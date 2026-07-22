//! R2 schema / seed / 约束 / Outbox 同事务集成测试。

use sea_orm::{ConnectionTrait, DatabaseBackend, Statement, TransactionTrait};
use stoneflow_application::operation::{
    OutboxEnqueueRecord, OutboxOpKind, OutboxWriter, SyncEntityKind, TombstoneRecord,
    TombstoneWriter, UnitOfWork,
};
use stoneflow_domain::create_id;
use stoneflow_test_support::TestDatabase;

use crate::unit_of_work::SqliteUnitOfWork;

const EXPECTED_TABLES: [&str; 14] = [
    "spaces",
    "projects",
    "tasks",
    "task_links",
    "views",
    "activity_events",
    "activity_changes",
    "settings",
    "outbox",
    "applied_operations",
    "sync_changes",
    "tombstones",
    "sync_cursors",
    "sync_devices",
];

const EXPECTED_INDEXES: [&str; 15] = [
    "ux_spaces_single_default_active",
    "ix_spaces_position",
    "ix_spaces_deleted_at",
    "ix_projects_space_position",
    "ix_projects_deleted_at",
    "ix_tasks_space_inbox_position",
    "ix_tasks_project_position",
    "ix_tasks_archived_at",
    "ix_tasks_deleted_at",
    "ix_task_links_task_position",
    "ix_views_position",
    "ix_activity_events_entity_created",
    "ix_outbox_available",
    "ix_tombstones_deletion_seq",
    "ix_sync_changes_seq",
];

const LEGACY_TABLES: [&str; 4] = [
    "sync_mutations",
    "sync_shadow",
    "sync_clients",
    "sync_outbox",
];

#[tokio::test]
async fn bootstrap_should_create_r2_tables_and_indexes() {
    let database = TestDatabase::bootstrap()
        .await
        .expect("test database should bootstrap");

    for table_name in EXPECTED_TABLES {
        assert!(
            sqlite_object_exists(database.connection(), "table", table_name)
                .await
                .expect("sqlite_master query should succeed"),
            "table `{table_name}` should exist"
        );
    }

    for index_name in EXPECTED_INDEXES {
        assert!(
            sqlite_object_exists(database.connection(), "index", index_name)
                .await
                .expect("sqlite_master query should succeed"),
            "index `{index_name}` should exist"
        );
    }

    for table_name in LEGACY_TABLES {
        assert!(
            !sqlite_object_exists(database.connection(), "table", table_name)
                .await
                .expect("sqlite_master query should succeed"),
            "legacy table `{table_name}` must not exist"
        );
    }
}

#[tokio::test]
async fn bootstrap_should_seed_only_default_space() {
    let database = TestDatabase::bootstrap()
        .await
        .expect("test database should bootstrap");

    let default_count = scalar_i64(
        database.connection(),
        "SELECT COUNT(*) AS value FROM spaces WHERE is_default = 1 AND archived_at IS NULL AND deleted_at IS NULL",
    )
    .await
    .expect("default space count");
    let personal_count = scalar_i64(
        database.connection(),
        "SELECT COUNT(*) AS value FROM spaces WHERE name = '个人'",
    )
    .await
    .expect("personal space count");
    let view_count = scalar_i64(database.connection(), "SELECT COUNT(*) AS value FROM views")
        .await
        .expect("view count");
    let setting_count = scalar_i64(
        database.connection(),
        "SELECT COUNT(*) AS value FROM settings",
    )
    .await
    .expect("setting count");

    assert_eq!(default_count, 1);
    assert_eq!(personal_count, 1);
    assert_eq!(view_count, 0);
    assert_eq!(setting_count, 0);
}

#[tokio::test]
async fn tasks_should_reject_cross_space_project_via_composite_fk() {
    let database = TestDatabase::bootstrap()
        .await
        .expect("test database should bootstrap");
    let conn = database.connection();

    let space_a = create_id().to_string();
    let space_b = create_id().to_string();
    let project_id = create_id().to_string();
    let now = "2026-07-22T00:00:00Z";

    exec(
        conn,
        &format!(
            "INSERT INTO spaces (id, name, icon_key, color_key, is_default, position, generation, created_at, updated_at)
             VALUES ('{space_a}', 'A', 'home', 'blue', 0, 1000, 1, '{now}', '{now}')"
        ),
    )
    .await
    .expect("insert space a");
    exec(
        conn,
        &format!(
            "INSERT INTO spaces (id, name, icon_key, color_key, is_default, position, generation, created_at, updated_at)
             VALUES ('{space_b}', 'B', 'home', 'blue', 0, 2000, 1, '{now}', '{now}')"
        ),
    )
    .await
    .expect("insert space b");
    exec(
        conn,
        &format!(
            "INSERT INTO projects (id, space_id, name, status, priority, status_changed_at, position, generation, created_at, updated_at)
             VALUES ('{project_id}', '{space_a}', 'P', 'todo', 0, '{now}', 1000, 1, '{now}', '{now}')"
        ),
    )
    .await
    .expect("insert project in space a");

    let err = exec(
        conn,
        &format!(
            "INSERT INTO tasks (id, space_id, project_id, title, status, priority, status_changed_at, position, generation, created_at, updated_at)
             VALUES ('{}', '{space_b}', '{project_id}', 'bad', 'todo', 0, '{now}', 1000, 1, '{now}', '{now}')",
            create_id()
        ),
    )
    .await
    .expect_err("cross-space project FK must fail");

    let message = err.to_string();
    assert!(
        message.contains("FOREIGN KEY") || message.contains("constraint"),
        "unexpected error: {message}"
    );
}

#[tokio::test]
async fn active_default_space_must_be_unique() {
    let database = TestDatabase::bootstrap()
        .await
        .expect("test database should bootstrap");
    let now = "2026-07-22T00:00:00Z";

    let err = exec(
        database.connection(),
        &format!(
            "INSERT INTO spaces (id, name, icon_key, color_key, is_default, position, generation, created_at, updated_at)
             VALUES ('{}', '另一个默认', 'home', 'blue', 1, 3000, 1, '{now}', '{now}')",
            create_id()
        ),
    )
    .await
    .expect_err("second active default must fail");

    let message = err.to_string();
    assert!(
        message.contains("UNIQUE") || message.contains("constraint"),
        "unexpected error: {message}"
    );
}

#[tokio::test]
async fn outbox_and_tombstone_commit_atomically() {
    let database = TestDatabase::bootstrap()
        .await
        .expect("test database should bootstrap");
    let uow = SqliteUnitOfWork::new(database.connection().clone());
    let now = "2026-07-22T01:00:00Z";
    let operation_id = create_id().to_string();
    let entity_id = create_id().to_string();

    let tx = uow.begin().await.expect("begin");
    uow.enqueue(
        &tx,
        &OutboxEnqueueRecord {
            id: create_id().to_string(),
            operation_id: operation_id.clone(),
            entity_type: SyncEntityKind::Task,
            entity_id: entity_id.clone(),
            generation: 2,
            operation_type: OutboxOpKind::Delete,
            payload_json: "{}".to_owned(),
            created_at: now.to_owned(),
            available_at: now.to_owned(),
        },
    )
    .await
    .expect("enqueue outbox");
    uow.insert_tombstone(
        &tx,
        &TombstoneRecord {
            entity_type: SyncEntityKind::Task,
            entity_id: entity_id.clone(),
            generation: 2,
            deletion_seq: 1,
            deleted_at: now.to_owned(),
        },
    )
    .await
    .expect("insert tombstone");
    uow.commit(tx).await.expect("commit");

    let outbox_count = scalar_i64(
        database.connection(),
        &format!("SELECT COUNT(*) AS value FROM outbox WHERE operation_id = '{operation_id}'"),
    )
    .await
    .expect("outbox count");
    let tombstone_count = scalar_i64(
        database.connection(),
        &format!(
            "SELECT COUNT(*) AS value FROM tombstones WHERE entity_id = '{entity_id}' AND entity_type = 'task'"
        ),
    )
    .await
    .expect("tombstone count");

    assert_eq!(outbox_count, 1);
    assert_eq!(tombstone_count, 1);
}

#[tokio::test]
async fn outbox_and_tombstone_rollback_leaves_no_partial_rows() {
    let database = TestDatabase::bootstrap()
        .await
        .expect("test database should bootstrap");
    let uow = SqliteUnitOfWork::new(database.connection().clone());
    let now = "2026-07-22T02:00:00Z";
    let operation_id = create_id().to_string();
    let entity_id = create_id().to_string();

    let tx = uow.begin().await.expect("begin");
    uow.enqueue(
        &tx,
        &OutboxEnqueueRecord {
            id: create_id().to_string(),
            operation_id: operation_id.clone(),
            entity_type: SyncEntityKind::Project,
            entity_id: entity_id.clone(),
            generation: 1,
            operation_type: OutboxOpKind::Delete,
            payload_json: "{}".to_owned(),
            created_at: now.to_owned(),
            available_at: now.to_owned(),
        },
    )
    .await
    .expect("enqueue outbox");
    uow.insert_tombstone(
        &tx,
        &TombstoneRecord {
            entity_type: SyncEntityKind::Project,
            entity_id: entity_id.clone(),
            generation: 1,
            deletion_seq: 2,
            deleted_at: now.to_owned(),
        },
    )
    .await
    .expect("insert tombstone");
    uow.rollback(tx).await.expect("rollback");

    let outbox_count = scalar_i64(
        database.connection(),
        &format!("SELECT COUNT(*) AS value FROM outbox WHERE operation_id = '{operation_id}'"),
    )
    .await
    .expect("outbox count");
    let tombstone_count = scalar_i64(
        database.connection(),
        &format!(
            "SELECT COUNT(*) AS value FROM tombstones WHERE entity_id = '{entity_id}' AND entity_type = 'project'"
        ),
    )
    .await
    .expect("tombstone count");

    assert_eq!(outbox_count, 0);
    assert_eq!(tombstone_count, 0);
}

#[tokio::test]
async fn injected_failure_after_entity_write_rolls_back_outbox() {
    let database = TestDatabase::bootstrap()
        .await
        .expect("test database should bootstrap");
    let conn = database.connection();
    let now = "2026-07-22T03:00:00Z";
    let space_id = create_id().to_string();
    let task_id = create_id().to_string();
    let operation_id = create_id().to_string();

    let tx = conn.begin().await.expect("begin");
    exec_on(
        &tx,
        &format!(
            "INSERT INTO spaces (id, name, icon_key, color_key, is_default, position, generation, created_at, updated_at)
             VALUES ('{space_id}', 'T', 'home', 'blue', 0, 4000, 1, '{now}', '{now}')"
        ),
    )
    .await
    .expect("insert space");
    exec_on(
        &tx,
        &format!(
            "INSERT INTO tasks (id, space_id, title, status, priority, status_changed_at, position, generation, created_at, updated_at)
             VALUES ('{task_id}', '{space_id}', 't', 'todo', 0, '{now}', 1000, 1, '{now}', '{now}')"
        ),
    )
    .await
    .expect("insert task");
    exec_on(
        &tx,
        &format!(
            "INSERT INTO outbox (id, operation_id, entity_type, entity_id, generation, operation_type, payload_json, created_at, available_at)
             VALUES ('{}', '{operation_id}', 'task', '{task_id}', 1, 'upsert', '{{}}', '{now}', '{now}')",
            create_id()
        ),
    )
    .await
    .expect("insert outbox");

    // 人为失败：重复默认 Space 唯一索引冲突，迫使整事务回滚
    let fail = exec_on(
        &tx,
        &format!(
            "INSERT INTO spaces (id, name, icon_key, color_key, is_default, position, generation, created_at, updated_at)
             VALUES ('{}', '冲突默认', 'home', 'blue', 1, 5000, 1, '{now}', '{now}')",
            create_id()
        ),
    )
    .await;
    assert!(
        fail.is_err(),
        "injected unique default conflict should fail"
    );
    tx.rollback().await.expect("rollback after failure");

    let task_count = scalar_i64(
        conn,
        &format!("SELECT COUNT(*) AS value FROM tasks WHERE id = '{task_id}'"),
    )
    .await
    .expect("task count");
    let outbox_count = scalar_i64(
        conn,
        &format!("SELECT COUNT(*) AS value FROM outbox WHERE operation_id = '{operation_id}'"),
    )
    .await
    .expect("outbox count");

    assert_eq!(task_count, 0);
    assert_eq!(outbox_count, 0);
}

async fn sqlite_object_exists(
    connection: &sea_orm::DatabaseConnection,
    object_type: &str,
    object_name: &str,
) -> Result<bool, sea_orm::DbErr> {
    let statement = Statement::from_sql_and_values(
        DatabaseBackend::Sqlite,
        "SELECT 1 FROM sqlite_master WHERE type = ? AND name = ? LIMIT 1",
        [object_type.into(), object_name.into()],
    );
    Ok(connection.query_one(statement).await?.is_some())
}

async fn scalar_i64(
    connection: &sea_orm::DatabaseConnection,
    sql: &str,
) -> Result<i64, sea_orm::DbErr> {
    let row = connection
        .query_one(Statement::from_string(
            DatabaseBackend::Sqlite,
            sql.to_owned(),
        ))
        .await?
        .expect("scalar row");
    row.try_get("", "value")
}

async fn exec(connection: &sea_orm::DatabaseConnection, sql: &str) -> Result<(), sea_orm::DbErr> {
    connection
        .execute(Statement::from_string(
            DatabaseBackend::Sqlite,
            sql.to_owned(),
        ))
        .await?;
    Ok(())
}

async fn exec_on<C: ConnectionTrait>(connection: &C, sql: &str) -> Result<(), sea_orm::DbErr> {
    connection
        .execute(Statement::from_string(
            DatabaseBackend::Sqlite,
            sql.to_owned(),
        ))
        .await?;
    Ok(())
}

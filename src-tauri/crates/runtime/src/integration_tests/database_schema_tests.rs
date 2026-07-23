//! 当前 SQLite Schema 回归测试。

use sea_orm::{ConnectionTrait, DatabaseBackend, Statement};
use stoneflow_test_support::TestDatabase;

const EXPECTED_TABLES: [&str; 14] = [
    "spaces",
    "projects",
    "tasks",
    "task_links",
    "views",
    "settings",
    "activity_events",
    "activity_changes",
    "outbox",
    "applied_operations",
    "sync_changes",
    "tombstones",
    "sync_cursors",
    "sync_devices",
];

const EXPECTED_SYNC_TABLES: [&str; 6] = [
    "outbox",
    "tombstones",
    "applied_operations",
    "sync_changes",
    "sync_cursors",
    "sync_devices",
];

const EXPECTED_INDEXES: [&str; 16] = [
    "ux_spaces_single_default_active",
    "ix_spaces_position",
    "ix_spaces_deleted_at",
    "ix_projects_space_position",
    "ix_projects_deleted_at",
    "ix_tasks_space_standalone_position",
    "ix_tasks_project_position",
    "ix_tasks_archived_at",
    "ix_tasks_deleted_at",
    "ix_task_links_task_position",
    "ix_views_position",
    "ix_activity_events_entity_created",
    "ix_activity_changes_event",
    "ix_outbox_available",
    "ix_applied_operations_entity",
    "ix_tombstones_deletion_seq",
];

const LEGACY_TABLES: [&str; 5] = [
    "sync_mutations",
    "sync_shadow",
    "sync_clients",
    "sync_cursor",
    "sync_outbox",
];

#[tokio::test]
async fn bootstrap_should_create_all_tables() {
    let database = TestDatabase::bootstrap()
        .await
        .expect("test database should bootstrap");

    for table_name in EXPECTED_TABLES {
        let exists = sqlite_object_exists(database.connection(), "table", table_name)
            .await
            .expect("sqlite_master query should succeed");
        assert!(exists, "table `{table_name}` should exist");
    }
}

#[tokio::test]
async fn bootstrap_should_create_sync_tables_without_legacy_mutations() {
    let database = TestDatabase::bootstrap()
        .await
        .expect("test database should bootstrap");

    for table_name in EXPECTED_SYNC_TABLES {
        let exists = sqlite_object_exists(database.connection(), "table", table_name)
            .await
            .expect("sqlite_master query should succeed");
        assert!(exists, "table `{table_name}` should exist");
    }

    for table_name in LEGACY_TABLES {
        let exists = sqlite_object_exists(database.connection(), "table", table_name)
            .await
            .expect("sqlite_master query should succeed");
        assert!(!exists, "legacy table `{table_name}` should not exist");
    }
}

#[tokio::test]
async fn bootstrap_should_create_expected_indexes() {
    let database = TestDatabase::bootstrap()
        .await
        .expect("test database should bootstrap");

    for index_name in EXPECTED_INDEXES {
        let exists = sqlite_object_exists(database.connection(), "index", index_name)
            .await
            .expect("sqlite_master query should succeed");
        assert!(exists, "index `{index_name}` should exist");
    }
}

async fn sqlite_object_exists(
    connection: &impl ConnectionTrait,
    object_type: &str,
    name: &str,
) -> Result<bool, sea_orm::DbErr> {
    let row = connection
        .query_one(Statement::from_sql_and_values(
            DatabaseBackend::Sqlite,
            "SELECT 1 AS value FROM sqlite_master WHERE type = ? AND name = ?",
            [object_type.into(), name.into()],
        ))
        .await?;
    Ok(row.is_some())
}

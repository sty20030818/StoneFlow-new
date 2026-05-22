//! 阶段 1 Schema 回归测试。

use sea_orm::{ConnectionTrait, DatabaseBackend, Statement};
use stoneflow_test_support::TempDatabaseDir;

use crate::infrastructure::database::bootstrap_database;

const EXPECTED_TABLES: [&str; 8] = [
    "spaces",
    "projects",
    "tasks",
    "task_links",
    "views",
    "settings",
    "activity_events",
    "activity_changes",
];

const EXPECTED_INDEXES: [&str; 12] = [
    "ux_spaces_single_default_active",
    "idx_projects_space_sort_order",
    "idx_tasks_space_project_status_sort_order",
    "idx_tasks_due_at",
    "idx_tasks_scheduled_at",
    "idx_tasks_inbox_at",
    "idx_task_links_task_sort_order",
    "idx_views_entity_visible_sort_order",
    "ux_views_entity_key",
    "ux_settings_key",
    "idx_activity_events_entity_created_at",
    "idx_activity_changes_event_id",
];

#[tokio::test]
async fn bootstrap_should_create_all_v1_tables() {
    let temp_dir =
        TempDatabaseDir::new("stoneflow-stage1-schema-tables").expect("temporary dir should exist");
    let database = bootstrap_database(temp_dir.path())
        .await
        .expect("database bootstrap should succeed");

    for table_name in EXPECTED_TABLES {
        let exists = sqlite_object_exists(database.connection(), "table", table_name)
            .await
            .expect("sqlite_master query should succeed");
        assert!(exists, "table `{table_name}` should exist");
    }
}

#[tokio::test]
async fn bootstrap_should_create_expected_indexes() {
    let temp_dir = TempDatabaseDir::new("stoneflow-stage1-schema-indexes")
        .expect("temporary dir should exist");
    let database = bootstrap_database(temp_dir.path())
        .await
        .expect("database bootstrap should succeed");

    for index_name in EXPECTED_INDEXES {
        let exists = sqlite_object_exists(database.connection(), "index", index_name)
            .await
            .expect("sqlite_master query should succeed");
        assert!(exists, "index `{index_name}` should exist");
    }
}

#[tokio::test]
async fn bootstrap_should_create_foreign_keys_for_core_relations() {
    let temp_dir =
        TempDatabaseDir::new("stoneflow-stage1-schema-fks").expect("temporary dir should exist");
    let database = bootstrap_database(temp_dir.path())
        .await
        .expect("database bootstrap should succeed");

    let project_foreign_keys = foreign_key_tables(database.connection(), "projects")
        .await
        .expect("project foreign keys should be queryable");
    assert_eq!(project_foreign_keys, vec!["spaces".to_owned()]);

    let task_foreign_keys = foreign_key_tables(database.connection(), "tasks")
        .await
        .expect("task foreign keys should be queryable");
    assert_eq!(
        task_foreign_keys,
        vec!["projects".to_owned(), "spaces".to_owned()]
    );

    let change_foreign_keys = foreign_key_tables(database.connection(), "activity_changes")
        .await
        .expect("activity_changes foreign keys should be queryable");
    assert_eq!(change_foreign_keys, vec!["activity_events".to_owned()]);

    let task_link_foreign_keys = foreign_key_tables(database.connection(), "task_links")
        .await
        .expect("task_links foreign keys should be queryable");
    assert_eq!(task_link_foreign_keys, vec!["tasks".to_owned()]);
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

    connection
        .query_one(statement)
        .await
        .map(|row| row.is_some())
}

async fn foreign_key_tables(
    connection: &sea_orm::DatabaseConnection,
    table_name: &str,
) -> Result<Vec<String>, sea_orm::DbErr> {
    let rows = connection
        .query_all(Statement::from_string(
            DatabaseBackend::Sqlite,
            format!("PRAGMA foreign_key_list('{table_name}')"),
        ))
        .await?;

    let mut tables = rows
        .into_iter()
        .map(|row| row.try_get("", "table"))
        .collect::<Result<Vec<String>, _>>()?;
    tables.sort();
    Ok(tables)
}

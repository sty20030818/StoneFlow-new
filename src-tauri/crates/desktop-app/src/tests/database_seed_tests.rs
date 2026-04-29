//! 阶段 1 Seed 与幂等回归测试。

use sea_orm::{ConnectionTrait, DatabaseBackend, Statement};
use stoneflow_test_support::TempDatabaseDir;

use crate::infrastructure::database::{bootstrap_database, connect_sqlite, resolve_database_path};

#[tokio::test]
async fn bootstrap_should_seed_default_space_and_not_duplicate_it() {
    let temp_dir =
        TempDatabaseDir::new("stoneflow-stage1-seed-space").expect("temporary dir should exist");

    let first = bootstrap_database(temp_dir.path())
        .await
        .expect("first bootstrap should succeed");
    let second = bootstrap_database(temp_dir.path())
        .await
        .expect("second bootstrap should succeed");

    let default_space_count = scalar_i64(
        second.connection(),
        "SELECT COUNT(*) AS value FROM spaces WHERE is_default = 1 AND archived_at IS NULL AND deleted_at IS NULL",
    )
    .await
    .expect("default space count query should succeed");
    let personal_space_count = scalar_i64(
        first.connection(),
        "SELECT COUNT(*) AS value FROM spaces WHERE name = '个人'",
    )
    .await
    .expect("personal space count query should succeed");

    assert_eq!(default_space_count, 1);
    assert_eq!(personal_space_count, 1);
}

#[tokio::test]
async fn bootstrap_should_seed_system_views_and_default_settings() {
    let temp_dir = TempDatabaseDir::new("stoneflow-stage1-seed-view-setting")
        .expect("temporary dir should exist");
    let database = bootstrap_database(temp_dir.path())
        .await
        .expect("database bootstrap should succeed");

    let task_system_views = scalar_i64(
        database.connection(),
        "SELECT COUNT(*) AS value FROM views WHERE entity_type = 'task' AND key IS NOT NULL",
    )
    .await
    .expect("task view count query should succeed");
    let project_system_views = scalar_i64(
        database.connection(),
        "SELECT COUNT(*) AS value FROM views WHERE entity_type = 'project' AND key IS NOT NULL",
    )
    .await
    .expect("project view count query should succeed");
    let setting_count = scalar_i64(
        database.connection(),
        "SELECT COUNT(*) AS value FROM settings",
    )
    .await
    .expect("setting count query should succeed");

    assert_eq!(task_system_views, 6);
    assert_eq!(project_system_views, 4);
    assert_eq!(setting_count, 4);
}

#[tokio::test]
async fn bootstrap_should_preserve_existing_setting_value_on_rebootstrap() {
    let temp_dir = TempDatabaseDir::new("stoneflow-stage1-seed-setting-preserve")
        .expect("temporary dir should exist");
    let database = bootstrap_database(temp_dir.path())
        .await
        .expect("first bootstrap should succeed");

    database
        .connection()
        .execute(Statement::from_sql_and_values(
            DatabaseBackend::Sqlite,
            "UPDATE settings SET value = ?, updated_at = ? WHERE key = 'app.ui'",
            [
                serde_json::json!({
                    "theme": "dark",
                    "density": "compact",
                    "sidebarWidth": 320,
                    "taskDrawerWidth": 520
                })
                .to_string()
                .into(),
                "2026-04-29T00:00:00+00:00".into(),
            ],
        ))
        .await
        .expect("manual settings update should succeed");

    let second = bootstrap_database(temp_dir.path())
        .await
        .expect("second bootstrap should succeed");
    let app_ui_value = scalar_string(
        second.connection(),
        "SELECT value AS value FROM settings WHERE key = 'app.ui'",
    )
    .await
    .expect("app.ui query should succeed");

    assert!(app_ui_value.contains("\"theme\":\"dark\""));
    assert!(app_ui_value.contains("\"sidebarWidth\":320"));
}

#[tokio::test]
async fn bootstrap_should_keep_system_view_keys_unique_per_entity_type() {
    let temp_dir = TempDatabaseDir::new("stoneflow-stage1-seed-view-unique")
        .expect("temporary dir should exist");
    let database = bootstrap_database(temp_dir.path())
        .await
        .expect("database bootstrap should succeed");

    let duplicate_pairs = scalar_i64(
        database.connection(),
        r#"
        SELECT COUNT(*) AS value
        FROM (
            SELECT entity_type, key
            FROM views
            WHERE key IS NOT NULL
            GROUP BY entity_type, key
            HAVING COUNT(*) > 1
        ) duplicated
        "#,
    )
    .await
    .expect("duplicate view key query should succeed");

    assert_eq!(duplicate_pairs, 0);
}

#[tokio::test]
async fn bootstrap_should_fail_with_readable_error_when_multiple_active_default_spaces_exist() {
    let temp_dir = TempDatabaseDir::new("stoneflow-stage1-seed-duplicate-default")
        .expect("temporary dir should exist");
    let database_path = resolve_database_path(temp_dir.path());
    let connection = connect_sqlite(&database_path)
        .await
        .expect("manual sqlite connection should succeed");

    connection
        .execute_unprepared(
            r#"
            CREATE TABLE spaces (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                icon_key TEXT NOT NULL,
                color_key TEXT NOT NULL,
                is_default INTEGER NOT NULL,
                sort_order INTEGER NOT NULL,
                archived_at TEXT NULL,
                deleted_at TEXT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            INSERT INTO spaces (
                id, name, icon_key, color_key, is_default, sort_order, archived_at, deleted_at, created_at, updated_at
            ) VALUES
            ('space-a', '个人一', 'user', 'blue', 1, 1000, NULL, NULL, '2026-04-29T00:00:00+00:00', '2026-04-29T00:00:00+00:00'),
            ('space-b', '个人二', 'user', 'green', 1, 2000, NULL, NULL, '2026-04-29T00:00:00+00:00', '2026-04-29T00:00:00+00:00');
            "#,
        )
        .await
        .expect("manual duplicated spaces should be inserted");

    let error = bootstrap_database(temp_dir.path())
        .await
        .expect_err("bootstrap should fail when duplicated active defaults exist");

    assert_eq!(
        error.to_string(),
        "初始化失败: 数据库存在多个活跃默认 Space，无法继续初始化"
    );
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
        .expect("scalar query should always return one row");

    row.try_get("", "value")
}

async fn scalar_string(
    connection: &sea_orm::DatabaseConnection,
    sql: &str,
) -> Result<String, sea_orm::DbErr> {
    let row = connection
        .query_one(Statement::from_string(
            DatabaseBackend::Sqlite,
            sql.to_owned(),
        ))
        .await?
        .expect("scalar query should always return one row");

    row.try_get("", "value")
}

//! Seed 回归：仅默认 Space「个人」，无系统 View。

use sea_orm::{ConnectionTrait, DatabaseBackend, Statement};
use stoneflow_storage::database::bootstrap_database_for_test;
use stoneflow_test_support::TestDatabase;

#[tokio::test]
async fn bootstrap_should_seed_default_space_and_not_duplicate_it() {
    let database = TestDatabase::bootstrap()
        .await
        .expect("test database should bootstrap");
    let base_dir = database
        .base_dir()
        .expect("file test database should expose base dir");

    let _second = bootstrap_database_for_test(base_dir)
        .await
        .expect("second bootstrap should succeed");

    let default_space_count = scalar_i64(
        database.connection(),
        "SELECT COUNT(*) AS value FROM spaces WHERE is_default = 1 AND archived_at IS NULL AND deleted_at IS NULL",
    )
    .await
    .expect("default space count query should succeed");
    let personal_space_count = scalar_i64(
        database.connection(),
        "SELECT COUNT(*) AS value FROM spaces WHERE name = '个人'",
    )
    .await
    .expect("personal space count query should succeed");

    assert_eq!(default_space_count, 1);
    assert_eq!(personal_space_count, 1);
}

#[tokio::test]
async fn bootstrap_should_not_seed_system_views_or_settings() {
    let database = TestDatabase::bootstrap()
        .await
        .expect("test database should bootstrap");

    let view_count = scalar_i64(database.connection(), "SELECT COUNT(*) AS value FROM views")
        .await
        .expect("view count query should succeed");
    let settings_count = scalar_i64(
        database.connection(),
        "SELECT COUNT(*) AS value FROM settings",
    )
    .await
    .expect("settings count query should succeed");

    assert_eq!(view_count, 0, "系统 View 不入库");
    assert_eq!(settings_count, 0, "Settings 不预置默认行");
}

async fn scalar_i64(connection: &impl ConnectionTrait, sql: &str) -> Result<i64, sea_orm::DbErr> {
    let row = connection
        .query_one_raw(Statement::from_string(
            DatabaseBackend::Sqlite,
            sql.to_owned(),
        ))
        .await?
        .expect("scalar query should return a row");
    row.try_get("", "value")
}

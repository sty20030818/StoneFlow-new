//! 阶段 0 数据库 bootstrap 回归测试。

use sea_orm::{ConnectionTrait, DatabaseBackend, DbErr, Statement, TransactionTrait};
use sea_orm_migration::prelude::*;
use stoneflow_test_support::TestDatabase;

use crate::app::error::AppError;
use stoneflow_storage::database::bootstrap_database_for_test;

#[tokio::test]
async fn database_bootstrap_should_create_sqlite_and_report_ready() {
    let database = TestDatabase::bootstrap()
        .await
        .expect("test database should bootstrap");

    let snapshot = database.snapshot();
    assert!(database.database_path().exists());
    assert_eq!(database.applied_migrations(), 1);
    assert!(snapshot.database_ready);
    assert!(snapshot.migrations_ready);
}

#[tokio::test]
async fn database_bootstrap_should_be_idempotent_for_same_directory() {
    let database = TestDatabase::bootstrap()
        .await
        .expect("test database should bootstrap");
    let base_dir = database
        .base_dir()
        .expect("file test database should expose base dir")
        .to_path_buf();
    let first_path = database.database_path().to_path_buf();

    let second = bootstrap_database_for_test(&base_dir)
        .await
        .expect("second bootstrap should succeed");

    assert_eq!(first_path, second.database_path());
    assert!(second.snapshot().database_ready);
}

#[tokio::test]
async fn transaction_should_rollback_test_data() {
    let database = TestDatabase::bootstrap()
        .await
        .expect("test database should bootstrap");

    let transaction = database
        .connection()
        .begin()
        .await
        .expect("transaction should start");

    transaction
        .execute(Statement::from_string(
            DatabaseBackend::Sqlite,
            "CREATE TABLE transaction_rollback_probe (value INTEGER NOT NULL)",
        ))
        .await
        .expect("probe table should be created");
    transaction
        .execute(Statement::from_string(
            DatabaseBackend::Sqlite,
            "INSERT INTO transaction_rollback_probe (value) VALUES (1)",
        ))
        .await
        .expect("probe row should be inserted");
    transaction
        .rollback()
        .await
        .expect("rollback should succeed");

    let probe = database
        .connection()
        .query_one(Statement::from_string(
            DatabaseBackend::Sqlite,
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'transaction_rollback_probe'",
        ))
        .await
        .expect("sqlite_master query should succeed");

    assert!(probe.is_none());
}

#[tokio::test]
async fn failing_migration_should_not_leave_half_finished_schema() {
    let database = TestDatabase::bootstrap()
        .await
        .expect("test database should bootstrap");

    let error = FailingMigrator::up(database.connection(), None)
        .await
        .expect_err("failing migrator should bubble error");
    let _error = error;

    let probe = database
        .connection()
        .query_one(Statement::from_string(
            DatabaseBackend::Sqlite,
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'failing_probe'",
        ))
        .await
        .expect("sqlite_master query should succeed");

    assert!(probe.is_none());
}

#[derive(DeriveMigrationName)]
struct FailingMigration;

#[async_trait::async_trait]
impl MigrationTrait for FailingMigration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute(Statement::from_string(
                DatabaseBackend::Sqlite,
                "CREATE TABLE failing_probe (id INTEGER PRIMARY KEY)",
            ))
            .await?;

        Err(DbErr::Migration("forced failure".to_owned()))
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        Ok(())
    }
}

struct FailingMigrator;

#[async_trait::async_trait]
impl MigratorTrait for FailingMigrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![Box::new(FailingMigration)]
    }
}

#[test]
fn app_error_should_classify_database_and_initialization_failures() {
    let database_error = AppError::database("db down");
    let initialization_error = AppError::initialization("missing dir");

    assert!(matches!(database_error, AppError::Database(_)));
    assert!(matches!(initialization_error, AppError::Initialization(_)));
}

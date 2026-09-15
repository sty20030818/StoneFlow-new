//! 数据库 bootstrap：负责连接、迁移与运行态快照。

use std::path::{Path, PathBuf};

use sea_orm::DatabaseConnection;
use serde::Serialize;

use crate::error::StorageError;

use super::{
    connection::{
        connect_sqlite, connect_sqlite_for_test, connect_sqlite_memory, resolve_database_path,
        run_smoke_query,
    },
    seed::{multiple_default_spaces_error, run_seed},
};

/// 数据库健康快照。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct DatabaseRuntimeSnapshot {
    pub database_path: String,
    pub database_ready: bool,
    pub migrations_ready: bool,
}

/// 主应用持有的数据库运行态。
#[derive(Debug, Clone)]
#[cfg_attr(not(test), allow(dead_code))]
pub struct DatabaseRuntimeState {
    connection: DatabaseConnection,
    database_path: PathBuf,
    applied_migrations: usize,
}

#[cfg_attr(not(test), allow(dead_code))]
impl DatabaseRuntimeState {
    /// 返回数据库连接。
    pub fn connection(&self) -> &DatabaseConnection {
        &self.connection
    }

    /// 返回数据库路径。
    pub fn database_path(&self) -> &Path {
        &self.database_path
    }

    /// 返回当前已配置的迁移数量。
    pub fn applied_migrations(&self) -> usize {
        self.applied_migrations
    }

    /// 返回可序列化健康快照。
    pub fn snapshot(&self) -> DatabaseRuntimeSnapshot {
        DatabaseRuntimeSnapshot {
            database_path: self.database_path.display().to_string(),
            database_ready: true,
            migrations_ready: self.applied_migrations > 0,
        }
    }
}

/// 建立数据库连接并执行基础迁移。
pub async fn bootstrap_database(base_dir: &Path) -> Result<DatabaseRuntimeState, StorageError> {
    let database_path = resolve_database_path(base_dir);
    let connection = connect_sqlite(&database_path).await?;
    bootstrap_database_with_connection(connection, database_path).await
}

/// 测试专用：文件库 bootstrap，使用更易清理的连接参数。
pub async fn bootstrap_database_for_test(
    base_dir: &Path,
) -> Result<DatabaseRuntimeState, StorageError> {
    let database_path = resolve_database_path(base_dir);
    let connection = connect_sqlite_for_test(&database_path).await?;
    bootstrap_database_with_connection(connection, database_path).await
}

/// 测试专用：内存库 bootstrap，避免在 Temp 目录落盘。
pub async fn bootstrap_database_in_memory() -> Result<DatabaseRuntimeState, StorageError> {
    let connection = connect_sqlite_memory().await?;
    bootstrap_database_with_connection(connection, PathBuf::from(":memory:")).await
}

async fn bootstrap_database_with_connection(
    connection: DatabaseConnection,
    database_path: PathBuf,
) -> Result<DatabaseRuntimeState, StorageError> {
    run_smoke_query(&connection).await?;

    let applied_migrations = crate::migration::run_migrations(&connection)
        .await
        .map_err(map_migration_error)?;
    run_seed(&connection).await?;

    Ok(DatabaseRuntimeState {
        connection,
        database_path,
        applied_migrations,
    })
}

fn map_migration_error(error: sea_orm::DbErr) -> StorageError {
    let message = error.to_string();
    if message.contains("ux_spaces_single_default_active")
        || message.contains("UNIQUE constraint failed: spaces.is_default")
    {
        return multiple_default_spaces_error();
    }

    StorageError::from(error)
}

#[cfg(test)]
mod tests {
    use sea_orm::{ConnectOptions, ConnectionTrait, Database, DbBackend, Statement};
    use sea_orm_migration::MigratorTrait;
    use stoneflow_test_support::TestDatabase;

    use super::*;

    async fn test_connection() -> DatabaseConnection {
        let mut options = ConnectOptions::new("sqlite::memory:");
        options.max_connections(1);
        Database::connect(options).await.expect("temporary SQLite")
    }

    async fn snapshot(connection: &DatabaseConnection) -> (Vec<(String, Option<String>)>, i64) {
        let schema = connection
            .query_all_raw(Statement::from_string(
                DbBackend::Sqlite,
                "SELECT name, sql FROM sqlite_schema ORDER BY type, name",
            ))
            .await
            .expect("schema snapshot")
            .into_iter()
            .map(|row| {
                (
                    row.try_get("", "name").expect("object name"),
                    row.try_get("", "sql").expect("object definition"),
                )
            })
            .collect();
        let changes = connection
            .query_one_raw(Statement::from_string(
                DbBackend::Sqlite,
                "SELECT total_changes() AS changes",
            ))
            .await
            .expect("change counter")
            .expect("change counter row")
            .try_get("", "changes")
            .expect("change count");
        (schema, changes)
    }

    #[tokio::test]
    async fn bootstrap_current_baseline_is_repeatable_and_has_strict_view_columns() {
        let connection = test_connection().await;
        let state = bootstrap_database_with_connection(connection.clone(), ":memory:".into())
            .await
            .expect("empty database bootstrap");
        assert_eq!(
            state.applied_migrations(),
            crate::migration::Migrator::migrations().len()
        );
        let columns: Vec<String> = connection
            .query_all_raw(Statement::from_string(
                DbBackend::Sqlite,
                "PRAGMA table_info(views)",
            ))
            .await
            .expect("View columns")
            .into_iter()
            .map(|row| row.try_get("", "name").expect("column name"))
            .collect();
        assert_eq!(
            columns,
            [
                "id",
                "name",
                "entity_kind",
                "scope_json",
                "filters_json",
                "position",
                "generation",
                "created_at",
                "updated_at"
            ]
        );
        let versions: Vec<String> = connection
            .query_all_raw(Statement::from_string(
                DbBackend::Sqlite,
                "SELECT version FROM seaql_migrations ORDER BY version",
            ))
            .await
            .expect("baseline ledger")
            .into_iter()
            .map(|row| row.try_get("", "version").expect("migration version"))
            .collect();
        assert_eq!(
            versions,
            crate::migration::Migrator::migrations()
                .iter()
                .map(|migration| migration.name().to_owned())
                .collect::<Vec<_>>()
        );

        let before = snapshot(&connection).await;
        bootstrap_database_with_connection(connection.clone(), ":memory:".into())
            .await
            .expect("current baseline bootstrap");
        assert_eq!(snapshot(&connection).await, before);
        connection.close().await.expect("close SQLite");
    }

    #[tokio::test]
    async fn bootstrap_rejects_unknown_incomplete_or_mismatched_history_without_ddl_or_seed() {
        for replacement in [
            "DELETE FROM seaql_migrations;
             INSERT INTO seaql_migrations (version, applied_at) VALUES ('m19000101_000001_unknown', 1)",
            "INSERT INTO seaql_migrations (version, applied_at) VALUES ('extra_baseline', 1)",
            "DROP TABLE seaql_migrations",
            "DELETE FROM seaql_migrations",
            "DROP TABLE seaql_migrations; CREATE TABLE seaql_migrations (unexpected TEXT)",
            "UPDATE seaql_migrations SET version = 'm20260723_000001_baseline'",
            "UPDATE seaql_migrations SET version = 'm20260914_000001_baseline'",
            "DELETE FROM seaql_migrations;
             INSERT INTO seaql_migrations (version, applied_at) VALUES
             ('m20260723_000001_baseline', 1),
             ('m20260914_000001_baseline', 2),
             ('m20260915_000001_view_contract', 3)",
            "ALTER TABLE views ADD COLUMN sort_json TEXT",
            "DROP TABLE tasks",
            "DROP TABLE sync_protocol_entities",
        ] {
            let connection = test_connection().await;
            crate::migration::run_migrations(&connection)
                .await
                .expect("fixture schema without seed");
            connection
                .execute_unprepared(
                    "INSERT INTO settings (key, value, created_at, updated_at)
                     VALUES ('preserved', 'original', '2026-09-14', '2026-09-14')",
                )
                .await
                .expect("existing data");
            connection
                .execute_unprepared(replacement)
                .await
                .expect("old ledger fixture");
            let before = snapshot(&connection).await;

            let error = bootstrap_database_with_connection(connection.clone(), ":memory:".into())
                .await
                .expect_err("unsupported database must fail closed");
            assert!(error.to_string().contains("迁移记录或表结构不受支持"));
            assert_eq!(snapshot(&connection).await, before, "{replacement}");
            connection.close().await.expect("close SQLite");
        }

        // 空 ledger 也不是空库；不能把中断或未知初始化状态冒认为新库。
        let connection = test_connection().await;
        connection
            .execute_unprepared(
                "CREATE TABLE seaql_migrations (version TEXT PRIMARY KEY, applied_at INTEGER)",
            )
            .await
            .expect("empty ledger fixture");
        let before = snapshot(&connection).await;
        bootstrap_database_with_connection(connection.clone(), ":memory:".into())
            .await
            .expect_err("empty ledger must fail closed");
        assert_eq!(snapshot(&connection).await, before);
        connection.close().await.expect("close SQLite");
    }

    #[tokio::test]
    async fn bootstrap_file_rejects_unknown_baseline_before_changing_journal_mode() {
        let fixture = TestDatabase::bootstrap()
            .await
            .expect("temporary file database");
        let base_dir = fixture.base_dir().expect("temporary directory").to_owned();
        let database_path = fixture.database_path().to_owned();
        fixture
            .connection()
            .execute_unprepared(
                "DELETE FROM seaql_migrations;
                 INSERT INTO seaql_migrations (version, applied_at) VALUES ('m19000101_000001_unknown', 1);
                 INSERT INTO settings (key, value, created_at, updated_at)
                 VALUES ('preserved', 'original', '2026-09-14', '2026-09-14')",
            )
            .await
            .expect("unknown DELETE database fixture");
        fixture
            .connection()
            .clone()
            .close()
            .await
            .expect("close fixture");
        let before = std::fs::read(&database_path).expect("database bytes before bootstrap");

        let error = bootstrap_database(&base_dir)
            .await
            .expect_err("unknown file must be rejected");
        assert!(error.to_string().contains("迁移记录或表结构不受支持"));
        assert!(
            std::fs::read(&database_path).expect("database bytes after rejection") == before,
            "拒绝未知数据库不得改变文件字节"
        );
        assert!(!database_path.with_extension("sqlite3-wal").exists());
        assert!(!database_path.with_extension("sqlite3-shm").exists());

        let inspect = Database::connect(format!("sqlite://{}?mode=ro", database_path.display()))
            .await
            .expect("read-only verification");
        let mode: String = inspect
            .query_one_raw(Statement::from_string(
                DbBackend::Sqlite,
                "PRAGMA journal_mode",
            ))
            .await
            .expect("journal mode")
            .expect("journal row")
            .try_get_by_index(0)
            .expect("journal value");
        assert_eq!(mode, "delete");
        let value: String = inspect
            .query_one_raw(Statement::from_string(
                DbBackend::Sqlite,
                "SELECT value FROM settings WHERE key = 'preserved'",
            ))
            .await
            .expect("preserved data")
            .expect("preserved row")
            .try_get("", "value")
            .expect("preserved value");
        assert_eq!(value, "original");
        inspect.close().await.expect("close inspection");

        let fresh_dir = base_dir.join("fresh");
        let state = bootstrap_database(&fresh_dir)
            .await
            .expect("new file bootstrap");
        let mode: String = state
            .connection()
            .query_one_raw(Statement::from_string(
                DbBackend::Sqlite,
                "PRAGMA journal_mode",
            ))
            .await
            .expect("new journal mode")
            .expect("new journal row")
            .try_get_by_index(0)
            .expect("new journal value");
        assert_eq!(mode, "wal");
        state
            .connection()
            .clone()
            .close()
            .await
            .expect("close new database");
        let repeated = bootstrap_database(&fresh_dir)
            .await
            .expect("current file bootstrap");
        assert_eq!(
            repeated.applied_migrations(),
            crate::migration::Migrator::migrations().len()
        );
        repeated
            .connection()
            .clone()
            .close()
            .await
            .expect("close reopened database");
        fixture.close().await;
    }

    #[tokio::test]
    async fn bootstrap_file_rejects_incomplete_tables_before_changing_journal_mode() {
        for table in ["tasks", "sync_protocol_entities"] {
            let fixture = TestDatabase::bootstrap()
                .await
                .expect("temporary current database");
            let base_dir = fixture.base_dir().expect("temporary directory").to_owned();
            let database_path = fixture.database_path().to_owned();
            fixture
                .connection()
                .execute_unprepared(&format!("DROP TABLE {table}"))
                .await
                .expect("incomplete current schema");
            fixture
                .connection()
                .clone()
                .close()
                .await
                .expect("close fixture");
            let before = std::fs::read(&database_path).expect("database before rejection");

            let error = bootstrap_database(&base_dir)
                .await
                .expect_err("incomplete schema must fail before enabling WAL");
            assert!(error.to_string().contains("迁移记录或表结构不受支持"));
            assert_eq!(
                std::fs::read(&database_path).expect("database after rejection"),
                before,
                "缺少 {table} 时不得改变数据库文件"
            );
            assert!(!database_path.with_extension("sqlite3-wal").exists());
            assert!(!database_path.with_extension("sqlite3-shm").exists());
            fixture.close().await;
        }
    }

    #[tokio::test]
    async fn baseline_downgrade_is_rejected_without_changing_data() {
        let connection = test_connection().await;
        bootstrap_database_with_connection(connection.clone(), ":memory:".into())
            .await
            .expect("current database");
        let before = snapshot(&connection).await;
        let error = crate::migration::Migrator::down(&connection, Some(1))
            .await
            .expect_err("baseline must not drop user tables");
        assert!(error.to_string().contains("不可自动降级"));
        assert_eq!(snapshot(&connection).await, before);
        connection.close().await.expect("close SQLite");
    }

    #[tokio::test]
    async fn initialization_failure_rolls_back_schema_and_ledger() {
        let connection = test_connection().await;
        // 限制可写页数，在建表中途触发 SQLITE_FULL，验证整个初始化事务回滚。
        connection
            .execute_unprepared("PRAGMA max_page_count = 6")
            .await
            .expect("limit SQLite pages");
        let before_schema = snapshot(&connection).await.0;
        let error = crate::migration::run_migrations(&connection)
            .await
            .expect_err("schema creation must exhaust the page limit");
        assert!(
            error.to_string().contains("full"),
            "unexpected failure: {error}"
        );
        assert_eq!(snapshot(&connection).await.0, before_schema);
        connection.close().await.expect("close SQLite");
    }
}

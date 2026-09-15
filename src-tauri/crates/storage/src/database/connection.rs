//! SQLite 连接与基础检查。
//!
//! 连接级 PRAGMA 配置到每条物理连接；持久 journal_mode 只在基线准入后设置。

use std::path::{Path, PathBuf};
use std::time::Duration;

use sea_orm::{
    sqlx::sqlite::{SqliteJournalMode, SqliteSynchronous},
    ConnectOptions, ConnectionTrait, Database, DatabaseConnection, DbBackend, Statement,
    TransactionTrait,
};

use crate::error::StorageError;

const DATABASE_FILE_NAME: &str = "stoneflow.sqlite3";
const SQLITE_BUSY_TIMEOUT: Duration = Duration::from_secs(5);

/// 解析 StoneFlow 本地数据库路径。
pub fn resolve_database_path(base_dir: &Path) -> PathBuf {
    base_dir.join(DATABASE_FILE_NAME)
}

/// 确保数据库父目录存在。
pub fn ensure_database_parent_dir(database_path: &Path) -> Result<(), StorageError> {
    if let Some(parent_dir) = database_path.parent() {
        std::fs::create_dir_all(parent_dir)?;
    }

    Ok(())
}

const SQLITE_MEMORY_URL: &str = "sqlite::memory:?cache=shared";

/// 创建 SQLite 连接并完成基础 PRAGMA 初始化。
pub async fn connect_sqlite(database_path: &Path) -> Result<DatabaseConnection, StorageError> {
    ensure_database_parent_dir(database_path)?;

    let database_url = format!("sqlite://{}?mode=rwc", database_path.to_string_lossy());
    connect_sqlite_with_options(&database_url, 5, SqliteJournalMode::Wal).await
}

/// 测试用文件库连接：单连接 + DELETE journal，便于 Windows 下释放文件锁。
pub async fn connect_sqlite_for_test(
    database_path: &Path,
) -> Result<DatabaseConnection, StorageError> {
    ensure_database_parent_dir(database_path)?;

    let database_url = format!("sqlite://{}?mode=rwc", database_path.to_string_lossy());
    connect_sqlite_with_options(&database_url, 1, SqliteJournalMode::Delete).await
}

/// 测试用内存库连接：不落盘，适合绝大多数集成/仓储测试。
pub async fn connect_sqlite_memory() -> Result<DatabaseConnection, StorageError> {
    connect_sqlite_with_options(SQLITE_MEMORY_URL, 5, SqliteJournalMode::Delete).await
}

async fn connect_sqlite_with_options(
    database_url: &str,
    max_connections: u32,
    journal_mode: SqliteJournalMode,
) -> Result<DatabaseConnection, StorageError> {
    let mut options = ConnectOptions::new(database_url);
    options.max_connections(max_connections);
    options.min_connections(1);
    options.acquire_timeout(Duration::from_secs(10));
    options.idle_timeout(Duration::from_secs(60));
    options.sqlx_logging(false);
    // 每条物理连接建立时生效，而不是只配置池里的第一条连接。
    options.map_sqlx_sqlite_opts(|opts| {
        opts.foreign_keys(true)
            .synchronous(SqliteSynchronous::Full)
            .busy_timeout(SQLITE_BUSY_TIMEOUT)
    });

    let connection = Database::connect(options)
        .await
        .map_err(StorageError::from)?;
    // 默认 DEFERRED 事务让 schema、ledger 与列读取处于同一快照，避免并发升级造成混读。
    let admission = connection.begin().await?;
    if let Err(error) = crate::migration::validate_database(&admission).await {
        admission.rollback().await?;
        connection.close().await?;
        return Err(StorageError::from(error));
    }
    admission.commit().await?;
    // WAL 是数据库持久模式；准入后设置，后续物理连接默认继承，不提前改旧库。
    connection
        .execute_raw(Statement::from_string(
            DbBackend::Sqlite,
            format!("PRAGMA journal_mode = {journal_mode:?}"),
        ))
        .await?;
    Ok(connection)
}

/// 执行最小 smoke query，确认连接可用。
pub async fn run_smoke_query(connection: &DatabaseConnection) -> Result<(), StorageError> {
    let result = connection
        .query_one_raw(Statement::from_string(
            DbBackend::Sqlite,
            "SELECT 1 AS healthcheck_value",
        ))
        .await?;

    if result.is_none() {
        return Err(StorageError::database("SQLite smoke query 未返回结果"));
    }

    Ok(())
}

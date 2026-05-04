//! SQLite 连接与基础检查。

use std::path::{Path, PathBuf};

use sea_orm::{
    ConnectOptions, ConnectionTrait, Database, DatabaseConnection, DbBackend, Statement,
};

use crate::app::error::AppError;

const DATABASE_FILE_NAME: &str = "stoneflow.sqlite3";

/// 解析 StoneFlow 本地数据库路径。
pub fn resolve_database_path(base_dir: &Path) -> PathBuf {
    base_dir.join(DATABASE_FILE_NAME)
}

/// 确保数据库父目录存在。
pub fn ensure_database_parent_dir(database_path: &Path) -> Result<(), AppError> {
    if let Some(parent_dir) = database_path.parent() {
        std::fs::create_dir_all(parent_dir)?;
    }

    Ok(())
}

/// 创建 SQLite 连接并完成基础 PRAGMA 初始化。
pub async fn connect_sqlite(database_path: &Path) -> Result<DatabaseConnection, AppError> {
    ensure_database_parent_dir(database_path)?;

    let mut options = ConnectOptions::new(format!(
        "sqlite://{}?mode=rwc",
        database_path.to_string_lossy()
    ));
    options.max_connections(5);
    options.min_connections(1);
    options.acquire_timeout(std::time::Duration::from_secs(10));
    options.idle_timeout(std::time::Duration::from_secs(60));
    options.sqlx_logging(false);

    let connection = Database::connect(options).await?;
    connection
        .execute_unprepared(
            r#"
            PRAGMA foreign_keys = ON;
            PRAGMA journal_mode = WAL;
            PRAGMA synchronous = NORMAL;
            "#,
        )
        .await?;

    Ok(connection)
}

/// 执行最小 smoke query，确认连接可用。
pub async fn run_smoke_query(connection: &DatabaseConnection) -> Result<(), AppError> {
    let result = connection
        .query_one(Statement::from_string(
            DbBackend::Sqlite,
            "SELECT 1 AS healthcheck_value",
        ))
        .await?;

    if result.is_none() {
        return Err(AppError::database("SQLite smoke query 未返回结果"));
    }

    Ok(())
}

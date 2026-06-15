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

    let applied_migrations = stoneflow_migration::run_migrations(&connection)
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

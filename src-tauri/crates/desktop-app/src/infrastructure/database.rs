//! 数据库连接、bootstrap 与共享状态。

use anyhow::{Context, Result};
use sea_orm::{ConnectOptions, Database, DatabaseConnection};
use serde::Serialize;
use stoneflow_migration::MigratorTrait;
use tauri::Manager;

use crate::infrastructure::seed::run_seed;

const APP_DATA_SUBDIR: &str = "stoneflow";
const APP_DB_NAME: &str = "app.db";

/// 供后续命令共享的数据库状态。
#[derive(Debug)]
pub(crate) struct DatabaseState {
    pub(crate) connection: DatabaseConnection,
    pub(crate) database_path: String,
    pub(crate) is_ready: bool,
}

impl DatabaseState {
    /// 返回当前健康状态载荷。
    pub(crate) fn payload(&self) -> DatabaseHealthcheckPayload {
        let _connection = &self.connection;

        DatabaseHealthcheckPayload {
            status: if self.is_ready { "ok" } else { "degraded" },
            app: "desktop-app",
            database_path: self.database_path.clone(),
            database_ready: self.is_ready,
        }
    }
}

/// 对外可见的数据库健康检查载荷。
#[derive(Debug, Clone, Serialize)]
pub(crate) struct DatabaseHealthcheckPayload {
    pub(crate) status: &'static str,
    pub(crate) app: &'static str,
    pub(crate) database_path: String,
    pub(crate) database_ready: bool,
}

fn resolve_database_path(app: &tauri::App) -> Result<std::path::PathBuf> {
    let base_dir = app
        .path()
        .app_data_dir()
        .context("failed to resolve tauri app data dir")?;

    Ok(base_dir.join(APP_DATA_SUBDIR).join(APP_DB_NAME))
}

async fn connect_database(database_path: &std::path::Path) -> Result<DatabaseConnection> {
    let sqlite_path = database_path.to_path_buf();
    let mut options = ConnectOptions::new("sqlite://stoneflow.db");
    options.sqlx_logging(false);
    options.map_sqlx_sqlite_opts(move |sqlite_options| {
        sqlite_options
            .filename(&sqlite_path)
            .create_if_missing(true)
    });

    Database::connect(options).await.with_context(|| {
        format!(
            "failed to connect sqlite database at {}",
            database_path.display()
        )
    })
}

/// 按 Tauri 应用路径初始化数据库。
pub(crate) async fn initialize_database(app: &tauri::App) -> Result<DatabaseState> {
    let database_path = resolve_database_path(app)?;
    prepare_database_at_path(&database_path).await
}

/// 在指定路径准备数据库，供测试与启动流程复用。
pub(crate) async fn prepare_database_at_path(
    database_path: &std::path::Path,
) -> Result<DatabaseState> {
    let database_dir = database_path
        .parent()
        .context("database path has no parent directory")?;

    std::fs::create_dir_all(database_dir).with_context(|| {
        format!(
            "failed to create database directory {}",
            database_dir.display()
        )
    })?;

    let connection = connect_database(database_path).await?;

    stoneflow_migration::Migrator::up(&connection, None)
        .await
        .with_context(|| format!("failed to run migrations for {}", database_path.display()))?;

    run_seed(&connection).await?;

    Ok(DatabaseState {
        connection,
        database_path: database_path.display().to_string(),
        is_ready: true,
    })
}

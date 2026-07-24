//! 云端副本：Postgres 适配器（唯一远端 IO）。
//!
//! 合并规则仍调用 `protocol::apply_mutation`；本模块只负责 SQL 与事务。

mod download;
mod error_map;
mod health;
mod labels;
mod schema;
mod upload;

pub use download::{download_after, download_full, DOWNLOAD_PAGE_SIZE};
pub use health::{diagnose, health};
pub use schema::{ensure_ready, PROTOCOL_SCHEMA_VERSION};
pub use upload::upload_operation;

#[cfg(test)]
#[path = "tests.rs"]
mod tests;

use sqlx::postgres::PgConnection;
use sqlx::Connection;

use crate::{SyncCloudConfig, SyncError};

use error_map::map_connect_error;

/// 短连接：每次上传/下载打开一条连接（P1 KISS；池化待证据）。
pub async fn connect(config: &SyncCloudConfig) -> Result<PgConnection, SyncError> {
    if config.database_url.trim().is_empty() {
        return Err(SyncError::validation("同步数据库连接串不能为空"));
    }
    // sqlx 不识别 Neon 的 channel_binding 参数，去掉以免噪音日志。
    let url = strip_unsupported_pg_params(&config.database_url);
    PgConnection::connect(&url).await.map_err(map_connect_error)
}

fn strip_unsupported_pg_params(url: &str) -> String {
    let Some((base, query)) = url.split_once('?') else {
        return url.to_owned();
    };
    let filtered: Vec<&str> = query
        .split('&')
        .filter(|pair| {
            let key = pair.split('=').next().unwrap_or("");
            !key.eq_ignore_ascii_case("channel_binding")
        })
        .collect();
    if filtered.is_empty() {
        base.to_owned()
    } else {
        format!("{base}?{}", filtered.join("&"))
    }
}

/// 连接并确保 schema 就绪。
pub async fn connect_ready(config: &SyncCloudConfig) -> Result<PgConnection, SyncError> {
    let mut conn = connect(config).await?;
    ensure_ready(&mut conn).await?;
    Ok(conn)
}

#[cfg(test)]
pub mod test_support {
    use std::env;

    use sqlx::postgres::PgConnection;
    use sqlx::Connection;
    use uuid::Uuid;

    use super::ensure_ready;
    use crate::{SyncCloudConfig, SyncError};

    /// 集成测数据库 URL（未配置则测试 `#[ignore]` 跳过）。
    pub fn base_database_url() -> Option<String> {
        env::var("STONEFLOW_SYNC_DATABASE_URL")
            .or_else(|_| env::var("DATABASE_URL"))
            .ok()
            .filter(|url| !url.trim().is_empty())
    }

    /// 在共享实例上建独立 schema，避免互相踩表。
    pub async fn open_isolated_cloud() -> Result<(SyncCloudConfig, String, String), SyncError> {
        let base = base_database_url().ok_or_else(|| {
            SyncError::internal(
                "集成测需要 STONEFLOW_SYNC_DATABASE_URL 或 DATABASE_URL（Postgres）",
            )
        })?;
        let schema = format!("sf_sync_{}", Uuid::new_v4().simple());
        let mut admin = PgConnection::connect(&base)
            .await
            .map_err(|error| SyncError::remote_database(format!("连接测试库失败: {error}")))?;
        // sqlx 0.9：非字面量 SQL 需 AssertSqlSafe 包装（schema 名由本机 UUID 生成）。
        let drop_sql = format!("DROP SCHEMA IF EXISTS \"{schema}\" CASCADE");
        sqlx::query(sqlx::AssertSqlSafe(drop_sql))
            .execute(&mut admin)
            .await
            .map_err(|error| {
                SyncError::remote_database(format!("清理测试 schema 失败: {error}"))
            })?;
        let create_sql = format!("CREATE SCHEMA \"{schema}\"");
        sqlx::query(sqlx::AssertSqlSafe(create_sql))
            .execute(&mut admin)
            .await
            .map_err(|error| {
                SyncError::remote_database(format!("创建测试 schema 失败: {error}"))
            })?;
        drop(admin);

        let separator = if base.contains('?') { '&' } else { '?' };
        let database_url = format!("{base}{separator}options=-csearch_path%3D{schema}");
        let config = SyncCloudConfig { database_url };
        let mut conn = super::connect(&config).await?;
        ensure_ready(&mut conn).await?;
        drop(conn);
        Ok((config, schema, base))
    }

    pub async fn drop_schema(base_url: &str, schema: &str) {
        if let Ok(mut admin) = PgConnection::connect(base_url).await {
            let drop_sql = format!("DROP SCHEMA IF EXISTS \"{schema}\" CASCADE");
            let _ = sqlx::query(sqlx::AssertSqlSafe(drop_sql))
                .execute(&mut admin)
                .await;
        }
    }
}

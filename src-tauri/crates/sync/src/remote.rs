//! Turso/libSQL 远端连接。

use libsql::{Builder, Connection};

use crate::{SyncError, SyncRemoteConfig};

pub async fn open_remote(remote_config: &SyncRemoteConfig) -> Result<Connection, SyncError> {
    let database = Builder::new_remote(remote_config.url.clone(), remote_config.token.clone())
        .build()
        .await
        .map_err(|error| SyncError::remote_database(format!("连接 Turso 远端失败: {error}")))?;

    database
        .connect()
        .map_err(|error| SyncError::remote_database(format!("连接 Turso 远端失败: {error}")))
}

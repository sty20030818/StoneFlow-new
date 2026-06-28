//! Turso 远端连接、表结构与 operation log 读写。

use std::path::Path;

use libsql::{params, Builder, Connection, Transaction};

use crate::{
    error::SyncWorkerError,
    schema::{REMOTE_SCHEMA_STATEMENTS, RemoteOperationRecord, SyncAction, SyncOperationPayload},
    types::SyncRemoteConfig,
};

pub async fn open_local_sqlite(database_path: &str) -> Result<Connection, SyncWorkerError> {
    let database = Builder::new_local(Path::new(database_path))
        .build()
        .await
        .map_err(|error| SyncWorkerError::local_database(format!("打开本地 SQLite 失败: {error}")))?;

    database
        .connect()
        .map_err(|error| SyncWorkerError::local_database(format!("连接本地 SQLite 失败: {error}")))
}

pub async fn open_remote(remote_config: &SyncRemoteConfig) -> Result<Connection, SyncWorkerError> {
    let database = Builder::new_remote(remote_config.url.clone(), remote_config.token.clone())
        .build()
        .await
        .map_err(map_remote_connect_error)?;

    database
        .connect()
        .map_err(|error| SyncWorkerError::remote_database(format!("连接 Turso 远端失败: {error}")))
}

pub async fn bootstrap_remote_schema(remote: &Connection) -> Result<(), SyncWorkerError> {
    for statement in REMOTE_SCHEMA_STATEMENTS {
        remote
            .execute(statement, params![])
            .await
            .map_err(|error| {
                SyncWorkerError::remote_database(format!(
                    "初始化 Turso 远端表结构失败: {error}"
                ))
            })?;
    }

    Ok(())
}

pub async fn insert_operation_if_absent(
    transaction: &Transaction,
    operation: &RemoteOperationRecord,
) -> Result<bool, SyncWorkerError> {
    let payload = serde_json::to_string(&operation.payload)
        .map_err(|error| SyncWorkerError::serialization(format!("序列化 sync payload 失败: {error}")))?;
    let changed = transaction
        .execute(
            r#"
            INSERT OR IGNORE INTO sync_operations(
                op_id, device_id, entity_type, entity_id, action, payload, committed_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            "#,
            params![
                operation.op_id.clone(),
                operation.device_id.clone(),
                operation.entity_type.clone(),
                operation.entity_id.clone(),
                operation.action.as_str(),
                payload,
                operation.committed_at.clone(),
            ],
        )
        .await
        .map_err(|error| SyncWorkerError::remote_database(format!("写入远端 sync_operations 失败: {error}")))?;

    Ok(changed > 0)
}

pub async fn fetch_operations_after(
    remote: &Connection,
    after_remote_cursor: Option<i64>,
    limit: i64,
) -> Result<Vec<RemoteOperationRecord>, SyncWorkerError> {
    let mut rows = remote
        .query(
            r#"
            SELECT remote_cursor, op_id, device_id, entity_type, entity_id, action, payload, committed_at
            FROM sync_operations
            WHERE (?1 IS NULL OR remote_cursor > ?1)
            ORDER BY remote_cursor ASC
            LIMIT ?2
            "#,
            params![after_remote_cursor, limit],
        )
        .await
        .map_err(|error| SyncWorkerError::remote_database(format!("读取远端 sync_operations 失败: {error}")))?;
    let mut operations = Vec::new();

    while let Some(row) = rows
        .next()
        .await
        .map_err(|error| SyncWorkerError::remote_database(format!("遍历远端 sync_operations 失败: {error}")))?
    {
        let action = match row
            .get::<String>(5)
            .map_err(|error| SyncWorkerError::remote_database(format!("读取远端 operation.action 失败: {error}")))?
            .as_str()
        {
            "upsert" => SyncAction::Upsert,
            "delete" => SyncAction::Delete,
            other => {
                return Err(SyncWorkerError::protocol(format!(
                    "远端 sync_operations.action 非法: {other}"
                )));
            }
        };
        let payload_raw = row
            .get::<String>(6)
            .map_err(|error| SyncWorkerError::remote_database(format!("读取远端 operation.payload 失败: {error}")))?;
        let payload = serde_json::from_str::<SyncOperationPayload>(&payload_raw)
            .map_err(|error| SyncWorkerError::serialization(format!("解析远端 sync payload 失败: {error}")))?;
        operations.push(RemoteOperationRecord {
            remote_cursor: row
                .get::<i64>(0)
                .map_err(|error| SyncWorkerError::remote_database(format!("读取远端 operation.remote_cursor 失败: {error}")))?,
            op_id: row
                .get::<String>(1)
                .map_err(|error| SyncWorkerError::remote_database(format!("读取远端 operation.op_id 失败: {error}")))?,
            device_id: row
                .get::<String>(2)
                .map_err(|error| SyncWorkerError::remote_database(format!("读取远端 operation.device_id 失败: {error}")))?,
            entity_type: row
                .get::<String>(3)
                .map_err(|error| SyncWorkerError::remote_database(format!("读取远端 operation.entity_type 失败: {error}")))?,
            entity_id: row
                .get::<String>(4)
                .map_err(|error| SyncWorkerError::remote_database(format!("读取远端 operation.entity_id 失败: {error}")))?,
            action,
            payload,
            committed_at: row
                .get::<String>(7)
                .map_err(|error| SyncWorkerError::remote_database(format!("读取远端 operation.committed_at 失败: {error}")))?,
        });
    }

    Ok(operations)
}

fn map_remote_connect_error(error: libsql::Error) -> SyncWorkerError {
    let message = error.to_string();
    if message.contains("401 Unauthorized") || message.contains("invalid JWT token") {
        return SyncWorkerError::authentication(
            "Turso 鉴权失败，请确认当前保存的 token 是该数据库对应的 auth token。",
        );
    }

    SyncWorkerError::remote_database(format!("初始化 Turso 远端连接失败: {message}"))
}

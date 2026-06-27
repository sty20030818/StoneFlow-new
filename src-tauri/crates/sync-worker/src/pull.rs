//! 远端 operation log -> 本地 SQLite 回放。

use libsql::{params, Connection};
use stoneflow_domain::now_utc;

use crate::{
    apply::apply_operation_to_local,
    error::SyncWorkerError,
    push::get_or_create_device_id,
    remote::fetch_operations_after,
    schema::{PULL_BATCH_SIZE, REMOTE_CURSOR_SCOPE},
};

pub async fn pull_remote_changes(local: &Connection, remote: &Connection) -> Result<(), SyncWorkerError> {
    let device_id = get_or_create_device_id(local).await?;

    loop {
        let after_remote_cursor = read_remote_cursor(local).await?;
        let operations = fetch_operations_after(remote, after_remote_cursor, PULL_BATCH_SIZE).await?;
        if operations.is_empty() {
            break;
        }

        let Some(last_operation) = operations.last() else {
            return Err(SyncWorkerError::internal(
                "pull batch 为空时不应进入 cursor 更新分支",
            ));
        };
        let last_remote_cursor = last_operation.remote_cursor;
        let transaction = local
            .transaction()
            .await
            .map_err(|error| SyncWorkerError::internal(format!("开启本地 pull 事务失败: {error}")))?;

        for operation in &operations {
            if operation.device_id == device_id {
                continue;
            }
            apply_operation_to_local(&transaction, operation).await?;
        }

        transaction
            .execute(
                r#"
                INSERT INTO sync_cursor(scope, cursor, updated_at)
                VALUES (?1, ?2, ?3)
                ON CONFLICT(scope) DO UPDATE SET
                    cursor = excluded.cursor,
                    updated_at = excluded.updated_at
                "#,
                params![
                    REMOTE_CURSOR_SCOPE.to_owned(),
                    last_remote_cursor.to_string(),
                    now_utc().to_rfc3339(),
                ],
            )
            .await
            .map_err(|error| SyncWorkerError::internal(format!("更新本地 remote cursor 失败: {error}")))?;
        transaction
            .commit()
            .await
            .map_err(|error| SyncWorkerError::internal(format!("提交本地 pull 事务失败: {error}")))?;
    }

    Ok(())
}

async fn read_remote_cursor(local: &Connection) -> Result<Option<i64>, SyncWorkerError> {
    let mut rows = local
        .query(
            "SELECT cursor FROM sync_cursor WHERE scope = ?1 LIMIT 1",
            params![REMOTE_CURSOR_SCOPE.to_owned()],
        )
        .await
        .map_err(|error| SyncWorkerError::internal(format!("读取 remote cursor 失败: {error}")))?;
    let row = rows
        .next()
        .await
        .map_err(|error| SyncWorkerError::internal(format!("遍历 remote cursor 失败: {error}")))?;
    let Some(row) = row else {
        return Ok(None);
    };
    let raw = row
        .get::<Option<String>>(0)
        .map_err(|error| SyncWorkerError::internal(format!("读取 remote cursor 值失败: {error}")))?;
    raw.map(|value| {
        value
            .parse::<i64>()
            .map_err(|error| SyncWorkerError::internal(format!("解析 remote cursor 失败: {error}")))
    })
    .transpose()
}

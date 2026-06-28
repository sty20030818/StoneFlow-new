//! 远端 operation log -> 本地 SQLite 回放。

use libsql::Connection;

use crate::{
    apply::apply_operation_to_local,
    error::SyncWorkerError,
    local::{get_or_create_device_id, read_remote_cursor, write_remote_cursor},
    remote::fetch_operations_after,
    schema::PULL_BATCH_SIZE,
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
            return Err(SyncWorkerError::protocol(
                "pull batch 为空时不应进入 cursor 更新分支",
            ));
        };
        let last_remote_cursor = last_operation.remote_cursor;
        let transaction = local
            .transaction()
            .await
            .map_err(|error| SyncWorkerError::local_database(format!("开启本地 pull 事务失败: {error}")))?;

        for operation in &operations {
            if operation.device_id == device_id {
                continue;
            }
            apply_operation_to_local(&transaction, operation).await?;
        }

        transaction
            .commit()
            .await
            .map_err(|error| SyncWorkerError::local_database(format!("提交本地 pull 事务失败: {error}")))?;
        write_remote_cursor(local, last_remote_cursor).await?;
    }

    Ok(())
}

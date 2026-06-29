//! 本地 SQLite 同步元数据读写与 restore 清理。

use libsql::{params, Connection, Transaction};
use stoneflow_domain::{create_id, now_utc};

use crate::{
    error::SyncWorkerError,
    schema::{
        DEVICE_ID_SCOPE, HARD_DELETE_CURSOR_SCOPE, HardDeleteCursor, HardDeleteEventRecord,
        LAST_RESTORE_AT_SCOPE, LocalMutationRecord, LocalOutboxRecord, REMOTE_CURSOR_SCOPE,
        SERVER_SEQ_CURSOR_SCOPE,
    },
};

const SYNC_CONFIG_SETTING_KEY: &str = "app.sync.config";

pub async fn get_or_create_device_id(local: &Connection) -> Result<String, SyncWorkerError> {
    if let Some(device_id) = read_text_cursor(local, DEVICE_ID_SCOPE).await? {
        return Ok(device_id);
    }

    let device_id = create_id().to_string();
    write_text_cursor(local, DEVICE_ID_SCOPE, Some(&device_id)).await?;
    Ok(device_id)
}

pub async fn list_pushable_outbox(
    local: &Connection,
    limit: u64,
) -> Result<Vec<LocalOutboxRecord>, SyncWorkerError> {
    let mut rows = local
        .query(
            r#"
            SELECT id, entity_type, action, payload, created_at, updated_at
            FROM sync_outbox
            WHERE status IN ('pending', 'failed')
            ORDER BY created_at ASC, id ASC
            LIMIT ?1
            "#,
            params![limit as i64],
        )
        .await
        .map_err(|error| SyncWorkerError::local_database(format!("读取本地 sync_outbox 失败: {error}")))?;
    let mut records = Vec::new();

    while let Some(row) = rows
        .next()
        .await
        .map_err(|error| SyncWorkerError::local_database(format!("遍历本地 sync_outbox 失败: {error}")))?
    {
        records.push(LocalOutboxRecord {
            op_id: row.get::<String>(0).map_err(read_local_column_error("sync_outbox.id"))?,
            entity_type: row
                .get::<String>(1)
                .map_err(read_local_column_error("sync_outbox.entity_type"))?,
            action: row
                .get::<String>(2)
                .map_err(read_local_column_error("sync_outbox.action"))?,
            payload: row
                .get::<String>(3)
                .map_err(read_local_column_error("sync_outbox.payload"))?,
            created_at: row
                .get::<String>(4)
                .map_err(read_local_column_error("sync_outbox.created_at"))?,
            updated_at: row
                .get::<String>(5)
                .map_err(read_local_column_error("sync_outbox.updated_at"))?,
        });
    }

    Ok(records)
}

pub async fn list_pending_mutations(
    local: &Connection,
    limit: u64,
) -> Result<Vec<LocalMutationRecord>, SyncWorkerError> {
    let mut rows = local
        .query(
            r#"
            SELECT client_id, client_seq, entity_type, entity_id, operation, payload, created_at, updated_at
            FROM sync_mutations
            WHERE status = 'pending'
            ORDER BY client_id ASC, client_seq ASC
            LIMIT ?1
            "#,
            params![limit as i64],
        )
        .await
        .map_err(|error| SyncWorkerError::local_database(format!("读取本地 sync_mutations 失败: {error}")))?;
    let mut records = Vec::new();

    while let Some(row) = rows
        .next()
        .await
        .map_err(|error| SyncWorkerError::local_database(format!("遍历本地 sync_mutations 失败: {error}")))?
    {
        records.push(LocalMutationRecord {
            client_id: row
                .get::<String>(0)
                .map_err(read_local_column_error("sync_mutations.client_id"))?,
            client_seq: row
                .get::<i64>(1)
                .map_err(read_local_column_error("sync_mutations.client_seq"))?,
            entity_type: row
                .get::<String>(2)
                .map_err(read_local_column_error("sync_mutations.entity_type"))?,
            entity_id: row
                .get::<String>(3)
                .map_err(read_local_column_error("sync_mutations.entity_id"))?,
            operation: row
                .get::<String>(4)
                .map_err(read_local_column_error("sync_mutations.operation"))?,
            payload: row
                .get::<String>(5)
                .map_err(read_local_column_error("sync_mutations.payload"))?,
            created_at: row
                .get::<String>(6)
                .map_err(read_local_column_error("sync_mutations.created_at"))?,
            updated_at: row
                .get::<String>(7)
                .map_err(read_local_column_error("sync_mutations.updated_at"))?,
        });
    }

    Ok(records)
}

pub async fn mark_mutations_acked(
    local: &Connection,
    batch: &[LocalMutationRecord],
) -> Result<(), SyncWorkerError> {
    let transaction = local
        .transaction()
        .await
        .map_err(|error| SyncWorkerError::local_database(format!("开启本地 mutation ack 事务失败: {error}")))?;
    let now = now_utc().to_rfc3339();

    for record in batch {
        transaction
            .execute(
                r#"
                UPDATE sync_mutations
                SET status = 'acked', error_message = NULL, updated_at = ?1
                WHERE client_id = ?2 AND client_seq = ?3
                "#,
                params![now.clone(), record.client_id.clone(), record.client_seq],
            )
            .await
            .map_err(|error| SyncWorkerError::local_database(format!("更新本地 sync_mutations 状态失败: {error}")))?;
    }

    transaction
        .commit()
        .await
        .map_err(|error| SyncWorkerError::local_database(format!("提交本地 mutation ack 事务失败: {error}")))?;
    Ok(())
}

pub async fn mark_outbox_records_synced(
    local: &Connection,
    batch: &[LocalOutboxRecord],
) -> Result<(), SyncWorkerError> {
    let transaction = local
        .transaction()
        .await
        .map_err(|error| SyncWorkerError::local_database(format!("开启本地 outbox 更新事务失败: {error}")))?;
    let now = now_utc().to_rfc3339();

    for record in batch {
        transaction
            .execute(
                r#"
                UPDATE sync_outbox
                SET status = 'synced', error_message = NULL, updated_at = ?1
                WHERE id = ?2
                "#,
                params![now.clone(), record.op_id.clone()],
            )
            .await
            .map_err(|error| SyncWorkerError::local_database(format!("更新本地 sync_outbox 状态失败: {error}")))?;
    }

    transaction
        .commit()
        .await
        .map_err(|error| SyncWorkerError::local_database(format!("提交本地 outbox 更新事务失败: {error}")))?;
    Ok(())
}

pub async fn list_hard_delete_events(
    local: &Connection,
    limit: i64,
) -> Result<Vec<HardDeleteEventRecord>, SyncWorkerError> {
    let cursor = read_hard_delete_cursor(local).await?;
    let mut rows = local
        .query(
            r#"
            SELECT id, entity_type, entity_id, metadata, created_at
            FROM activity_events
            WHERE action IN ('task.permanently_deleted', 'project.permanently_deleted', 'space.permanently_deleted')
              AND (
                ?1 IS NULL
                OR created_at > ?1
                OR (created_at = ?1 AND id > ?2)
              )
            ORDER BY created_at ASC, id ASC
            LIMIT ?3
            "#,
            params![
                cursor.as_ref().map(|cursor| cursor.created_at.clone()),
                cursor.as_ref().map(|cursor| cursor.event_id.clone()),
                limit,
            ],
        )
        .await
        .map_err(|error| SyncWorkerError::local_database(format!("读取永久删除事件失败: {error}")))?;
    let mut events = Vec::new();

    while let Some(row) = rows
        .next()
        .await
        .map_err(|error| SyncWorkerError::local_database(format!("遍历永久删除事件失败: {error}")))?
    {
        events.push(HardDeleteEventRecord {
            id: row
                .get::<String>(0)
                .map_err(read_local_column_error("activity_events.id"))?,
            entity_type: row
                .get::<String>(1)
                .map_err(read_local_column_error("activity_events.entity_type"))?,
            entity_id: row
                .get::<String>(2)
                .map_err(read_local_column_error("activity_events.entity_id"))?,
            metadata: row
                .get::<Option<String>>(3)
                .map_err(read_local_column_error("activity_events.metadata"))?,
            created_at: row
                .get::<String>(4)
                .map_err(read_local_column_error("activity_events.created_at"))?,
        });
    }

    Ok(events)
}

pub async fn advance_hard_delete_cursor(
    local: &Connection,
    event: &HardDeleteEventRecord,
) -> Result<(), SyncWorkerError> {
    let cursor = serde_json::to_string(&HardDeleteCursor {
        created_at: event.created_at.clone(),
        event_id: event.id.clone(),
    })
    .map_err(|error| SyncWorkerError::serialization(format!("序列化 hard delete cursor 失败: {error}")))?;
    write_text_cursor(local, HARD_DELETE_CURSOR_SCOPE, Some(&cursor)).await
}

pub async fn read_remote_cursor(local: &Connection) -> Result<Option<i64>, SyncWorkerError> {
    let Some(raw) = read_text_cursor(local, REMOTE_CURSOR_SCOPE).await? else {
        return Ok(None);
    };

    raw.parse::<i64>()
        .map(Some)
        .map_err(|error| SyncWorkerError::serialization(format!("解析 remote cursor 失败: {error}")))
}

pub async fn write_remote_cursor(
    local: &Connection,
    remote_cursor: i64,
) -> Result<(), SyncWorkerError> {
    write_text_cursor(local, REMOTE_CURSOR_SCOPE, Some(&remote_cursor.to_string())).await
}

pub async fn read_server_seq_cursor(local: &Connection) -> Result<Option<i64>, SyncWorkerError> {
    let Some(raw) = read_text_cursor(local, SERVER_SEQ_CURSOR_SCOPE).await? else {
        return Ok(None);
    };

    raw.parse::<i64>()
        .map(Some)
        .map_err(|error| SyncWorkerError::serialization(format!("解析 server_seq cursor 失败: {error}")))
}

pub async fn write_server_seq_cursor_in_transaction(
    transaction: &Transaction,
    server_seq: i64,
) -> Result<(), SyncWorkerError> {
    write_text_cursor_in_transaction(
        transaction,
        SERVER_SEQ_CURSOR_SCOPE,
        Some(&server_seq.to_string()),
    )
    .await
}

pub async fn upsert_sync_shadow(
    transaction: &Transaction,
    entity_type: &str,
    entity_id: &str,
    server_seq: i64,
    snapshot: &str,
    deleted_at: Option<&str>,
    updated_at: &str,
) -> Result<(), SyncWorkerError> {
    transaction
        .execute(
            r#"
            INSERT INTO sync_shadow(entity_type, entity_id, server_seq, snapshot, deleted_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)
            ON CONFLICT(entity_type, entity_id) DO UPDATE SET
                server_seq = excluded.server_seq,
                snapshot = excluded.snapshot,
                deleted_at = excluded.deleted_at,
                updated_at = excluded.updated_at
            "#,
            params![
                entity_type.to_owned(),
                entity_id.to_owned(),
                server_seq,
                snapshot.to_owned(),
                deleted_at.map(str::to_owned),
                updated_at.to_owned(),
            ],
        )
        .await
        .map_err(|error| SyncWorkerError::local_database(format!("写入 sync_shadow 失败: {error}")))?;
    Ok(())
}

pub async fn delete_sync_shadow(
    transaction: &Transaction,
    entity_type: &str,
    entity_id: &str,
) -> Result<(), SyncWorkerError> {
    transaction
        .execute(
            "DELETE FROM sync_shadow WHERE entity_type = ?1 AND entity_id = ?2",
            params![entity_type.to_owned(), entity_id.to_owned()],
        )
        .await
        .map_err(|error| SyncWorkerError::local_database(format!("删除 sync_shadow 失败: {error}")))?;
    Ok(())
}

pub async fn reset_local_replica_for_restore(
    transaction: &Transaction,
) -> Result<(), SyncWorkerError> {
    // restore 会用远端当前镜像重建本地工作副本，因此先清空所有可重建业务表和同步元数据。
    let statements = [
        "DELETE FROM task_links",
        "DELETE FROM tasks",
        "DELETE FROM projects",
        "DELETE FROM views",
        "DELETE FROM activity_changes",
        "DELETE FROM activity_events",
        "DELETE FROM sync_outbox",
        "DELETE FROM settings WHERE key <> ?1",
        "DELETE FROM spaces",
        "DELETE FROM sync_cursor WHERE scope <> ?1",
    ];

    for statement in &statements[..7] {
        transaction
            .execute(statement, params![])
            .await
            .map_err(|error| {
                SyncWorkerError::local_database(format!("清空本地 restore 副本失败: {error}"))
            })?;
    }

    transaction
        .execute(statements[7], params![SYNC_CONFIG_SETTING_KEY])
        .await
        .map_err(|error| {
            SyncWorkerError::local_database(format!("清空本地 restore settings 失败: {error}"))
        })?;
    transaction
        .execute(statements[8], params![])
        .await
        .map_err(|error| {
            SyncWorkerError::local_database(format!("清空本地 restore spaces 失败: {error}"))
        })?;
    transaction
        .execute(statements[9], params![DEVICE_ID_SCOPE])
        .await
        .map_err(|error| {
            SyncWorkerError::local_database(format!("清空本地 restore cursor 失败: {error}"))
        })?;

    Ok(())
}

pub async fn write_restore_markers(
    transaction: &Transaction,
    remote_cursor: i64,
    restored_at: &str,
) -> Result<(), SyncWorkerError> {
    write_text_cursor_in_transaction(
        transaction,
        REMOTE_CURSOR_SCOPE,
        Some(&remote_cursor.to_string()),
    )
    .await?;
    write_text_cursor_in_transaction(transaction, LAST_RESTORE_AT_SCOPE, Some(restored_at)).await
}

async fn read_hard_delete_cursor(
    local: &Connection,
) -> Result<Option<HardDeleteCursor>, SyncWorkerError> {
    let Some(raw) = read_text_cursor(local, HARD_DELETE_CURSOR_SCOPE).await? else {
        return Ok(None);
    };
    serde_json::from_str::<HardDeleteCursor>(&raw)
        .map(Some)
        .map_err(|error| SyncWorkerError::serialization(format!("解析 hard delete cursor 失败: {error}")))
}

async fn read_text_cursor(
    local: &Connection,
    scope: &str,
) -> Result<Option<String>, SyncWorkerError> {
    let mut rows = local
        .query(
            "SELECT cursor FROM sync_cursor WHERE scope = ?1 LIMIT 1",
            params![scope.to_owned()],
        )
        .await
        .map_err(|error| SyncWorkerError::local_database(format!("读取 sync_cursor 失败: {error}")))?;
    let row = rows
        .next()
        .await
        .map_err(|error| SyncWorkerError::local_database(format!("遍历 sync_cursor 失败: {error}")))?;

    row.map(|row| {
        row.get::<Option<String>>(0)
            .map_err(read_local_column_error("sync_cursor.cursor"))
    })
    .transpose()
    .map(Option::flatten)
}

async fn write_text_cursor(
    local: &Connection,
    scope: &str,
    cursor: Option<&str>,
) -> Result<(), SyncWorkerError> {
    local
        .execute(
            r#"
            INSERT INTO sync_cursor(scope, cursor, updated_at)
            VALUES (?1, ?2, ?3)
            ON CONFLICT(scope) DO UPDATE SET
                cursor = excluded.cursor,
                updated_at = excluded.updated_at
            "#,
            params![scope.to_owned(), cursor.map(str::to_owned), now_utc().to_rfc3339()],
        )
        .await
        .map_err(|error| SyncWorkerError::local_database(format!("写入 sync_cursor 失败: {error}")))?;
    Ok(())
}

async fn write_text_cursor_in_transaction(
    transaction: &Transaction,
    scope: &str,
    cursor: Option<&str>,
) -> Result<(), SyncWorkerError> {
    transaction
        .execute(
            r#"
            INSERT INTO sync_cursor(scope, cursor, updated_at)
            VALUES (?1, ?2, ?3)
            ON CONFLICT(scope) DO UPDATE SET
                cursor = excluded.cursor,
                updated_at = excluded.updated_at
            "#,
            params![scope.to_owned(), cursor.map(str::to_owned), now_utc().to_rfc3339()],
        )
        .await
        .map_err(|error| SyncWorkerError::local_database(format!("写入 sync_cursor 失败: {error}")))?;
    Ok(())
}

fn read_local_column_error(column: &'static str) -> impl FnOnce(libsql::Error) -> SyncWorkerError {
    move |error| SyncWorkerError::local_database(format!("读取 {column} 失败: {error}"))
}

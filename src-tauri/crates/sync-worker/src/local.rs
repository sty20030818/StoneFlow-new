//! 本地 SQLite 同步元数据读写。

use libsql::{params, Connection};
use stoneflow_domain::{create_id, now_utc};

use crate::{
    error::SyncWorkerError,
    schema::{
        DEVICE_ID_SCOPE, HARD_DELETE_CURSOR_SCOPE, HardDeleteCursor, HardDeleteEventRecord,
        LocalOutboxRecord, REMOTE_CURSOR_SCOPE,
    },
};

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

fn read_local_column_error(column: &'static str) -> impl FnOnce(libsql::Error) -> SyncWorkerError {
    move |error| SyncWorkerError::local_database(format!("读取 {column} 失败: {error}"))
}

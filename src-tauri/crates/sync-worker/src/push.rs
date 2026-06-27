//! 本地 outbox / hard-delete tombstone -> 远端 operation log。

use libsql::{params, Connection};
use serde_json::Value;
use stoneflow_domain::{create_id, now_utc};

use crate::{
    apply::apply_operation_to_remote,
    error::SyncWorkerError,
    remote::insert_operation_if_absent,
    schema::{
        DEVICE_ID_SCOPE, HARD_DELETE_CURSOR_SCOPE, HardDeleteCursor, HardDeleteEventRecord,
        HardDeletePayload, LocalOutboxRecord, ProjectPayload, PUSH_BATCH_SIZE, SettingPayload,
        SpacePayload, SyncAction, SyncOperationPayload, TaskLinkPayload, TaskPayload,
        ViewPayload,
    },
};

pub async fn push_local_changes(local: &Connection, remote: &Connection) -> Result<(), SyncWorkerError> {
    let device_id = get_or_create_device_id(local).await?;

    loop {
        let batch = list_pushable_outbox(local, PUSH_BATCH_SIZE).await?;
        if batch.is_empty() {
            break;
        }

        let operations = batch
            .iter()
            .map(|record| normalize_outbox_record(record, &device_id))
            .collect::<Result<Vec<_>, _>>()?;
        let remote_tx = remote
            .transaction()
            .await
            .map_err(|error| SyncWorkerError::internal(format!("开启远端 push 事务失败: {error}")))?;

        for operation in &operations {
            let inserted = insert_operation_if_absent(&remote_tx, operation).await?;
            if inserted {
                apply_operation_to_remote(&remote_tx, operation).await?;
            }
        }

        remote_tx
            .commit()
            .await
            .map_err(|error| SyncWorkerError::internal(format!("提交远端 push 事务失败: {error}")))?;
        mark_outbox_records_synced(local, &batch).await?;
    }

    push_hard_delete_events(local, remote, &device_id).await
}

async fn push_hard_delete_events(
    local: &Connection,
    remote: &Connection,
    device_id: &str,
) -> Result<(), SyncWorkerError> {
    loop {
        let cursor = read_hard_delete_cursor(local).await?;
        let events = list_hard_delete_events(local, cursor.as_ref(), PUSH_BATCH_SIZE as i64).await?;
        if events.is_empty() {
            break;
        }

        let operations = events
            .iter()
            .map(|event| normalize_hard_delete_event(event, device_id))
            .collect::<Result<Vec<_>, _>>()?;
        let remote_tx = remote.transaction().await.map_err(|error| {
            SyncWorkerError::internal(format!("开启远端 hard delete 事务失败: {error}"))
        })?;

        for operation in &operations {
            let inserted = insert_operation_if_absent(&remote_tx, operation).await?;
            if inserted {
                apply_operation_to_remote(&remote_tx, operation).await?;
            }
        }

        remote_tx.commit().await.map_err(|error| {
            SyncWorkerError::internal(format!("提交远端 hard delete 事务失败: {error}"))
        })?;
        let Some(last) = events.last() else {
            return Err(SyncWorkerError::internal(
                "hard delete batch 为空时不应进入写 cursor 分支",
            ));
        };
        write_cursor(
            local,
            HARD_DELETE_CURSOR_SCOPE,
            Some(&serde_json::to_string(&HardDeleteCursor {
                created_at: last.created_at.clone(),
                event_id: last.id.clone(),
            })
            .map_err(|error| {
                SyncWorkerError::internal(format!("序列化 hard delete cursor 失败: {error}"))
            })?),
        )
        .await?;
    }

    Ok(())
}

fn normalize_outbox_record(
    record: &LocalOutboxRecord,
    device_id: &str,
) -> Result<crate::schema::RemoteOperationRecord, SyncWorkerError> {
    let value = serde_json::from_str::<Value>(&record.payload)
        .map_err(|error| SyncWorkerError::internal(format!("解析本地 outbox payload 失败: {error}")))?;
    let payload = match record.entity_type.as_str() {
        "space" => SyncOperationPayload::Space {
            snapshot: serde_json::from_value::<SpacePayload>(value)
                .map_err(|error| SyncWorkerError::internal(format!("解析 Space sync payload 失败: {error}")))?,
        },
        "project" => SyncOperationPayload::Project {
            snapshot: serde_json::from_value::<ProjectPayload>(value).map_err(|error| {
                SyncWorkerError::internal(format!("解析 Project sync payload 失败: {error}"))
            })?,
        },
        "view" => SyncOperationPayload::View {
            snapshot: serde_json::from_value::<ViewPayload>(value)
                .map_err(|error| SyncWorkerError::internal(format!("解析 View sync payload 失败: {error}")))?,
        },
        "setting" => SyncOperationPayload::Setting {
            snapshot: serde_json::from_value::<SettingPayload>(value).map_err(|error| {
                SyncWorkerError::internal(format!("解析 Setting sync payload 失败: {error}"))
            })?,
        },
        "task" => {
            if value.get("task_id").is_some() {
                SyncOperationPayload::TaskLink {
                    snapshot: serde_json::from_value::<TaskLinkPayload>(value).map_err(|error| {
                        SyncWorkerError::internal(format!("解析 TaskLink sync payload 失败: {error}"))
                    })?,
                }
            } else {
                SyncOperationPayload::Task {
                    snapshot: serde_json::from_value::<TaskPayload>(value).map_err(|error| {
                        SyncWorkerError::internal(format!("解析 Task sync payload 失败: {error}"))
                    })?,
                }
            }
        }
        other => {
            return Err(SyncWorkerError::internal(format!(
                "未知的本地 outbox entity_type: {other}"
            )))
        }
    };
    let action = match record.action.as_str() {
        "upsert" => SyncAction::Upsert,
        "delete" => SyncAction::Delete,
        other => {
            return Err(SyncWorkerError::internal(format!(
                "未知的本地 outbox action: {other}"
            )))
        }
    };

    Ok(crate::schema::RemoteOperationRecord {
        remote_cursor: 0,
        op_id: record.op_id.clone(),
        device_id: device_id.to_owned(),
        entity_type: payload.entity_type().to_owned(),
        entity_id: payload.entity_id().to_owned(),
        action,
        payload,
        committed_at: record.updated_at.clone(),
    })
}

fn normalize_hard_delete_event(
    event: &HardDeleteEventRecord,
    device_id: &str,
) -> Result<crate::schema::RemoteOperationRecord, SyncWorkerError> {
    let metadata = event
        .metadata
        .as_deref()
        .map(serde_json::from_str::<Value>)
        .transpose()
        .map_err(|error| SyncWorkerError::internal(format!("解析 hard delete metadata 失败: {error}")))?;

    Ok(crate::schema::RemoteOperationRecord {
        remote_cursor: 0,
        op_id: event.id.clone(),
        device_id: device_id.to_owned(),
        entity_type: event.entity_type.clone(),
        entity_id: event.entity_id.clone(),
        action: SyncAction::Delete,
        payload: SyncOperationPayload::HardDelete {
            target: HardDeletePayload {
                entity_type: event.entity_type.clone(),
                entity_id: event.entity_id.clone(),
                deleted_at: event.created_at.clone(),
                metadata,
            },
        },
        committed_at: event.created_at.clone(),
    })
}

pub async fn get_or_create_device_id(local: &Connection) -> Result<String, SyncWorkerError> {
    if let Some(device_id) = read_cursor(local, DEVICE_ID_SCOPE).await? {
        return Ok(device_id);
    }

    let device_id = create_id().to_string();
    write_cursor(local, DEVICE_ID_SCOPE, Some(&device_id)).await?;
    Ok(device_id)
}

async fn list_pushable_outbox(local: &Connection, limit: u64) -> Result<Vec<LocalOutboxRecord>, SyncWorkerError> {
    let mut rows = local
        .query(
            r#"
            SELECT id, entity_type, entity_id, action, payload, status, error_message,
                   attempt_count, created_at, updated_at
            FROM sync_outbox
            WHERE status IN ('pending', 'failed')
            ORDER BY created_at ASC, id ASC
            LIMIT ?1
            "#,
            params![limit as i64],
        )
        .await
        .map_err(|error| SyncWorkerError::internal(format!("读取本地 sync_outbox 失败: {error}")))?;
    let mut records = Vec::new();

    while let Some(row) = rows
        .next()
        .await
        .map_err(|error| SyncWorkerError::internal(format!("遍历本地 sync_outbox 失败: {error}")))?
    {
        records.push(LocalOutboxRecord {
            op_id: row.get::<String>(0).map_err(read_error("sync_outbox.id"))?,
            entity_type: row.get::<String>(1).map_err(read_error("sync_outbox.entity_type"))?,
            entity_id: row.get::<String>(2).map_err(read_error("sync_outbox.entity_id"))?,
            action: row.get::<String>(3).map_err(read_error("sync_outbox.action"))?,
            payload: row.get::<String>(4).map_err(read_error("sync_outbox.payload"))?,
            status: row.get::<String>(5).map_err(read_error("sync_outbox.status"))?,
            error_message: row.get::<Option<String>>(6).map_err(read_error("sync_outbox.error_message"))?,
            attempt_count: row.get::<i64>(7).map_err(read_error("sync_outbox.attempt_count"))?,
            created_at: row.get::<String>(8).map_err(read_error("sync_outbox.created_at"))?,
            updated_at: row.get::<String>(9).map_err(read_error("sync_outbox.updated_at"))?,
        });
    }

    Ok(records)
}

async fn mark_outbox_records_synced(local: &Connection, batch: &[LocalOutboxRecord]) -> Result<(), SyncWorkerError> {
    let transaction = local
        .transaction()
        .await
        .map_err(|error| SyncWorkerError::internal(format!("开启本地 outbox 更新事务失败: {error}")))?;
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
            .map_err(|error| SyncWorkerError::internal(format!("更新本地 sync_outbox 状态失败: {error}")))?;
    }

    transaction
        .commit()
        .await
        .map_err(|error| SyncWorkerError::internal(format!("提交本地 outbox 更新事务失败: {error}")))?;
    Ok(())
}

async fn list_hard_delete_events(
    local: &Connection,
    cursor: Option<&HardDeleteCursor>,
    limit: i64,
) -> Result<Vec<HardDeleteEventRecord>, SyncWorkerError> {
    let mut rows = local
        .query(
            r#"
            SELECT id, entity_type, entity_id, action, metadata, created_at
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
                cursor.map(|cursor| cursor.created_at.clone()),
                cursor.map(|cursor| cursor.event_id.clone()),
                limit,
            ],
        )
        .await
        .map_err(|error| SyncWorkerError::internal(format!("读取永久删除事件失败: {error}")))?;
    let mut events = Vec::new();

    while let Some(row) = rows
        .next()
        .await
        .map_err(|error| SyncWorkerError::internal(format!("遍历永久删除事件失败: {error}")))?
    {
        events.push(HardDeleteEventRecord {
            id: row.get::<String>(0).map_err(read_error("activity_events.id"))?,
            entity_type: row.get::<String>(1).map_err(read_error("activity_events.entity_type"))?,
            entity_id: row.get::<String>(2).map_err(read_error("activity_events.entity_id"))?,
            action: row.get::<String>(3).map_err(read_error("activity_events.action"))?,
            metadata: row.get::<Option<String>>(4).map_err(read_error("activity_events.metadata"))?,
            created_at: row.get::<String>(5).map_err(read_error("activity_events.created_at"))?,
        });
    }

    Ok(events)
}

async fn read_hard_delete_cursor(local: &Connection) -> Result<Option<HardDeleteCursor>, SyncWorkerError> {
    let Some(raw) = read_cursor(local, HARD_DELETE_CURSOR_SCOPE).await? else {
        return Ok(None);
    };
    serde_json::from_str::<HardDeleteCursor>(&raw)
        .map(Some)
        .map_err(|error| SyncWorkerError::internal(format!("解析 hard delete cursor 失败: {error}")))
}

pub async fn read_cursor(local: &Connection, scope: &str) -> Result<Option<String>, SyncWorkerError> {
    let mut rows = local
        .query(
            "SELECT cursor FROM sync_cursor WHERE scope = ?1 LIMIT 1",
            params![scope.to_owned()],
        )
        .await
        .map_err(|error| SyncWorkerError::internal(format!("读取 sync_cursor 失败: {error}")))?;
    let row = rows
        .next()
        .await
        .map_err(|error| SyncWorkerError::internal(format!("遍历 sync_cursor 失败: {error}")))?;

    row.map(|row| row.get::<Option<String>>(0).map_err(read_error("sync_cursor.cursor")))
        .transpose()
        .map(Option::flatten)
}

pub async fn write_cursor(
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
        .map_err(|error| SyncWorkerError::internal(format!("写入 sync_cursor 失败: {error}")))?;
    Ok(())
}

fn read_error(column: &'static str) -> impl FnOnce(libsql::Error) -> SyncWorkerError {
    move |error| SyncWorkerError::internal(format!("读取 {column} 失败: {error}"))
}

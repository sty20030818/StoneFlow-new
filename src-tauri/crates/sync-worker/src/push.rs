//! 本地 outbox / hard-delete tombstone -> 远端 operation log。

use libsql::Connection;
use serde_json::Value;

use crate::{
    apply::apply_operation_to_remote,
    error::SyncWorkerError,
    local::{
        advance_hard_delete_cursor, get_or_create_device_id, list_hard_delete_events,
        list_pushable_outbox, mark_outbox_records_synced,
    },
    remote::insert_operation_if_absent,
    schema::{
        HardDeleteEventRecord, HardDeletePayload, LocalOutboxRecord, ProjectPayload,
        PUSH_BATCH_SIZE, SettingPayload, SpacePayload, SyncAction, SyncOperationPayload,
        TaskLinkPayload, TaskPayload, ViewPayload,
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
            .map_err(|error| SyncWorkerError::remote_database(format!("开启远端 push 事务失败: {error}")))?;

        for operation in &operations {
            let inserted = insert_operation_if_absent(&remote_tx, operation).await?;
            if inserted {
                apply_operation_to_remote(&remote_tx, operation).await?;
            }
        }

        remote_tx
            .commit()
            .await
            .map_err(|error| SyncWorkerError::remote_database(format!("提交远端 push 事务失败: {error}")))?;
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
        let events = list_hard_delete_events(local, PUSH_BATCH_SIZE as i64).await?;
        if events.is_empty() {
            break;
        }

        let operations = events
            .iter()
            .map(|event| normalize_hard_delete_event(event, device_id))
            .collect::<Result<Vec<_>, _>>()?;
        let remote_tx = remote.transaction().await.map_err(|error| {
            SyncWorkerError::remote_database(format!("开启远端 hard delete 事务失败: {error}"))
        })?;

        for operation in &operations {
            let inserted = insert_operation_if_absent(&remote_tx, operation).await?;
            if inserted {
                apply_operation_to_remote(&remote_tx, operation).await?;
            }
        }

        remote_tx.commit().await.map_err(|error| {
            SyncWorkerError::remote_database(format!("提交远端 hard delete 事务失败: {error}"))
        })?;
        let Some(last) = events.last() else {
            return Err(SyncWorkerError::protocol(
                "hard delete batch 为空时不应进入写 cursor 分支",
            ));
        };
        advance_hard_delete_cursor(local, last).await?;
    }

    Ok(())
}

fn normalize_outbox_record(
    record: &LocalOutboxRecord,
    device_id: &str,
) -> Result<crate::schema::RemoteOperationRecord, SyncWorkerError> {
    let value = serde_json::from_str::<Value>(&record.payload)
        .map_err(|error| SyncWorkerError::serialization(format!("解析本地 outbox payload 失败: {error}")))?;
    let payload = match record.entity_type.as_str() {
        "space" => SyncOperationPayload::Space {
            snapshot: serde_json::from_value::<SpacePayload>(value)
                .map_err(|error| SyncWorkerError::serialization(format!("解析 Space sync payload 失败: {error}")))?,
        },
        "project" => SyncOperationPayload::Project {
            snapshot: serde_json::from_value::<ProjectPayload>(value).map_err(|error| {
                SyncWorkerError::serialization(format!("解析 Project sync payload 失败: {error}"))
            })?,
        },
        "view" => SyncOperationPayload::View {
            snapshot: serde_json::from_value::<ViewPayload>(value)
                .map_err(|error| SyncWorkerError::serialization(format!("解析 View sync payload 失败: {error}")))?,
        },
        "setting" => SyncOperationPayload::Setting {
            snapshot: serde_json::from_value::<SettingPayload>(value).map_err(|error| {
                SyncWorkerError::serialization(format!("解析 Setting sync payload 失败: {error}"))
            })?,
        },
        "task" => {
            if value.get("task_id").is_some() {
                SyncOperationPayload::TaskLink {
                    snapshot: serde_json::from_value::<TaskLinkPayload>(value).map_err(|error| {
                        SyncWorkerError::serialization(format!("解析 TaskLink sync payload 失败: {error}"))
                    })?,
                }
            } else {
                SyncOperationPayload::Task {
                    snapshot: serde_json::from_value::<TaskPayload>(value).map_err(|error| {
                        SyncWorkerError::serialization(format!("解析 Task sync payload 失败: {error}"))
                    })?,
                }
            }
        }
        other => {
            return Err(SyncWorkerError::protocol(format!(
                "未知的本地 outbox entity_type: {other}"
            )))
        }
    };
    let action = match record.action.as_str() {
        "upsert" => SyncAction::Upsert,
        "delete" => SyncAction::Delete,
        other => {
            return Err(SyncWorkerError::protocol(format!(
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
        .map_err(|error| SyncWorkerError::serialization(format!("解析 hard delete metadata 失败: {error}")))?;

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

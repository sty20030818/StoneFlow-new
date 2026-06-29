//! 本地 outbox / hard-delete tombstone -> 远端 operation log。

use libsql::Connection;
use serde_json::Value;

use crate::{
    apply::apply_operation_to_remote,
    error::SyncWorkerError,
    local::{
        advance_hard_delete_cursor, get_or_create_device_id, list_hard_delete_events,
        list_pending_mutations, list_pushable_outbox, mark_mutations_acked,
        mark_outbox_records_synced,
    },
    remote::{find_remote_mutation_ack, insert_operation_if_absent, insert_v2_change_and_ack},
    schema::{
        HardDeleteEventRecord, HardDeletePayload, LocalMutationRecord, LocalOutboxRecord,
        ProjectPayload, PUSH_BATCH_SIZE, RemoteChangeKind, RemoteOperationRecord, SettingPayload,
        SpacePayload, SyncAction, SyncOperationPayload, TaskLinkPayload, TaskPayload, ViewPayload,
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

pub async fn push_v2_local_changes(local: &Connection, remote: &Connection) -> Result<(), SyncWorkerError> {
    loop {
        let batch = list_pending_mutations(local, PUSH_BATCH_SIZE).await?;
        if batch.is_empty() {
            break;
        }

        let remote_tx = remote
            .transaction()
            .await
            .map_err(|error| SyncWorkerError::remote_database(format!("开启远端 V2 push 事务失败: {error}")))?;

        for mutation in &batch {
            if find_remote_mutation_ack(&remote_tx, &mutation.client_id, mutation.client_seq)
                .await?
                .is_some()
            {
                continue;
            }

            let (operation, change_kind, patch) = normalize_mutation_record(mutation)?;
            apply_operation_to_remote(&remote_tx, &operation).await?;
            insert_v2_change_and_ack(&remote_tx, mutation, change_kind, patch.as_ref()).await?;
        }

        remote_tx
            .commit()
            .await
            .map_err(|error| SyncWorkerError::remote_database(format!("提交远端 V2 push 事务失败: {error}")))?;
        mark_mutations_acked(local, &batch).await?;
    }

    Ok(())
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

fn normalize_mutation_record(
    record: &LocalMutationRecord,
) -> Result<(RemoteOperationRecord, RemoteChangeKind, Option<SyncOperationPayload>), SyncWorkerError> {
    let payload = if record.operation == "hard_delete" {
        None
    } else {
        Some(parse_mutation_payload(record)?)
    };
    let change_kind = match record.operation.as_str() {
        "upsert" => RemoteChangeKind::Upsert,
        "soft_delete" => RemoteChangeKind::SoftDelete,
        "restore" => RemoteChangeKind::Restore,
        "hard_delete" => RemoteChangeKind::HardDelete,
        other => {
            return Err(SyncWorkerError::protocol(format!(
                "未知的本地 mutation operation: {other}"
            )))
        }
    };
    let operation_payload = payload.clone().unwrap_or_else(|| {
        SyncOperationPayload::HardDelete {
            target: HardDeletePayload {
                entity_type: record.entity_type.clone(),
                entity_id: record.entity_id.clone(),
                deleted_at: record.updated_at.clone(),
                metadata: None,
            },
        }
    });
    let action = match change_kind {
        RemoteChangeKind::Upsert | RemoteChangeKind::Restore => SyncAction::Upsert,
        RemoteChangeKind::SoftDelete | RemoteChangeKind::HardDelete => SyncAction::Delete,
        RemoteChangeKind::ConflictNotice => unreachable!(),
    };

    Ok((
        RemoteOperationRecord {
            remote_cursor: 0,
            op_id: format!("{}:{}", record.client_id, record.client_seq),
            device_id: record.client_id.clone(),
            entity_type: record.entity_type.clone(),
            entity_id: record.entity_id.clone(),
            action,
            payload: operation_payload,
            committed_at: record.updated_at.clone(),
        },
        change_kind,
        payload,
    ))
}

fn parse_mutation_payload(record: &LocalMutationRecord) -> Result<SyncOperationPayload, SyncWorkerError> {
    let value = serde_json::from_str::<Value>(&record.payload)
        .map_err(|error| SyncWorkerError::serialization(format!("解析本地 mutation payload 失败: {error}")))?;

    match record.entity_type.as_str() {
        "space" => Ok(SyncOperationPayload::Space {
            snapshot: serde_json::from_value::<SpacePayload>(value)
                .map_err(|error| SyncWorkerError::serialization(format!("解析 Space mutation payload 失败: {error}")))?,
        }),
        "project" => Ok(SyncOperationPayload::Project {
            snapshot: serde_json::from_value::<ProjectPayload>(value).map_err(|error| {
                SyncWorkerError::serialization(format!("解析 Project mutation payload 失败: {error}"))
            })?,
        }),
        "view" => Ok(SyncOperationPayload::View {
            snapshot: serde_json::from_value::<ViewPayload>(value)
                .map_err(|error| SyncWorkerError::serialization(format!("解析 View mutation payload 失败: {error}")))?,
        }),
        "setting" => Ok(SyncOperationPayload::Setting {
            snapshot: serde_json::from_value::<SettingPayload>(value).map_err(|error| {
                SyncWorkerError::serialization(format!("解析 Setting mutation payload 失败: {error}"))
            })?,
        }),
        "task" => Ok(SyncOperationPayload::Task {
            snapshot: serde_json::from_value::<TaskPayload>(value)
                .map_err(|error| SyncWorkerError::serialization(format!("解析 Task mutation payload 失败: {error}")))?,
        }),
        "task_link" => Ok(SyncOperationPayload::TaskLink {
            snapshot: serde_json::from_value::<TaskLinkPayload>(value).map_err(|error| {
                SyncWorkerError::serialization(format!("解析 TaskLink mutation payload 失败: {error}"))
            })?,
        }),
        other => Err(SyncWorkerError::protocol(format!(
            "未知的本地 mutation entity_type: {other}"
        ))),
    }
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

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use libsql::{params, Builder, Connection};
    use tempfile::TempDir;

    use super::push_v2_local_changes;
    use crate::remote::bootstrap_remote_schema;

    #[tokio::test]
    async fn push_v2_local_changes_should_write_canonical_log_ack_and_mark_local_acked() {
        let (_local_dir, local) = open_test_connection("local-v2-push").await;
        let (_remote_dir, remote) = open_test_connection("remote-v2-push").await;
        bootstrap_local_schema(&local).await;
        bootstrap_remote_schema(&remote)
            .await
            .expect("remote schema should bootstrap");
        local
            .execute(
                r#"
                INSERT INTO sync_mutations(
                    client_id, client_seq, entity_type, entity_id, operation, payload,
                    base_server_seq, status, error_message, created_at, updated_at
                )
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL, 'pending', NULL, ?7, ?8)
                "#,
                params![
                    "client-a",
                    1,
                    "setting",
                    "app.theme",
                    "upsert",
                    r#"{"key":"app.theme","raw_value":"\"dark\"","updated_at":"2026-06-29T10:00:00Z"}"#,
                    "2026-06-29T10:00:00Z",
                    "2026-06-29T10:00:00Z",
                ],
            )
            .await
            .expect("local mutation should insert");

        push_v2_local_changes(&local, &remote)
            .await
            .expect("v2 push should succeed");

        let remote_setting = read_text(&remote, "SELECT value FROM settings WHERE key = 'app.theme'")
            .await
            .expect("remote setting should exist");
        let change_kind = read_text(&remote, "SELECT change_kind FROM remote_change_log WHERE server_seq = 1")
            .await
            .expect("remote change should exist");
        let ack_status = read_text(&remote, "SELECT status FROM remote_mutations WHERE client_id = 'client-a' AND client_seq = 1")
            .await
            .expect("remote ack should exist");
        let local_status = read_text(&local, "SELECT status FROM sync_mutations WHERE client_id = 'client-a' AND client_seq = 1")
            .await
            .expect("local mutation should exist");

        assert_eq!(remote_setting, "\"dark\"");
        assert_eq!(change_kind, "upsert");
        assert_eq!(ack_status, "applied");
        assert_eq!(local_status, "acked");
    }

    async fn open_test_connection(name: &str) -> (TempDir, Connection) {
        let temp_dir = tempfile::tempdir().expect("temp dir should be created");
        let path = temp_dir.path().join(format!("{name}.db"));
        let database = Builder::new_local(PathBuf::from(path))
            .build()
            .await
            .expect("test database should build");
        let connection = database
            .connect()
            .expect("test database should connect");

        (temp_dir, connection)
    }

    async fn bootstrap_local_schema(connection: &Connection) {
        connection
            .execute(
                r#"
                CREATE TABLE sync_mutations (
                    client_id TEXT NOT NULL,
                    client_seq INTEGER NOT NULL,
                    entity_type TEXT NOT NULL,
                    entity_id TEXT NOT NULL,
                    operation TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    base_server_seq INTEGER NULL,
                    status TEXT NOT NULL,
                    error_message TEXT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    PRIMARY KEY (client_id, client_seq)
                )
                "#,
                params![],
            )
            .await
            .expect("local sync_mutations table should create");
    }

    async fn read_text(connection: &Connection, sql: &str) -> Option<String> {
        let mut rows = connection
            .query(sql, params![])
            .await
            .expect("query should run");
        rows.next()
            .await
            .expect("row iteration should succeed")
            .map(|row| row.get::<String>(0).expect("column should be string"))
    }
}

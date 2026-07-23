//! R7 operation 到远端协议数据面的原子提交。

use libsql::{params, Connection, Transaction};

use crate::{
    apply_mutation, ApplyOutcome, EntityIdentity, EntitySnapshot, LifecycleState, ReplicaEntity,
    SyncError, SyncMutation, SyncOperation, Tombstone,
};

/// 远端 operation 提交结果。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PushResult {
    pub committed_seq: i64,
    pub was_already_applied: bool,
}

/// 原子提交一个本地 operation。
///
/// 同一 `(device_id, operation_id)` 重试只返回首次提交的 sequence，不会重复写 change log。
pub async fn submit_operation(
    remote: &Connection,
    operation: &SyncOperation,
) -> Result<PushResult, SyncError> {
    match submit_operation_once(remote, operation).await {
        Ok(result) => Ok(result),
        Err(error) if is_duplicate_operation_error(&error) => {
            let committed_seq = find_applied_operation_on_remote(remote, operation)
                .await?
                .ok_or(error)?;
            Ok(PushResult {
                committed_seq,
                was_already_applied: true,
            })
        }
        Err(error) => Err(error),
    }
}

async fn submit_operation_once(
    remote: &Connection,
    operation: &SyncOperation,
) -> Result<PushResult, SyncError> {
    if operation.mutations.is_empty() {
        return Err(SyncError::validation(
            "同步 operation 至少需要一个 mutation",
        ));
    }

    let transaction = remote
        .transaction()
        .await
        .map_err(remote_error("开启 R7 push 事务"))?;
    if let Some(committed_seq) = find_applied_operation(&transaction, operation).await? {
        transaction
            .commit()
            .await
            .map_err(remote_error("提交 R7 幂等读取事务"))?;
        return Ok(PushResult {
            committed_seq,
            was_already_applied: true,
        });
    }

    let mut committed_seq = 0;
    for mutation in &operation.mutations {
        let server_seq = reserve_change(&transaction, operation, mutation).await?;
        let mutation = assign_tombstone_sequence(mutation, server_seq);
        let mut replica = load_replica(&transaction, mutation.entity()).await?;
        if apply_mutation(&mut replica, &mutation, server_seq) == ApplyOutcome::IgnoredByTombstone {
            return Err(SyncError::protocol(format!(
                "entity-gone: {}:{} generation={}",
                entity_kind_label(mutation.entity()),
                mutation.entity().entity_id,
                mutation.entity().generation
            )));
        }
        persist_replica(&transaction, mutation.entity(), &replica).await?;
        write_change_payload(&transaction, server_seq, &mutation).await?;
        committed_seq = server_seq;
    }

    transaction
        .execute(
            r#"
            INSERT INTO sync_applied_operations(device_id, operation_id, committed_seq, committed_at)
            VALUES (?1, ?2, ?3, ?4)
            "#,
            params![
                operation.device_id.clone(),
                operation.operation_id.clone(),
                committed_seq,
                operation.created_at.clone(),
            ],
        )
        .await
        .map_err(remote_error("写入 R7 operation 幂等记录"))?;
    transaction
        .commit()
        .await
        .map_err(remote_error("提交 R7 push 事务"))?;

    Ok(PushResult {
        committed_seq,
        was_already_applied: false,
    })
}

async fn find_applied_operation(
    transaction: &Transaction,
    operation: &SyncOperation,
) -> Result<Option<i64>, SyncError> {
    let mut rows = transaction
        .query(
            "SELECT committed_seq FROM sync_applied_operations WHERE device_id = ?1 AND operation_id = ?2",
            params![operation.device_id.clone(), operation.operation_id.clone()],
        )
        .await
        .map_err(remote_error("查询 R7 operation 幂等记录"))?;
    rows.next()
        .await
        .map_err(remote_error("遍历 R7 operation 幂等记录"))?
        .map(|row| {
            row.get::<i64>(0)
                .map_err(remote_error("读取 R7 operation sequence"))
        })
        .transpose()
}

async fn find_applied_operation_on_remote(
    remote: &Connection,
    operation: &SyncOperation,
) -> Result<Option<i64>, SyncError> {
    let mut rows = remote
        .query(
            "SELECT committed_seq FROM sync_applied_operations WHERE device_id = ?1 AND operation_id = ?2",
            params![operation.device_id.clone(), operation.operation_id.clone()],
        )
        .await
        .map_err(remote_error("并发重试时查询 R7 operation 幂等记录"))?;
    rows.next()
        .await
        .map_err(remote_error("并发重试时遍历 R7 operation 幂等记录"))?
        .map(|row| {
            row.get::<i64>(0)
                .map_err(remote_error("并发重试时读取 R7 operation sequence"))
        })
        .transpose()
}

fn is_duplicate_operation_error(error: &SyncError) -> bool {
    if error.kind() != crate::SyncErrorKind::RemoteDatabase {
        return false;
    }
    let message = error.message().to_ascii_lowercase();
    message.contains("sync_applied_operations")
        && (message.contains("unique") || message.contains("constraint"))
}

async fn reserve_change(
    transaction: &Transaction,
    operation: &SyncOperation,
    mutation: &SyncMutation,
) -> Result<i64, SyncError> {
    let entity = mutation.entity();
    transaction
        .execute(
            r#"
            INSERT INTO sync_change_log(
                device_id, operation_id, entity_type, entity_id, generation, mutation_kind, payload_json, committed_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, '{}', ?7)
            "#,
            params![
                operation.device_id.clone(),
                operation.operation_id.clone(),
                entity_kind_label(entity),
                entity.entity_id.clone(),
                entity.generation,
                mutation_kind_label(mutation),
                operation.created_at.clone(),
            ],
        )
        .await
        .map_err(remote_error("预留 R7 change sequence"))?;
    let mut rows = transaction
        .query("SELECT last_insert_rowid()", params![])
        .await
        .map_err(remote_error("读取 R7 change sequence"))?;
    rows.next()
        .await
        .map_err(remote_error("遍历 R7 change sequence"))?
        .ok_or_else(|| SyncError::remote_database("R7 change sequence 缺少结果行"))?
        .get::<i64>(0)
        .map_err(remote_error("读取 R7 change sequence"))
}

fn assign_tombstone_sequence(mutation: &SyncMutation, server_seq: i64) -> SyncMutation {
    match mutation {
        SyncMutation::Tombstone { tombstone } => SyncMutation::Tombstone {
            tombstone: Tombstone {
                entity: tombstone.entity.clone(),
                deletion_seq: server_seq,
                deleted_at: tombstone.deleted_at.clone(),
            },
        },
        _ => mutation.clone(),
    }
}

async fn load_replica(
    transaction: &Transaction,
    entity: &EntityIdentity,
) -> Result<ReplicaEntity, SyncError> {
    Ok(ReplicaEntity {
        snapshot: load_snapshot(transaction, entity).await?,
        tombstone: load_tombstone(transaction, entity).await?,
    })
}

async fn load_snapshot(
    transaction: &Transaction,
    entity: &EntityIdentity,
) -> Result<Option<EntitySnapshot>, SyncError> {
    let mut rows = transaction
        .query(
            r#"
            SELECT generation, fields_json, field_versions_json, lifecycle_state, lifecycle_seq, updated_seq
            FROM sync_entity_snapshots
            WHERE entity_type = ?1 AND entity_id = ?2
            ORDER BY generation DESC
            LIMIT 1
            "#,
            params![entity_kind_label(entity), entity.entity_id.clone()],
        )
        .await
        .map_err(remote_error("读取 R7 entity snapshot"))?;
    let Some(row) = rows
        .next()
        .await
        .map_err(remote_error("遍历 R7 entity snapshot"))?
    else {
        return Ok(None);
    };
    let generation = row
        .get::<i64>(0)
        .map_err(remote_error("读取 R7 snapshot generation"))?;
    let fields = parse_json(
        row.get::<String>(1)
            .map_err(remote_error("读取 R7 snapshot fields"))?,
        "R7 snapshot fields",
    )?;
    let field_sequences = parse_json(
        row.get::<String>(2)
            .map_err(remote_error("读取 R7 field versions"))?,
        "R7 field versions",
    )?;
    let lifecycle = parse_lifecycle(
        &row.get::<String>(3)
            .map_err(remote_error("读取 R7 lifecycle"))?,
    )?;
    Ok(Some(EntitySnapshot {
        entity: EntityIdentity {
            generation,
            ..entity.clone()
        },
        fields,
        field_sequences,
        lifecycle,
        lifecycle_seq: row
            .get::<i64>(4)
            .map_err(remote_error("读取 R7 lifecycle sequence"))?,
        updated_seq: row
            .get::<i64>(5)
            .map_err(remote_error("读取 R7 updated sequence"))?,
    }))
}

async fn load_tombstone(
    transaction: &Transaction,
    entity: &EntityIdentity,
) -> Result<Option<Tombstone>, SyncError> {
    let mut rows = transaction
        .query(
            r#"
            SELECT generation, deletion_seq, deleted_at
            FROM sync_tombstones
            WHERE entity_type = ?1 AND entity_id = ?2
            ORDER BY generation DESC
            LIMIT 1
            "#,
            params![entity_kind_label(entity), entity.entity_id.clone()],
        )
        .await
        .map_err(remote_error("读取 R7 tombstone"))?;
    let Some(row) = rows
        .next()
        .await
        .map_err(remote_error("遍历 R7 tombstone"))?
    else {
        return Ok(None);
    };
    Ok(Some(Tombstone {
        entity: EntityIdentity {
            generation: row
                .get::<i64>(0)
                .map_err(remote_error("读取 R7 tombstone generation"))?,
            ..entity.clone()
        },
        deletion_seq: row
            .get::<i64>(1)
            .map_err(remote_error("读取 R7 tombstone sequence"))?,
        deleted_at: row
            .get::<String>(2)
            .map_err(remote_error("读取 R7 tombstone time"))?,
    }))
}

async fn persist_replica(
    transaction: &Transaction,
    entity: &EntityIdentity,
    replica: &ReplicaEntity,
) -> Result<(), SyncError> {
    if let Some(snapshot) = &replica.snapshot {
        transaction.execute(
            r#"
            INSERT INTO sync_entity_snapshots(
                entity_type, entity_id, generation, fields_json, field_versions_json, lifecycle_state, lifecycle_seq, updated_seq
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
            ON CONFLICT(entity_type, entity_id, generation) DO UPDATE SET
                fields_json = excluded.fields_json,
                field_versions_json = excluded.field_versions_json,
                lifecycle_state = excluded.lifecycle_state,
                lifecycle_seq = excluded.lifecycle_seq,
                updated_seq = excluded.updated_seq
            "#,
            params![entity_kind_label(&snapshot.entity), snapshot.entity.entity_id.clone(), snapshot.entity.generation,
                serialize_json(&snapshot.fields, "R7 snapshot fields")?, serialize_json(&snapshot.field_sequences, "R7 field versions")?,
                lifecycle_label(snapshot.lifecycle), snapshot.lifecycle_seq, snapshot.updated_seq],
        ).await.map_err(remote_error("写入 R7 entity snapshot"))?;
    }
    if let Some(tombstone) = &replica.tombstone {
        transaction.execute(
            r#"
            INSERT INTO sync_tombstones(entity_type, entity_id, generation, deletion_seq, deleted_at)
            VALUES (?1, ?2, ?3, ?4, ?5)
            ON CONFLICT(entity_type, entity_id, generation) DO UPDATE SET
                deletion_seq = excluded.deletion_seq, deleted_at = excluded.deleted_at
            "#,
            params![entity_kind_label(&tombstone.entity), tombstone.entity.entity_id.clone(), tombstone.entity.generation, tombstone.deletion_seq, tombstone.deleted_at.clone()],
        ).await.map_err(remote_error("写入 R7 tombstone"))?;
        transaction
            .execute(
                "DELETE FROM sync_entity_snapshots WHERE entity_type = ?1 AND entity_id = ?2",
                params![entity_kind_label(entity), entity.entity_id.clone()],
            )
            .await
            .map_err(remote_error("删除 R7 tombstoned snapshot"))?;
    }
    Ok(())
}

async fn write_change_payload(
    transaction: &Transaction,
    server_seq: i64,
    mutation: &SyncMutation,
) -> Result<(), SyncError> {
    transaction
        .execute(
            "UPDATE sync_change_log SET payload_json = ?1 WHERE server_seq = ?2",
            params![serialize_json(mutation, "R7 change payload")?, server_seq],
        )
        .await
        .map_err(remote_error("写入 R7 change payload"))?;
    Ok(())
}

fn parse_json<T: serde::de::DeserializeOwned>(raw: String, label: &str) -> Result<T, SyncError> {
    serde_json::from_str(&raw)
        .map_err(|error| SyncError::serialization(format!("解析 {label} 失败: {error}")))
}

fn serialize_json(value: &impl serde::Serialize, label: &str) -> Result<String, SyncError> {
    serde_json::to_string(value)
        .map_err(|error| SyncError::serialization(format!("序列化 {label} 失败: {error}")))
}

fn entity_kind_label(entity: &EntityIdentity) -> &'static str {
    match entity.entity_type {
        crate::SyncEntityKind::Space => "space",
        crate::SyncEntityKind::Project => "project",
        crate::SyncEntityKind::Task => "task",
        crate::SyncEntityKind::TaskLink => "task_link",
        crate::SyncEntityKind::View => "view",
    }
}

fn mutation_kind_label(mutation: &SyncMutation) -> &'static str {
    match mutation {
        SyncMutation::Patch { .. } => "patch",
        SyncMutation::Lifecycle { .. } => "lifecycle",
        SyncMutation::Tombstone { .. } => "tombstone",
    }
}

fn lifecycle_label(state: LifecycleState) -> &'static str {
    match state {
        LifecycleState::Active => "active",
        LifecycleState::Archived => "archived",
        LifecycleState::Trashed => "trashed",
    }
}

fn parse_lifecycle(value: &str) -> Result<LifecycleState, SyncError> {
    match value {
        "active" => Ok(LifecycleState::Active),
        "archived" => Ok(LifecycleState::Archived),
        "trashed" => Ok(LifecycleState::Trashed),
        _ => Err(SyncError::protocol(format!(
            "未知 R7 lifecycle state: {value}"
        ))),
    }
}

fn remote_error(action: &'static str) -> impl FnOnce(libsql::Error) -> SyncError {
    move |error| SyncError::remote_database(format!("{action}失败: {error}"))
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use libsql::{params, Builder, Connection};
    use serde_json::json;
    use tempfile::TempDir;

    use super::submit_operation;
    use crate::{
        bootstrap_protocol_schema, EntityIdentity, EntityPatch, SyncEntityKind, SyncMutation,
        SyncOperation, Tombstone,
    };

    #[tokio::test]
    async fn submit_operation_should_ack_retries_without_duplicate_changes() {
        let (_directory, remote) = open_remote().await;
        let operation = operation("operation-1", patch(&[("title", json!("A"))]));

        let first = submit_operation(&remote, &operation)
            .await
            .expect("first submit should succeed");
        let retry = submit_operation(&remote, &operation)
            .await
            .expect("retry should succeed");

        assert!(!first.was_already_applied);
        assert!(retry.was_already_applied);
        assert_eq!(first.committed_seq, retry.committed_seq);
        assert_eq!(count(&remote, "sync_change_log").await, 1);
    }

    #[tokio::test]
    async fn submit_operation_should_converge_concurrent_retries_to_one_change() {
        let (_directory, first_remote, second_remote) = open_remote_connections().await;
        let operation = operation("operation-1", patch(&[("title", json!("A"))]));

        let (first, second) = tokio::join!(
            submit_operation(&first_remote, &operation),
            submit_operation(&second_remote, &operation)
        );
        let first = first.expect("first concurrent submit should succeed");
        let second = second.expect("second concurrent submit should succeed");

        assert_eq!(first.committed_seq, second.committed_seq);
        assert!(first.was_already_applied || second.was_already_applied);
        assert_eq!(count(&first_remote, "sync_change_log").await, 1);
    }

    #[tokio::test]
    async fn submit_operation_should_merge_different_fields() {
        let (_directory, remote) = open_remote().await;
        submit_operation(
            &remote,
            &operation("operation-title", patch(&[("title", json!("A"))])),
        )
        .await
        .expect("title should submit");
        submit_operation(
            &remote,
            &operation("operation-priority", patch(&[("priority", json!(2))])),
        )
        .await
        .expect("priority should submit");

        let fields = read_text(&remote, "SELECT fields_json FROM sync_entity_snapshots")
            .await
            .expect("snapshot should exist");
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(&fields).expect("fields should parse"),
            json!({"priority": 2, "title": "A"})
        );
    }

    #[tokio::test]
    async fn submit_operation_should_reject_patch_after_tombstone() {
        let (_directory, remote) = open_remote().await;
        let entity = entity();
        submit_operation(
            &remote,
            &operation(
                "operation-delete",
                SyncMutation::Tombstone {
                    tombstone: Tombstone {
                        entity: entity.clone(),
                        deletion_seq: 0,
                        deleted_at: "2026-07-23T00:00:00Z".to_owned(),
                    },
                },
            ),
        )
        .await
        .expect("tombstone should submit");

        let error = submit_operation(
            &remote,
            &operation("operation-stale", patch(&[("title", json!("old"))])),
        )
        .await
        .expect_err("stale patch should fail");

        assert!(error.message().contains("entity-gone"));
        assert_eq!(count(&remote, "sync_change_log").await, 1);
    }

    fn entity() -> EntityIdentity {
        EntityIdentity {
            entity_type: SyncEntityKind::Task,
            entity_id: "task-1".to_owned(),
            generation: 1,
        }
    }

    fn patch(values: &[(&str, serde_json::Value)]) -> SyncMutation {
        SyncMutation::Patch {
            patch: EntityPatch {
                entity: entity(),
                fields: values
                    .iter()
                    .map(|(key, value)| ((*key).to_owned(), value.clone()))
                    .collect::<BTreeMap<_, _>>(),
            },
        }
    }

    fn operation(operation_id: &str, mutation: SyncMutation) -> SyncOperation {
        SyncOperation {
            device_id: "device-1".to_owned(),
            operation_id: operation_id.to_owned(),
            mutations: vec![mutation],
            created_at: "2026-07-23T00:00:00Z".to_owned(),
        }
    }

    async fn open_remote() -> (TempDir, Connection) {
        let directory = tempfile::tempdir().expect("temporary directory should create");
        let database = Builder::new_local(directory.path().join("remote.db"))
            .build()
            .await
            .expect("remote database should build");
        let remote = database.connect().expect("remote database should connect");
        bootstrap_protocol_schema(&remote)
            .await
            .expect("remote schema should bootstrap");
        (directory, remote)
    }

    async fn open_remote_connections() -> (TempDir, Connection, Connection) {
        let directory = tempfile::tempdir().expect("temporary directory should create");
        let database = Builder::new_local(directory.path().join("remote.db"))
            .build()
            .await
            .expect("remote database should build");
        let first = database.connect().expect("first remote should connect");
        let second = database.connect().expect("second remote should connect");
        bootstrap_protocol_schema(&first)
            .await
            .expect("remote schema should bootstrap");
        (directory, first, second)
    }

    async fn count(remote: &Connection, table: &str) -> i64 {
        let mut rows = remote
            .query(&format!("SELECT COUNT(*) FROM {table}"), params![])
            .await
            .expect("count should query");
        rows.next()
            .await
            .expect("count row should read")
            .expect("count row should exist")
            .get::<i64>(0)
            .expect("count should read")
    }

    async fn read_text(remote: &Connection, query: &str) -> Option<String> {
        let mut rows = remote
            .query(query, params![])
            .await
            .expect("query should run");
        rows.next()
            .await
            .expect("query row should read")
            .map(|row| row.get::<String>(0).expect("text should read"))
    }
}

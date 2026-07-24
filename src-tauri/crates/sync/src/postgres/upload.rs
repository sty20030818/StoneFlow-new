//! 上传 operation 到云端副本。

use std::collections::BTreeMap;

use serde_json::Value;
use sqlx::types::Json;
use sqlx::{Connection, PgConnection, Postgres, Row, Transaction};

use super::error_map::{is_unique_violation, map_sqlx_error};
use super::labels::{entity_kind_label, lifecycle_label, mutation_kind_label, parse_lifecycle};
use crate::{
    apply_mutation, ApplyOutcome, EntityIdentity, EntitySnapshot, PushResult, ReplicaEntity,
    SyncError, SyncMutation, SyncOperation, Tombstone,
};

/// 原子上传一个 operation（幂等键 device_id + operation_id）。
pub async fn upload_operation(
    conn: &mut PgConnection,
    operation: &SyncOperation,
) -> Result<PushResult, SyncError> {
    match upload_operation_once(conn, operation).await {
        Ok(result) => Ok(result),
        Err(error) if is_duplicate_ack_error(&error) => {
            let committed_seq = find_ack(conn, operation).await?.ok_or(error)?;
            Ok(PushResult {
                committed_seq,
                was_already_applied: true,
            })
        }
        Err(error) => Err(error),
    }
}

async fn upload_operation_once(
    conn: &mut PgConnection,
    operation: &SyncOperation,
) -> Result<PushResult, SyncError> {
    if operation.mutations.is_empty() {
        return Err(SyncError::validation(
            "同步 operation 至少需要一个 mutation",
        ));
    }

    let mut tx = conn
        .begin()
        .await
        .map_err(|error| map_sqlx_error("开启 上传事务", error))?;

    if let Some(committed_seq) = find_ack_in_tx(&mut tx, operation).await? {
        tx.commit()
            .await
            .map_err(|error| map_sqlx_error("提交 幂等读取事务", error))?;
        return Ok(PushResult {
            committed_seq,
            was_already_applied: true,
        });
    }

    let mut committed_seq = 0;
    for mutation in &operation.mutations {
        let server_seq = reserve_change(&mut tx, operation, mutation).await?;
        let mutation = assign_tombstone_sequence(mutation, server_seq);
        let mut replica = load_replica(&mut tx, mutation.entity()).await?;
        if apply_mutation(&mut replica, &mutation, server_seq) == ApplyOutcome::IgnoredByTombstone {
            return Err(SyncError::protocol(format!(
                "entity-gone: {}:{} generation={}",
                entity_kind_label(mutation.entity()),
                mutation.entity().entity_id,
                mutation.entity().generation
            )));
        }
        persist_replica(&mut tx, mutation.entity(), &replica).await?;
        write_change_payload(&mut tx, server_seq, &mutation).await?;
        committed_seq = server_seq;
    }

    sqlx::query(
        r#"
        INSERT INTO sync_upload_acks(device_id, operation_id, committed_seq, committed_at)
        VALUES ($1, $2, $3, $4)
        "#,
    )
    .bind(&operation.device_id)
    .bind(&operation.operation_id)
    .bind(committed_seq)
    .bind(&operation.created_at)
    .execute(&mut *tx)
    .await
    .map_err(|error| {
        if is_unique_violation(&error) {
            SyncError::remote_database(format!(
                "写入 upload ack 唯一约束冲突: sync_upload_acks unique {error}"
            ))
        } else {
            map_sqlx_error("写入 upload ack", error)
        }
    })?;

    tx.commit()
        .await
        .map_err(|error| map_sqlx_error("提交 上传事务", error))?;

    Ok(PushResult {
        committed_seq,
        was_already_applied: false,
    })
}

async fn find_ack(
    conn: &mut PgConnection,
    operation: &SyncOperation,
) -> Result<Option<i64>, SyncError> {
    let row = sqlx::query(
        r#"
        SELECT committed_seq FROM sync_upload_acks
        WHERE device_id = $1 AND operation_id = $2
        "#,
    )
    .bind(&operation.device_id)
    .bind(&operation.operation_id)
    .fetch_optional(&mut *conn)
    .await
    .map_err(|error| map_sqlx_error("查询 upload ack", error))?;
    Ok(row.map(|row| row.get::<i64, _>("committed_seq")))
}

async fn find_ack_in_tx(
    tx: &mut Transaction<'_, Postgres>,
    operation: &SyncOperation,
) -> Result<Option<i64>, SyncError> {
    let row = sqlx::query(
        r#"
        SELECT committed_seq FROM sync_upload_acks
        WHERE device_id = $1 AND operation_id = $2
        "#,
    )
    .bind(&operation.device_id)
    .bind(&operation.operation_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| map_sqlx_error("查询 upload ack", error))?;
    Ok(row.map(|row| row.get::<i64, _>("committed_seq")))
}

fn is_duplicate_ack_error(error: &SyncError) -> bool {
    if error.kind() != crate::SyncErrorKind::RemoteDatabase {
        return false;
    }
    let message = error.message().to_ascii_lowercase();
    message.contains("sync_upload_acks")
        && (message.contains("unique") || message.contains("23505") || message.contains("约束"))
}

async fn reserve_change(
    tx: &mut Transaction<'_, Postgres>,
    operation: &SyncOperation,
    mutation: &SyncMutation,
) -> Result<i64, SyncError> {
    let entity = mutation.entity();
    let row = sqlx::query(
        r#"
        INSERT INTO sync_change_log(
            device_id, operation_id, entity_type, entity_id, generation,
            mutation_kind, payload_json, committed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, '{}'::jsonb, $7)
        RETURNING server_seq
        "#,
    )
    .bind(&operation.device_id)
    .bind(&operation.operation_id)
    .bind(entity_kind_label(entity))
    .bind(&entity.entity_id)
    .bind(entity.generation)
    .bind(mutation_kind_label(mutation))
    .bind(&operation.created_at)
    .fetch_one(&mut **tx)
    .await
    .map_err(|error| map_sqlx_error("预留 change sequence", error))?;
    Ok(row.get("server_seq"))
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
    tx: &mut Transaction<'_, Postgres>,
    entity: &EntityIdentity,
) -> Result<ReplicaEntity, SyncError> {
    Ok(ReplicaEntity {
        snapshot: load_state(tx, entity).await?,
        tombstone: load_tombstone(tx, entity).await?,
    })
}

async fn load_state(
    tx: &mut Transaction<'_, Postgres>,
    entity: &EntityIdentity,
) -> Result<Option<EntitySnapshot>, SyncError> {
    let row = sqlx::query(
        r#"
        SELECT generation, fields_json, field_versions_json, lifecycle_state, lifecycle_seq, updated_seq
        FROM sync_entity_state
        WHERE entity_type = $1 AND entity_id = $2
        ORDER BY generation DESC
        LIMIT 1
        "#,
    )
    .bind(entity_kind_label(entity))
    .bind(&entity.entity_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| map_sqlx_error("读取 entity state", error))?;

    let Some(row) = row else {
        return Ok(None);
    };
    let generation: i64 = row.get("generation");
    let fields: Json<BTreeMap<String, Value>> = row.get("fields_json");
    let field_sequences: Json<BTreeMap<String, i64>> = row.get("field_versions_json");
    let lifecycle = parse_lifecycle(row.get("lifecycle_state"))?;
    Ok(Some(EntitySnapshot {
        entity: EntityIdentity {
            generation,
            ..entity.clone()
        },
        fields: fields.0,
        field_sequences: field_sequences.0,
        lifecycle,
        lifecycle_seq: row.get("lifecycle_seq"),
        updated_seq: row.get("updated_seq"),
    }))
}

async fn load_tombstone(
    tx: &mut Transaction<'_, Postgres>,
    entity: &EntityIdentity,
) -> Result<Option<Tombstone>, SyncError> {
    let row = sqlx::query(
        r#"
        SELECT generation, deletion_seq, deleted_at
        FROM sync_tombstones
        WHERE entity_type = $1 AND entity_id = $2
        ORDER BY generation DESC
        LIMIT 1
        "#,
    )
    .bind(entity_kind_label(entity))
    .bind(&entity.entity_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|error| map_sqlx_error("读取 tombstone", error))?;

    let Some(row) = row else {
        return Ok(None);
    };
    Ok(Some(Tombstone {
        entity: EntityIdentity {
            generation: row.get("generation"),
            ..entity.clone()
        },
        deletion_seq: row.get("deletion_seq"),
        deleted_at: row.get("deleted_at"),
    }))
}

async fn persist_replica(
    tx: &mut Transaction<'_, Postgres>,
    entity: &EntityIdentity,
    replica: &ReplicaEntity,
) -> Result<(), SyncError> {
    if let Some(snapshot) = &replica.snapshot {
        sqlx::query(
            r#"
            INSERT INTO sync_entity_state(
                entity_type, entity_id, generation, fields_json, field_versions_json,
                lifecycle_state, lifecycle_seq, updated_seq
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (entity_type, entity_id, generation) DO UPDATE SET
                fields_json = EXCLUDED.fields_json,
                field_versions_json = EXCLUDED.field_versions_json,
                lifecycle_state = EXCLUDED.lifecycle_state,
                lifecycle_seq = EXCLUDED.lifecycle_seq,
                updated_seq = EXCLUDED.updated_seq
            "#,
        )
        .bind(entity_kind_label(&snapshot.entity))
        .bind(&snapshot.entity.entity_id)
        .bind(snapshot.entity.generation)
        .bind(Json(&snapshot.fields))
        .bind(Json(&snapshot.field_sequences))
        .bind(lifecycle_label(snapshot.lifecycle))
        .bind(snapshot.lifecycle_seq)
        .bind(snapshot.updated_seq)
        .execute(&mut **tx)
        .await
        .map_err(|error| map_sqlx_error("写入 entity state", error))?;

        // 投影只保留当前 generation，避免诊断/基线把历史代际算成多个实体。
        sqlx::query(
            r#"
            DELETE FROM sync_entity_state
            WHERE entity_type = $1 AND entity_id = $2 AND generation < $3
            "#,
        )
        .bind(entity_kind_label(&snapshot.entity))
        .bind(&snapshot.entity.entity_id)
        .bind(snapshot.entity.generation)
        .execute(&mut **tx)
        .await
        .map_err(|error| map_sqlx_error("清理旧 generation 投影", error))?;
    }

    if let Some(tombstone) = &replica.tombstone {
        sqlx::query(
            r#"
            INSERT INTO sync_tombstones(entity_type, entity_id, generation, deletion_seq, deleted_at)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (entity_type, entity_id, generation) DO UPDATE SET
                deletion_seq = EXCLUDED.deletion_seq,
                deleted_at = EXCLUDED.deleted_at
            "#,
        )
        .bind(entity_kind_label(&tombstone.entity))
        .bind(&tombstone.entity.entity_id)
        .bind(tombstone.entity.generation)
        .bind(tombstone.deletion_seq)
        .bind(&tombstone.deleted_at)
        .execute(&mut **tx)
        .await
        .map_err(|error| map_sqlx_error("写入 tombstone", error))?;

        sqlx::query(
            r#"
            DELETE FROM sync_entity_state
            WHERE entity_type = $1 AND entity_id = $2
            "#,
        )
        .bind(entity_kind_label(entity))
        .bind(&entity.entity_id)
        .execute(&mut **tx)
        .await
        .map_err(|error| map_sqlx_error("删除 tombstoned state", error))?;
    }
    Ok(())
}

async fn write_change_payload(
    tx: &mut Transaction<'_, Postgres>,
    server_seq: i64,
    mutation: &SyncMutation,
) -> Result<(), SyncError> {
    sqlx::query("UPDATE sync_change_log SET payload_json = $1 WHERE server_seq = $2")
        .bind(Json(mutation))
        .bind(server_seq)
        .execute(&mut **tx)
        .await
        .map_err(|error| map_sqlx_error("写入 change payload", error))?;
    Ok(())
}

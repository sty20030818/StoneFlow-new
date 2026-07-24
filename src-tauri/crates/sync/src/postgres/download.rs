//! 从云端副本下载增量或全量。

use std::collections::BTreeMap;

use serde_json::Value;
use sqlx::types::Json;
use sqlx::{PgConnection, Row};

use super::error_map::map_sqlx_error;
use super::labels::{parse_entity_kind, parse_lifecycle};
use crate::{
    Baseline, EntityIdentity, EntitySnapshot, SequencedMutation, SyncCursor, SyncError,
    SyncMutation, Tombstone,
};

/// 与现 PROTOCOL_PULL_PAGE_SIZE 对齐。
pub const DOWNLOAD_PAGE_SIZE: i64 = 200;

/// 按同步位置拉增量；位置过期返回 `CursorExpired`。
pub async fn download_after(
    conn: &mut PgConnection,
    after_server_seq: i64,
    limit: i64,
) -> Result<Vec<SequencedMutation>, SyncError> {
    ensure_cursor_available(conn, after_server_seq).await?;
    let rows = sqlx::query(
        r#"
        SELECT server_seq, payload_json, committed_at
        FROM sync_change_log
        WHERE server_seq > $1
        ORDER BY server_seq ASC
        LIMIT $2
        "#,
    )
    .bind(after_server_seq)
    .bind(limit)
    .fetch_all(&mut *conn)
    .await
    .map_err(|error| map_sqlx_error("读取 增量变更", error))?;

    let mut changes = Vec::with_capacity(rows.len());
    for row in rows {
        let payload: Json<SyncMutation> = row.try_get("payload_json").map_err(|error| {
            SyncError::remote_database(format!("读取 增量 payload失败: {error}"))
        })?;
        changes.push(SequencedMutation {
            server_seq: row.get("server_seq"),
            mutation: payload.0,
            committed_at: row.get("committed_at"),
        });
    }
    Ok(changes)
}

/// 全量同步：实体状态 + 删除标记 + 当前同步序号。
pub async fn download_full(conn: &mut PgConnection) -> Result<Baseline, SyncError> {
    let cursor = SyncCursor {
        server_seq: read_latest_sequence(conn).await?,
    };
    Ok(Baseline {
        cursor,
        entities: read_entity_states(conn).await?,
        tombstones: read_tombstones(conn).await?,
    })
}

async fn ensure_cursor_available(
    conn: &mut PgConnection,
    after_server_seq: i64,
) -> Result<(), SyncError> {
    let first_sequence: Option<i64> =
        sqlx::query_scalar("SELECT MIN(server_seq) FROM sync_change_log")
            .fetch_one(&mut *conn)
            .await
            .map_err(|error| map_sqlx_error("读取 最早 change sequence", error))?;
    if first_sequence.is_some_and(|first| after_server_seq < first.saturating_sub(1)) {
        return Err(SyncError::cursor_expired());
    }
    Ok(())
}

async fn read_latest_sequence(conn: &mut PgConnection) -> Result<i64, SyncError> {
    let value: i64 = sqlx::query_scalar("SELECT COALESCE(MAX(server_seq), 0) FROM sync_change_log")
        .fetch_one(&mut *conn)
        .await
        .map_err(|error| map_sqlx_error("读取 最新 sequence", error))?;
    Ok(value)
}

async fn read_entity_states(conn: &mut PgConnection) -> Result<Vec<EntitySnapshot>, SyncError> {
    // entity_state 语义是「当前投影」：每个实体只取最高 generation。
    let rows = sqlx::query(
        r#"
        SELECT DISTINCT ON (entity_type, entity_id)
            entity_type, entity_id, generation, fields_json, field_versions_json,
            lifecycle_state, lifecycle_seq, updated_seq
        FROM sync_entity_state
        ORDER BY entity_type, entity_id, generation DESC
        "#,
    )
    .fetch_all(&mut *conn)
    .await
    .map_err(|error| map_sqlx_error("读取 实体状态", error))?;

    // 基线物化仍按 updated_seq 稳定排序（先父后子由 runtime entity_rank 再排）。
    let mut rows = rows;
    rows.sort_by_key(|row| row.get::<i64, _>("updated_seq"));

    let mut entities = Vec::with_capacity(rows.len());
    for row in rows {
        let entity_type: String = row.get("entity_type");
        let fields: Json<BTreeMap<String, Value>> = row.get("fields_json");
        let field_sequences: Json<BTreeMap<String, i64>> = row.get("field_versions_json");
        let lifecycle: String = row.get("lifecycle_state");
        entities.push(EntitySnapshot {
            entity: EntityIdentity {
                entity_type: parse_entity_kind(&entity_type)?,
                entity_id: row.get("entity_id"),
                generation: row.get("generation"),
            },
            fields: fields.0,
            field_sequences: field_sequences.0,
            lifecycle: parse_lifecycle(&lifecycle)?,
            lifecycle_seq: row.get("lifecycle_seq"),
            updated_seq: row.get("updated_seq"),
        });
    }
    Ok(entities)
}

async fn read_tombstones(conn: &mut PgConnection) -> Result<Vec<Tombstone>, SyncError> {
    let rows = sqlx::query(
        r#"
        SELECT entity_type, entity_id, generation, deletion_seq, deleted_at
        FROM sync_tombstones
        ORDER BY deletion_seq ASC
        "#,
    )
    .fetch_all(&mut *conn)
    .await
    .map_err(|error| map_sqlx_error("读取 删除标记", error))?;

    let mut tombstones = Vec::with_capacity(rows.len());
    for row in rows {
        let entity_type: String = row.get("entity_type");
        tombstones.push(Tombstone {
            entity: EntityIdentity {
                entity_type: parse_entity_kind(&entity_type)?,
                entity_id: row.get("entity_id"),
                generation: row.get("generation"),
            },
            deletion_seq: row.get("deletion_seq"),
            deleted_at: row.get("deleted_at"),
        });
    }
    Ok(tombstones)
}

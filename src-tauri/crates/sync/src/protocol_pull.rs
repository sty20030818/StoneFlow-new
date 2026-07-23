//! R7 远端增量与基线读取。
//!
//! 此模块只负责网络读取与协议反序列化；本地 SQLite 回放由 runtime 的本地副本模块负责，
//! 因此网络 await 永远不占用本地写事务。

use libsql::{params, Connection};

use crate::{
    remote::open_remote, Baseline, EntityIdentity, EntitySnapshot, LifecycleState,
    SequencedMutation, SyncCursor, SyncEntityKind, SyncError, SyncRemoteConfig, Tombstone,
};

/// R7 每页变更数量。这个限制保护本地事务时长；调整需要先有性能证据。
pub const PROTOCOL_PULL_PAGE_SIZE: i64 = 200;

/// 从远端读取一个按 sequence 排序的增量页。
pub async fn fetch_protocol_changes(
    remote_config: &SyncRemoteConfig,
    after_server_seq: i64,
) -> Result<Vec<SequencedMutation>, SyncError> {
    let remote = open_remote(remote_config).await?;
    crate::bootstrap_protocol_schema(&remote).await?;
    ensure_cursor_is_available(&remote, after_server_seq).await?;
    fetch_protocol_changes_from_connection(&remote, after_server_seq, PROTOCOL_PULL_PAGE_SIZE).await
}

/// 读取当前远端基线与其 cursor。
pub async fn fetch_protocol_baseline(
    remote_config: &SyncRemoteConfig,
) -> Result<Baseline, SyncError> {
    let remote = open_remote(remote_config).await?;
    crate::bootstrap_protocol_schema(&remote).await?;
    fetch_protocol_baseline_from_connection(&remote).await
}

async fn fetch_protocol_changes_from_connection(
    remote: &Connection,
    after_server_seq: i64,
    limit: i64,
) -> Result<Vec<SequencedMutation>, SyncError> {
    let mut rows = remote
        .query(
            r#"
            SELECT server_seq, payload_json, committed_at
            FROM sync_change_log
            WHERE server_seq > ?1
            ORDER BY server_seq ASC
            LIMIT ?2
            "#,
            params![after_server_seq, limit],
        )
        .await
        .map_err(remote_error("读取 R7 增量变更"))?;
    let mut changes = Vec::new();
    while let Some(row) = rows
        .next()
        .await
        .map_err(remote_error("遍历 R7 增量变更"))?
    {
        let payload = row
            .get::<String>(1)
            .map_err(remote_error("读取 R7 增量 payload"))?;
        changes.push(SequencedMutation {
            server_seq: row
                .get::<i64>(0)
                .map_err(remote_error("读取 R7 增量 sequence"))?,
            mutation: serde_json::from_str(&payload).map_err(|error| {
                SyncError::serialization(format!("解析 R7 增量 payload 失败: {error}"))
            })?,
            committed_at: row
                .get::<String>(2)
                .map_err(remote_error("读取 R7 增量时间"))?,
        });
    }
    Ok(changes)
}

/// 如果远端已清理当前 cursor 之前的日志，增量回放不再完整，必须转为 baseline。
async fn ensure_cursor_is_available(
    remote: &Connection,
    after_server_seq: i64,
) -> Result<(), SyncError> {
    let mut rows = remote
        .query("SELECT MIN(server_seq) FROM sync_change_log", params![])
        .await
        .map_err(remote_error("读取 R7 最早 change sequence"))?;
    let Some(row) = rows
        .next()
        .await
        .map_err(remote_error("遍历 R7 最早 change sequence"))?
    else {
        return Ok(());
    };
    let first_sequence = row
        .get::<Option<i64>>(0)
        .map_err(remote_error("读取 R7 最早 change sequence"))?;
    if first_sequence.is_some_and(|first| after_server_seq < first.saturating_sub(1)) {
        return Err(SyncError::cursor_expired());
    }
    Ok(())
}

async fn fetch_protocol_baseline_from_connection(
    remote: &Connection,
) -> Result<Baseline, SyncError> {
    let cursor = SyncCursor {
        server_seq: read_latest_sequence(remote).await?,
    };
    let entities = read_snapshots(remote).await?;
    let tombstones = read_tombstones(remote).await?;
    Ok(Baseline {
        cursor,
        entities,
        tombstones,
    })
}

async fn read_latest_sequence(remote: &Connection) -> Result<i64, SyncError> {
    let mut rows = remote
        .query(
            "SELECT COALESCE(MAX(server_seq), 0) FROM sync_change_log",
            params![],
        )
        .await
        .map_err(remote_error("读取 R7 最新 sequence"))?;
    rows.next()
        .await
        .map_err(remote_error("遍历 R7 最新 sequence"))?
        .ok_or_else(|| SyncError::remote_database("R7 最新 sequence 缺少结果行"))?
        .get::<i64>(0)
        .map_err(remote_error("读取 R7 最新 sequence"))
}

async fn read_snapshots(remote: &Connection) -> Result<Vec<EntitySnapshot>, SyncError> {
    let mut rows = remote
        .query(
            "SELECT entity_type, entity_id, generation, fields_json, field_versions_json, lifecycle_state, lifecycle_seq, updated_seq FROM sync_entity_snapshots ORDER BY updated_seq ASC",
            params![],
        )
        .await
        .map_err(remote_error("读取 R7 基线实体"))?;
    let mut entities = Vec::new();
    while let Some(row) = rows
        .next()
        .await
        .map_err(remote_error("遍历 R7 基线实体"))?
    {
        entities.push(EntitySnapshot {
            entity: EntityIdentity {
                entity_type: parse_entity_kind(
                    &row.get::<String>(0)
                        .map_err(remote_error("读取 R7 基线实体类型"))?,
                )?,
                entity_id: row
                    .get::<String>(1)
                    .map_err(remote_error("读取 R7 基线实体 ID"))?,
                generation: row
                    .get::<i64>(2)
                    .map_err(remote_error("读取 R7 基线 generation"))?,
            },
            fields: parse_json(
                row.get::<String>(3)
                    .map_err(remote_error("读取 R7 基线 fields"))?,
                "R7 基线 fields",
            )?,
            field_sequences: parse_json(
                row.get::<String>(4)
                    .map_err(remote_error("读取 R7 基线 field versions"))?,
                "R7 基线 field versions",
            )?,
            lifecycle: parse_lifecycle(
                &row.get::<String>(5)
                    .map_err(remote_error("读取 R7 基线 lifecycle"))?,
            )?,
            lifecycle_seq: row
                .get::<i64>(6)
                .map_err(remote_error("读取 R7 基线 lifecycle sequence"))?,
            updated_seq: row
                .get::<i64>(7)
                .map_err(remote_error("读取 R7 基线 updated sequence"))?,
        });
    }
    Ok(entities)
}

async fn read_tombstones(remote: &Connection) -> Result<Vec<Tombstone>, SyncError> {
    let mut rows = remote
        .query(
            "SELECT entity_type, entity_id, generation, deletion_seq, deleted_at FROM sync_tombstones ORDER BY deletion_seq ASC",
            params![],
        )
        .await
        .map_err(remote_error("读取 R7 基线 tombstone"))?;
    let mut tombstones = Vec::new();
    while let Some(row) = rows
        .next()
        .await
        .map_err(remote_error("遍历 R7 基线 tombstone"))?
    {
        tombstones.push(Tombstone {
            entity: EntityIdentity {
                entity_type: parse_entity_kind(
                    &row.get::<String>(0)
                        .map_err(remote_error("读取 R7 tombstone 类型"))?,
                )?,
                entity_id: row
                    .get::<String>(1)
                    .map_err(remote_error("读取 R7 tombstone ID"))?,
                generation: row
                    .get::<i64>(2)
                    .map_err(remote_error("读取 R7 tombstone generation"))?,
            },
            deletion_seq: row
                .get::<i64>(3)
                .map_err(remote_error("读取 R7 tombstone sequence"))?,
            deleted_at: row
                .get::<String>(4)
                .map_err(remote_error("读取 R7 tombstone 时间"))?,
        });
    }
    Ok(tombstones)
}

fn parse_json<T: serde::de::DeserializeOwned>(raw: String, label: &str) -> Result<T, SyncError> {
    serde_json::from_str(&raw)
        .map_err(|error| SyncError::serialization(format!("解析 {label} 失败: {error}")))
}

fn parse_entity_kind(value: &str) -> Result<SyncEntityKind, SyncError> {
    match value {
        "space" => Ok(SyncEntityKind::Space),
        "project" => Ok(SyncEntityKind::Project),
        "task" => Ok(SyncEntityKind::Task),
        "task_link" => Ok(SyncEntityKind::TaskLink),
        "view" => Ok(SyncEntityKind::View),
        _ => Err(SyncError::protocol(format!("未知 R7 实体类型: {value}"))),
    }
}

fn parse_lifecycle(value: &str) -> Result<LifecycleState, SyncError> {
    match value {
        "active" => Ok(LifecycleState::Active),
        "archived" => Ok(LifecycleState::Archived),
        "trashed" => Ok(LifecycleState::Trashed),
        _ => Err(SyncError::protocol(format!("未知 R7 生命周期: {value}"))),
    }
}

fn remote_error(action: &'static str) -> impl FnOnce(libsql::Error) -> SyncError {
    move |error| SyncError::remote_database(format!("{action}失败: {error}"))
}

#[cfg(test)]
mod tests {
    use libsql::{params, Builder};
    use tempfile::TempDir;

    use super::ensure_cursor_is_available;
    use crate::{bootstrap_protocol_schema, SyncError};

    #[tokio::test]
    async fn cursor_should_expire_when_remote_has_pruned_earlier_changes() {
        let (_directory, connection) = open_test_connection().await;
        bootstrap_protocol_schema(&connection)
            .await
            .expect("schema should bootstrap");
        for operation_id in ["one", "two"] {
            connection
                .execute(
                    "INSERT INTO sync_change_log(device_id, operation_id, entity_type, entity_id, generation, mutation_kind, payload_json, committed_at) VALUES (?1, ?2, 'space', ?3, 1, 'patch', '{}', '2026-07-24T00:00:00Z')",
                    params!["device", operation_id, operation_id],
                )
                .await
                .expect("change should insert");
        }
        connection
            .execute(
                "DELETE FROM sync_change_log WHERE server_seq = 1",
                params![],
            )
            .await
            .expect("old change should prune");

        let error = ensure_cursor_is_available(&connection, 0)
            .await
            .expect_err("cursor before retained log should expire");

        assert!(matches!(error, SyncError::CursorExpired));
    }

    async fn open_test_connection() -> (TempDir, libsql::Connection) {
        let directory = tempfile::tempdir().expect("temporary directory should create");
        let database = Builder::new_local(directory.path().join("remote.db"))
            .build()
            .await
            .expect("database should build");
        let connection = database.connect().expect("database should connect");
        (directory, connection)
    }
}

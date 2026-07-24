//! 云端副本 schema bootstrap。

use sqlx::{Executor, PgConnection, Row};

use super::error_map::map_sqlx_error;
use crate::SyncError;

/// 协议 schema 版本；表结构见任务 PG-SCHEMA。
pub const PROTOCOL_SCHEMA_VERSION: i64 = 1;

const SCHEMA_STATEMENTS: &[&str] = &[
    r#"
    CREATE TABLE IF NOT EXISTS sync_schema (
        name    TEXT PRIMARY KEY NOT NULL CHECK (name = 'stoneflow'),
        version BIGINT NOT NULL
    )
    "#,
    r#"
    CREATE TABLE IF NOT EXISTS sync_entity_state (
        entity_type         TEXT NOT NULL
            CHECK (entity_type IN ('space', 'project', 'task', 'task_link', 'view')),
        entity_id           TEXT NOT NULL,
        generation          BIGINT NOT NULL CHECK (generation >= 1),
        fields_json         JSONB NOT NULL,
        field_versions_json JSONB NOT NULL,
        lifecycle_state     TEXT NOT NULL
            CHECK (lifecycle_state IN ('active', 'archived', 'trashed')),
        lifecycle_seq       BIGINT NOT NULL,
        updated_seq         BIGINT NOT NULL,
        PRIMARY KEY (entity_type, entity_id, generation)
    )
    "#,
    r#"
    CREATE TABLE IF NOT EXISTS sync_upload_acks (
        device_id     TEXT NOT NULL,
        operation_id  TEXT NOT NULL,
        committed_seq BIGINT NOT NULL,
        committed_at  TEXT NOT NULL,
        PRIMARY KEY (device_id, operation_id)
    )
    "#,
    r#"
    CREATE TABLE IF NOT EXISTS sync_tombstones (
        entity_type   TEXT NOT NULL
            CHECK (entity_type IN ('space', 'project', 'task', 'task_link', 'view')),
        entity_id     TEXT NOT NULL,
        generation    BIGINT NOT NULL CHECK (generation >= 1),
        deletion_seq  BIGINT NOT NULL,
        deleted_at    TEXT NOT NULL,
        PRIMARY KEY (entity_type, entity_id, generation)
    )
    "#,
    r#"
    CREATE TABLE IF NOT EXISTS sync_change_log (
        server_seq     BIGSERIAL PRIMARY KEY,
        device_id      TEXT NOT NULL,
        operation_id   TEXT NOT NULL,
        entity_type    TEXT NOT NULL
            CHECK (entity_type IN ('space', 'project', 'task', 'task_link', 'view')),
        entity_id      TEXT NOT NULL,
        generation     BIGINT NOT NULL CHECK (generation >= 1),
        mutation_kind  TEXT NOT NULL
            CHECK (mutation_kind IN ('patch', 'lifecycle', 'tombstone')),
        payload_json   JSONB NOT NULL,
        committed_at   TEXT NOT NULL
    )
    "#,
    r#"
    CREATE INDEX IF NOT EXISTS idx_sync_change_log_operation
        ON sync_change_log (device_id, operation_id, server_seq)
    "#,
    r#"
    CREATE INDEX IF NOT EXISTS idx_sync_change_log_entity
        ON sync_change_log (entity_type, entity_id, generation, server_seq)
    "#,
    r#"
    CREATE INDEX IF NOT EXISTS idx_sync_tombstones_identity
        ON sync_tombstones (entity_type, entity_id, generation)
    "#,
];

/// 空库建表；版本不匹配则拒绝（不自动 DROP）。
pub async fn ensure_ready(conn: &mut PgConnection) -> Result<(), SyncError> {
    for statement in SCHEMA_STATEMENTS {
        conn.execute(*statement)
            .await
            .map_err(|error| SyncError::schema(format!("初始化 云端同步表失败: {error}")))?;
    }

    let row = sqlx::query("SELECT version FROM sync_schema WHERE name = 'stoneflow'")
        .fetch_optional(&mut *conn)
        .await
        .map_err(|error| map_sqlx_error("读取 协议版本", error))?;

    match row {
        None => {
            sqlx::query("INSERT INTO sync_schema(name, version) VALUES ('stoneflow', $1)")
                .bind(PROTOCOL_SCHEMA_VERSION)
                .execute(&mut *conn)
                .await
                .map_err(|error| SyncError::schema(format!("写入 协议版本失败: {error}")))?;
            Ok(())
        }
        Some(row) => {
            let version: i64 = row
                .try_get("version")
                .map_err(|error| SyncError::schema(format!("读取 协议版本失败: {error}")))?;
            if version == PROTOCOL_SCHEMA_VERSION {
                Ok(())
            } else {
                Err(SyncError::schema(format!(
                    "云端 schema 版本不兼容: 当前 {version}，需要 {PROTOCOL_SCHEMA_VERSION}"
                )))
            }
        }
    }
}

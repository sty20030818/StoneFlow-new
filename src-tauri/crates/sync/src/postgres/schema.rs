//! 云端副本 schema bootstrap。

use sqlx::{Connection, Executor, PgConnection, Row};

use super::error_map::map_sqlx_error;
use crate::SyncError;

/// 协议 schema 版本；表结构见任务 PG-SCHEMA。
pub const PROTOCOL_SCHEMA_VERSION: i64 = 2;

const SYNC_SCHEMA_STATEMENT: &str = r#"
    CREATE TABLE IF NOT EXISTS sync_schema (
        name        TEXT PRIMARY KEY NOT NULL CHECK (name = 'stoneflow'),
        version     BIGINT NOT NULL,
        instance_id TEXT NOT NULL
    )
    "#;

const SCHEMA_STATEMENTS: &[&str] = &[
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

/// 空库建表；v1 原地补齐远端实例身份，其余版本不匹配则拒绝（不自动 DROP）。
pub async fn ensure_ready(conn: &mut PgConnection) -> Result<(), SyncError> {
    let mut transaction = conn
        .begin()
        .await
        .map_err(|error| SyncError::schema(format!("开始 云端 schema 事务失败: {error}")))?;

    transaction
        .execute(SYNC_SCHEMA_STATEMENT)
        .await
        .map_err(|error| SyncError::schema(format!("初始化 sync_schema 失败: {error}")))?;

    let row = sqlx::query("SELECT version FROM sync_schema WHERE name = 'stoneflow'")
        .fetch_optional(&mut *transaction)
        .await
        .map_err(|error| map_sqlx_error("读取 协议版本", error))?;

    let migrated_identity = match row {
        None => {
            // 旧实现可能在建表后、写版本行前中断；空的旧表也要走统一初始化。
            transaction
                .execute("ALTER TABLE sync_schema ADD COLUMN IF NOT EXISTS instance_id TEXT")
                .await
                .map_err(|error| SyncError::schema(format!("补齐 云端实例身份列失败: {error}")))?;
            sqlx::query(
                r#"
                INSERT INTO sync_schema(name, version, instance_id)
                VALUES (
                    'stoneflow',
                    $1,
                    md5(random()::text || clock_timestamp()::text || pg_backend_pid()::text || txid_current()::text)
                )
                "#,
            )
            .bind(PROTOCOL_SCHEMA_VERSION)
            .execute(&mut *transaction)
            .await
            .map_err(|error| SyncError::schema(format!("写入 协议版本与实例身份失败: {error}")))?;
            true
        }
        Some(row) => {
            let version: i64 = row
                .try_get("version")
                .map_err(|error| SyncError::schema(format!("读取 协议版本失败: {error}")))?;
            match version {
                1 => {
                    transaction
                        .execute(
                            "ALTER TABLE sync_schema ADD COLUMN IF NOT EXISTS instance_id TEXT",
                        )
                        .await
                        .map_err(|error| {
                            SyncError::schema(format!("迁移 云端实例身份列失败: {error}"))
                        })?;
                    transaction
                        .execute(
                            r#"
                            UPDATE sync_schema
                            SET instance_id = md5(random()::text || clock_timestamp()::text || pg_backend_pid()::text || txid_current()::text)
                            WHERE name = 'stoneflow'
                              AND (instance_id IS NULL OR btrim(instance_id) = '')
                            "#,
                        )
                        .await
                        .map_err(|error| {
                            SyncError::schema(format!("生成 云端实例身份失败: {error}"))
                        })?;
                    sqlx::query("UPDATE sync_schema SET version = $1 WHERE name = 'stoneflow'")
                        .bind(PROTOCOL_SCHEMA_VERSION)
                        .execute(&mut *transaction)
                        .await
                        .map_err(|error| {
                            SyncError::schema(format!("升级 云端协议版本失败: {error}"))
                        })?;
                    true
                }
                PROTOCOL_SCHEMA_VERSION => false,
                _ => {
                    return Err(SyncError::schema(format!(
                        "云端 schema 版本不兼容: 当前 {version}，需要 {PROTOCOL_SCHEMA_VERSION}"
                    )));
                }
            }
        }
    };

    let instance_id: String =
        sqlx::query_scalar("SELECT instance_id FROM sync_schema WHERE name = 'stoneflow'")
            .fetch_one(&mut *transaction)
            .await
            .map_err(|error| map_sqlx_error("读取 云端实例身份", error))?;
    if instance_id.trim().is_empty() {
        return Err(SyncError::schema("云端实例身份为空，拒绝继续同步"));
    }
    if migrated_identity {
        transaction
            .execute("ALTER TABLE sync_schema ALTER COLUMN instance_id SET NOT NULL")
            .await
            .map_err(|error| SyncError::schema(format!("约束 云端实例身份失败: {error}")))?;
    }

    for statement in SCHEMA_STATEMENTS {
        transaction
            .execute(*statement)
            .await
            .map_err(|error| SyncError::schema(format!("初始化 云端同步表失败: {error}")))?;
    }

    // 兼容历史脏数据：投影只保留每个实体最高 generation。
    transaction
        .execute(
            r#"
        DELETE FROM sync_entity_state AS older
        USING sync_entity_state AS newer
        WHERE older.entity_type = newer.entity_type
          AND older.entity_id = newer.entity_id
          AND older.generation < newer.generation
        "#,
        )
        .await
        .map_err(|error| SyncError::schema(format!("清理旧 generation 投影失败: {error}")))?;

    transaction
        .commit()
        .await
        .map_err(|error| SyncError::schema(format!("提交 云端 schema 事务失败: {error}")))
}

pub(super) async fn read_instance_id(conn: &mut PgConnection) -> Result<String, SyncError> {
    let instance_id: String =
        sqlx::query_scalar("SELECT instance_id FROM sync_schema WHERE name = 'stoneflow'")
            .fetch_one(&mut *conn)
            .await
            .map_err(|error| map_sqlx_error("读取 云端实例身份", error))?;
    if instance_id.trim().is_empty() {
        return Err(SyncError::schema("云端实例身份为空，拒绝继续同步"));
    }
    Ok(instance_id)
}

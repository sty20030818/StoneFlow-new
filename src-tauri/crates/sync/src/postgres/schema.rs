//! 云端副本 schema bootstrap。

use sqlx::{Connection, Executor, PgConnection};

use super::error_map::map_sqlx_error;
use crate::SyncError;

/// 同步契约版本；不兼容变更必须显式迁移数据并阻断旧写入方。
pub const PROTOCOL_SCHEMA_VERSION: i64 = 3;

const SYNC_SCHEMA_STATEMENT: &str = r#"
    CREATE TABLE sync_schema (
        name        TEXT PRIMARY KEY NOT NULL CHECK (name = 'stoneflow'),
        version     BIGINT NOT NULL,
        instance_id TEXT NOT NULL
    )
    "#;

const SCHEMA_STATEMENTS: &[&str] = &[
    r#"
    CREATE TABLE sync_entity_state (
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
    CREATE TABLE sync_upload_acks (
        device_id     TEXT NOT NULL,
        operation_id  TEXT NOT NULL,
        committed_seq BIGINT NOT NULL,
        committed_at  TEXT NOT NULL,
        PRIMARY KEY (device_id, operation_id)
    )
    "#,
    r#"
    CREATE TABLE sync_tombstones (
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
    CREATE TABLE sync_change_log (
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
    CREATE INDEX idx_sync_change_log_operation
        ON sync_change_log (device_id, operation_id, server_seq)
    "#,
    r#"
    CREATE INDEX idx_sync_change_log_entity
        ON sync_change_log (entity_type, entity_id, generation, server_seq)
    "#,
    r#"
    CREATE INDEX idx_sync_tombstones_identity
        ON sync_tombstones (entity_type, entity_id, generation)
    "#,
];

/// 仅初始化没有同步表的 schema；现有库必须完整且版本一致，不升级或清理数据。
pub async fn ensure_ready(conn: &mut PgConnection) -> Result<(), SyncError> {
    let mut transaction = conn
        .begin()
        .await
        .map_err(|error| SyncError::schema(format!("开始 云端 schema 事务失败: {error}")))?;

    ensure_ready_in_transaction(&mut transaction).await?;
    transaction
        .commit()
        .await
        .map_err(|error| SyncError::schema(format!("提交 云端 schema 事务失败: {error}")))
}

async fn ensure_ready_in_transaction(transaction: &mut PgConnection) -> Result<(), SyncError> {
    // 同一 schema 的首次握手串行，避免两台设备同时把空库判成可初始化。
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended(current_schema(), 0))")
        .execute(&mut *transaction)
        .await
        .map_err(|error| map_sqlx_error("锁定 云端 schema 初始化", error))?;
    let table_count: i64 = sqlx::query_scalar(
        r#"
        SELECT COUNT(*) FROM pg_catalog.pg_class
        WHERE relnamespace = current_schema()::regnamespace
          AND relkind IN ('r', 'p')
          AND relname IN (
              'sync_schema', 'sync_entity_state', 'sync_upload_acks',
              'sync_tombstones', 'sync_change_log'
          )
        "#,
    )
    .fetch_one(&mut *transaction)
    .await
    .map_err(|error| map_sqlx_error("检查 云端同步表", error))?;

    if table_count == 0 {
        transaction
            .execute(SYNC_SCHEMA_STATEMENT)
            .await
            .map_err(|error| SyncError::schema(format!("初始化 sync_schema 失败: {error}")))?;
        for statement in SCHEMA_STATEMENTS {
            transaction
                .execute(*statement)
                .await
                .map_err(|error| SyncError::schema(format!("初始化 云端同步表失败: {error}")))?;
        }
        sqlx::query(
            r#"
            INSERT INTO sync_schema(name, version, instance_id)
            VALUES (
                'stoneflow', $1,
                md5(random()::text || clock_timestamp()::text || pg_backend_pid()::text || txid_current()::text)
            )
            "#,
        )
        .bind(PROTOCOL_SCHEMA_VERSION)
        .execute(&mut *transaction)
        .await
        .map_err(|error| SyncError::schema(format!("写入 协议版本与实例身份失败: {error}")))?;
    } else if table_count != 5 {
        return Err(SyncError::schema(
            "云端同步表不完整，拒绝自动修复；请保留现有数据库，并从完整备份恢复后重试",
        ));
    }

    let version = read_schema_version(transaction).await?;
    if version != PROTOCOL_SCHEMA_VERSION {
        return Err(SyncError::schema(format!(
            "云端 schema 版本不兼容: 当前 {version}，需要 {PROTOCOL_SCHEMA_VERSION}；请核对客户端版本，并连接协议版本一致的云端副本；本客户端不再提供旧版数据库迁移"
        )));
    }
    read_instance_id(transaction).await?;
    Ok(())
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

pub(super) async fn read_schema_version(conn: &mut PgConnection) -> Result<i64, SyncError> {
    sqlx::query_scalar("SELECT version FROM sync_schema WHERE name = 'stoneflow'")
        .fetch_optional(conn)
        .await
        .map_err(|error| map_sqlx_error("读取 协议版本", error))?
        .ok_or_else(|| SyncError::schema("云端缺少协议版本记录，拒绝自动初始化"))
}

/// 锁持续到上传事务结束，避免握手后协议版本变化导致不兼容写入。
pub(super) async fn lock_current_version(conn: &mut PgConnection) -> Result<(), SyncError> {
    let version: Option<i64> =
        sqlx::query_scalar("SELECT version FROM sync_schema WHERE name = 'stoneflow' FOR SHARE")
            .fetch_optional(conn)
            .await
            .map_err(|error| map_sqlx_error("锁定 上传协议版本", error))?;
    if version != Some(PROTOCOL_SCHEMA_VERSION) {
        return Err(SyncError::schema("上传事务的云端协议版本已变化，拒绝写入"));
    }
    Ok(())
}

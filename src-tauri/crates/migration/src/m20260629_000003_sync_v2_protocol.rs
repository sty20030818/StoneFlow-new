//! 云同步 V2 协议骨架表。
//!
//! 这里先落本地事实源，不替换现有 S1 `sync_outbox` 行为。

use sea_orm::ConnectionTrait;
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const CREATE_SYNC_V2_PROTOCOL_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS sync_clients (
    client_id TEXT PRIMARY KEY NOT NULL,
    created_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_mutations (
    client_id TEXT NOT NULL,
    client_seq INTEGER NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'project', 'space', 'view', 'setting', 'task_link')),
    entity_id TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('upsert', 'soft_delete', 'restore', 'hard_delete')),
    payload TEXT NOT NULL,
    base_server_seq INTEGER NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'acked', 'failed')),
    error_message TEXT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (client_id, client_seq)
);

CREATE INDEX IF NOT EXISTS idx_sync_mutations_status_seq
ON sync_mutations(status, client_id, client_seq);

CREATE INDEX IF NOT EXISTS idx_sync_mutations_entity
ON sync_mutations(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS sync_shadow (
    entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'project', 'space', 'view', 'setting', 'task_link')),
    entity_id TEXT NOT NULL,
    server_seq INTEGER NOT NULL,
    snapshot TEXT NOT NULL,
    deleted_at TEXT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_shadow_server_seq
ON sync_shadow(server_seq);
"#;

const DROP_SYNC_V2_PROTOCOL_SQL: &str = r#"
DROP INDEX IF EXISTS idx_sync_shadow_server_seq;
DROP TABLE IF EXISTS sync_shadow;
DROP INDEX IF EXISTS idx_sync_mutations_entity;
DROP INDEX IF EXISTS idx_sync_mutations_status_seq;
DROP TABLE IF EXISTS sync_mutations;
DROP TABLE IF EXISTS sync_clients;
"#;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(CREATE_SYNC_V2_PROTOCOL_SQL)
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(DROP_SYNC_V2_PROTOCOL_SQL)
            .await?;
        Ok(())
    }
}

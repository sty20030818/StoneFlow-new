//! 云同步基础元数据表：设备标识、游标与本地 outbox。

use sea_orm::ConnectionTrait;
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const CREATE_SYNC_METADATA_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS sync_outbox (
    id TEXT PRIMARY KEY NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'project', 'space', 'view', 'setting')),
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('upsert', 'delete')),
    payload TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'synced', 'failed')),
    error_message TEXT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_outbox_status_created_at
ON sync_outbox(status, created_at);

CREATE TABLE IF NOT EXISTS sync_cursor (
    scope TEXT PRIMARY KEY NOT NULL,
    cursor TEXT NULL,
    updated_at TEXT NOT NULL
);
"#;

const DROP_SYNC_METADATA_SQL: &str = r#"
DROP INDEX IF EXISTS idx_sync_outbox_status_created_at;
DROP TABLE IF EXISTS sync_cursor;
DROP TABLE IF EXISTS sync_outbox;
"#;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(CREATE_SYNC_METADATA_SQL)
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(DROP_SYNC_METADATA_SQL)
            .await?;
        Ok(())
    }
}

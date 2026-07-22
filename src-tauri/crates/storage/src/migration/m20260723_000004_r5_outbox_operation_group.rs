//! R5：一个用户操作可生成多条 Outbox 记录，共享同一个 operation_id。

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const UP_SQL: &str = r#"
ALTER TABLE outbox RENAME TO outbox_legacy;
DROP INDEX IF EXISTS ix_outbox_available;

CREATE TABLE outbox (
    id TEXT PRIMARY KEY NOT NULL,
    operation_id TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('space', 'project', 'task', 'task_link', 'view', 'setting', 'activity')),
    entity_id TEXT NOT NULL,
    generation INTEGER NOT NULL CHECK (generation >= 1),
    operation_type TEXT NOT NULL CHECK (operation_type IN ('upsert', 'delete', 'restore', 'patch')),
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    available_at TEXT NOT NULL
);

CREATE INDEX ix_outbox_available ON outbox(available_at, created_at);
CREATE INDEX ix_outbox_operation ON outbox(operation_id);

INSERT INTO outbox (
    id, operation_id, entity_type, entity_id, generation, operation_type, payload_json, created_at, available_at
)
SELECT
    id, operation_id, entity_type, entity_id, generation, operation_type, payload_json, created_at, available_at
FROM outbox_legacy;

DROP TABLE outbox_legacy;
"#;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(UP_SQL)
            .await
            .map(|_| ())
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        Err(DbErr::Migration("R5 Outbox operation 分组不支持降级".to_owned()))
    }
}

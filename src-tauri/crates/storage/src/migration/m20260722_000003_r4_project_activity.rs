//! R4：Activity 从 Task 专属记录收口为通用实体时间线。

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const UP_SQL: &str = r#"
PRAGMA foreign_keys = OFF;

ALTER TABLE activity_events RENAME TO activity_events_legacy;
ALTER TABLE activity_changes RENAME TO activity_changes_legacy;

DROP INDEX IF EXISTS ix_activity_events_task_created;
DROP INDEX IF EXISTS ix_activity_changes_event;

CREATE TABLE activity_events (
    id TEXT PRIMARY KEY NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('project', 'task', 'space', 'view', 'setting')),
    entity_id TEXT NOT NULL,
    operation_id TEXT NOT NULL,
    action TEXT NOT NULL,
    actor_type TEXT NOT NULL,
    source TEXT NOT NULL,
    summary TEXT NULL,
    metadata_json TEXT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX ix_activity_events_entity_created
ON activity_events(entity_type, entity_id, created_at DESC);

CREATE TABLE activity_changes (
    id TEXT PRIMARY KEY NOT NULL,
    event_id TEXT NOT NULL,
    field_key TEXT NOT NULL,
    old_value TEXT NULL,
    new_value TEXT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (event_id) REFERENCES activity_events(id) ON DELETE CASCADE
);

CREATE INDEX ix_activity_changes_event ON activity_changes(event_id);

INSERT INTO activity_events (
    id, entity_type, entity_id, operation_id, action, actor_type, source, summary, metadata_json, created_at
)
SELECT id, 'task', task_id, operation_id, action, actor_kind, source_kind, NULL, NULL, created_at
FROM activity_events_legacy;

INSERT INTO activity_changes (id, event_id, field_key, old_value, new_value, created_at)
SELECT changes.id, changes.event_id, changes.field_key, changes.old_value, changes.new_value, events.created_at
FROM activity_changes_legacy AS changes
JOIN activity_events_legacy AS events ON events.id = changes.event_id;

DROP TABLE activity_changes_legacy;
DROP TABLE activity_events_legacy;

PRAGMA foreign_keys = ON;
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
        Err(DbErr::Migration("R4 通用 Activity 表不支持降级".to_owned()))
    }
}

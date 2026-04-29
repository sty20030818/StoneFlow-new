//! 阶段 1 完整 Schema：一次性建立 V1 核心表结构。

use sea_orm::ConnectionTrait;
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const CREATE_SCHEMA_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS spaces (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    icon_key TEXT NOT NULL,
    color_key TEXT NOT NULL,
    is_default INTEGER NOT NULL CHECK (is_default IN (0, 1)),
    sort_order INTEGER NOT NULL,
    archived_at TEXT NULL,
    deleted_at TEXT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY NOT NULL,
    space_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NULL,
    due_at TEXT NULL,
    sort_order INTEGER NOT NULL,
    completed_at TEXT NULL,
    archived_at TEXT NULL,
    archived_by_type TEXT NULL CHECK (archived_by_type IS NULL OR archived_by_type IN ('space', 'project', 'self')),
    archived_by_id TEXT NULL,
    deleted_at TEXT NULL,
    deleted_by_type TEXT NULL CHECK (deleted_by_type IS NULL OR deleted_by_type IN ('space', 'project', 'self')),
    deleted_by_id TEXT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (space_id) REFERENCES spaces(id)
);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY NOT NULL,
    space_id TEXT NOT NULL,
    project_id TEXT NULL,
    title TEXT NOT NULL,
    note TEXT NULL,
    status TEXT NOT NULL CHECK (status IN ('todo', 'doing', 'waiting', 'done', 'canceled')),
    status_changed_at TEXT NOT NULL,
    priority INTEGER NOT NULL CHECK (priority IN (0, 1, 2, 3, 4)),
    inbox_at TEXT NULL,
    due_at TEXT NULL,
    scheduled_at TEXT NULL,
    reminder_at TEXT NULL,
    sort_order INTEGER NOT NULL,
    completed_at TEXT NULL,
    canceled_at TEXT NULL,
    archived_at TEXT NULL,
    archived_by_type TEXT NULL CHECK (archived_by_type IS NULL OR archived_by_type IN ('space', 'project', 'self')),
    archived_by_id TEXT NULL,
    deleted_at TEXT NULL,
    deleted_by_type TEXT NULL CHECK (deleted_by_type IS NULL OR deleted_by_type IN ('space', 'project', 'self')),
    deleted_by_id TEXT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (space_id) REFERENCES spaces(id),
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE IF NOT EXISTS views (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NULL,
    type TEXT NOT NULL CHECK (type IN ('system', 'custom')),
    entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'project')),
    key TEXT NULL,
    filters TEXT NOT NULL,
    sort TEXT NOT NULL,
    group_by TEXT NULL,
    is_visible INTEGER NOT NULL CHECK (is_visible IN (0, 1)),
    sort_order INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_events (
    id TEXT PRIMARY KEY NOT NULL,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'project', 'space', 'view', 'setting')),
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    actor_type TEXT NOT NULL CHECK (actor_type IN ('user', 'system', 'ai')),
    source TEXT NOT NULL CHECK (source IN ('app', 'shortcut', 'command', 'import', 'automation')),
    summary TEXT NULL,
    metadata TEXT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_changes (
    id TEXT PRIMARY KEY NOT NULL,
    event_id TEXT NOT NULL,
    field TEXT NOT NULL,
    old_value TEXT NULL,
    new_value TEXT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (event_id) REFERENCES activity_events(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_spaces_single_default_active
ON spaces(is_default)
WHERE is_default = 1 AND archived_at IS NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_projects_space_sort_order
ON projects(space_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_tasks_space_project_status_sort_order
ON tasks(space_id, project_id, status, sort_order);

CREATE INDEX IF NOT EXISTS idx_tasks_due_at
ON tasks(due_at);

CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_at
ON tasks(scheduled_at);

CREATE INDEX IF NOT EXISTS idx_tasks_inbox_at
ON tasks(inbox_at);

CREATE INDEX IF NOT EXISTS idx_views_entity_visible_sort_order
ON views(entity_type, is_visible, sort_order);

CREATE UNIQUE INDEX IF NOT EXISTS ux_views_entity_key
ON views(entity_type, key)
WHERE key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_settings_key
ON settings(key);

CREATE INDEX IF NOT EXISTS idx_activity_events_entity_created_at
ON activity_events(entity_type, entity_id, created_at);

CREATE INDEX IF NOT EXISTS idx_activity_changes_event_id
ON activity_changes(event_id);
"#;

const DROP_SCHEMA_SQL: &str = r#"
DROP INDEX IF EXISTS idx_activity_changes_event_id;
DROP INDEX IF EXISTS idx_activity_events_entity_created_at;
DROP INDEX IF EXISTS ux_settings_key;
DROP INDEX IF EXISTS ux_views_entity_key;
DROP INDEX IF EXISTS idx_views_entity_visible_sort_order;
DROP INDEX IF EXISTS idx_tasks_inbox_at;
DROP INDEX IF EXISTS idx_tasks_scheduled_at;
DROP INDEX IF EXISTS idx_tasks_due_at;
DROP INDEX IF EXISTS idx_tasks_space_project_status_sort_order;
DROP INDEX IF EXISTS idx_projects_space_sort_order;
DROP INDEX IF EXISTS ux_spaces_single_default_active;

DROP TABLE IF EXISTS activity_changes;
DROP TABLE IF EXISTS activity_events;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS views;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS spaces;
"#;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(CREATE_SCHEMA_SQL)
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(DROP_SCHEMA_SQL)
            .await?;
        Ok(())
    }
}

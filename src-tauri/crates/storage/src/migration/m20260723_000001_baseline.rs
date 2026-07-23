//! 当前完整本地 Schema 基线（单迁移，无升级链）。
//!
//! 空库直接建表；不支持从旧库在线升级。

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const CREATE_SCHEMA_SQL: &str = r#"CREATE TABLE IF NOT EXISTS spaces (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    icon_key TEXT NOT NULL,
    color_key TEXT NOT NULL,
    is_default INTEGER NOT NULL CHECK (is_default IN (0, 1)),
    position INTEGER NOT NULL CHECK (position >= 0),
    generation INTEGER NOT NULL CHECK (generation >= 1),
    archived_at TEXT NULL,
    deleted_at TEXT NULL,
    archived_by_operation_id TEXT NULL,
    deleted_by_operation_id TEXT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_spaces_single_default_active
ON spaces(is_default)
WHERE is_default = 1 AND archived_at IS NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_spaces_position ON spaces(position);
CREATE INDEX IF NOT EXISTS ix_spaces_deleted_at
ON spaces(deleted_at)
WHERE deleted_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS projects (
    id TEXT NOT NULL,
    space_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NULL,
    status TEXT NOT NULL CHECK (status IN ('todo', 'doing', 'waiting', 'done', 'canceled')),
    priority INTEGER NOT NULL CHECK (priority IN (0, 1, 2, 3, 4)),
    planned_at TEXT NULL,
    due_at TEXT NULL,
    remind_at TEXT NULL,
    status_changed_at TEXT NOT NULL,
    completed_at TEXT NULL,
    position INTEGER NOT NULL CHECK (position >= 0),
    generation INTEGER NOT NULL CHECK (generation >= 1),
    archived_at TEXT NULL,
    deleted_at TEXT NULL,
    archived_by_operation_id TEXT NULL,
    deleted_by_operation_id TEXT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (id, space_id),
    FOREIGN KEY (space_id) REFERENCES spaces(id)
);

CREATE INDEX IF NOT EXISTS ix_projects_space_position
ON projects(space_id, position);
CREATE INDEX IF NOT EXISTS ix_projects_deleted_at
ON projects(deleted_at)
WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_projects_archived_operation
ON projects(archived_by_operation_id)
WHERE archived_by_operation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_projects_deleted_operation
ON projects(deleted_by_operation_id)
WHERE deleted_by_operation_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY NOT NULL,
    space_id TEXT NOT NULL,
    project_id TEXT NULL,
    title TEXT NOT NULL,
    note TEXT NULL,
    status TEXT NOT NULL CHECK (status IN ('todo', 'doing', 'waiting', 'done', 'canceled')),
    priority INTEGER NOT NULL CHECK (priority IN (0, 1, 2, 3, 4)),
    planned_at TEXT NULL,
    due_at TEXT NULL,
    remind_at TEXT NULL,
    status_changed_at TEXT NOT NULL,
    completed_at TEXT NULL,
    position INTEGER NOT NULL CHECK (position >= 0),
    generation INTEGER NOT NULL CHECK (generation >= 1),
    archived_at TEXT NULL,
    deleted_at TEXT NULL,
    archived_by_operation_id TEXT NULL,
    deleted_by_operation_id TEXT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (space_id) REFERENCES spaces(id),
    FOREIGN KEY (project_id, space_id) REFERENCES projects(id, space_id)
);

-- Space 内无 Project 归属的任务排序（独立事项）
CREATE INDEX IF NOT EXISTS ix_tasks_space_no_project_position
ON tasks(space_id, position)
WHERE project_id IS NULL AND archived_at IS NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_tasks_project_position
ON tasks(project_id, position)
WHERE project_id IS NOT NULL AND archived_at IS NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_tasks_archived_at
ON tasks(archived_at)
WHERE archived_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_tasks_deleted_at
ON tasks(deleted_at)
WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_tasks_archived_operation
ON tasks(archived_by_operation_id)
WHERE archived_by_operation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_tasks_deleted_operation
ON tasks(deleted_by_operation_id)
WHERE deleted_by_operation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_tasks_view_space_status_due
ON tasks(space_id, status, due_at, position)
WHERE archived_at IS NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS ix_tasks_view_status_due
ON tasks(status, due_at, position)
WHERE archived_at IS NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS task_links (
    id TEXT PRIMARY KEY NOT NULL,
    task_id TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    position INTEGER NOT NULL CHECK (position >= 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_task_links_task_position
ON task_links(task_id, position);

CREATE TABLE IF NOT EXISTS views (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    entity_kind TEXT NOT NULL CHECK (entity_kind IN ('task', 'project')),
    scope_json TEXT NOT NULL,
    filters_json TEXT NOT NULL,
    sort_json TEXT NOT NULL,
    group_by_json TEXT NULL,
    position INTEGER NOT NULL CHECK (position >= 0),
    generation INTEGER NOT NULL CHECK (generation >= 1),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_views_position ON views(position);

CREATE TABLE IF NOT EXISTS activity_events (
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

CREATE INDEX IF NOT EXISTS ix_activity_events_entity_created
ON activity_events(entity_type, entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS activity_changes (
    id TEXT PRIMARY KEY NOT NULL,
    event_id TEXT NOT NULL,
    field_key TEXT NOT NULL,
    old_value TEXT NULL,
    new_value TEXT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (event_id) REFERENCES activity_events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_activity_changes_event ON activity_changes(event_id);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outbox (
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

CREATE INDEX IF NOT EXISTS ix_outbox_available ON outbox(available_at, created_at);
CREATE INDEX IF NOT EXISTS ix_outbox_operation ON outbox(operation_id);

CREATE TABLE IF NOT EXISTS applied_operations (
    operation_id TEXT PRIMARY KEY NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    applied_at TEXT NOT NULL,
    server_seq INTEGER NULL
);

CREATE INDEX IF NOT EXISTS ix_applied_operations_entity
ON applied_operations(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS sync_changes (
    server_seq INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_id TEXT NOT NULL UNIQUE,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    generation INTEGER NOT NULL,
    operation_type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    committed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_sync_changes_seq ON sync_changes(server_seq);

CREATE TABLE IF NOT EXISTS tombstones (
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    generation INTEGER NOT NULL CHECK (generation >= 1),
    deletion_seq INTEGER NOT NULL,
    deleted_at TEXT NOT NULL,
    PRIMARY KEY (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS ix_tombstones_deletion_seq ON tombstones(deletion_seq);

CREATE TABLE IF NOT EXISTS sync_cursors (
    scope TEXT PRIMARY KEY NOT NULL,
    cursor TEXT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_devices (
    singleton INTEGER PRIMARY KEY NOT NULL CHECK (singleton = 1),
    device_id TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_protocol_entities (
    entity_type TEXT NOT NULL CHECK (entity_type IN ('space', 'project', 'task', 'task_link', 'view')),
    entity_id TEXT NOT NULL,
    generation INTEGER NOT NULL CHECK (generation >= 1),
    snapshot_json TEXT NULL,
    tombstone_json TEXT NULL,
    PRIMARY KEY (entity_type, entity_id),
    CHECK ((snapshot_json IS NULL) <> (tombstone_json IS NULL))
);
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
            .execute_unprepared(
                r#"
                DROP TABLE IF EXISTS sync_protocol_entities;
                DROP TABLE IF EXISTS sync_devices;
                DROP TABLE IF EXISTS sync_cursors;
                DROP TABLE IF EXISTS tombstones;
                DROP TABLE IF EXISTS sync_changes;
                DROP TABLE IF EXISTS applied_operations;
                DROP TABLE IF EXISTS outbox;
                DROP TABLE IF EXISTS settings;
                DROP TABLE IF EXISTS activity_changes;
                DROP TABLE IF EXISTS activity_events;
                DROP TABLE IF EXISTS views;
                DROP TABLE IF EXISTS task_links;
                DROP TABLE IF EXISTS tasks;
                DROP TABLE IF EXISTS projects;
                DROP TABLE IF EXISTS spaces;
                "#,
            )
            .await?;
        Ok(())
    }
}

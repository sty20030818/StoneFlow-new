//! 云同步复制器：本地 SQLite 为真相源，Turso 仅作为远端汇聚库。
//!
//! 当前实现遵循两个长期约束：
//! 1. 业务层仍然只读写本地库；
//! 2. 每台设备独立维护自己的同步游标，避免多设备互相覆盖进度。

use std::path::Path;

use libsql::{params, Builder, Connection, Value as LibsqlValue};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::app::error::AppError;

use super::types::SyncRemoteConfig;

const ENTITY_TABLES: &[EntityTable] = &[
    EntityTable::new(
        "spaces",
        &[
            "id",
            "name",
            "icon_key",
            "color_key",
            "is_default",
            "sort_order",
            "archived_at",
            "deleted_at",
            "created_at",
            "updated_at",
        ],
        &[],
    ),
    EntityTable::new(
        "projects",
        &[
            "id",
            "space_id",
            "name",
            "description",
            "due_at",
            "sort_order",
            "completed_at",
            "archived_at",
            "archived_by_type",
            "archived_by_id",
            "deleted_at",
            "deleted_by_type",
            "deleted_by_id",
            "created_at",
            "updated_at",
        ],
        &[],
    ),
    EntityTable::new(
        "tasks",
        &[
            "id",
            "space_id",
            "project_id",
            "title",
            "note",
            "status",
            "status_changed_at",
            "priority",
            "inbox_at",
            "due_at",
            "scheduled_at",
            "reminder_at",
            "sort_order",
            "completed_at",
            "canceled_at",
            "archived_at",
            "archived_by_type",
            "archived_by_id",
            "deleted_at",
            "deleted_by_type",
            "deleted_by_id",
            "created_at",
            "updated_at",
        ],
        &[],
    ),
    EntityTable::new(
        "task_links",
        &[
            "id",
            "task_id",
            "title",
            "url",
            "sort_order",
            "created_at",
            "updated_at",
        ],
        &[],
    ),
    EntityTable::new(
        "views",
        &[
            "id",
            "name",
            "description",
            "type",
            "entity_type",
            "key",
            "filters",
            "sort",
            "group_by",
            "is_visible",
            "sort_order",
            "created_at",
            "updated_at",
        ],
        &[],
    ),
    EntityTable::new(
        "settings",
        &["key", "value", "created_at", "updated_at"],
        &["app.sync.config"],
    ),
];

const TOMBSTONE_ACTIONS: &[&str] = &[
    "task.permanently_deleted",
    "task.link.removed",
    "project.permanently_deleted",
    "space.permanently_deleted",
    "view.deleted",
];

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReplicationMode {
    Push,
    Pull,
    Force,
}

impl From<super::state::SyncRunMode> for ReplicationMode {
    fn from(value: super::state::SyncRunMode) -> Self {
        match value {
            super::state::SyncRunMode::Push => Self::Push,
            super::state::SyncRunMode::Pull => Self::Pull,
            super::state::SyncRunMode::Force => Self::Force,
        }
    }
}

#[derive(Debug, Clone, Copy)]
struct EntityTable {
    name: &'static str,
    columns: &'static [&'static str],
    excluded_keys: &'static [&'static str],
}

impl EntityTable {
    const fn new(
        name: &'static str,
        columns: &'static [&'static str],
        excluded_keys: &'static [&'static str],
    ) -> Self {
        Self {
            name,
            columns,
            excluded_keys,
        }
    }

    fn primary_key_column(&self) -> &'static str {
        if self.name == "settings" {
            "key"
        } else {
            "id"
        }
    }

    fn updated_at_column(&self) -> &'static str {
        "updated_at"
    }

    fn push_scope(&self) -> String {
        format!("push:{}", self.name)
    }

    fn pull_scope(&self) -> String {
        format!("pull:{}", self.name)
    }
}

#[derive(Debug, Clone, PartialEq)]
struct RowSnapshot {
    primary_key: String,
    updated_at: String,
    values: Vec<Value>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
struct CursorToken {
    updated_at: String,
    primary_key: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct TombstoneRecord {
    id: String,
    entity_type: String,
    entity_id: String,
    action: String,
    actor_type: String,
    source: String,
    summary: Option<String>,
    metadata: Option<String>,
    created_at: String,
}

impl TombstoneRecord {
    fn cursor_token(&self) -> CursorToken {
        CursorToken {
            updated_at: self.created_at.clone(),
            primary_key: self.id.clone(),
        }
    }

    fn deletion_target(&self) -> Option<DeletionTarget> {
        match (self.entity_type.as_str(), self.action.as_str()) {
            ("task", "task.permanently_deleted") => {
                Some(DeletionTarget::new("tasks", self.entity_id.clone()))
            }
            ("task", "task.link.removed") => {
                let metadata = self.metadata.as_deref()?;
                let value: Value = serde_json::from_str(metadata).ok()?;
                let link_id = value.get("linkId")?.as_str()?.to_owned();
                Some(DeletionTarget::new("task_links", link_id))
            }
            ("project", "project.permanently_deleted") => {
                Some(DeletionTarget::new("projects", self.entity_id.clone()))
            }
            ("space", "space.permanently_deleted") => {
                Some(DeletionTarget::new("spaces", self.entity_id.clone()))
            }
            ("view", "view.deleted") => Some(DeletionTarget::new("views", self.entity_id.clone())),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct DeletionTarget {
    table_name: &'static str,
    primary_key: String,
}

impl DeletionTarget {
    fn new(table_name: &'static str, primary_key: String) -> Self {
        Self {
            table_name,
            primary_key,
        }
    }
}

pub async fn replicate_database(
    database_path: &str,
    remote_config: &SyncRemoteConfig,
    mode: ReplicationMode,
) -> Result<(), AppError> {
    let local = open_local_sqlite(database_path).await?;
    let remote = open_remote_turso(remote_config).await?;

    bootstrap_remote_schema(&remote).await?;

    match mode {
        ReplicationMode::Push => {
            push_all_entities(&local, &remote).await?;
            push_permanent_delete_tombstones(&local, &remote).await?;
        }
        ReplicationMode::Pull => {
            pull_all_entities(&local, &remote).await?;
            apply_permanent_delete_tombstones(&local, &remote).await?;
        }
        ReplicationMode::Force => {
            push_all_entities(&local, &remote).await?;
            push_permanent_delete_tombstones(&local, &remote).await?;
            pull_all_entities(&local, &remote).await?;
            apply_permanent_delete_tombstones(&local, &remote).await?;
        }
    }

    Ok(())
}

async fn open_local_sqlite(database_path: &str) -> Result<Connection, AppError> {
    let database = Builder::new_local(Path::new(database_path))
        .build()
        .await
        .map_err(|error| AppError::internal(format!("打开本地 SQLite 失败: {error}")))?;
    database
        .connect()
        .map_err(|error| AppError::internal(format!("连接本地 SQLite 失败: {error}")))
}

async fn open_remote_turso(remote_config: &SyncRemoteConfig) -> Result<Connection, AppError> {
    let database = Builder::new_remote(remote_config.url.clone(), remote_config.token.clone())
        .build()
        .await
        .map_err(map_remote_connect_error)?;

    database
        .connect()
        .map_err(|error| AppError::internal(format!("连接 Turso 远端失败: {error}")))
}

fn map_remote_connect_error(error: libsql::Error) -> AppError {
    let message = error.to_string();
    if message.contains("401 Unauthorized") || message.contains("invalid JWT token") {
        return AppError::validation(
            "Turso 鉴权失败，请确认当前保存的 token 是该数据库对应的 auth token。",
        );
    }

    AppError::internal(format!("初始化 Turso 远端连接失败: {message}"))
}

async fn bootstrap_remote_schema(remote: &Connection) -> Result<(), AppError> {
    let statements = [
        r#"
        CREATE TABLE IF NOT EXISTS spaces (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            icon_key TEXT NOT NULL,
            color_key TEXT NOT NULL,
            is_default INTEGER NOT NULL,
            sort_order INTEGER NOT NULL,
            archived_at TEXT NULL,
            deleted_at TEXT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        "#,
        r#"
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY NOT NULL,
            space_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT NULL,
            due_at TEXT NULL,
            sort_order INTEGER NOT NULL,
            completed_at TEXT NULL,
            archived_at TEXT NULL,
            archived_by_type TEXT NULL,
            archived_by_id TEXT NULL,
            deleted_at TEXT NULL,
            deleted_by_type TEXT NULL,
            deleted_by_id TEXT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        "#,
        r#"
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY NOT NULL,
            space_id TEXT NOT NULL,
            project_id TEXT NULL,
            title TEXT NOT NULL,
            note TEXT NULL,
            status TEXT NOT NULL,
            status_changed_at TEXT NOT NULL,
            priority INTEGER NOT NULL,
            inbox_at TEXT NULL,
            due_at TEXT NULL,
            scheduled_at TEXT NULL,
            reminder_at TEXT NULL,
            sort_order INTEGER NOT NULL,
            completed_at TEXT NULL,
            canceled_at TEXT NULL,
            archived_at TEXT NULL,
            archived_by_type TEXT NULL,
            archived_by_id TEXT NULL,
            deleted_at TEXT NULL,
            deleted_by_type TEXT NULL,
            deleted_by_id TEXT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        "#,
        r#"
        CREATE TABLE IF NOT EXISTS task_links (
            id TEXT PRIMARY KEY NOT NULL,
            task_id TEXT NOT NULL,
            title TEXT NOT NULL,
            url TEXT NOT NULL,
            sort_order INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        "#,
        r#"
        CREATE TABLE IF NOT EXISTS views (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            description TEXT NULL,
            type TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            key TEXT NULL,
            filters TEXT NOT NULL,
            sort TEXT NOT NULL,
            group_by TEXT NULL,
            is_visible INTEGER NOT NULL,
            sort_order INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        "#,
        r#"
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        "#,
        r#"
        CREATE TABLE IF NOT EXISTS activity_events (
            id TEXT PRIMARY KEY NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            action TEXT NOT NULL,
            actor_type TEXT NOT NULL,
            source TEXT NOT NULL,
            summary TEXT NULL,
            metadata TEXT NULL,
            created_at TEXT NOT NULL
        )
        "#,
        r#"
        CREATE TABLE IF NOT EXISTS sync_cursor (
            scope TEXT PRIMARY KEY NOT NULL,
            cursor TEXT NULL,
            updated_at TEXT NOT NULL
        )
        "#,
        r#"
        CREATE INDEX IF NOT EXISTS idx_spaces_updated_at_id
        ON spaces(updated_at, id)
        "#,
        r#"
        CREATE INDEX IF NOT EXISTS idx_projects_updated_at_id
        ON projects(updated_at, id)
        "#,
        r#"
        CREATE INDEX IF NOT EXISTS idx_tasks_updated_at_id
        ON tasks(updated_at, id)
        "#,
        r#"
        CREATE INDEX IF NOT EXISTS idx_task_links_updated_at_id
        ON task_links(updated_at, id)
        "#,
        r#"
        CREATE INDEX IF NOT EXISTS idx_views_updated_at_id
        ON views(updated_at, id)
        "#,
        r#"
        CREATE INDEX IF NOT EXISTS idx_settings_updated_at_key
        ON settings(updated_at, key)
        "#,
        r#"
        CREATE INDEX IF NOT EXISTS idx_activity_events_action_created_at_id
        ON activity_events(action, created_at, id)
        "#,
    ];

    for sql in statements {
        remote
            .execute_batch(sql)
            .await
            .map_err(|error| AppError::internal(format!("初始化 Turso 远端表结构失败: {error}")))?;
    }

    Ok(())
}

async fn push_all_entities(local: &Connection, remote: &Connection) -> Result<(), AppError> {
    for table in ENTITY_TABLES {
        push_entity_table(local, remote, *table).await?;
    }

    Ok(())
}

async fn pull_all_entities(local: &Connection, remote: &Connection) -> Result<(), AppError> {
    for table in ENTITY_TABLES {
        pull_entity_table(local, remote, *table).await?;
    }

    Ok(())
}

async fn push_entity_table(
    local: &Connection,
    remote: &Connection,
    table: EntityTable,
) -> Result<(), AppError> {
    let cursor_scope = table.push_scope();
    let cursor = read_cursor(local, &cursor_scope).await?;
    let rows = fetch_incremental_rows(local, table, cursor.as_ref(), "本地").await?;
    if rows.is_empty() {
        log::info!("sync:push table={} rows=0 cursor_unchanged", table.name);
        return Ok(());
    }

    upsert_rows_with_lww(remote, table, &rows, "Turso").await?;
    let next_cursor = rows.last().map(RowSnapshot::cursor_token);
    write_cursor(local, &cursor_scope, next_cursor.as_ref()).await?;
    log::info!(
        "sync:push table={} rows={} last_updated_at={} last_pk={}",
        table.name,
        rows.len(),
        next_cursor
            .as_ref()
            .map(|cursor| cursor.updated_at.as_str())
            .unwrap_or("-"),
        next_cursor
            .as_ref()
            .map(|cursor| cursor.primary_key.as_str())
            .unwrap_or("-")
    );
    Ok(())
}

async fn pull_entity_table(
    local: &Connection,
    remote: &Connection,
    table: EntityTable,
) -> Result<(), AppError> {
    let cursor_scope = table.pull_scope();
    let cursor = read_cursor(local, &cursor_scope).await?;
    let rows = fetch_incremental_rows(remote, table, cursor.as_ref(), "Turso").await?;
    if rows.is_empty() {
        log::info!("sync:pull table={} rows=0 cursor_unchanged", table.name);
        return Ok(());
    }

    upsert_rows_with_lww(local, table, &rows, "本地").await?;
    let next_cursor = rows.last().map(RowSnapshot::cursor_token);
    write_cursor(local, &cursor_scope, next_cursor.as_ref()).await?;
    log::info!(
        "sync:pull table={} rows={} last_updated_at={} last_pk={}",
        table.name,
        rows.len(),
        next_cursor
            .as_ref()
            .map(|cursor| cursor.updated_at.as_str())
            .unwrap_or("-"),
        next_cursor
            .as_ref()
            .map(|cursor| cursor.primary_key.as_str())
            .unwrap_or("-")
    );
    Ok(())
}

async fn push_permanent_delete_tombstones(
    local: &Connection,
    remote: &Connection,
) -> Result<(), AppError> {
    let cursor = read_cursor(local, "push:tombstones").await?;
    let tombstones = fetch_incremental_tombstones(local, cursor.as_ref(), "本地").await?;
    if tombstones.is_empty() {
        log::info!("sync:push tombstones rows=0 cursor_unchanged");
        return Ok(());
    }

    upsert_tombstones(remote, &tombstones, "Turso").await?;
    let next_cursor = tombstones.last().map(TombstoneRecord::cursor_token);
    write_cursor(local, "push:tombstones", next_cursor.as_ref()).await?;
    log::info!(
        "sync:push tombstones rows={} last_created_at={} last_id={}",
        tombstones.len(),
        next_cursor
            .as_ref()
            .map(|cursor| cursor.updated_at.as_str())
            .unwrap_or("-"),
        next_cursor
            .as_ref()
            .map(|cursor| cursor.primary_key.as_str())
            .unwrap_or("-")
    );
    Ok(())
}

async fn apply_permanent_delete_tombstones(
    local: &Connection,
    remote: &Connection,
) -> Result<(), AppError> {
    let cursor = read_cursor(local, "pull:tombstones").await?;
    let tombstones = fetch_incremental_tombstones(remote, cursor.as_ref(), "Turso").await?;
    if tombstones.is_empty() {
        log::info!("sync:pull tombstones rows=0 cursor_unchanged");
        return Ok(());
    }

    let tx = local
        .transaction()
        .await
        .map_err(|error| AppError::internal(format!("开启本地 tombstone 事务失败: {error}")))?;

    for tombstone in &tombstones {
        if let Some(target) = tombstone.deletion_target() {
            tx.execute(
                &format!("DELETE FROM {} WHERE id = ?1", target.table_name),
                params![target.primary_key.clone()],
            )
            .await
            .map_err(|error| {
                AppError::internal(format!(
                    "应用本地 tombstone 删除 {}:{}:{} 失败: {error}",
                    target.table_name, tombstone.entity_type, tombstone.action
                ))
            })?;
        }
    }

    tx.commit()
        .await
        .map_err(|error| AppError::internal(format!("提交本地 tombstone 事务失败: {error}")))?;

    let next_cursor = tombstones.last().map(TombstoneRecord::cursor_token);
    write_cursor(local, "pull:tombstones", next_cursor.as_ref()).await?;
    log::info!(
        "sync:pull tombstones rows={} last_created_at={} last_id={}",
        tombstones.len(),
        next_cursor
            .as_ref()
            .map(|cursor| cursor.updated_at.as_str())
            .unwrap_or("-"),
        next_cursor
            .as_ref()
            .map(|cursor| cursor.primary_key.as_str())
            .unwrap_or("-")
    );
    Ok(())
}

async fn fetch_incremental_rows(
    connection: &Connection,
    table: EntityTable,
    cursor: Option<&CursorToken>,
    source_label: &str,
) -> Result<Vec<RowSnapshot>, AppError> {
    let sql = build_incremental_select_sql(table, cursor);
    let params = cursor_params(cursor);
    let mut rows = connection.query(&sql, params).await.map_err(|error| {
        AppError::internal(format!("读取{source_label}表 {} 失败: {error}", table.name))
    })?;
    let mut snapshots = Vec::new();

    while let Some(row) = rows.next().await.map_err(|error| {
        AppError::internal(format!("遍历{source_label}表 {} 失败: {error}", table.name))
    })? {
        let mut values = Vec::with_capacity(table.columns.len());
        let mut primary_key = None;
        let mut updated_at = None;

        for (index, column) in table.columns.iter().enumerate() {
            let value = row
                .get_value(index as i32)
                .map(libsql_value_to_json)
                .map_err(|error| {
                    AppError::internal(format!(
                        "读取{source_label}表 {} 第 {} 列失败: {error}",
                        table.name, index
                    ))
                })?;

            if *column == table.primary_key_column() {
                primary_key = Some(json_value_to_required_string(
                    &value,
                    table.name,
                    table.primary_key_column(),
                    source_label,
                )?);
            }
            if *column == table.updated_at_column() {
                updated_at = Some(json_value_to_required_string(
                    &value,
                    table.name,
                    table.updated_at_column(),
                    source_label,
                )?);
            }

            values.push(value);
        }

        snapshots.push(RowSnapshot {
            primary_key: primary_key.ok_or_else(|| {
                AppError::internal(format!(
                    "{source_label}表 {} 缺少主键列 {}",
                    table.name,
                    table.primary_key_column()
                ))
            })?,
            updated_at: updated_at.ok_or_else(|| {
                AppError::internal(format!(
                    "{source_label}表 {} 缺少 updated_at 列",
                    table.name
                ))
            })?,
            values,
        });
    }

    Ok(snapshots)
}

async fn fetch_incremental_tombstones(
    connection: &Connection,
    cursor: Option<&CursorToken>,
    source_label: &str,
) -> Result<Vec<TombstoneRecord>, AppError> {
    let sql = build_tombstone_select_sql(cursor);
    let params = cursor_params(cursor);
    let mut rows = connection.query(&sql, params).await.map_err(|error| {
        AppError::internal(format!("读取{source_label} activity_events 失败: {error}"))
    })?;
    let mut tombstones = Vec::new();

    while let Some(row) = rows.next().await.map_err(|error| {
        AppError::internal(format!("遍历{source_label} activity_events 失败: {error}"))
    })? {
        tombstones.push(TombstoneRecord {
            id: row.get::<String>(0).map_err(|error| {
                AppError::internal(format!("读取{source_label} tombstone id 失败: {error}"))
            })?,
            entity_type: row.get::<String>(1).map_err(|error| {
                AppError::internal(format!(
                    "读取{source_label} tombstone entity_type 失败: {error}"
                ))
            })?,
            entity_id: row.get::<String>(2).map_err(|error| {
                AppError::internal(format!(
                    "读取{source_label} tombstone entity_id 失败: {error}"
                ))
            })?,
            action: row.get::<String>(3).map_err(|error| {
                AppError::internal(format!("读取{source_label} tombstone action 失败: {error}"))
            })?,
            actor_type: row.get::<String>(4).map_err(|error| {
                AppError::internal(format!(
                    "读取{source_label} tombstone actor_type 失败: {error}"
                ))
            })?,
            source: row.get::<String>(5).map_err(|error| {
                AppError::internal(format!("读取{source_label} tombstone source 失败: {error}"))
            })?,
            summary: row.get::<Option<String>>(6).map_err(|error| {
                AppError::internal(format!(
                    "读取{source_label} tombstone summary 失败: {error}"
                ))
            })?,
            metadata: row.get::<Option<String>>(7).map_err(|error| {
                AppError::internal(format!(
                    "读取{source_label} tombstone metadata 失败: {error}"
                ))
            })?,
            created_at: row.get::<String>(8).map_err(|error| {
                AppError::internal(format!(
                    "读取{source_label} tombstone created_at 失败: {error}"
                ))
            })?,
        });
    }

    Ok(tombstones)
}

async fn upsert_rows_with_lww(
    destination: &Connection,
    table: EntityTable,
    rows: &[RowSnapshot],
    destination_label: &str,
) -> Result<(), AppError> {
    let tx = destination.transaction().await.map_err(|error| {
        AppError::internal(format!(
            "开启{destination_label}表 {} 事务失败: {error}",
            table.name
        ))
    })?;

    for row in rows {
        tx.execute(
            &build_upsert_sql(table),
            json_values_to_libsql_params(&row.values)?,
        )
        .await
        .map_err(|error| {
            AppError::internal(format!(
                "写入{destination_label}表 {} 失败: {error}",
                table.name
            ))
        })?;
    }

    tx.commit().await.map_err(|error| {
        AppError::internal(format!(
            "提交{destination_label}表 {} 事务失败: {error}",
            table.name
        ))
    })?;

    Ok(())
}

async fn upsert_tombstones(
    remote: &Connection,
    tombstones: &[TombstoneRecord],
    destination_label: &str,
) -> Result<(), AppError> {
    let tx = remote.transaction().await.map_err(|error| {
        AppError::internal(format!(
            "开启{destination_label} tombstone 事务失败: {error}"
        ))
    })?;

    for tombstone in tombstones {
        tx.execute(
            r#"
            INSERT INTO activity_events (
                id, entity_type, entity_id, action, actor_type, source, summary, metadata, created_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
            ON CONFLICT(id) DO UPDATE SET
                entity_type = excluded.entity_type,
                entity_id = excluded.entity_id,
                action = excluded.action,
                actor_type = excluded.actor_type,
                source = excluded.source,
                summary = excluded.summary,
                metadata = excluded.metadata,
                created_at = excluded.created_at
            "#,
            params![
                tombstone.id.clone(),
                tombstone.entity_type.clone(),
                tombstone.entity_id.clone(),
                tombstone.action.clone(),
                tombstone.actor_type.clone(),
                tombstone.source.clone(),
                tombstone.summary.clone(),
                tombstone.metadata.clone(),
                tombstone.created_at.clone(),
            ],
        )
        .await
        .map_err(|error| {
            AppError::internal(format!("写入{destination_label} tombstone 事件失败: {error}"))
        })?;
    }

    tx.commit().await.map_err(|error| {
        AppError::internal(format!(
            "提交{destination_label} tombstone 事务失败: {error}"
        ))
    })?;

    Ok(())
}

async fn read_cursor(
    connection: &Connection,
    scope: &str,
) -> Result<Option<CursorToken>, AppError> {
    let mut rows = connection
        .query(
            "SELECT cursor FROM sync_cursor WHERE scope = ?1 LIMIT 1",
            params![scope.to_owned()],
        )
        .await
        .map_err(|error| AppError::internal(format!("读取同步游标 {scope} 失败: {error}")))?;

    let Some(row) = rows
        .next()
        .await
        .map_err(|error| AppError::internal(format!("遍历同步游标 {scope} 失败: {error}")))?
    else {
        return Ok(None);
    };

    let cursor_payload = row
        .get::<Option<String>>(0)
        .map_err(|error| AppError::internal(format!("读取同步游标 {scope} 值失败: {error}")))?;

    match cursor_payload {
        None => Ok(None),
        Some(cursor) => serde_json::from_str::<CursorToken>(&cursor)
            .map(Some)
            .map_err(|error| AppError::internal(format!("解析同步游标 {scope} 失败: {error}"))),
    }
}

async fn write_cursor(
    connection: &Connection,
    scope: &str,
    cursor: Option<&CursorToken>,
) -> Result<(), AppError> {
    let payload = cursor
        .map(serde_json::to_string)
        .transpose()
        .map_err(|error| AppError::internal(format!("序列化同步游标 {scope} 失败: {error}")))?;
    let updated_at = cursor
        .map(|token| token.updated_at.clone())
        .unwrap_or_else(|| "1970-01-01T00:00:00+00:00".to_owned());

    connection
        .execute(
            r#"
            INSERT INTO sync_cursor (scope, cursor, updated_at)
            VALUES (?1, ?2, ?3)
            ON CONFLICT(scope) DO UPDATE SET
                cursor = excluded.cursor,
                updated_at = excluded.updated_at
            "#,
            params![scope.to_owned(), payload, updated_at],
        )
        .await
        .map_err(|error| AppError::internal(format!("写入同步游标 {scope} 失败: {error}")))?;

    Ok(())
}

fn build_incremental_select_sql(table: EntityTable, cursor: Option<&CursorToken>) -> String {
    let mut sql = format!("SELECT {} FROM {}", table.columns.join(", "), table.name);
    let mut predicates = Vec::new();

    if !table.excluded_keys.is_empty() {
        let excluded = table
            .excluded_keys
            .iter()
            .map(|key| format!("'{}'", key.replace('\'', "''")))
            .collect::<Vec<_>>()
            .join(", ");
        predicates.push(format!(
            "{} NOT IN ({excluded})",
            table.primary_key_column()
        ));
    }

    if cursor.is_some() {
        predicates.push(format!(
            "({updated_at} > ?1 OR ({updated_at} = ?1 AND {pk} > ?2))",
            updated_at = table.updated_at_column(),
            pk = table.primary_key_column(),
        ));
    }

    if !predicates.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&predicates.join(" AND "));
    }

    sql.push_str(&format!(
        " ORDER BY {} ASC, {} ASC",
        table.updated_at_column(),
        table.primary_key_column()
    ));
    sql
}

fn build_tombstone_select_sql(cursor: Option<&CursorToken>) -> String {
    let actions = TOMBSTONE_ACTIONS
        .iter()
        .map(|action| format!("'{}'", action.replace('\'', "''")))
        .collect::<Vec<_>>()
        .join(", ");

    let mut sql = format!(
        "SELECT id, entity_type, entity_id, action, actor_type, source, summary, metadata, created_at \
         FROM activity_events WHERE action IN ({actions})"
    );

    if cursor.is_some() {
        sql.push_str(" AND (created_at > ?1 OR (created_at = ?1 AND id > ?2))");
    }

    sql.push_str(" ORDER BY created_at ASC, id ASC");
    sql
}

fn build_upsert_sql(table: EntityTable) -> String {
    let placeholders = (1..=table.columns.len())
        .map(|index| format!("?{index}"))
        .collect::<Vec<_>>()
        .join(", ");
    let updates = table
        .columns
        .iter()
        .filter(|column| **column != table.primary_key_column())
        .map(|column| format!("{column} = excluded.{column}"))
        .collect::<Vec<_>>()
        .join(", ");

    format!(
        "INSERT INTO {} ({}) VALUES ({}) ON CONFLICT({}) DO UPDATE SET {} WHERE excluded.{} >= {}.{}",
        table.name,
        table.columns.join(", "),
        placeholders,
        table.primary_key_column(),
        updates,
        table.updated_at_column(),
        table.name,
        table.updated_at_column()
    )
}

fn cursor_params(cursor: Option<&CursorToken>) -> Vec<LibsqlValue> {
    match cursor {
        Some(cursor) => vec![
            LibsqlValue::from(cursor.updated_at.clone()),
            LibsqlValue::from(cursor.primary_key.clone()),
        ],
        None => Vec::new(),
    }
}

fn libsql_value_to_json(value: LibsqlValue) -> Value {
    match value {
        LibsqlValue::Null => Value::Null,
        LibsqlValue::Integer(value) => Value::from(value),
        LibsqlValue::Real(value) => Value::from(value),
        LibsqlValue::Text(value) => Value::String(value),
        LibsqlValue::Blob(value) => Value::Array(value.into_iter().map(Value::from).collect()),
    }
}

fn json_values_to_libsql_params(values: &[Value]) -> Result<Vec<LibsqlValue>, AppError> {
    values.iter().map(json_value_to_libsql).collect()
}

fn json_value_to_libsql(value: &Value) -> Result<LibsqlValue, AppError> {
    Ok(match value {
        Value::Null => LibsqlValue::Null,
        Value::Bool(value) => LibsqlValue::from(*value),
        Value::Number(value) => {
            if let Some(number) = value.as_i64() {
                LibsqlValue::from(number)
            } else if let Some(number) = value.as_f64() {
                LibsqlValue::from(number)
            } else {
                return Err(AppError::internal("无法把 JSON number 转成 libsql 参数"));
            }
        }
        Value::String(value) => LibsqlValue::from(value.clone()),
        Value::Array(_) | Value::Object(_) => LibsqlValue::from(value.to_string()),
    })
}

fn json_value_to_required_string(
    value: &Value,
    table_name: &str,
    column_name: &str,
    source_label: &str,
) -> Result<String, AppError> {
    value.as_str().map(ToOwned::to_owned).ok_or_else(|| {
        AppError::internal(format!(
            "{source_label}表 {table_name} 的 {column_name} 不是合法字符串"
        ))
    })
}

impl RowSnapshot {
    fn cursor_token(&self) -> CursorToken {
        CursorToken {
            updated_at: self.updated_at.clone(),
            primary_key: self.primary_key.clone(),
        }
    }
}

#[cfg(test)]
mod tests {
    use libsql::{params, Builder, Connection};
    use tempfile::TempDir;

    use super::{
        apply_permanent_delete_tombstones, bootstrap_remote_schema, fetch_incremental_rows,
        fetch_incremental_tombstones, pull_all_entities, push_all_entities,
        push_permanent_delete_tombstones, read_cursor, write_cursor, CursorToken, EntityTable,
        ENTITY_TABLES,
    };

    async fn open_temp_local_connection() -> (TempDir, Connection) {
        let temp_dir = TempDir::new().expect("temp dir should create");
        let database_path = temp_dir.path().join("replicator-test.sqlite3");
        let database = Builder::new_local(database_path.as_path())
            .build()
            .await
            .expect("local database should build");
        let connection = database.connect().expect("local database should connect");

        connection
            .execute_batch(
                r#"
                CREATE TABLE IF NOT EXISTS spaces (
                    id TEXT PRIMARY KEY NOT NULL,
                    name TEXT NOT NULL,
                    icon_key TEXT NOT NULL,
                    color_key TEXT NOT NULL,
                    is_default INTEGER NOT NULL,
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
                    archived_by_type TEXT NULL,
                    archived_by_id TEXT NULL,
                    deleted_at TEXT NULL,
                    deleted_by_type TEXT NULL,
                    deleted_by_id TEXT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS tasks (
                    id TEXT PRIMARY KEY NOT NULL,
                    space_id TEXT NOT NULL,
                    project_id TEXT NULL,
                    title TEXT NOT NULL,
                    note TEXT NULL,
                    status TEXT NOT NULL,
                    status_changed_at TEXT NOT NULL,
                    priority INTEGER NOT NULL,
                    inbox_at TEXT NULL,
                    due_at TEXT NULL,
                    scheduled_at TEXT NULL,
                    reminder_at TEXT NULL,
                    sort_order INTEGER NOT NULL,
                    completed_at TEXT NULL,
                    canceled_at TEXT NULL,
                    archived_at TEXT NULL,
                    archived_by_type TEXT NULL,
                    archived_by_id TEXT NULL,
                    deleted_at TEXT NULL,
                    deleted_by_type TEXT NULL,
                    deleted_by_id TEXT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS task_links (
                    id TEXT PRIMARY KEY NOT NULL,
                    task_id TEXT NOT NULL,
                    title TEXT NOT NULL,
                    url TEXT NOT NULL,
                    sort_order INTEGER NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS views (
                    id TEXT PRIMARY KEY NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT NULL,
                    type TEXT NOT NULL,
                    entity_type TEXT NOT NULL,
                    key TEXT NULL,
                    filters TEXT NOT NULL,
                    sort TEXT NOT NULL,
                    group_by TEXT NULL,
                    is_visible INTEGER NOT NULL,
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
                    entity_type TEXT NOT NULL,
                    entity_id TEXT NOT NULL,
                    action TEXT NOT NULL,
                    actor_type TEXT NOT NULL,
                    source TEXT NOT NULL,
                    summary TEXT NULL,
                    metadata TEXT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS sync_cursor (
                    scope TEXT PRIMARY KEY NOT NULL,
                    cursor TEXT NULL,
                    updated_at TEXT NOT NULL
                );
                "#,
            )
            .await
            .expect("schema should create");

        (temp_dir, connection)
    }

    fn entity_table(name: &str) -> EntityTable {
        *ENTITY_TABLES
            .iter()
            .find(|table| table.name == name)
            .expect("table should exist")
    }

    #[tokio::test]
    async fn fetch_incremental_rows_should_skip_records_before_cursor() {
        let (_dir, connection) = open_temp_local_connection().await;
        connection
            .execute(
                "INSERT INTO spaces (id, name, icon_key, color_key, is_default, sort_order, archived_at, deleted_at, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![
                    "space-1",
                    "Alpha",
                    "home",
                    "green",
                    1,
                    0,
                    Option::<String>::None,
                    Option::<String>::None,
                    "2026-06-26T10:00:00+00:00",
                    "2026-06-26T10:00:00+00:00"
                ],
            )
            .await
            .expect("first row should insert");
        connection
            .execute(
                "INSERT INTO spaces (id, name, icon_key, color_key, is_default, sort_order, archived_at, deleted_at, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![
                    "space-2",
                    "Beta",
                    "star",
                    "blue",
                    0,
                    1,
                    Option::<String>::None,
                    Option::<String>::None,
                    "2026-06-26T10:00:01+00:00",
                    "2026-06-26T10:00:01+00:00"
                ],
            )
            .await
            .expect("second row should insert");

        let cursor = CursorToken {
            updated_at: "2026-06-26T10:00:00+00:00".to_owned(),
            primary_key: "space-1".to_owned(),
        };
        let rows =
            fetch_incremental_rows(&connection, entity_table("spaces"), Some(&cursor), "本地")
                .await
                .expect("incremental rows should load");

        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].primary_key, "space-2");
    }

    #[tokio::test]
    async fn push_and_pull_should_only_sync_new_rows_and_skip_sync_config() {
        let (_local_dir, local) = open_temp_local_connection().await;
        let (_remote_dir, remote) = open_temp_local_connection().await;
        bootstrap_remote_schema(&remote)
            .await
            .expect("remote schema should bootstrap");

        local
            .execute(
                "INSERT INTO spaces (id, name, icon_key, color_key, is_default, sort_order, archived_at, deleted_at, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![
                    "space-1",
                    "Alpha",
                    "home",
                    "green",
                    1,
                    0,
                    Option::<String>::None,
                    Option::<String>::None,
                    "2026-06-26T10:00:00+00:00",
                    "2026-06-26T10:00:00+00:00"
                ],
            )
            .await
            .expect("space should insert");
        local
            .execute(
                "INSERT INTO settings (key, value, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
                params![
                    "app.sync.config",
                    "{\"url\":\"libsql://x\",\"token\":\"y\"}",
                    "2026-06-26T10:00:00+00:00",
                    "2026-06-26T10:00:00+00:00"
                ],
            )
            .await
            .expect("sync config should insert");
        local
            .execute(
                "INSERT INTO settings (key, value, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)",
                params![
                    "app.ui.preferences",
                    "{\"compact\":true}",
                    "2026-06-26T10:00:00+00:00",
                    "2026-06-26T10:00:00+00:00"
                ],
            )
            .await
            .expect("ui setting should insert");

        push_all_entities(&local, &remote)
            .await
            .expect("initial push should succeed");
        push_all_entities(&local, &remote)
            .await
            .expect("second push should be noop");

        let mut rows = remote
            .query("SELECT key FROM settings ORDER BY key ASC", ())
            .await
            .expect("remote settings should query");
        let mut keys = Vec::new();
        while let Some(row) = rows.next().await.expect("row iteration should succeed") {
            keys.push(row.get::<String>(0).expect("setting key should read"));
        }
        assert_eq!(keys, vec!["app.ui.preferences"]);

        remote
            .execute(
                "INSERT INTO spaces (id, name, icon_key, color_key, is_default, sort_order, archived_at, deleted_at, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                params![
                    "space-2",
                    "Gamma",
                    "leaf",
                    "yellow",
                    0,
                    1,
                    Option::<String>::None,
                    Option::<String>::None,
                    "2026-06-26T10:00:02+00:00",
                    "2026-06-26T10:00:02+00:00"
                ],
            )
            .await
            .expect("remote space should insert");

        pull_all_entities(&local, &remote)
            .await
            .expect("pull should succeed");

        let mut local_rows = local
            .query("SELECT id FROM spaces ORDER BY id ASC", ())
            .await
            .expect("local spaces should query");
        let mut ids = Vec::new();
        while let Some(row) = local_rows
            .next()
            .await
            .expect("row iteration should succeed")
        {
            ids.push(row.get::<String>(0).expect("space id should read"));
        }
        assert_eq!(ids, vec!["space-1", "space-2"]);

        let push_cursor = read_cursor(&local, "push:spaces")
            .await
            .expect("push cursor should load")
            .expect("push cursor should exist");
        let pull_cursor = read_cursor(&local, "pull:spaces")
            .await
            .expect("pull cursor should load")
            .expect("pull cursor should exist");

        assert_eq!(push_cursor.primary_key, "space-1");
        assert_eq!(pull_cursor.primary_key, "space-2");
    }

    #[tokio::test]
    async fn task_links_should_sync_incrementally() {
        let (_local_dir, local) = open_temp_local_connection().await;
        let (_remote_dir, remote) = open_temp_local_connection().await;
        bootstrap_remote_schema(&remote)
            .await
            .expect("remote schema should bootstrap");

        local
            .execute(
                "INSERT INTO task_links (id, task_id, title, url, sort_order, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    "link-1",
                    "task-1",
                    "Docs",
                    "https://example.com/docs",
                    1000,
                    "2026-06-26T10:00:00+00:00",
                    "2026-06-26T10:00:00+00:00"
                ],
            )
            .await
            .expect("task link should insert");

        push_all_entities(&local, &remote)
            .await
            .expect("task link push should succeed");

        remote
            .execute(
                "INSERT INTO task_links (id, task_id, title, url, sort_order, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    "link-2",
                    "task-1",
                    "Roadmap",
                    "https://example.com/roadmap",
                    2000,
                    "2026-06-26T10:00:01+00:00",
                    "2026-06-26T10:00:01+00:00"
                ],
            )
            .await
            .expect("remote task link should insert");

        pull_all_entities(&local, &remote)
            .await
            .expect("task link pull should succeed");

        let mut rows = local
            .query("SELECT id FROM task_links ORDER BY id ASC", ())
            .await
            .expect("local task links should query");
        let mut ids = Vec::new();
        while let Some(row) = rows.next().await.expect("row iteration should succeed") {
            ids.push(row.get::<String>(0).expect("task link id should read"));
        }

        assert_eq!(ids, vec!["link-1", "link-2"]);
    }

    #[tokio::test]
    async fn tombstone_sync_should_advance_incrementally() {
        let (_local_dir, local) = open_temp_local_connection().await;
        let (_remote_dir, remote) = open_temp_local_connection().await;
        bootstrap_remote_schema(&remote)
            .await
            .expect("remote schema should bootstrap");

        local
            .execute(
                "INSERT INTO tasks (id, space_id, project_id, title, note, status, status_changed_at, priority, inbox_at, due_at, scheduled_at, reminder_at, sort_order, completed_at, canceled_at, archived_at, archived_by_type, archived_by_id, deleted_at, deleted_by_type, deleted_by_id, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23)",
                params![
                    "task-1",
                    "space-1",
                    Option::<String>::None,
                    "Task 1",
                    Option::<String>::None,
                    "todo",
                    "2026-06-26T10:00:00+00:00",
                    1,
                    Option::<String>::None,
                    Option::<String>::None,
                    Option::<String>::None,
                    Option::<String>::None,
                    0,
                    Option::<String>::None,
                    Option::<String>::None,
                    Option::<String>::None,
                    Option::<String>::None,
                    Option::<String>::None,
                    Option::<String>::None,
                    Option::<String>::None,
                    Option::<String>::None,
                    "2026-06-26T10:00:00+00:00",
                    "2026-06-26T10:00:00+00:00"
                ],
            )
            .await
            .expect("task should insert");
        local
            .execute(
                "INSERT INTO task_links (id, task_id, title, url, sort_order, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                params![
                    "link-1",
                    "task-1",
                    "Docs",
                    "https://example.com/docs",
                    1000,
                    "2026-06-26T10:00:00+00:00",
                    "2026-06-26T10:00:00+00:00"
                ],
            )
            .await
            .expect("task link should insert");
        local
            .execute(
                "INSERT INTO activity_events (id, entity_type, entity_id, action, actor_type, source, summary, metadata, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                params![
                    "event-1",
                    "task",
                    "task-1",
                    "task.permanently_deleted",
                    "user",
                    "app",
                    Option::<String>::None,
                    Option::<String>::None,
                    "2026-06-26T10:00:01+00:00"
                ],
            )
            .await
            .expect("tombstone should insert");
        local
            .execute(
                "INSERT INTO activity_events (id, entity_type, entity_id, action, actor_type, source, summary, metadata, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                params![
                    "event-2",
                    "task",
                    "task-1",
                    "task.link.removed",
                    "user",
                    "app",
                    Option::<String>::None,
                    Some("{\"taskId\":\"task-1\",\"linkId\":\"link-1\",\"title\":\"Docs\",\"url\":\"https://example.com/docs\"}".to_owned()),
                    "2026-06-26T10:00:02+00:00"
                ],
            )
            .await
            .expect("task link tombstone should insert");

        push_permanent_delete_tombstones(&local, &remote)
            .await
            .expect("tombstone push should succeed");
        push_permanent_delete_tombstones(&local, &remote)
            .await
            .expect("second tombstone push should be noop");

        let remote_tombstones = fetch_incremental_tombstones(&remote, None, "Turso")
            .await
            .expect("remote tombstones should load");
        assert_eq!(remote_tombstones.len(), 2);

        apply_permanent_delete_tombstones(&local, &remote)
            .await
            .expect("tombstone pull should succeed");

        let mut rows = local
            .query("SELECT id FROM tasks WHERE id = ?1", params!["task-1"])
            .await
            .expect("task lookup should run");
        assert!(rows
            .next()
            .await
            .expect("row iteration should succeed")
            .is_none());
        let mut link_rows = local
            .query("SELECT id FROM task_links WHERE id = ?1", params!["link-1"])
            .await
            .expect("task link lookup should run");
        assert!(link_rows
            .next()
            .await
            .expect("row iteration should succeed")
            .is_none());

        let cursor = read_cursor(&local, "pull:tombstones")
            .await
            .expect("pull tombstone cursor should load")
            .expect("pull tombstone cursor should exist");
        assert_eq!(cursor.primary_key, "event-2");

        write_cursor(
            &local,
            "manual:test",
            Some(&CursorToken {
                updated_at: "2026-06-26T11:00:00+00:00".to_owned(),
                primary_key: "abc".to_owned(),
            }),
        )
        .await
        .expect("manual cursor write should succeed");
        let cursor = read_cursor(&local, "manual:test")
            .await
            .expect("manual cursor read should succeed");
        assert!(cursor.is_some());
    }
}

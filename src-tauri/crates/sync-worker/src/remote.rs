//! Turso 远端连接、表结构与 operation log 读写。

use std::path::Path;

use libsql::{params, Builder, Connection, Transaction};

use crate::{
    error::SyncWorkerError,
    schema::{
        ProjectPayload, REMOTE_SCHEMA_STATEMENTS, RemoteChangeKind, RemoteChangeRecord,
        RemoteOperationRecord, SettingPayload, SpacePayload, SyncAction, SyncOperationPayload,
        TaskLinkPayload, TaskPayload, ViewPayload,
    },
    types::SyncRemoteConfig,
};

const SYNC_CONFIG_SETTING_KEY: &str = "app.sync.config";

pub async fn open_local_sqlite(database_path: &str) -> Result<Connection, SyncWorkerError> {
    let database = Builder::new_local(Path::new(database_path))
        .build()
        .await
        .map_err(|error| SyncWorkerError::local_database(format!("打开本地 SQLite 失败: {error}")))?;

    database
        .connect()
        .map_err(|error| SyncWorkerError::local_database(format!("连接本地 SQLite 失败: {error}")))
}

pub async fn fetch_v2_changes_after(
    remote: &Connection,
    after_server_seq: i64,
    limit: i64,
) -> Result<Vec<RemoteChangeRecord>, SyncWorkerError> {
    let mut rows = remote
        .query(
            r#"
            SELECT server_seq, entity_type, entity_id, change_kind, patch,
                   changed_by_client_id, changed_by_client_seq, committed_at
            FROM remote_change_log
            WHERE server_seq > ?1
            ORDER BY server_seq ASC
            LIMIT ?2
            "#,
            params![after_server_seq, limit],
        )
        .await
        .map_err(|error| SyncWorkerError::remote_database(format!("读取远端 remote_change_log 失败: {error}")))?;
    let mut changes = Vec::new();

    while let Some(row) = rows
        .next()
        .await
        .map_err(|error| SyncWorkerError::remote_database(format!("遍历远端 remote_change_log 失败: {error}")))?
    {
        let change_kind = RemoteChangeKind::parse(
            row.get::<String>(3)
                .map_err(remote_column_error("remote_change_log.change_kind"))?
                .as_str(),
        )?;
        let patch_raw = row
            .get::<Option<String>>(4)
            .map_err(remote_column_error("remote_change_log.patch"))?;
        let patch = patch_raw
            .map(|raw| {
                serde_json::from_str::<SyncOperationPayload>(&raw).map_err(|error| {
                    SyncWorkerError::serialization(format!("解析 remote_change_log.patch 失败: {error}"))
                })
            })
            .transpose()?;

        changes.push(RemoteChangeRecord {
            server_seq: row
                .get::<i64>(0)
                .map_err(remote_column_error("remote_change_log.server_seq"))?,
            entity_type: row
                .get::<String>(1)
                .map_err(remote_column_error("remote_change_log.entity_type"))?,
            entity_id: row
                .get::<String>(2)
                .map_err(remote_column_error("remote_change_log.entity_id"))?,
            change_kind,
            patch,
            changed_by_client_id: row
                .get::<String>(5)
                .map_err(remote_column_error("remote_change_log.changed_by_client_id"))?,
            changed_by_client_seq: row
                .get::<i64>(6)
                .map_err(remote_column_error("remote_change_log.changed_by_client_seq"))?,
            committed_at: row
                .get::<String>(7)
                .map_err(remote_column_error("remote_change_log.committed_at"))?,
        });
    }

    Ok(changes)
}

pub async fn fetch_latest_v2_server_seq(remote: &Connection) -> Result<Option<i64>, SyncWorkerError> {
    let mut rows = remote
        .query("SELECT MAX(server_seq) FROM remote_change_log LIMIT 1", params![])
        .await
        .map_err(|error| SyncWorkerError::remote_database(format!("读取远端最新 server_seq 失败: {error}")))?;
    let row = rows
        .next()
        .await
        .map_err(|error| SyncWorkerError::remote_database(format!("遍历远端最新 server_seq 失败: {error}")))?;

    row.map(|row| {
        row.get::<Option<i64>>(0).map_err(|error| {
            SyncWorkerError::remote_database(format!(
                "读取远端 remote_change_log.max(server_seq) 失败: {error}"
            ))
        })
    })
    .transpose()
    .map(Option::flatten)
}

pub async fn open_remote(remote_config: &SyncRemoteConfig) -> Result<Connection, SyncWorkerError> {
    let database = Builder::new_remote(remote_config.url.clone(), remote_config.token.clone())
        .build()
        .await
        .map_err(map_remote_connect_error)?;

    database
        .connect()
        .map_err(|error| SyncWorkerError::remote_database(format!("连接 Turso 远端失败: {error}")))
}

pub async fn bootstrap_remote_schema(remote: &Connection) -> Result<(), SyncWorkerError> {
    for statement in REMOTE_SCHEMA_STATEMENTS {
        remote
            .execute(statement, params![])
            .await
            .map_err(|error| {
                SyncWorkerError::remote_database(format!(
                    "初始化 Turso 远端表结构失败: {error}"
                ))
            })?;
    }

    Ok(())
}

pub async fn insert_operation_if_absent(
    transaction: &Transaction,
    operation: &RemoteOperationRecord,
) -> Result<bool, SyncWorkerError> {
    let payload = serde_json::to_string(&operation.payload)
        .map_err(|error| SyncWorkerError::serialization(format!("序列化 sync payload 失败: {error}")))?;
    let changed = transaction
        .execute(
            r#"
            INSERT OR IGNORE INTO sync_operations(
                op_id, device_id, entity_type, entity_id, action, payload, committed_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            "#,
            params![
                operation.op_id.clone(),
                operation.device_id.clone(),
                operation.entity_type.clone(),
                operation.entity_id.clone(),
                operation.action.as_str(),
                payload,
                operation.committed_at.clone(),
            ],
        )
        .await
        .map_err(|error| SyncWorkerError::remote_database(format!("写入远端 sync_operations 失败: {error}")))?;

    Ok(changed > 0)
}

pub async fn fetch_operations_after(
    remote: &Connection,
    after_remote_cursor: Option<i64>,
    limit: i64,
) -> Result<Vec<RemoteOperationRecord>, SyncWorkerError> {
    let mut rows = remote
        .query(
            r#"
            SELECT remote_cursor, op_id, device_id, entity_type, entity_id, action, payload, committed_at
            FROM sync_operations
            WHERE (?1 IS NULL OR remote_cursor > ?1)
            ORDER BY remote_cursor ASC
            LIMIT ?2
            "#,
            params![after_remote_cursor, limit],
        )
        .await
        .map_err(|error| SyncWorkerError::remote_database(format!("读取远端 sync_operations 失败: {error}")))?;
    let mut operations = Vec::new();

    while let Some(row) = rows
        .next()
        .await
        .map_err(|error| SyncWorkerError::remote_database(format!("遍历远端 sync_operations 失败: {error}")))?
    {
        let action = match row
            .get::<String>(5)
            .map_err(|error| SyncWorkerError::remote_database(format!("读取远端 operation.action 失败: {error}")))?
            .as_str()
        {
            "upsert" => SyncAction::Upsert,
            "delete" => SyncAction::Delete,
            other => {
                return Err(SyncWorkerError::protocol(format!(
                    "远端 sync_operations.action 非法: {other}"
                )));
            }
        };
        let payload_raw = row
            .get::<String>(6)
            .map_err(|error| SyncWorkerError::remote_database(format!("读取远端 operation.payload 失败: {error}")))?;
        let payload = serde_json::from_str::<SyncOperationPayload>(&payload_raw)
            .map_err(|error| SyncWorkerError::serialization(format!("解析远端 sync payload 失败: {error}")))?;
        operations.push(RemoteOperationRecord {
            remote_cursor: row
                .get::<i64>(0)
                .map_err(|error| SyncWorkerError::remote_database(format!("读取远端 operation.remote_cursor 失败: {error}")))?,
            op_id: row
                .get::<String>(1)
                .map_err(|error| SyncWorkerError::remote_database(format!("读取远端 operation.op_id 失败: {error}")))?,
            device_id: row
                .get::<String>(2)
                .map_err(|error| SyncWorkerError::remote_database(format!("读取远端 operation.device_id 失败: {error}")))?,
            entity_type: row
                .get::<String>(3)
                .map_err(|error| SyncWorkerError::remote_database(format!("读取远端 operation.entity_type 失败: {error}")))?,
            entity_id: row
                .get::<String>(4)
                .map_err(|error| SyncWorkerError::remote_database(format!("读取远端 operation.entity_id 失败: {error}")))?,
            action,
            payload,
            committed_at: row
                .get::<String>(7)
                .map_err(|error| SyncWorkerError::remote_database(format!("读取远端 operation.committed_at 失败: {error}")))?,
        });
    }

    Ok(operations)
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RemoteRestoreSnapshot {
    pub latest_remote_cursor: Option<i64>,
    pub spaces: Vec<SpacePayload>,
    pub projects: Vec<ProjectPayload>,
    pub tasks: Vec<TaskPayload>,
    pub task_links: Vec<TaskLinkPayload>,
    pub views: Vec<ViewPayload>,
    pub settings: Vec<SettingPayload>,
}

pub async fn fetch_restore_snapshot(
    remote: &Connection,
) -> Result<RemoteRestoreSnapshot, SyncWorkerError> {
    Ok(RemoteRestoreSnapshot {
        latest_remote_cursor: fetch_latest_remote_cursor(remote).await?,
        spaces: fetch_spaces(remote).await?,
        projects: fetch_projects(remote).await?,
        tasks: fetch_tasks(remote).await?,
        task_links: fetch_task_links(remote).await?,
        views: fetch_views(remote).await?,
        settings: fetch_settings(remote).await?,
    })
}

async fn fetch_latest_remote_cursor(remote: &Connection) -> Result<Option<i64>, SyncWorkerError> {
    let mut rows = remote
        .query(
            "SELECT MAX(remote_cursor) FROM sync_operations LIMIT 1",
            params![],
        )
        .await
        .map_err(|error| {
            SyncWorkerError::remote_database(format!("读取远端最新 remote_cursor 失败: {error}"))
        })?;
    let row = rows
        .next()
        .await
        .map_err(|error| {
            SyncWorkerError::remote_database(format!("遍历远端最新 remote_cursor 失败: {error}"))
        })?;

    row.map(|row| {
        row.get::<Option<i64>>(0).map_err(|error| {
            SyncWorkerError::remote_database(format!(
                "读取远端 sync_operations.max(remote_cursor) 失败: {error}"
            ))
        })
    })
    .transpose()
    .map(Option::flatten)
}

async fn fetch_spaces(remote: &Connection) -> Result<Vec<SpacePayload>, SyncWorkerError> {
    let mut rows = remote
        .query(
            r#"
            SELECT id, name, icon_key, color_key, is_default, sort_order, archived_at, deleted_at, created_at, updated_at
            FROM spaces
            ORDER BY sort_order ASC, created_at ASC, id ASC
            "#,
            params![],
        )
        .await
        .map_err(|error| SyncWorkerError::remote_database(format!("读取远端 spaces 失败: {error}")))?;
    let mut records = Vec::new();

    while let Some(row) = rows.next().await.map_err(remote_row_walk_error("spaces"))? {
        records.push(SpacePayload {
            id: row.get::<String>(0).map_err(remote_column_error("spaces.id"))?,
            name: row.get::<String>(1).map_err(remote_column_error("spaces.name"))?,
            icon_key: row
                .get::<String>(2)
                .map_err(remote_column_error("spaces.icon_key"))?,
            color_key: row
                .get::<String>(3)
                .map_err(remote_column_error("spaces.color_key"))?,
            is_default: row
                .get::<i64>(4)
                .map_err(remote_column_error("spaces.is_default"))?
                != 0,
            sort_order: row
                .get::<i32>(5)
                .map_err(remote_column_error("spaces.sort_order"))?,
            archived_at: row
                .get::<Option<String>>(6)
                .map_err(remote_column_error("spaces.archived_at"))?,
            deleted_at: row
                .get::<Option<String>>(7)
                .map_err(remote_column_error("spaces.deleted_at"))?,
            created_at: row
                .get::<String>(8)
                .map_err(remote_column_error("spaces.created_at"))?,
            updated_at: row
                .get::<String>(9)
                .map_err(remote_column_error("spaces.updated_at"))?,
        });
    }

    Ok(records)
}

async fn fetch_projects(remote: &Connection) -> Result<Vec<ProjectPayload>, SyncWorkerError> {
    let mut rows = remote
        .query(
            r#"
            SELECT id, space_id, name, description, due_at, sort_order, completed_at, archived_at, deleted_at, created_at, updated_at
            FROM projects
            ORDER BY sort_order ASC, created_at ASC, id ASC
            "#,
            params![],
        )
        .await
        .map_err(|error| SyncWorkerError::remote_database(format!("读取远端 projects 失败: {error}")))?;
    let mut records = Vec::new();

    while let Some(row) = rows.next().await.map_err(remote_row_walk_error("projects"))? {
        records.push(ProjectPayload {
            id: row.get::<String>(0).map_err(remote_column_error("projects.id"))?,
            space_id: row
                .get::<String>(1)
                .map_err(remote_column_error("projects.space_id"))?,
            name: row.get::<String>(2).map_err(remote_column_error("projects.name"))?,
            description: row
                .get::<Option<String>>(3)
                .map_err(remote_column_error("projects.description"))?,
            due_at: row
                .get::<Option<String>>(4)
                .map_err(remote_column_error("projects.due_at"))?,
            sort_order: row
                .get::<i32>(5)
                .map_err(remote_column_error("projects.sort_order"))?,
            completed_at: row
                .get::<Option<String>>(6)
                .map_err(remote_column_error("projects.completed_at"))?,
            archived_at: row
                .get::<Option<String>>(7)
                .map_err(remote_column_error("projects.archived_at"))?,
            deleted_at: row
                .get::<Option<String>>(8)
                .map_err(remote_column_error("projects.deleted_at"))?,
            created_at: row
                .get::<String>(9)
                .map_err(remote_column_error("projects.created_at"))?,
            updated_at: row
                .get::<String>(10)
                .map_err(remote_column_error("projects.updated_at"))?,
        });
    }

    Ok(records)
}

async fn fetch_tasks(remote: &Connection) -> Result<Vec<TaskPayload>, SyncWorkerError> {
    let mut rows = remote
        .query(
            r#"
            SELECT id, space_id, project_id, title, note, status, status_changed_at, priority, inbox_at, due_at, scheduled_at, reminder_at, sort_order, completed_at, canceled_at, archived_at, deleted_at, created_at, updated_at
            FROM tasks
            ORDER BY sort_order ASC, created_at ASC, id ASC
            "#,
            params![],
        )
        .await
        .map_err(|error| SyncWorkerError::remote_database(format!("读取远端 tasks 失败: {error}")))?;
    let mut records = Vec::new();

    while let Some(row) = rows.next().await.map_err(remote_row_walk_error("tasks"))? {
        records.push(TaskPayload {
            id: row.get::<String>(0).map_err(remote_column_error("tasks.id"))?,
            space_id: row
                .get::<String>(1)
                .map_err(remote_column_error("tasks.space_id"))?,
            project_id: row
                .get::<Option<String>>(2)
                .map_err(remote_column_error("tasks.project_id"))?,
            title: row.get::<String>(3).map_err(remote_column_error("tasks.title"))?,
            note: row
                .get::<Option<String>>(4)
                .map_err(remote_column_error("tasks.note"))?,
            status: row.get::<String>(5).map_err(remote_column_error("tasks.status"))?,
            status_changed_at: row
                .get::<String>(6)
                .map_err(remote_column_error("tasks.status_changed_at"))?,
            priority: row
                .get::<i32>(7)
                .map_err(remote_column_error("tasks.priority"))?,
            inbox_at: row
                .get::<Option<String>>(8)
                .map_err(remote_column_error("tasks.inbox_at"))?,
            due_at: row
                .get::<Option<String>>(9)
                .map_err(remote_column_error("tasks.due_at"))?,
            scheduled_at: row
                .get::<Option<String>>(10)
                .map_err(remote_column_error("tasks.scheduled_at"))?,
            reminder_at: row
                .get::<Option<String>>(11)
                .map_err(remote_column_error("tasks.reminder_at"))?,
            sort_order: row
                .get::<i32>(12)
                .map_err(remote_column_error("tasks.sort_order"))?,
            completed_at: row
                .get::<Option<String>>(13)
                .map_err(remote_column_error("tasks.completed_at"))?,
            canceled_at: row
                .get::<Option<String>>(14)
                .map_err(remote_column_error("tasks.canceled_at"))?,
            archived_at: row
                .get::<Option<String>>(15)
                .map_err(remote_column_error("tasks.archived_at"))?,
            deleted_at: row
                .get::<Option<String>>(16)
                .map_err(remote_column_error("tasks.deleted_at"))?,
            created_at: row
                .get::<String>(17)
                .map_err(remote_column_error("tasks.created_at"))?,
            updated_at: row
                .get::<String>(18)
                .map_err(remote_column_error("tasks.updated_at"))?,
        });
    }

    Ok(records)
}

async fn fetch_task_links(remote: &Connection) -> Result<Vec<TaskLinkPayload>, SyncWorkerError> {
    let mut rows = remote
        .query(
            r#"
            SELECT id, task_id, title, url, sort_order, created_at, updated_at
            FROM task_links
            ORDER BY sort_order ASC, created_at ASC, id ASC
            "#,
            params![],
        )
        .await
        .map_err(|error| SyncWorkerError::remote_database(format!("读取远端 task_links 失败: {error}")))?;
    let mut records = Vec::new();

    while let Some(row) = rows.next().await.map_err(remote_row_walk_error("task_links"))? {
        records.push(TaskLinkPayload {
            id: row.get::<String>(0).map_err(remote_column_error("task_links.id"))?,
            task_id: row
                .get::<String>(1)
                .map_err(remote_column_error("task_links.task_id"))?,
            title: row
                .get::<String>(2)
                .map_err(remote_column_error("task_links.title"))?,
            url: row.get::<String>(3).map_err(remote_column_error("task_links.url"))?,
            sort_order: row
                .get::<i32>(4)
                .map_err(remote_column_error("task_links.sort_order"))?,
            created_at: row
                .get::<String>(5)
                .map_err(remote_column_error("task_links.created_at"))?,
            updated_at: row
                .get::<String>(6)
                .map_err(remote_column_error("task_links.updated_at"))?,
        });
    }

    Ok(records)
}

async fn fetch_views(remote: &Connection) -> Result<Vec<ViewPayload>, SyncWorkerError> {
    let mut rows = remote
        .query(
            r#"
            SELECT id, name, description, type, entity_type, key, filters, sort, group_by, is_visible, sort_order, created_at, updated_at
            FROM views
            ORDER BY sort_order ASC, created_at ASC, id ASC
            "#,
            params![],
        )
        .await
        .map_err(|error| SyncWorkerError::remote_database(format!("读取远端 views 失败: {error}")))?;
    let mut records = Vec::new();

    while let Some(row) = rows.next().await.map_err(remote_row_walk_error("views"))? {
        records.push(ViewPayload {
            id: row.get::<String>(0).map_err(remote_column_error("views.id"))?,
            name: row.get::<String>(1).map_err(remote_column_error("views.name"))?,
            description: row
                .get::<Option<String>>(2)
                .map_err(remote_column_error("views.description"))?,
            kind: row.get::<String>(3).map_err(remote_column_error("views.type"))?,
            entity_type: row
                .get::<String>(4)
                .map_err(remote_column_error("views.entity_type"))?,
            key: row
                .get::<Option<String>>(5)
                .map_err(remote_column_error("views.key"))?,
            filters: row
                .get::<String>(6)
                .map_err(remote_column_error("views.filters"))?,
            sort: row.get::<String>(7).map_err(remote_column_error("views.sort"))?,
            group_by: row
                .get::<Option<String>>(8)
                .map_err(remote_column_error("views.group_by"))?,
            is_visible: row
                .get::<i64>(9)
                .map_err(remote_column_error("views.is_visible"))?
                != 0,
            sort_order: row
                .get::<i32>(10)
                .map_err(remote_column_error("views.sort_order"))?,
            created_at: row
                .get::<String>(11)
                .map_err(remote_column_error("views.created_at"))?,
            updated_at: row
                .get::<String>(12)
                .map_err(remote_column_error("views.updated_at"))?,
        });
    }

    Ok(records)
}

async fn fetch_settings(remote: &Connection) -> Result<Vec<SettingPayload>, SyncWorkerError> {
    let mut rows = remote
        .query(
            r#"
            SELECT key, value, updated_at
            FROM settings
            WHERE key <> ?1
            ORDER BY key ASC
            "#,
            params![SYNC_CONFIG_SETTING_KEY],
        )
        .await
        .map_err(|error| SyncWorkerError::remote_database(format!("读取远端 settings 失败: {error}")))?;
    let mut records = Vec::new();

    while let Some(row) = rows.next().await.map_err(remote_row_walk_error("settings"))? {
        records.push(SettingPayload {
            key: row.get::<String>(0).map_err(remote_column_error("settings.key"))?,
            raw_value: row
                .get::<String>(1)
                .map_err(remote_column_error("settings.value"))?,
            updated_at: row
                .get::<String>(2)
                .map_err(remote_column_error("settings.updated_at"))?,
        });
    }

    Ok(records)
}

fn remote_row_walk_error(table: &'static str) -> impl FnOnce(libsql::Error) -> SyncWorkerError {
    move |error| SyncWorkerError::remote_database(format!("遍历远端 {table} 失败: {error}"))
}

fn remote_column_error(column: &'static str) -> impl FnOnce(libsql::Error) -> SyncWorkerError {
    move |error| SyncWorkerError::remote_database(format!("读取远端 {column} 失败: {error}"))
}

fn map_remote_connect_error(error: libsql::Error) -> SyncWorkerError {
    let message = error.to_string();
    if message.contains("401 Unauthorized") || message.contains("invalid JWT token") {
        return SyncWorkerError::authentication(
            "Turso 鉴权失败，请确认当前保存的 token 是该数据库对应的 auth token。",
        );
    }

    SyncWorkerError::remote_database(format!("初始化 Turso 远端连接失败: {message}"))
}

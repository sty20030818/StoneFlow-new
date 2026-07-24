//! 首次绑定空云端时：把本机已有实体灌进 Outbox，作为上传基线。

use sea_orm::{ConnectionTrait, DatabaseBackend, Statement};
use serde_json::{json, Map, Value};
use stoneflow_application::operation::{
    OutboxEnqueueRecord, OutboxOpKind, OutboxPayload, SyncEntityKind,
};
use stoneflow_domain::now_utc;
use stoneflow_storage::{database::DatabaseRuntimeState, repositories::OutboxRepository};
use uuid::Uuid;

use crate::app::error::AppError;

const SERVER_SEQ_CURSOR_SCOPE: &str = "sync:last_pulled_server_seq";
const ORIGIN_SEED_SCOPE: &str = "sync:origin_seed_done";
const LAST_RESTORE_AT_SCOPE: &str = "sync:last_restore_at";

/// 换绑空云端 / 云端被清空时：清掉本机同步位置与「已灌库」标记，允许再次 origin seed。
/// 不删业务数据、不删 device_id；仅清理历史 origin-seed 待传条目以免重复灌库。
pub async fn reset_origin_binding_for_reseed(
    database: &DatabaseRuntimeState,
) -> Result<(), AppError> {
    let connection = database.connection();
    for scope in [
        SERVER_SEQ_CURSOR_SCOPE,
        ORIGIN_SEED_SCOPE,
        LAST_RESTORE_AT_SCOPE,
    ] {
        connection
            .execute_raw(Statement::from_sql_and_values(
                DatabaseBackend::Sqlite,
                "DELETE FROM sync_cursors WHERE scope = ?",
                [scope.into()],
            ))
            .await
            .map_err(|error| {
                AppError::database(format!("清除同步绑定标记失败 ({scope}): {error}"))
            })?;
    }
    connection
        .execute_raw(Statement::from_string(
            DatabaseBackend::Sqlite,
            r#"
            DELETE FROM outbox
            WHERE operation_id LIKE 'origin-seed:%'
               OR operation_id LIKE 'r7-default-space:%'
            "#
            .to_owned(),
        ))
        .await
        .map_err(|error| AppError::database(format!("清除历史灌库 outbox 失败: {error}")))?;
    log::info!("同步:已清除序号/灌库标记（准备向当前云端重新灌库）");
    Ok(())
}

/// 若本机尚无同步 cursor、且还没做过 origin seed，则把存活实体写入 Outbox。
///
/// 返回写入条数。幂等：已 seed 或已有 cursor 时返回 0。
/// 换绑空云端前须先调用 [`reset_origin_binding_for_reseed`]。
pub async fn seed_origin_outbox_if_needed(
    database: &DatabaseRuntimeState,
) -> Result<usize, AppError> {
    if has_setting(database, SERVER_SEQ_CURSOR_SCOPE).await? {
        return Ok(0);
    }
    if has_setting(database, ORIGIN_SEED_SCOPE).await? {
        return Ok(0);
    }

    let connection = database.connection();
    let outbox = OutboxRepository::new(connection.clone());
    let now = now_utc().to_rfc3339();
    let mut seeded = 0usize;

    // 顺序：space → project → task → task_link → view（引用依赖）
    seeded += seed_spaces(connection, &outbox, &now).await?;
    seeded += seed_projects(connection, &outbox, &now).await?;
    seeded += seed_tasks(connection, &outbox, &now).await?;
    seeded += seed_task_links(connection, &outbox, &now).await?;
    seeded += seed_views(connection, &outbox, &now).await?;

    write_setting(connection, ORIGIN_SEED_SCOPE, &now, &now).await?;
    if seeded > 0 {
        log::info!("同步:首次灌库 {seeded} 条");
    }
    Ok(seeded)
}

async fn seed_spaces(
    connection: &impl ConnectionTrait,
    outbox: &OutboxRepository,
    now: &str,
) -> Result<usize, AppError> {
    let rows = connection
        .query_all_raw(Statement::from_string(
            DatabaseBackend::Sqlite,
            r#"
            SELECT id, name, icon_key, color_key, position, generation, created_at, updated_at
            FROM spaces
            WHERE deleted_at IS NULL
            ORDER BY position ASC, id ASC
            "#
            .to_owned(),
        ))
        .await
        .map_err(|error| AppError::database(format!("origin seed 读取 spaces 失败: {error}")))?;

    let mut count = 0;
    for row in rows {
        let id: String = row.try_get("", "id")?;
        let fields = map_of([
            ("name", json!(row.try_get::<String>("", "name")?)),
            ("icon_key", json!(row.try_get::<String>("", "icon_key")?)),
            ("color_key", json!(row.try_get::<String>("", "color_key")?)),
            ("position", json!(row.try_get::<i64>("", "position")?)),
            (
                "created_at",
                json!(row.try_get::<String>("", "created_at")?),
            ),
            (
                "updated_at",
                json!(row.try_get::<String>("", "updated_at")?),
            ),
        ]);
        enqueue(
            outbox,
            SyncEntityKind::Space,
            &id,
            row.try_get("", "generation")?,
            fields,
            now,
        )
        .await?;
        count += 1;
    }
    Ok(count)
}

async fn seed_projects(
    connection: &impl ConnectionTrait,
    outbox: &OutboxRepository,
    now: &str,
) -> Result<usize, AppError> {
    let rows = connection
        .query_all_raw(Statement::from_string(
            DatabaseBackend::Sqlite,
            r#"
            SELECT id, space_id, name, description, status, priority, planned_at, due_at, remind_at,
                   status_changed_at, completed_at, position, generation, created_at, updated_at
            FROM projects
            WHERE deleted_at IS NULL
            ORDER BY position ASC, id ASC
            "#
            .to_owned(),
        ))
        .await
        .map_err(|error| AppError::database(format!("origin seed 读取 projects 失败: {error}")))?;

    let mut count = 0;
    for row in rows {
        let id: String = row.try_get("", "id")?;
        let created_at: String = row.try_get("", "created_at")?;
        let status_changed_at: String = row
            .try_get::<Option<String>>("", "status_changed_at")?
            .unwrap_or_else(|| created_at.clone());
        let fields = map_of([
            ("space_id", json!(row.try_get::<String>("", "space_id")?)),
            ("name", json!(row.try_get::<String>("", "name")?)),
            (
                "description",
                json!(row.try_get::<Option<String>>("", "description")?),
            ),
            ("status", json!(row.try_get::<String>("", "status")?)),
            ("priority", json!(row.try_get::<i64>("", "priority")?)),
            (
                "planned_at",
                json!(row.try_get::<Option<String>>("", "planned_at")?),
            ),
            (
                "due_at",
                json!(row.try_get::<Option<String>>("", "due_at")?),
            ),
            (
                "remind_at",
                json!(row.try_get::<Option<String>>("", "remind_at")?),
            ),
            ("status_changed_at", json!(status_changed_at)),
            (
                "completed_at",
                json!(row.try_get::<Option<String>>("", "completed_at")?),
            ),
            ("position", json!(row.try_get::<i64>("", "position")?)),
            ("created_at", json!(created_at)),
            (
                "updated_at",
                json!(row.try_get::<String>("", "updated_at")?),
            ),
        ]);
        enqueue(
            outbox,
            SyncEntityKind::Project,
            &id,
            row.try_get("", "generation")?,
            fields,
            now,
        )
        .await?;
        count += 1;
    }
    Ok(count)
}

async fn seed_tasks(
    connection: &impl ConnectionTrait,
    outbox: &OutboxRepository,
    now: &str,
) -> Result<usize, AppError> {
    let rows = connection
        .query_all_raw(Statement::from_string(
            DatabaseBackend::Sqlite,
            r#"
            SELECT id, space_id, project_id, title, note, status, priority, planned_at, due_at, remind_at,
                   status_changed_at, completed_at, position, generation, created_at, updated_at
            FROM tasks
            WHERE deleted_at IS NULL
            ORDER BY position ASC, id ASC
            "#
            .to_owned(),
        ))
        .await
        .map_err(|error| AppError::database(format!("origin seed 读取 tasks 失败: {error}")))?;

    let mut count = 0;
    for row in rows {
        let id: String = row.try_get("", "id")?;
        let created_at: String = row.try_get("", "created_at")?;
        let status_changed_at: String = row
            .try_get::<Option<String>>("", "status_changed_at")?
            .unwrap_or_else(|| created_at.clone());
        let fields = map_of([
            ("space_id", json!(row.try_get::<String>("", "space_id")?)),
            (
                "project_id",
                json!(row.try_get::<Option<String>>("", "project_id")?),
            ),
            ("title", json!(row.try_get::<String>("", "title")?)),
            ("note", json!(row.try_get::<Option<String>>("", "note")?)),
            ("status", json!(row.try_get::<String>("", "status")?)),
            ("priority", json!(row.try_get::<i64>("", "priority")?)),
            (
                "planned_at",
                json!(row.try_get::<Option<String>>("", "planned_at")?),
            ),
            (
                "due_at",
                json!(row.try_get::<Option<String>>("", "due_at")?),
            ),
            (
                "remind_at",
                json!(row.try_get::<Option<String>>("", "remind_at")?),
            ),
            ("status_changed_at", json!(status_changed_at)),
            (
                "completed_at",
                json!(row.try_get::<Option<String>>("", "completed_at")?),
            ),
            ("position", json!(row.try_get::<i64>("", "position")?)),
            ("created_at", json!(created_at)),
            (
                "updated_at",
                json!(row.try_get::<String>("", "updated_at")?),
            ),
        ]);
        enqueue(
            outbox,
            SyncEntityKind::Task,
            &id,
            row.try_get("", "generation")?,
            fields,
            now,
        )
        .await?;
        count += 1;
    }
    Ok(count)
}

async fn seed_task_links(
    connection: &impl ConnectionTrait,
    outbox: &OutboxRepository,
    now: &str,
) -> Result<usize, AppError> {
    let rows = connection
        .query_all_raw(Statement::from_string(
            DatabaseBackend::Sqlite,
            r#"
            SELECT id, task_id, title, url, position, created_at, updated_at
            FROM task_links
            ORDER BY position ASC, id ASC
            "#
            .to_owned(),
        ))
        .await
        .map_err(|error| {
            AppError::database(format!("origin seed 读取 task_links 失败: {error}"))
        })?;

    let mut count = 0;
    for row in rows {
        let id: String = row.try_get("", "id")?;
        let fields = map_of([
            ("task_id", json!(row.try_get::<String>("", "task_id")?)),
            ("title", json!(row.try_get::<String>("", "title")?)),
            ("url", json!(row.try_get::<String>("", "url")?)),
            ("position", json!(row.try_get::<i64>("", "position")?)),
            (
                "created_at",
                json!(row.try_get::<String>("", "created_at")?),
            ),
            (
                "updated_at",
                json!(row.try_get::<String>("", "updated_at")?),
            ),
        ]);
        enqueue(outbox, SyncEntityKind::TaskLink, &id, 1, fields, now).await?;
        count += 1;
    }
    Ok(count)
}

async fn seed_views(
    connection: &impl ConnectionTrait,
    outbox: &OutboxRepository,
    now: &str,
) -> Result<usize, AppError> {
    let rows = connection
        .query_all_raw(Statement::from_string(
            DatabaseBackend::Sqlite,
            r#"
            SELECT id, name, entity_kind, scope_json, filters_json, sort_json, group_by_json,
                   position, generation, created_at, updated_at
            FROM views
            ORDER BY position ASC, id ASC
            "#
            .to_owned(),
        ))
        .await
        .map_err(|error| AppError::database(format!("origin seed 读取 views 失败: {error}")))?;

    let mut count = 0;
    for row in rows {
        let id: String = row.try_get("", "id")?;
        let scope: String = row.try_get("", "scope_json")?;
        let filters: String = row.try_get("", "filters_json")?;
        let sort: String = row.try_get("", "sort_json")?;
        let group_by: Option<String> = row.try_get("", "group_by_json")?;
        let fields = map_of([
            ("name", json!(row.try_get::<String>("", "name")?)),
            (
                "entity_kind",
                json!(row.try_get::<String>("", "entity_kind")?),
            ),
            ("scope", parse_json_value(&scope)?),
            ("filters", parse_json_value(&filters)?),
            ("sort", parse_json_value(&sort)?),
            (
                "group_by",
                group_by
                    .map(|raw| parse_json_value(&raw))
                    .transpose()?
                    .unwrap_or(Value::Null),
            ),
            ("position", json!(row.try_get::<i64>("", "position")?)),
            (
                "created_at",
                json!(row.try_get::<String>("", "created_at")?),
            ),
            (
                "updated_at",
                json!(row.try_get::<String>("", "updated_at")?),
            ),
        ]);
        enqueue(
            outbox,
            SyncEntityKind::View,
            &id,
            row.try_get("", "generation")?,
            fields,
            now,
        )
        .await?;
        count += 1;
    }
    Ok(count)
}

async fn enqueue(
    outbox: &OutboxRepository,
    entity_type: SyncEntityKind,
    entity_id: &str,
    generation: i64,
    fields: Map<String, Value>,
    now: &str,
) -> Result<(), AppError> {
    let kind = match entity_type {
        SyncEntityKind::Space => "space",
        SyncEntityKind::Project => "project",
        SyncEntityKind::Task => "task",
        SyncEntityKind::TaskLink => "task_link",
        SyncEntityKind::View => "view",
        _ => "entity",
    };
    let payload = OutboxPayload::Patch { fields };
    outbox
        .enqueue_in_connection(
            outbox.connection(),
            &OutboxEnqueueRecord {
                id: Uuid::now_v7().to_string(),
                operation_id: format!("origin-seed:{kind}:{entity_id}"),
                entity_type,
                entity_id: entity_id.to_owned(),
                generation,
                operation_type: OutboxOpKind::Upsert,
                payload_json: payload
                    .to_json()
                    .map_err(|error| AppError::internal(error.to_string()))?,
                created_at: now.to_owned(),
                available_at: now.to_owned(),
            },
        )
        .await
        .map_err(|error| AppError::database(format!("origin seed 写入 outbox 失败: {error}")))?;
    Ok(())
}

fn map_of(entries: impl IntoIterator<Item = (&'static str, Value)>) -> Map<String, Value> {
    entries
        .into_iter()
        .map(|(key, value)| (key.to_owned(), value))
        .collect()
}

fn parse_json_value(raw: &str) -> Result<Value, AppError> {
    serde_json::from_str(raw)
        .map_err(|error| AppError::database(format!("origin seed 解析 JSON 失败: {error}")))
}

async fn has_setting(database: &DatabaseRuntimeState, scope: &str) -> Result<bool, AppError> {
    let row = database
        .connection()
        .query_one_raw(Statement::from_string(
            DatabaseBackend::Sqlite,
            format!("SELECT cursor FROM sync_cursors WHERE scope = '{scope}'"),
        ))
        .await
        .map_err(|error| AppError::database(format!("读取 setting 失败: {error}")))?;
    Ok(row
        .and_then(|row| row.try_get::<Option<String>>("", "cursor").ok())
        .flatten()
        .is_some_and(|value| !value.trim().is_empty()))
}

async fn write_setting(
    connection: &impl ConnectionTrait,
    scope: &str,
    value: &str,
    updated_at: &str,
) -> Result<(), AppError> {
    connection
        .execute_raw(Statement::from_sql_and_values(
            DatabaseBackend::Sqlite,
            r#"
            INSERT INTO sync_cursors(scope, cursor, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(scope) DO UPDATE SET cursor = excluded.cursor, updated_at = excluded.updated_at
            "#,
            [scope.into(), value.into(), updated_at.into()],
        ))
        .await
        .map_err(|error| AppError::database(format!("写入 setting 失败: {error}")))?;
    Ok(())
}

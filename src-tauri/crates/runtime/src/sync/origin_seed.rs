//! 首次绑定空云端时：把本机已有实体灌进 Outbox，作为上传基线。

use sea_orm::{
    ConnectionTrait, DatabaseBackend, EntityTrait, QueryOrder, SqliteTransactionMode, Statement,
    TransactionOptions, TransactionTrait,
};
use serde_json::{json, Map, Value};
use stoneflow_application::operation::{
    OutboxEnqueueRecord, OutboxOpKind, OutboxPayload, SyncEntityKind,
};
use stoneflow_application::view::codec::view_sync_fields;
use stoneflow_domain::now_utc;
use stoneflow_storage::{
    database::DatabaseRuntimeState,
    entities::{prelude::View, view},
    repositories::{map_view, OutboxRepository},
};
use uuid::Uuid;

use crate::app::error::AppError;

use super::binding::{LAST_RESTORE_AT_SCOPE, ORIGIN_SEED_SCOPE, SERVER_SEQ_CURSOR_SCOPE};

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
    let connection = database.connection();
    // 标记检查与全部灌库写入共用写事务，失败不留半批，并发调用不能重复 seed。
    let transaction = connection
        .begin_with_options(TransactionOptions {
            sqlite_transaction_mode: Some(SqliteTransactionMode::Immediate),
            ..Default::default()
        })
        .await?;
    if has_setting(&transaction, SERVER_SEQ_CURSOR_SCOPE).await?
        || has_setting(&transaction, ORIGIN_SEED_SCOPE).await?
    {
        transaction.commit().await?;
        return Ok(0);
    }

    let outbox = OutboxRepository::new(connection.clone());
    let now = now_utc().to_rfc3339();
    let mut seeded = 0usize;

    // 顺序：space → project → task → task_link → view（引用依赖）
    seeded += seed_spaces(&transaction, &outbox, &now).await?;
    seeded += seed_projects(&transaction, &outbox, &now).await?;
    seeded += seed_tasks(&transaction, &outbox, &now).await?;
    seeded += seed_task_links(&transaction, &outbox, &now).await?;
    seeded += seed_views(&transaction, &outbox, &now).await?;

    write_setting(&transaction, ORIGIN_SEED_SCOPE, &now, &now).await?;
    transaction.commit().await?;
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
            connection,
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
            connection,
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
            connection,
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
        enqueue(
            connection,
            outbox,
            SyncEntityKind::TaskLink,
            &id,
            1,
            fields,
            now,
        )
        .await?;
        count += 1;
    }
    Ok(count)
}

async fn seed_views(
    connection: &impl ConnectionTrait,
    outbox: &OutboxRepository,
    now: &str,
) -> Result<usize, AppError> {
    let rows = View::find()
        .order_by_asc(view::Column::Position)
        .order_by_asc(view::Column::Id)
        .all(connection)
        .await
        .map_err(|error| AppError::database(format!("origin seed 读取 views 失败: {error}")))?;

    let mut count = 0;
    for row in rows {
        let record = map_view(row);
        let fields = view_sync_fields(&record)?;
        enqueue(
            connection,
            outbox,
            SyncEntityKind::View,
            &record.id,
            record.generation,
            fields,
            now,
        )
        .await?;
        count += 1;
    }
    Ok(count)
}

async fn enqueue(
    connection: &impl ConnectionTrait,
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
            connection,
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

async fn has_setting(connection: &impl ConnectionTrait, scope: &str) -> Result<bool, AppError> {
    let row = connection
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

#[cfg(test)]
mod tests {
    use stoneflow_application::view::{
        CreateViewInput, FilterQueryValue, TaskScopeInput, TaskScopeKind, TaskViewBaseKey,
        TaskViewContext,
    };
    use stoneflow_storage::adapters::build_view_service;
    use stoneflow_test_support::TestDatabase;

    use super::*;

    #[tokio::test]
    async fn failed_origin_seed_rolls_back_and_retries_without_duplicate_outbox() {
        let database = TestDatabase::bootstrap_in_memory().await.unwrap();
        let connection = database.connection();
        let service = build_view_service(connection.clone());
        let outbox = OutboxRepository::new(connection.clone());
        let mut view_ids = Vec::new();
        for name in ["有效视图", "待修复视图"] {
            let view = service
                .create_view(CreateViewInput {
                    name: name.to_owned(),
                    scope: TaskScopeInput {
                        kind: TaskScopeKind::All,
                        space_id: None,
                    },
                    context: TaskViewContext::All,
                    base_view_key: TaskViewBaseKey::Active,
                    filters: FilterQueryValue::default(),
                })
                .await
                .unwrap();
            view_ids.push(view.id);
        }
        let damaged_id = &view_ids[1];
        let original = View::find_by_id(damaged_id)
            .one(connection)
            .await
            .unwrap()
            .unwrap();
        connection
            .execute_raw(Statement::from_sql_and_values(
                DatabaseBackend::Sqlite,
                "UPDATE views SET filters_json = ? WHERE id = ?",
                [r#"{"unknown":true}"#.into(), damaged_id.clone().into()],
            ))
            .await
            .unwrap();
        let pending_before = outbox.list_pending_operations(100).await.unwrap();
        let count_before = outbox.count_all().await.unwrap();

        for _ in 0..2 {
            assert!(matches!(
                seed_origin_outbox_if_needed(&database).await,
                Err(AppError::Validation(_))
            ));
            assert!(!has_setting(connection, ORIGIN_SEED_SCOPE).await.unwrap());
        }
        assert_eq!(outbox.count_all().await.unwrap(), count_before);
        assert_eq!(
            outbox.list_pending_operations(100).await.unwrap(),
            pending_before
        );

        connection
            .execute_raw(Statement::from_sql_and_values(
                DatabaseBackend::Sqlite,
                "UPDATE views SET filters_json = ? WHERE id = ?",
                [original.filters_json.into(), damaged_id.clone().into()],
            ))
            .await
            .unwrap();
        let seeded = seed_origin_outbox_if_needed(&database).await.unwrap();
        assert!(seeded > 0);
        assert!(has_setting(connection, ORIGIN_SEED_SCOPE).await.unwrap());
        assert_eq!(
            outbox.count_all().await.unwrap(),
            count_before + seeded as u64
        );
        let pending_after = outbox.list_pending_operations(100).await.unwrap();
        assert_eq!(seed_origin_outbox_if_needed(&database).await.unwrap(), 0);
        assert_eq!(
            outbox.list_pending_operations(100).await.unwrap(),
            pending_after
        );
    }
}

//! 同步 operation 到本地 / 远端镜像表。

use libsql::{params, Connection, Transaction};
use serde_json::json;

use crate::{
    error::SyncWorkerError,
    schema::{
        HardDeletePayload, ProjectPayload, RemoteOperationRecord, SettingPayload, SpacePayload,
        SyncAction, SyncOperationPayload, TaskLinkPayload, TaskPayload, ViewPayload,
    },
};

pub async fn apply_operation_to_remote(
    transaction: &Transaction,
    operation: &RemoteOperationRecord,
) -> Result<(), SyncWorkerError> {
    apply_operation(transaction, operation, ApplyTarget::Remote).await
}

pub async fn apply_operation_to_local(
    transaction: &Transaction,
    operation: &RemoteOperationRecord,
) -> Result<(), SyncWorkerError> {
    apply_operation(transaction, operation, ApplyTarget::Local).await
}

async fn apply_operation(
    transaction: &Transaction,
    operation: &RemoteOperationRecord,
    target: ApplyTarget,
) -> Result<(), SyncWorkerError> {
    match (&operation.action, &operation.payload) {
        (SyncAction::Upsert, SyncOperationPayload::Space { snapshot })
        | (SyncAction::Delete, SyncOperationPayload::Space { snapshot }) => {
            upsert_space(transaction, snapshot, target).await
        }
        (SyncAction::Upsert, SyncOperationPayload::Project { snapshot })
        | (SyncAction::Delete, SyncOperationPayload::Project { snapshot }) => {
            upsert_project(transaction, snapshot, target).await
        }
        (SyncAction::Upsert, SyncOperationPayload::Task { snapshot })
        | (SyncAction::Delete, SyncOperationPayload::Task { snapshot }) => {
            upsert_task(transaction, snapshot, target).await
        }
        (SyncAction::Upsert, SyncOperationPayload::View { snapshot }) => {
            upsert_view(transaction, snapshot, target).await
        }
        (SyncAction::Delete, SyncOperationPayload::View { snapshot }) => {
            delete_view(transaction, snapshot, &operation.op_id, target).await
        }
        (SyncAction::Upsert, SyncOperationPayload::Setting { snapshot })
        | (SyncAction::Delete, SyncOperationPayload::Setting { snapshot }) => {
            upsert_setting(transaction, snapshot, target).await
        }
        (SyncAction::Upsert, SyncOperationPayload::TaskLink { snapshot }) => {
            upsert_task_link(transaction, snapshot, target).await
        }
        (SyncAction::Delete, SyncOperationPayload::TaskLink { snapshot }) => {
            delete_task_link(transaction, snapshot, &operation.op_id, target).await
        }
        (SyncAction::Delete, SyncOperationPayload::HardDelete { target: payload }) => {
            apply_hard_delete(transaction, payload, &operation.op_id, target).await
        }
        (SyncAction::Upsert, SyncOperationPayload::HardDelete { .. }) => Err(
            SyncWorkerError::protocol("hard delete payload 不允许使用 upsert action"),
        ),
    }
}

async fn upsert_space(
    transaction: &Transaction,
    snapshot: &SpacePayload,
    target: ApplyTarget,
) -> Result<(), SyncWorkerError> {
    if !should_apply_record(
        transaction,
        "spaces",
        "id",
        &snapshot.id,
        &snapshot.updated_at,
        None,
        target,
    )
    .await?
    {
        return Ok(());
    }

    if snapshot.is_default {
        transaction
            .execute(
                r#"
                UPDATE spaces
                SET is_default = 0
                WHERE id <> ?1 AND is_default = 1
                "#,
                params![snapshot.id.clone()],
            )
            .await
            .map_err(|error| target.database_error(format!("清理默认 Space 失败: {error}")))?;
    }

    transaction
        .execute(
            r#"
            INSERT INTO spaces(
                id, name, icon_key, color_key, is_default, sort_order, archived_at, deleted_at,
                created_at, updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                icon_key = excluded.icon_key,
                color_key = excluded.color_key,
                is_default = excluded.is_default,
                sort_order = excluded.sort_order,
                archived_at = excluded.archived_at,
                deleted_at = excluded.deleted_at,
                created_at = excluded.created_at,
                updated_at = excluded.updated_at
            "#,
            params![
                snapshot.id.clone(),
                snapshot.name.clone(),
                snapshot.icon_key.clone(),
                snapshot.color_key.clone(),
                snapshot.is_default,
                snapshot.sort_order,
                snapshot.archived_at.clone(),
                snapshot.deleted_at.clone(),
                snapshot.created_at.clone(),
                snapshot.updated_at.clone(),
            ],
        )
        .await
        .map_err(|error| target.database_error(format!("写入 Space 镜像失败: {error}")))?;

    Ok(())
}

async fn upsert_project(
    transaction: &Transaction,
    snapshot: &ProjectPayload,
    target: ApplyTarget,
) -> Result<(), SyncWorkerError> {
    if !should_apply_record(
        transaction,
        "projects",
        "id",
        &snapshot.id,
        &snapshot.updated_at,
        Some(("project", "project.permanently_deleted")),
        target,
    )
    .await?
    {
        return Ok(());
    }

    transaction
        .execute(
            r#"
            INSERT INTO projects(
                id, space_id, name, description, due_at, sort_order, completed_at, archived_at,
                deleted_at, created_at, updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
            ON CONFLICT(id) DO UPDATE SET
                space_id = excluded.space_id,
                name = excluded.name,
                description = excluded.description,
                due_at = excluded.due_at,
                sort_order = excluded.sort_order,
                completed_at = excluded.completed_at,
                archived_at = excluded.archived_at,
                deleted_at = excluded.deleted_at,
                created_at = excluded.created_at,
                updated_at = excluded.updated_at
            "#,
            params![
                snapshot.id.clone(),
                snapshot.space_id.clone(),
                snapshot.name.clone(),
                snapshot.description.clone(),
                snapshot.due_at.clone(),
                snapshot.sort_order,
                snapshot.completed_at.clone(),
                snapshot.archived_at.clone(),
                snapshot.deleted_at.clone(),
                snapshot.created_at.clone(),
                snapshot.updated_at.clone(),
            ],
        )
        .await
        .map_err(|error| target.database_error(format!("写入 Project 镜像失败: {error}")))?;

    Ok(())
}

async fn upsert_task(
    transaction: &Transaction,
    snapshot: &TaskPayload,
    target: ApplyTarget,
) -> Result<(), SyncWorkerError> {
    if !should_apply_record(
        transaction,
        "tasks",
        "id",
        &snapshot.id,
        &snapshot.updated_at,
        Some(("task", "task.permanently_deleted")),
        target,
    )
    .await?
    {
        return Ok(());
    }

    transaction
        .execute(
            r#"
            INSERT INTO tasks(
                id, space_id, project_id, title, note, status, status_changed_at, priority,
                inbox_at, due_at, scheduled_at, reminder_at, sort_order, completed_at,
                canceled_at, archived_at, deleted_at, created_at, updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)
            ON CONFLICT(id) DO UPDATE SET
                space_id = excluded.space_id,
                project_id = excluded.project_id,
                title = excluded.title,
                note = excluded.note,
                status = excluded.status,
                status_changed_at = excluded.status_changed_at,
                priority = excluded.priority,
                inbox_at = excluded.inbox_at,
                due_at = excluded.due_at,
                scheduled_at = excluded.scheduled_at,
                reminder_at = excluded.reminder_at,
                sort_order = excluded.sort_order,
                completed_at = excluded.completed_at,
                canceled_at = excluded.canceled_at,
                archived_at = excluded.archived_at,
                deleted_at = excluded.deleted_at,
                created_at = excluded.created_at,
                updated_at = excluded.updated_at
            "#,
            params![
                snapshot.id.clone(),
                snapshot.space_id.clone(),
                snapshot.project_id.clone(),
                snapshot.title.clone(),
                snapshot.note.clone(),
                snapshot.status.clone(),
                snapshot.status_changed_at.clone(),
                snapshot.priority,
                snapshot.inbox_at.clone(),
                snapshot.due_at.clone(),
                snapshot.scheduled_at.clone(),
                snapshot.reminder_at.clone(),
                snapshot.sort_order,
                snapshot.completed_at.clone(),
                snapshot.canceled_at.clone(),
                snapshot.archived_at.clone(),
                snapshot.deleted_at.clone(),
                snapshot.created_at.clone(),
                snapshot.updated_at.clone(),
            ],
        )
        .await
        .map_err(|error| target.database_error(format!("写入 Task 镜像失败: {error}")))?;

    Ok(())
}

async fn upsert_view(
    transaction: &Transaction,
    snapshot: &ViewPayload,
    target: ApplyTarget,
) -> Result<(), SyncWorkerError> {
    if !should_apply_record(
        transaction,
        "views",
        "id",
        &snapshot.id,
        &snapshot.updated_at,
        Some(("view", "view.deleted")),
        target,
    )
    .await?
    {
        return Ok(());
    }

    transaction
        .execute(
            r#"
            INSERT INTO views(
                id, name, description, type, entity_type, key, filters, sort, group_by,
                is_visible, sort_order, created_at, updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
            ON CONFLICT(id) DO UPDATE SET
                name = excluded.name,
                description = excluded.description,
                type = excluded.type,
                entity_type = excluded.entity_type,
                key = excluded.key,
                filters = excluded.filters,
                sort = excluded.sort,
                group_by = excluded.group_by,
                is_visible = excluded.is_visible,
                sort_order = excluded.sort_order,
                created_at = excluded.created_at,
                updated_at = excluded.updated_at
            "#,
            params![
                snapshot.id.clone(),
                snapshot.name.clone(),
                snapshot.description.clone(),
                snapshot.kind.clone(),
                snapshot.entity_type.clone(),
                snapshot.key.clone(),
                snapshot.filters.clone(),
                snapshot.sort.clone(),
                snapshot.group_by.clone(),
                snapshot.is_visible,
                snapshot.sort_order,
                snapshot.created_at.clone(),
                snapshot.updated_at.clone(),
            ],
        )
        .await
        .map_err(|error| target.database_error(format!("写入 View 镜像失败: {error}")))?;

    Ok(())
}

async fn delete_view(
    transaction: &Transaction,
    snapshot: &ViewPayload,
    op_id: &str,
    target: ApplyTarget,
) -> Result<(), SyncWorkerError> {
    if !should_delete_record(
        transaction,
        "views",
        "id",
        &snapshot.id,
        &snapshot.updated_at,
        Some(("view", "view.deleted")),
        target,
    )
    .await?
    {
        return Ok(());
    }

    transaction
        .execute(
            "DELETE FROM views WHERE id = ?1",
            params![snapshot.id.clone()],
        )
        .await
        .map_err(|error| target.database_error(format!("删除 View 镜像失败: {error}")))?;
    insert_activity_tombstone(
        transaction,
        TombstoneActivity {
            event_id: op_id,
            entity_type: "view",
            entity_id: &snapshot.id,
            action: "view.deleted",
            metadata: None,
            created_at: &snapshot.updated_at,
        },
        target,
    )
    .await
}

async fn upsert_setting(
    transaction: &Transaction,
    snapshot: &SettingPayload,
    target: ApplyTarget,
) -> Result<(), SyncWorkerError> {
    if !should_apply_record(
        transaction,
        "settings",
        "key",
        &snapshot.key,
        &snapshot.updated_at,
        None,
        target,
    )
    .await?
    {
        return Ok(());
    }

    transaction
        .execute(
            r#"
            INSERT INTO settings(key, value, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4)
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at
            "#,
            params![
                snapshot.key.clone(),
                snapshot.raw_value.clone(),
                snapshot.updated_at.clone(),
                snapshot.updated_at.clone(),
            ],
        )
        .await
        .map_err(|error| target.database_error(format!("写入 Setting 镜像失败: {error}")))?;

    Ok(())
}

async fn upsert_task_link(
    transaction: &Transaction,
    snapshot: &TaskLinkPayload,
    target: ApplyTarget,
) -> Result<(), SyncWorkerError> {
    if !should_apply_task_link(transaction, &snapshot.id, &snapshot.updated_at, target).await? {
        return Ok(());
    }

    transaction
        .execute(
            r#"
            INSERT INTO task_links(
                id, task_id, title, url, sort_order, created_at, updated_at
            )
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
            ON CONFLICT(id) DO UPDATE SET
                task_id = excluded.task_id,
                title = excluded.title,
                url = excluded.url,
                sort_order = excluded.sort_order,
                created_at = excluded.created_at,
                updated_at = excluded.updated_at
            "#,
            params![
                snapshot.id.clone(),
                snapshot.task_id.clone(),
                snapshot.title.clone(),
                snapshot.url.clone(),
                snapshot.sort_order,
                snapshot.created_at.clone(),
                snapshot.updated_at.clone(),
            ],
        )
        .await
        .map_err(|error| target.database_error(format!("写入 TaskLink 镜像失败: {error}")))?;

    Ok(())
}

async fn delete_task_link(
    transaction: &Transaction,
    snapshot: &TaskLinkPayload,
    op_id: &str,
    target: ApplyTarget,
) -> Result<(), SyncWorkerError> {
    if !should_delete_task_link(transaction, &snapshot.id, &snapshot.updated_at, target).await? {
        return Ok(());
    }

    transaction
        .execute(
            "DELETE FROM task_links WHERE id = ?1",
            params![snapshot.id.clone()],
        )
        .await
        .map_err(|error| target.database_error(format!("删除 TaskLink 镜像失败: {error}")))?;
    insert_activity_tombstone(
        transaction,
        TombstoneActivity {
            event_id: op_id,
            entity_type: "task",
            entity_id: &snapshot.task_id,
            action: "task.link.removed",
            metadata: Some(json!({
                "taskId": snapshot.task_id,
                "linkId": snapshot.id,
                "title": snapshot.title,
                "url": snapshot.url,
            })),
            created_at: &snapshot.updated_at,
        },
        target,
    )
    .await
}

async fn apply_hard_delete(
    transaction: &Transaction,
    target_payload: &HardDeletePayload,
    op_id: &str,
    target: ApplyTarget,
) -> Result<(), SyncWorkerError> {
    let (table_name, action) = match target_payload.entity_type.as_str() {
        "task" => ("tasks", "task.permanently_deleted"),
        "project" => ("projects", "project.permanently_deleted"),
        "space" => ("spaces", "space.permanently_deleted"),
        "task_link" => ("task_links", "task.link.removed"),
        other => {
            return Err(SyncWorkerError::protocol(format!(
                "暂不支持的 hard delete entity_type: {other}"
            )))
        }
    };

    insert_activity_tombstone(
        transaction,
        TombstoneActivity {
            event_id: op_id,
            entity_type: &target_payload.entity_type,
            entity_id: &target_payload.entity_id,
            action,
            metadata: target_payload.metadata.clone(),
            created_at: &target_payload.deleted_at,
        },
        target,
    )
    .await?;
    transaction
        .execute(
            &format!("DELETE FROM {table_name} WHERE id = ?1"),
            params![target_payload.entity_id.clone()],
        )
        .await
        .map_err(|error| target.database_error(format!("应用 hard delete 失败: {error}")))?;
    if target_payload.entity_type == "task" {
        transaction
            .execute(
                "DELETE FROM task_links WHERE task_id = ?1",
                params![target_payload.entity_id.clone()],
            )
            .await
            .map_err(|error| {
                target.database_error(format!("删除任务关联 TaskLink 失败: {error}"))
            })?;
    }

    Ok(())
}

async fn should_apply_record(
    connection: &Connection,
    table_name: &str,
    primary_key_column: &str,
    primary_key: &str,
    incoming_updated_at: &str,
    tombstone: Option<(&str, &str)>,
    target: ApplyTarget,
) -> Result<bool, SyncWorkerError> {
    if let Some(current_updated_at) = query_current_updated_at(
        connection,
        table_name,
        primary_key_column,
        primary_key,
        target,
    )
    .await?
    {
        return Ok(current_updated_at.as_str() <= incoming_updated_at);
    }

    if let Some((entity_type, action)) = tombstone {
        if let Some(tombstone_at) =
            query_latest_tombstone_at(connection, entity_type, primary_key, action, target).await?
        {
            return Ok(tombstone_at.as_str() < incoming_updated_at);
        }
    }

    Ok(true)
}

async fn should_delete_record(
    connection: &Connection,
    table_name: &str,
    primary_key_column: &str,
    primary_key: &str,
    incoming_updated_at: &str,
    tombstone: Option<(&str, &str)>,
    target: ApplyTarget,
) -> Result<bool, SyncWorkerError> {
    should_apply_record(
        connection,
        table_name,
        primary_key_column,
        primary_key,
        incoming_updated_at,
        tombstone,
        target,
    )
    .await
}

async fn should_apply_task_link(
    connection: &Connection,
    link_id: &str,
    incoming_updated_at: &str,
    target: ApplyTarget,
) -> Result<bool, SyncWorkerError> {
    if let Some(current_updated_at) =
        query_current_updated_at(connection, "task_links", "id", link_id, target).await?
    {
        return Ok(current_updated_at.as_str() <= incoming_updated_at);
    }

    if let Some(tombstone_at) =
        query_latest_task_link_tombstone_at(connection, link_id, target).await?
    {
        return Ok(tombstone_at.as_str() < incoming_updated_at);
    }

    Ok(true)
}

async fn should_delete_task_link(
    connection: &Connection,
    link_id: &str,
    incoming_updated_at: &str,
    target: ApplyTarget,
) -> Result<bool, SyncWorkerError> {
    should_apply_task_link(connection, link_id, incoming_updated_at, target).await
}

async fn query_current_updated_at(
    connection: &Connection,
    table_name: &str,
    primary_key_column: &str,
    primary_key: &str,
    target: ApplyTarget,
) -> Result<Option<String>, SyncWorkerError> {
    let sql =
        format!("SELECT updated_at FROM {table_name} WHERE {primary_key_column} = ?1 LIMIT 1");
    let mut rows = connection
        .query(&sql, params![primary_key.to_owned()])
        .await
        .map_err(|error| target.database_error(format!("读取当前镜像记录失败: {error}")))?;
    let row = rows
        .next()
        .await
        .map_err(|error| target.database_error(format!("遍历当前镜像记录失败: {error}")))?;

    row.map(|row| {
        row.get::<String>(0)
            .map_err(|error| target.database_error(format!("读取当前 updated_at 失败: {error}")))
    })
    .transpose()
}

async fn query_latest_tombstone_at(
    connection: &Connection,
    entity_type: &str,
    entity_id: &str,
    action: &str,
    target: ApplyTarget,
) -> Result<Option<String>, SyncWorkerError> {
    let mut rows = connection
        .query(
            r#"
            SELECT created_at
            FROM activity_events
            WHERE entity_type = ?1 AND entity_id = ?2 AND action = ?3
            ORDER BY created_at DESC, id DESC
            LIMIT 1
            "#,
            params![
                entity_type.to_owned(),
                entity_id.to_owned(),
                action.to_owned()
            ],
        )
        .await
        .map_err(|error| target.database_error(format!("读取 tombstone 失败: {error}")))?;
    let row = rows
        .next()
        .await
        .map_err(|error| target.database_error(format!("遍历 tombstone 失败: {error}")))?;

    row.map(|row| {
        row.get::<String>(0).map_err(|error| {
            target.database_error(format!("读取 tombstone.created_at 失败: {error}"))
        })
    })
    .transpose()
}

async fn query_latest_task_link_tombstone_at(
    connection: &Connection,
    link_id: &str,
    target: ApplyTarget,
) -> Result<Option<String>, SyncWorkerError> {
    let mut rows = connection
        .query(
            r#"
            SELECT created_at
            FROM activity_events
            WHERE action = 'task.link.removed'
              AND json_extract(metadata, '$.linkId') = ?1
            ORDER BY created_at DESC, id DESC
            LIMIT 1
            "#,
            params![link_id.to_owned()],
        )
        .await
        .map_err(|error| target.database_error(format!("读取 TaskLink tombstone 失败: {error}")))?;
    let row = rows
        .next()
        .await
        .map_err(|error| target.database_error(format!("遍历 TaskLink tombstone 失败: {error}")))?;

    row.map(|row| {
        row.get::<String>(0).map_err(|error| {
            target.database_error(format!("读取 TaskLink tombstone.created_at 失败: {error}"))
        })
    })
    .transpose()
}

async fn insert_activity_tombstone(
    transaction: &Transaction,
    tombstone: TombstoneActivity<'_>,
    target: ApplyTarget,
) -> Result<(), SyncWorkerError> {
    let metadata = tombstone
        .metadata
        .map(|value| serde_json::to_string(&value))
        .transpose()
        .map_err(|error| {
            SyncWorkerError::serialization(format!("序列化 tombstone metadata 失败: {error}"))
        })?;
    transaction
        .execute(
            r#"
            INSERT INTO activity_events(
                id, entity_type, entity_id, action, actor_type, source, summary, metadata, created_at
            )
            VALUES (?1, ?2, ?3, ?4, 'system', 'sync', NULL, ?5, ?6)
            ON CONFLICT(id) DO UPDATE SET
                entity_type = excluded.entity_type,
                entity_id = excluded.entity_id,
                action = excluded.action,
                actor_type = excluded.actor_type,
                source = excluded.source,
                metadata = excluded.metadata,
                created_at = excluded.created_at
            "#,
            params![
                tombstone.event_id.to_owned(),
                tombstone.entity_type.to_owned(),
                tombstone.entity_id.to_owned(),
                tombstone.action.to_owned(),
                metadata,
                tombstone.created_at.to_owned(),
            ],
        )
        .await
        .map_err(|error| target.database_error(format!("写入 tombstone activity 失败: {error}")))?;
    Ok(())
}

struct TombstoneActivity<'a> {
    event_id: &'a str,
    entity_type: &'a str,
    entity_id: &'a str,
    action: &'a str,
    metadata: Option<serde_json::Value>,
    created_at: &'a str,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum ApplyTarget {
    Local,
    Remote,
}

impl ApplyTarget {
    fn database_error(self, message: String) -> SyncWorkerError {
        match self {
            Self::Local => SyncWorkerError::local_database(message),
            Self::Remote => SyncWorkerError::remote_database(message),
        }
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use libsql::{Builder, Connection};
    use tempfile::TempDir;

    use super::*;
    use crate::schema::{RemoteOperationRecord, SettingPayload, SyncAction, SyncOperationPayload};

    #[tokio::test]
    async fn apply_operation_to_local_should_report_local_database_error_when_schema_missing() {
        let (_temp_dir, connection) = open_test_connection("local-missing-schema").await;
        let transaction = connection
            .transaction()
            .await
            .expect("test transaction should open");

        let error = apply_operation_to_local(&transaction, &sample_setting_operation())
            .await
            .expect_err("apply should fail when local schema is missing");

        assert!(
            matches!(error, SyncWorkerError::LocalDatabase { .. }),
            "expected local database error, got {error}"
        );
    }

    #[tokio::test]
    async fn apply_operation_to_remote_should_report_remote_database_error_when_schema_missing() {
        let (_temp_dir, connection) = open_test_connection("remote-missing-schema").await;
        let transaction = connection
            .transaction()
            .await
            .expect("test transaction should open");

        let error = apply_operation_to_remote(&transaction, &sample_setting_operation())
            .await
            .expect_err("apply should fail when remote schema is missing");

        assert!(
            matches!(error, SyncWorkerError::RemoteDatabase { .. }),
            "expected remote database error, got {error}"
        );
    }

    #[tokio::test]
    async fn apply_operation_to_local_should_return_protocol_error_for_unknown_hard_delete_type() {
        let (_temp_dir, connection) = open_test_connection("protocol-hard-delete").await;
        let transaction = connection
            .transaction()
            .await
            .expect("test transaction should open");

        let error = apply_operation_to_local(&transaction, &invalid_hard_delete_operation())
            .await
            .expect_err("unknown hard delete target should fail");

        assert!(
            matches!(error, SyncWorkerError::Protocol { .. }),
            "expected protocol error, got {error}"
        );
    }

    async fn open_test_connection(name: &str) -> (TempDir, Connection) {
        let temp_dir = tempfile::tempdir().expect("temp dir should be created");
        let path = temp_dir.path().join(format!("{name}.db"));
        let database = Builder::new_local(PathBuf::from(path))
            .build()
            .await
            .expect("test database should build");
        let connection = database.connect().expect("test database should connect");

        (temp_dir, connection)
    }

    fn sample_setting_operation() -> RemoteOperationRecord {
        RemoteOperationRecord {
            server_seq: 1,
            op_id: "op-setting-1".to_owned(),
            device_id: "device-a".to_owned(),
            entity_type: "setting".to_owned(),
            entity_id: "app.theme".to_owned(),
            action: SyncAction::Upsert,
            payload: SyncOperationPayload::Setting {
                snapshot: SettingPayload {
                    key: "app.theme".to_owned(),
                    raw_value: "\"light\"".to_owned(),
                    updated_at: "2026-06-28T10:00:00Z".to_owned(),
                },
            },
            committed_at: "2026-06-28T10:00:00Z".to_owned(),
        }
    }

    fn invalid_hard_delete_operation() -> RemoteOperationRecord {
        RemoteOperationRecord {
            server_seq: 2,
            op_id: "op-hard-delete-1".to_owned(),
            device_id: "device-a".to_owned(),
            entity_type: "mystery".to_owned(),
            entity_id: "entity-1".to_owned(),
            action: SyncAction::Delete,
            payload: SyncOperationPayload::HardDelete {
                target: HardDeletePayload {
                    entity_type: "mystery".to_owned(),
                    entity_id: "entity-1".to_owned(),
                    deleted_at: "2026-06-28T11:00:00Z".to_owned(),
                    metadata: None,
                },
            },
            committed_at: "2026-06-28T11:00:00Z".to_owned(),
        }
    }
}

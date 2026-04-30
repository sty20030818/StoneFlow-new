//! Space Service：集中承载阶段 4 的 Space 业务规则、事务与 Activity 编排。

use sea_orm::TransactionTrait;
use serde::{Deserialize, Serialize};
use serde_json::json;
use stoneflow_entity::{common::ActivityEntityKind, space};
use uuid::Uuid;

use crate::{
    app::error::AppError,
    application::activity::{
        ActivityAction, ActivityChangeInput, ActivityService, RecordActivityInput,
    },
    domain::{create_id, normalize_required_text, now_utc},
    infrastructure::repositories::{
        CreateSpaceRecord, ProjectRepository, SpaceRepository, TaskRepository, UpdateSpacePatch,
    },
};

/// 提供给前端消费的 Space 数据。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpaceDto {
    pub id: String,
    pub name: String,
    pub icon_key: String,
    pub color_key: String,
    pub is_default: bool,
    pub sort_order: i32,
    pub archived_at: Option<String>,
    pub deleted_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// 创建 Space 的输入。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSpaceInput {
    pub name: String,
    pub icon_key: String,
    pub color_key: String,
}

/// 更新 Space 的输入。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSpaceInput {
    pub space_id: String,
    pub name: Option<String>,
    pub icon_key: Option<String>,
    pub color_key: Option<String>,
}

/// 仅携带 Space ID 的命令输入。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpaceIdInput {
    pub space_id: String,
}

/// 设置默认 Space 的输入。
pub type SetDefaultSpaceInput = SpaceIdInput;

#[derive(Debug, Clone)]
pub struct SpaceService {
    repository: SpaceRepository,
    project_repository: ProjectRepository,
    task_repository: TaskRepository,
    activity_service: ActivityService,
}

impl SpaceService {
    pub fn new(
        repository: SpaceRepository,
        project_repository: ProjectRepository,
        task_repository: TaskRepository,
        activity_service: ActivityService,
    ) -> Self {
        Self {
            repository,
            project_repository,
            task_repository,
            activity_service,
        }
    }

    pub fn repository(&self) -> &SpaceRepository {
        &self.repository
    }

    /// 列出所有可见 Space。
    pub async fn list_visible_spaces(&self) -> Result<Vec<SpaceDto>, AppError> {
        let spaces = self.repository.list_visible().await?;
        Ok(spaces.into_iter().map(map_space_model).collect())
    }

    /// 创建一个新的活跃 Space。
    pub async fn create_space(&self, input: CreateSpaceInput) -> Result<SpaceDto, AppError> {
        let now = now_utc().to_rfc3339();
        let name = normalize_required_text(&input.name, "Space name")?;
        let icon_key = normalize_required_text(&input.icon_key, "Space iconKey")?;
        let color_key = normalize_required_text(&input.color_key, "Space colorKey")?;
        let transaction = self.repository.connection().begin().await?;
        let sort_order = self.repository.next_sort_order(&transaction).await?;

        let space = self
            .repository
            .create(
                &transaction,
                CreateSpaceRecord {
                    id: create_id().to_string(),
                    name: name.clone(),
                    icon_key: icon_key.clone(),
                    color_key: color_key.clone(),
                    is_default: false,
                    sort_order,
                    created_at: now.clone(),
                    updated_at: now.clone(),
                },
            )
            .await?;

        self.activity_service
            .record_activity_in_txn(
                &transaction,
                RecordActivityInput {
                    entity_type: ActivityEntityKind::Space,
                    entity_id: space.id.clone(),
                    action: ActivityAction::SpaceCreated,
                    actor_type: None,
                    source: None,
                    summary: Some(format!("创建 Space「{}」", space.name)),
                    metadata: Some(json!({ "spaceId": space.id })),
                    changes: vec![
                        ActivityChangeInput {
                            field: "name".to_owned(),
                            old_value: None,
                            new_value: Some(json!(name)),
                        },
                        ActivityChangeInput {
                            field: "iconKey".to_owned(),
                            old_value: None,
                            new_value: Some(json!(icon_key)),
                        },
                        ActivityChangeInput {
                            field: "colorKey".to_owned(),
                            old_value: None,
                            new_value: Some(json!(color_key)),
                        },
                    ],
                },
            )
            .await?;

        transaction.commit().await?;
        Ok(map_space_model(space))
    }

    /// 更新 Space 的基础展示字段。
    pub async fn update_space(&self, input: UpdateSpaceInput) -> Result<SpaceDto, AppError> {
        let space_id = normalize_space_id(&input.space_id)?;
        let current = self.require_existing_space(&space_id).await?;
        ensure_space_mutable(&current)?;

        let next_name = normalize_optional_required_text(input.name.as_deref(), "Space name")?;
        let next_icon_key =
            normalize_optional_required_text(input.icon_key.as_deref(), "Space iconKey")?;
        let next_color_key =
            normalize_optional_required_text(input.color_key.as_deref(), "Space colorKey")?;

        let mut patch = UpdateSpacePatch::default();
        let mut activity_records = Vec::new();

        if let Some(name) = next_name {
            if name != current.name {
                patch.name = Some(name.clone());
                activity_records.push((
                    ActivityAction::SpaceNameUpdated,
                    "name".to_owned(),
                    json!(current.name.clone()),
                    json!(name),
                ));
            }
        }
        if let Some(icon_key) = next_icon_key {
            if icon_key != current.icon_key {
                patch.icon_key = Some(icon_key.clone());
                activity_records.push((
                    ActivityAction::SpaceIconUpdated,
                    "iconKey".to_owned(),
                    json!(current.icon_key.clone()),
                    json!(icon_key),
                ));
            }
        }
        if let Some(color_key) = next_color_key {
            if color_key != current.color_key {
                patch.color_key = Some(color_key.clone());
                activity_records.push((
                    ActivityAction::SpaceColorUpdated,
                    "colorKey".to_owned(),
                    json!(current.color_key.clone()),
                    json!(color_key),
                ));
            }
        }

        if activity_records.is_empty() {
            return Ok(map_space_model(current));
        }

        let updated_at = now_utc().to_rfc3339();
        let transaction = self.repository.connection().begin().await?;
        let updated = self
            .repository
            .update(&transaction, &space_id, patch, &updated_at)
            .await?
            .ok_or_else(|| AppError::not_found("Space 不存在"))?;

        for (action, field, old_value, new_value) in activity_records {
            self.activity_service
                .record_activity_in_txn(
                    &transaction,
                    RecordActivityInput {
                        entity_type: ActivityEntityKind::Space,
                        entity_id: updated.id.clone(),
                        action,
                        actor_type: None,
                        source: None,
                        summary: Some(format!("更新 Space「{}」", updated.name)),
                        metadata: Some(json!({ "spaceId": updated.id })),
                        changes: vec![ActivityChangeInput {
                            field,
                            old_value: Some(old_value),
                            new_value: Some(new_value),
                        }],
                    },
                )
                .await?;
        }

        transaction.commit().await?;
        Ok(map_space_model(updated))
    }

    /// 切换默认 Space。
    pub async fn set_default_space(
        &self,
        input: SetDefaultSpaceInput,
    ) -> Result<SpaceDto, AppError> {
        let space_id = normalize_space_id(&input.space_id)?;
        let current = self.require_existing_space(&space_id).await?;
        ensure_space_mutable(&current)?;

        if current.is_default {
            return Ok(map_space_model(current));
        }

        let updated_at = now_utc().to_rfc3339();
        let transaction = self.repository.connection().begin().await?;
        self.repository
            .clear_default(&transaction, &updated_at)
            .await?;
        let updated = self
            .repository
            .set_default(&transaction, &space_id, &updated_at)
            .await?
            .ok_or_else(|| AppError::not_found("Space 不存在"))?;

        self.activity_service
            .record_activity_in_txn(
                &transaction,
                RecordActivityInput {
                    entity_type: ActivityEntityKind::Space,
                    entity_id: updated.id.clone(),
                    action: ActivityAction::SpaceDefaultChanged,
                    actor_type: None,
                    source: None,
                    summary: Some(format!("设置默认 Space 为「{}」", updated.name)),
                    metadata: Some(json!({ "spaceId": updated.id })),
                    changes: vec![ActivityChangeInput {
                        field: "isDefault".to_owned(),
                        old_value: Some(json!(false)),
                        new_value: Some(json!(true)),
                    }],
                },
            )
            .await?;

        transaction.commit().await?;
        Ok(map_space_model(updated))
    }

    /// 归档一个 Space，并级联归档其下项目和任务。
    pub async fn archive_space(&self, input: SpaceIdInput) -> Result<SpaceDto, AppError> {
        let space_id = normalize_space_id(&input.space_id)?;
        let current = self.require_existing_space(&space_id).await?;
        ensure_space_mutable(&current)?;
        ensure_not_only_active_default(
            &current,
            "当前唯一活跃默认 Space 不能直接归档，请先切换默认 Space",
        )?;

        if current.archived_at.is_some() {
            return Ok(map_space_model(current));
        }

        let now = now_utc().to_rfc3339();
        let transaction = self.repository.connection().begin().await?;
        let updated = self
            .repository
            .archive_raw(&transaction, &space_id, &now, &now)
            .await?
            .ok_or_else(|| AppError::not_found("Space 不存在"))?;
        let archived_projects = self
            .project_repository
            .archive_by_space_raw(&transaction, &space_id, &now, &space_id, &now)
            .await?;
        let archived_tasks = self
            .task_repository
            .archive_by_space_raw(&transaction, &space_id, &now, &space_id, &now)
            .await?;

        self.activity_service
            .record_activity_in_txn(
                &transaction,
                RecordActivityInput {
                    entity_type: ActivityEntityKind::Space,
                    entity_id: updated.id.clone(),
                    action: ActivityAction::SpaceArchived,
                    actor_type: None,
                    source: None,
                    summary: Some(format!("归档 Space「{}」", updated.name)),
                    metadata: Some(json!({
                        "spaceId": updated.id,
                        "archivedProjects": archived_projects,
                        "archivedTasks": archived_tasks
                    })),
                    changes: vec![ActivityChangeInput {
                        field: "archivedAt".to_owned(),
                        old_value: None,
                        new_value: Some(json!(now.clone())),
                    }],
                },
            )
            .await?;

        transaction.commit().await?;
        Ok(map_space_model(updated))
    }

    /// 恢复一个已归档或已删除的 Space，仅恢复 Space 本身。
    pub async fn restore_space(&self, input: SpaceIdInput) -> Result<SpaceDto, AppError> {
        let space_id = normalize_space_id(&input.space_id)?;
        let current = self.require_existing_space(&space_id).await?;
        let existing_default = self.repository.get_default().await?;
        if current.is_default
            && current.deleted_at.is_some()
            && existing_default
                .as_ref()
                .is_some_and(|space| space.id != current.id)
        {
            return Err(AppError::conflict(
                "已存在其他活跃默认 Space，无法直接恢复该默认 Space",
            ));
        }

        if current.archived_at.is_none() && current.deleted_at.is_none() {
            return Ok(map_space_model(current));
        }

        let updated_at = now_utc().to_rfc3339();
        let transaction = self.repository.connection().begin().await?;
        let restored = self
            .repository
            .restore_raw(&transaction, &space_id, &updated_at)
            .await?
            .ok_or_else(|| AppError::not_found("Space 不存在"))?;

        self.activity_service
            .record_activity_in_txn(
                &transaction,
                RecordActivityInput {
                    entity_type: ActivityEntityKind::Space,
                    entity_id: restored.id.clone(),
                    action: ActivityAction::SpaceRestored,
                    actor_type: None,
                    source: None,
                    summary: Some(format!("恢复 Space「{}」", restored.name)),
                    metadata: Some(json!({ "spaceId": restored.id })),
                    changes: vec![
                        ActivityChangeInput {
                            field: "archivedAt".to_owned(),
                            old_value: current.archived_at.as_ref().map(|value| json!(value)),
                            new_value: Some(serde_json::Value::Null),
                        },
                        ActivityChangeInput {
                            field: "deletedAt".to_owned(),
                            old_value: current.deleted_at.as_ref().map(|value| json!(value)),
                            new_value: Some(serde_json::Value::Null),
                        },
                    ],
                },
            )
            .await?;

        transaction.commit().await?;
        Ok(map_space_model(restored))
    }

    /// 删除一个 Space，并级联删除其下项目和任务。
    pub async fn delete_space(&self, input: SpaceIdInput) -> Result<SpaceDto, AppError> {
        let space_id = normalize_space_id(&input.space_id)?;
        let current = self.require_existing_space(&space_id).await?;
        ensure_not_only_active_default(
            &current,
            "当前唯一活跃默认 Space 不能直接删除，请先切换默认 Space",
        )?;

        if current.deleted_at.is_some() {
            return Ok(map_space_model(current));
        }

        let now = now_utc().to_rfc3339();
        let transaction = self.repository.connection().begin().await?;
        let updated = self
            .repository
            .delete_raw(&transaction, &space_id, &now, &now)
            .await?
            .ok_or_else(|| AppError::not_found("Space 不存在"))?;
        let deleted_projects = self
            .project_repository
            .delete_by_space_raw(&transaction, &space_id, &now, &space_id, &now)
            .await?;
        let deleted_tasks = self
            .task_repository
            .delete_by_space_raw(&transaction, &space_id, &now, &space_id, &now)
            .await?;

        self.activity_service
            .record_activity_in_txn(
                &transaction,
                RecordActivityInput {
                    entity_type: ActivityEntityKind::Space,
                    entity_id: updated.id.clone(),
                    action: ActivityAction::SpaceDeleted,
                    actor_type: None,
                    source: None,
                    summary: Some(format!("删除 Space「{}」", updated.name)),
                    metadata: Some(json!({
                        "spaceId": updated.id,
                        "deletedProjects": deleted_projects,
                        "deletedTasks": deleted_tasks
                    })),
                    changes: vec![ActivityChangeInput {
                        field: "deletedAt".to_owned(),
                        old_value: None,
                        new_value: Some(json!(now.clone())),
                    }],
                },
            )
            .await?;

        transaction.commit().await?;
        Ok(map_space_model(updated))
    }

    async fn require_existing_space(&self, space_id: &str) -> Result<space::Model, AppError> {
        self.repository
            .get(space_id)
            .await?
            .ok_or_else(|| AppError::not_found("Space 不存在"))
    }
}

fn map_space_model(model: space::Model) -> SpaceDto {
    SpaceDto {
        id: model.id,
        name: model.name,
        icon_key: model.icon_key,
        color_key: model.color_key,
        is_default: model.is_default,
        sort_order: model.sort_order,
        archived_at: model.archived_at,
        deleted_at: model.deleted_at,
        created_at: model.created_at,
        updated_at: model.updated_at,
    }
}

fn normalize_space_id(value: &str) -> Result<String, AppError> {
    let normalized = normalize_required_text(value, "Space id")?;
    Uuid::parse_str(&normalized).map_err(|_| AppError::validation("spaceId 必须是合法 UUID"))?;
    Ok(normalized)
}

fn normalize_optional_required_text(
    value: Option<&str>,
    field: &str,
) -> Result<Option<String>, AppError> {
    value
        .map(|value| normalize_required_text(value, field))
        .transpose()
}

fn ensure_space_mutable(space: &space::Model) -> Result<(), AppError> {
    if space.deleted_at.is_some() {
        return Err(AppError::conflict("已删除的 Space 不能直接编辑或归档"));
    }
    Ok(())
}

fn ensure_not_only_active_default(space: &space::Model, message: &str) -> Result<(), AppError> {
    if space.is_default && space.archived_at.is_none() && space.deleted_at.is_none() {
        return Err(AppError::conflict(message));
    }
    Ok(())
}

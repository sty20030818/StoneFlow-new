//! Lifecycle Service：统一承载 Archive / Trash 生命周期编排。

use std::collections::HashMap;

use sea_orm::TransactionTrait;
use serde::{Deserialize, Serialize};
use serde_json::json;
use stoneflow_entity::{common::ActivityEntityKind, project, space, task};
use uuid::Uuid;

use crate::{
    app::error::AppError,
    application::activity::{
        ActivityAction, ActivityChangeInput, ActivityService, RecordActivityInput,
    },
    domain::{normalize_required_text, now_utc},
    infrastructure::repositories::{
        ProjectRepository, SpaceRepository, TaskRepository, UpdateTaskPatch,
    },
};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum LifecycleEntityType {
    Space,
    Project,
    Task,
}

impl LifecycleEntityType {
    fn as_str(self) -> &'static str {
        match self {
            Self::Space => "space",
            Self::Project => "project",
            Self::Task => "task",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum LifecycleMode {
    Archive,
    Trash,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LifecycleScopeKind {
    All,
    Space,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LifecycleScopeInput {
    #[serde(rename = "type")]
    pub kind: LifecycleScopeKind,
    pub space_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListLifecycleEntriesInput {
    pub scope: LifecycleScopeInput,
    pub entity_filter: Option<LifecycleEntityType>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LifecycleEntry {
    pub id: String,
    pub entity_type: LifecycleEntityType,
    pub title: String,
    pub space_id: Option<String>,
    pub space_name: Option<String>,
    pub project_id: Option<String>,
    pub project_name: Option<String>,
    pub archived_at: Option<String>,
    pub deleted_at: Option<String>,
    pub source_type: Option<String>,
    pub source_id: Option<String>,
    pub restore_hint: String,
}

#[derive(Debug, Clone)]
pub struct LifecycleService {
    space_repository: SpaceRepository,
    project_repository: ProjectRepository,
    task_repository: TaskRepository,
    activity_service: ActivityService,
}

impl LifecycleService {
    pub fn new(
        space_repository: SpaceRepository,
        project_repository: ProjectRepository,
        task_repository: TaskRepository,
        activity_service: ActivityService,
    ) -> Self {
        Self {
            space_repository,
            project_repository,
            task_repository,
            activity_service,
        }
    }

    pub async fn archive_space(&self, space_id: &str) -> Result<space::Model, AppError> {
        let space_id = normalize_uuid_text(space_id, "spaceId")?;
        let current = self.require_existing_space(&space_id).await?;
        ensure_space_mutable(&current)?;
        ensure_not_only_active_default(
            &current,
            "当前唯一活跃默认 Space 不能直接归档，请先切换默认 Space",
        )?;

        if current.archived_at.is_some() {
            return Ok(current);
        }

        let now = now_utc().to_rfc3339();
        let transaction = self.space_repository.connection().begin().await?;
        let affected_projects = self
            .project_repository
            .list_by_space(&space_id)
            .await?
            .into_iter()
            .filter(|project| project.archived_at.is_none() && project.deleted_at.is_none())
            .collect::<Vec<_>>();
        let affected_tasks = self
            .task_repository
            .list_by_space(&space_id)
            .await?
            .into_iter()
            .filter(|task| task.archived_at.is_none() && task.deleted_at.is_none())
            .collect::<Vec<_>>();

        let updated = self
            .space_repository
            .archive_raw(&transaction, &space_id, &now, &now)
            .await?
            .ok_or_else(|| AppError::not_found("Space 不存在"))?;

        self.project_repository
            .archive_by_space_raw(&transaction, &space_id, &now, &space_id, &now)
            .await?;
        self.task_repository
            .archive_by_space_raw(&transaction, &space_id, &now, &space_id, &now)
            .await?;

        self.record_space_activity(
            &transaction,
            &updated,
            ActivityAction::SpaceArchived,
            format!("归档 Space「{}」", updated.name),
            Some(json!({
                "spaceId": updated.id,
                "archivedProjectCount": affected_projects.len(),
                "archivedTaskCount": affected_tasks.len(),
            })),
            vec![ActivityChangeInput {
                field: "archivedAt".to_owned(),
                old_value: current.archived_at.clone().map(|value| json!(value)),
                new_value: Some(json!(now.clone())),
            }],
        )
        .await?;

        for project in &affected_projects {
            self.record_project_activity(
                &transaction,
                project,
                ActivityAction::ProjectArchived,
                format!("归档 Project「{}」", project.name),
                Some(json!({
                    "projectId": project.id,
                    "spaceId": project.space_id,
                    "sourceEntityType": "space",
                    "sourceEntityId": updated.id,
                    "cascade": true,
                })),
                vec![ActivityChangeInput {
                    field: "archivedAt".to_owned(),
                    old_value: project.archived_at.clone().map(|value| json!(value)),
                    new_value: Some(json!(now.clone())),
                }],
            )
            .await?;
        }

        for item in &affected_tasks {
            self.record_task_activity(
                &transaction,
                item,
                ActivityAction::TaskArchived,
                format!("归档任务「{}」", item.title),
                Some(json!({
                    "taskId": item.id,
                    "spaceId": item.space_id,
                    "projectId": item.project_id,
                    "sourceEntityType": "space",
                    "sourceEntityId": updated.id,
                    "cascade": true,
                })),
                vec![ActivityChangeInput {
                    field: "archivedAt".to_owned(),
                    old_value: item.archived_at.clone().map(|value| json!(value)),
                    new_value: Some(json!(now.clone())),
                }],
            )
            .await?;
        }

        transaction.commit().await?;
        Ok(updated)
    }

    pub async fn restore_space(&self, space_id: &str) -> Result<space::Model, AppError> {
        let space_id = normalize_uuid_text(space_id, "spaceId")?;
        let current = self.require_existing_space(&space_id).await?;
        let existing_default = self.space_repository.get_default().await?;
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
            return Ok(current);
        }

        let updated_at = now_utc().to_rfc3339();
        let transaction = self.space_repository.connection().begin().await?;
        let restored = self
            .space_repository
            .restore_raw(&transaction, &space_id, &updated_at)
            .await?
            .ok_or_else(|| AppError::not_found("Space 不存在"))?;

        self.record_space_activity(
            &transaction,
            &restored,
            ActivityAction::SpaceRestored,
            format!("恢复 Space「{}」", restored.name),
            Some(json!({ "spaceId": restored.id })),
            vec![
                ActivityChangeInput {
                    field: "archivedAt".to_owned(),
                    old_value: current.archived_at.clone().map(|value| json!(value)),
                    new_value: None,
                },
                ActivityChangeInput {
                    field: "deletedAt".to_owned(),
                    old_value: current.deleted_at.clone().map(|value| json!(value)),
                    new_value: None,
                },
            ],
        )
        .await?;

        transaction.commit().await?;
        Ok(restored)
    }

    pub async fn delete_space(&self, space_id: &str) -> Result<space::Model, AppError> {
        let space_id = normalize_uuid_text(space_id, "spaceId")?;
        let current = self.require_existing_space(&space_id).await?;
        ensure_not_only_active_default(
            &current,
            "当前唯一活跃默认 Space 不能直接删除，请先切换默认 Space",
        )?;

        if current.deleted_at.is_some() {
            return Ok(current);
        }

        let now = now_utc().to_rfc3339();
        let transaction = self.space_repository.connection().begin().await?;
        let affected_projects = self
            .project_repository
            .list_by_space(&space_id)
            .await?
            .into_iter()
            .filter(|project| project.deleted_at.is_none())
            .collect::<Vec<_>>();
        let affected_tasks = self
            .task_repository
            .list_by_space(&space_id)
            .await?
            .into_iter()
            .filter(|task| task.deleted_at.is_none())
            .collect::<Vec<_>>();

        let updated = self
            .space_repository
            .delete_raw(&transaction, &space_id, &now, &now)
            .await?
            .ok_or_else(|| AppError::not_found("Space 不存在"))?;

        self.project_repository
            .delete_by_space_raw(&transaction, &space_id, &now, &space_id, &now)
            .await?;
        self.task_repository
            .delete_by_space_raw(&transaction, &space_id, &now, &space_id, &now)
            .await?;

        self.record_space_activity(
            &transaction,
            &updated,
            ActivityAction::SpaceDeleted,
            format!("删除 Space「{}」", updated.name),
            Some(json!({
                "spaceId": updated.id,
                "deletedProjectCount": affected_projects.len(),
                "deletedTaskCount": affected_tasks.len(),
            })),
            vec![ActivityChangeInput {
                field: "deletedAt".to_owned(),
                old_value: current.deleted_at.clone().map(|value| json!(value)),
                new_value: Some(json!(now.clone())),
            }],
        )
        .await?;

        for project in &affected_projects {
            self.record_project_activity(
                &transaction,
                project,
                ActivityAction::ProjectDeleted,
                format!("删除 Project「{}」", project.name),
                Some(json!({
                    "projectId": project.id,
                    "spaceId": project.space_id,
                    "sourceEntityType": "space",
                    "sourceEntityId": updated.id,
                    "cascade": true,
                })),
                vec![ActivityChangeInput {
                    field: "deletedAt".to_owned(),
                    old_value: project.deleted_at.clone().map(|value| json!(value)),
                    new_value: Some(json!(now.clone())),
                }],
            )
            .await?;
        }

        for item in &affected_tasks {
            self.record_task_activity(
                &transaction,
                item,
                ActivityAction::TaskDeleted,
                format!("删除任务「{}」", item.title),
                Some(json!({
                    "taskId": item.id,
                    "spaceId": item.space_id,
                    "projectId": item.project_id,
                    "sourceEntityType": "space",
                    "sourceEntityId": updated.id,
                    "cascade": true,
                })),
                vec![ActivityChangeInput {
                    field: "deletedAt".to_owned(),
                    old_value: item.deleted_at.clone().map(|value| json!(value)),
                    new_value: Some(json!(now.clone())),
                }],
            )
            .await?;
        }

        transaction.commit().await?;
        Ok(updated)
    }

    pub async fn permanently_delete_space(&self, space_id: &str) -> Result<(), AppError> {
        let space_id = normalize_uuid_text(space_id, "spaceId")?;
        let current = self.require_existing_space(&space_id).await?;
        ensure_deleted(&current.deleted_at, "Space")?;

        let transaction = self.space_repository.connection().begin().await?;
        let deleted_projects = self
            .project_repository
            .list_by_space(&space_id)
            .await?
            .into_iter()
            .filter(|project| project.deleted_at.is_some())
            .collect::<Vec<_>>();
        let deleted_tasks = self
            .task_repository
            .list_by_space(&space_id)
            .await?
            .into_iter()
            .filter(|task| task.deleted_at.is_some())
            .collect::<Vec<_>>();

        for item in &deleted_tasks {
            self.record_task_activity(
                &transaction,
                item,
                ActivityAction::TaskPermanentlyDeleted,
                format!("永久删除任务「{}」", item.title),
                Some(json!({
                    "taskId": item.id,
                    "spaceId": item.space_id,
                    "projectId": item.project_id,
                    "sourceEntityType": "space",
                    "sourceEntityId": current.id,
                    "cascade": true,
                })),
                Vec::new(),
            )
            .await?;
            self.task_repository
                .permanently_delete(&transaction, &item.id)
                .await?;
        }

        for project in &deleted_projects {
            self.record_project_activity(
                &transaction,
                project,
                ActivityAction::ProjectPermanentlyDeleted,
                format!("永久删除 Project「{}」", project.name),
                Some(json!({
                    "projectId": project.id,
                    "spaceId": project.space_id,
                    "sourceEntityType": "space",
                    "sourceEntityId": current.id,
                    "cascade": true,
                })),
                Vec::new(),
            )
            .await?;
            self.project_repository
                .permanently_delete(&transaction, &project.id)
                .await?;
        }

        self.record_space_activity(
            &transaction,
            &current,
            ActivityAction::SpacePermanentlyDeleted,
            format!("永久删除 Space「{}」", current.name),
            Some(json!({
                "spaceId": current.id,
                "deletedProjectCount": deleted_projects.len(),
                "deletedTaskCount": deleted_tasks.len(),
            })),
            Vec::new(),
        )
        .await?;

        self.space_repository
            .permanently_delete(&transaction, &space_id)
            .await?;
        transaction.commit().await?;
        Ok(())
    }

    pub async fn archive_project(&self, project_id: &str) -> Result<project::Model, AppError> {
        let project_id = normalize_uuid_text(project_id, "projectId")?;
        let current = self.require_existing_project(&project_id).await?;

        if current.archived_at.is_some() {
            return Ok(current);
        }
        if current.deleted_at.is_some() {
            return Err(AppError::conflict("已删除 Project 不能归档"));
        }

        let now = now_utc().to_rfc3339();
        let transaction = self.project_repository.connection().begin().await?;
        let affected_tasks = self
            .task_repository
            .list_by_project(&project_id)
            .await?
            .into_iter()
            .filter(|task| task.archived_at.is_none() && task.deleted_at.is_none())
            .collect::<Vec<_>>();

        let updated = self
            .project_repository
            .archive_raw(&transaction, &project_id, &now, &project_id, &now)
            .await?
            .ok_or_else(|| AppError::not_found("Project 不存在"))?;
        self.task_repository
            .archive_by_project_raw(&transaction, &project_id, &now, &project_id, &now)
            .await?;

        self.record_project_activity(
            &transaction,
            &updated,
            ActivityAction::ProjectArchived,
            format!("归档 Project「{}」", updated.name),
            Some(json!({
                "projectId": updated.id,
                "spaceId": updated.space_id,
                "archivedTaskCount": affected_tasks.len(),
            })),
            vec![ActivityChangeInput {
                field: "archivedAt".to_owned(),
                old_value: current.archived_at.clone().map(|value| json!(value)),
                new_value: Some(json!(now.clone())),
            }],
        )
        .await?;

        for item in &affected_tasks {
            self.record_task_activity(
                &transaction,
                item,
                ActivityAction::TaskArchived,
                format!("归档任务「{}」", item.title),
                Some(json!({
                    "taskId": item.id,
                    "spaceId": item.space_id,
                    "projectId": item.project_id,
                    "sourceEntityType": "project",
                    "sourceEntityId": updated.id,
                    "cascade": true,
                })),
                vec![ActivityChangeInput {
                    field: "archivedAt".to_owned(),
                    old_value: item.archived_at.clone().map(|value| json!(value)),
                    new_value: Some(json!(now.clone())),
                }],
            )
            .await?;
        }

        transaction.commit().await?;
        Ok(updated)
    }

    pub async fn restore_project(&self, project_id: &str) -> Result<project::Model, AppError> {
        let project_id = normalize_uuid_text(project_id, "projectId")?;
        let current = self.require_existing_project(&project_id).await?;

        if current.archived_at.is_none() && current.deleted_at.is_none() {
            return Ok(current);
        }

        self.require_visible_space(&current.space_id).await?;

        let updated_at = now_utc().to_rfc3339();
        let transaction = self.project_repository.connection().begin().await?;
        let updated = self
            .project_repository
            .restore_raw(&transaction, &project_id, &updated_at)
            .await?
            .ok_or_else(|| AppError::not_found("Project 不存在"))?;

        self.record_project_activity(
            &transaction,
            &updated,
            ActivityAction::ProjectRestored,
            format!("恢复 Project「{}」", updated.name),
            Some(json!({ "projectId": updated.id, "spaceId": updated.space_id })),
            vec![
                ActivityChangeInput {
                    field: "archivedAt".to_owned(),
                    old_value: current.archived_at.clone().map(|value| json!(value)),
                    new_value: None,
                },
                ActivityChangeInput {
                    field: "deletedAt".to_owned(),
                    old_value: current.deleted_at.clone().map(|value| json!(value)),
                    new_value: None,
                },
            ],
        )
        .await?;

        transaction.commit().await?;
        Ok(updated)
    }

    pub async fn delete_project(&self, project_id: &str) -> Result<project::Model, AppError> {
        let project_id = normalize_uuid_text(project_id, "projectId")?;
        let current = self.require_existing_project(&project_id).await?;

        if current.deleted_at.is_some() {
            return Ok(current);
        }

        let now = now_utc().to_rfc3339();
        let transaction = self.project_repository.connection().begin().await?;
        let affected_tasks = self
            .task_repository
            .list_by_project(&project_id)
            .await?
            .into_iter()
            .filter(|task| task.deleted_at.is_none())
            .collect::<Vec<_>>();

        let updated = self
            .project_repository
            .delete_raw(&transaction, &project_id, &now, &project_id, &now)
            .await?
            .ok_or_else(|| AppError::not_found("Project 不存在"))?;
        self.task_repository
            .delete_by_project_raw(&transaction, &project_id, &now, &project_id, &now)
            .await?;

        self.record_project_activity(
            &transaction,
            &updated,
            ActivityAction::ProjectDeleted,
            format!("删除 Project「{}」", updated.name),
            Some(json!({
                "projectId": updated.id,
                "spaceId": updated.space_id,
                "deletedTaskCount": affected_tasks.len(),
            })),
            vec![ActivityChangeInput {
                field: "deletedAt".to_owned(),
                old_value: current.deleted_at.clone().map(|value| json!(value)),
                new_value: Some(json!(now.clone())),
            }],
        )
        .await?;

        for item in &affected_tasks {
            self.record_task_activity(
                &transaction,
                item,
                ActivityAction::TaskDeleted,
                format!("删除任务「{}」", item.title),
                Some(json!({
                    "taskId": item.id,
                    "spaceId": item.space_id,
                    "projectId": item.project_id,
                    "sourceEntityType": "project",
                    "sourceEntityId": updated.id,
                    "cascade": true,
                })),
                vec![ActivityChangeInput {
                    field: "deletedAt".to_owned(),
                    old_value: item.deleted_at.clone().map(|value| json!(value)),
                    new_value: Some(json!(now.clone())),
                }],
            )
            .await?;
        }

        transaction.commit().await?;
        Ok(updated)
    }

    pub async fn permanently_delete_project(&self, project_id: &str) -> Result<(), AppError> {
        let project_id = normalize_uuid_text(project_id, "projectId")?;
        let current = self.require_existing_project(&project_id).await?;
        ensure_deleted(&current.deleted_at, "Project")?;

        let transaction = self.project_repository.connection().begin().await?;
        let deleted_tasks = self
            .task_repository
            .list_by_project(&project_id)
            .await?
            .into_iter()
            .filter(|task| task.deleted_at.is_some())
            .collect::<Vec<_>>();

        for item in &deleted_tasks {
            self.record_task_activity(
                &transaction,
                item,
                ActivityAction::TaskPermanentlyDeleted,
                format!("永久删除任务「{}」", item.title),
                Some(json!({
                    "taskId": item.id,
                    "spaceId": item.space_id,
                    "projectId": item.project_id,
                    "sourceEntityType": "project",
                    "sourceEntityId": current.id,
                    "cascade": true,
                })),
                Vec::new(),
            )
            .await?;
            self.task_repository
                .permanently_delete(&transaction, &item.id)
                .await?;
        }

        self.record_project_activity(
            &transaction,
            &current,
            ActivityAction::ProjectPermanentlyDeleted,
            format!("永久删除 Project「{}」", current.name),
            Some(json!({
                "projectId": current.id,
                "spaceId": current.space_id,
                "deletedTaskCount": deleted_tasks.len(),
            })),
            Vec::new(),
        )
        .await?;

        self.project_repository
            .permanently_delete(&transaction, &project_id)
            .await?;
        transaction.commit().await?;
        Ok(())
    }

    pub async fn archive_task(&self, task_id: &str) -> Result<task::Model, AppError> {
        let task_id = normalize_uuid_text(task_id, "taskId")?;
        let current = self.require_existing_task(&task_id).await?;

        if current.deleted_at.is_some() {
            return Err(AppError::not_found("Task 不存在"));
        }
        if current.archived_at.is_some() {
            return Ok(current);
        }

        let now = now_utc().to_rfc3339();
        let transaction = self.task_repository.connection().begin().await?;
        let updated = self
            .task_repository
            .archive_raw(&transaction, &task_id, &now, &task_id, &now)
            .await?
            .ok_or_else(|| AppError::not_found("Task 不存在"))?;

        self.record_task_activity(
            &transaction,
            &updated,
            ActivityAction::TaskArchived,
            format!("归档任务「{}」", updated.title),
            Some(json!({
                "taskId": updated.id,
                "spaceId": updated.space_id,
                "projectId": updated.project_id,
            })),
            vec![ActivityChangeInput {
                field: "archivedAt".to_owned(),
                old_value: current.archived_at.clone().map(|value| json!(value)),
                new_value: Some(json!(now.clone())),
            }],
        )
        .await?;

        transaction.commit().await?;
        Ok(updated)
    }

    pub async fn restore_task(&self, task_id: &str) -> Result<task::Model, AppError> {
        let task_id = normalize_uuid_text(task_id, "taskId")?;
        let current = self.require_existing_task(&task_id).await?;

        if current.archived_at.is_none() && current.deleted_at.is_none() {
            return Ok(current);
        }

        let target_space = match self.space_repository.get(&current.space_id).await? {
            Some(space) if space.archived_at.is_none() && space.deleted_at.is_none() => space,
            _ => self
                .space_repository
                .get_default()
                .await?
                .ok_or_else(|| AppError::conflict("默认 Space 不存在"))?,
        };

        let target_project_id = match current.project_id.as_deref() {
            Some(project_id) if target_space.id == current.space_id => {
                match self.project_repository.get(project_id).await? {
                    Some(project)
                        if project.archived_at.is_none()
                            && project.deleted_at.is_none()
                            && project.space_id == target_space.id =>
                    {
                        Some(project.id)
                    }
                    _ => None,
                }
            }
            _ => None,
        };
        let next_inbox_at = if target_project_id.is_some() {
            current.inbox_at.clone()
        } else {
            Some(now_utc().to_rfc3339())
        };

        let updated_at = now_utc().to_rfc3339();
        let transaction = self.task_repository.connection().begin().await?;
        let _ = self
            .task_repository
            .restore_raw(&transaction, &task_id, &updated_at)
            .await?
            .ok_or_else(|| AppError::not_found("Task 不存在"))?;
        let updated = self
            .task_repository
            .update(
                &transaction,
                &task_id,
                UpdateTaskPatch {
                    space_id: Some(target_space.id.clone()),
                    project_id: Some(target_project_id.clone()),
                    inbox_at: Some(next_inbox_at.clone()),
                    ..UpdateTaskPatch::default()
                },
                &updated_at,
            )
            .await?
            .ok_or_else(|| AppError::not_found("Task 不存在"))?;

        self.record_task_activity(
            &transaction,
            &updated,
            ActivityAction::TaskRestored,
            format!("恢复任务「{}」", updated.title),
            Some(json!({
                "taskId": updated.id,
                "spaceId": updated.space_id,
                "projectId": updated.project_id,
                "restoredToDefaultSpace": updated.space_id != current.space_id,
                "restoredToInbox": current.project_id.is_some() && updated.project_id.is_none(),
            })),
            vec![
                ActivityChangeInput {
                    field: "archivedAt".to_owned(),
                    old_value: current.archived_at.clone().map(|value| json!(value)),
                    new_value: None,
                },
                ActivityChangeInput {
                    field: "deletedAt".to_owned(),
                    old_value: current.deleted_at.clone().map(|value| json!(value)),
                    new_value: None,
                },
                ActivityChangeInput {
                    field: "spaceId".to_owned(),
                    old_value: Some(json!(current.space_id.clone())),
                    new_value: Some(json!(updated.space_id.clone())),
                },
                ActivityChangeInput {
                    field: "projectId".to_owned(),
                    old_value: current.project_id.clone().map(|value| json!(value)),
                    new_value: updated.project_id.clone().map(|value| json!(value)),
                },
                ActivityChangeInput {
                    field: "inboxAt".to_owned(),
                    old_value: current.inbox_at.clone().map(|value| json!(value)),
                    new_value: next_inbox_at.clone().map(|value| json!(value)),
                },
            ],
        )
        .await?;

        transaction.commit().await?;
        Ok(updated)
    }

    pub async fn delete_task(&self, task_id: &str) -> Result<task::Model, AppError> {
        let task_id = normalize_uuid_text(task_id, "taskId")?;
        let current = self.require_existing_task(&task_id).await?;

        if current.deleted_at.is_some() {
            return Ok(current);
        }

        let now = now_utc().to_rfc3339();
        let transaction = self.task_repository.connection().begin().await?;
        let updated = self
            .task_repository
            .delete_raw(&transaction, &task_id, &now, &task_id, &now)
            .await?
            .ok_or_else(|| AppError::not_found("Task 不存在"))?;

        self.record_task_activity(
            &transaction,
            &updated,
            ActivityAction::TaskDeleted,
            format!("删除任务「{}」", updated.title),
            Some(json!({
                "taskId": updated.id,
                "spaceId": updated.space_id,
                "projectId": updated.project_id,
            })),
            vec![ActivityChangeInput {
                field: "deletedAt".to_owned(),
                old_value: current.deleted_at.clone().map(|value| json!(value)),
                new_value: Some(json!(now.clone())),
            }],
        )
        .await?;

        transaction.commit().await?;
        Ok(updated)
    }

    pub async fn permanently_delete_task(&self, task_id: &str) -> Result<(), AppError> {
        let task_id = normalize_uuid_text(task_id, "taskId")?;
        let current = self.require_existing_task(&task_id).await?;
        ensure_deleted(&current.deleted_at, "Task")?;

        let transaction = self.task_repository.connection().begin().await?;
        self.record_task_activity(
            &transaction,
            &current,
            ActivityAction::TaskPermanentlyDeleted,
            format!("永久删除任务「{}」", current.title),
            Some(json!({
                "taskId": current.id,
                "spaceId": current.space_id,
                "projectId": current.project_id,
            })),
            Vec::new(),
        )
        .await?;

        self.task_repository
            .permanently_delete(&transaction, &task_id)
            .await?;
        transaction.commit().await?;
        Ok(())
    }

    pub async fn list_archive_entries(
        &self,
        input: ListLifecycleEntriesInput,
    ) -> Result<Vec<LifecycleEntry>, AppError> {
        self.list_entries(LifecycleMode::Archive, input).await
    }

    pub async fn list_trash_entries(
        &self,
        input: ListLifecycleEntriesInput,
    ) -> Result<Vec<LifecycleEntry>, AppError> {
        self.list_entries(LifecycleMode::Trash, input).await
    }

    async fn list_entries(
        &self,
        mode: LifecycleMode,
        input: ListLifecycleEntriesInput,
    ) -> Result<Vec<LifecycleEntry>, AppError> {
        let scope_space_id = normalize_scope(&input.scope)?;
        let entity_filter = input.entity_filter;
        let include_space =
            entity_filter.is_none() || entity_filter == Some(LifecycleEntityType::Space);
        let include_project =
            entity_filter.is_none() || entity_filter == Some(LifecycleEntityType::Project);
        let include_task =
            entity_filter.is_none() || entity_filter == Some(LifecycleEntityType::Task);

        let space_rows = if include_space {
            match mode {
                LifecycleMode::Archive => {
                    self.space_repository
                        .list_archived(scope_space_id.as_deref())
                        .await?
                }
                LifecycleMode::Trash => {
                    self.space_repository
                        .list_deleted(scope_space_id.as_deref())
                        .await?
                }
            }
        } else {
            Vec::new()
        };
        let project_rows = if include_project {
            match mode {
                LifecycleMode::Archive => {
                    self.project_repository
                        .list_archived(scope_space_id.as_deref())
                        .await?
                }
                LifecycleMode::Trash => {
                    self.project_repository
                        .list_deleted(scope_space_id.as_deref())
                        .await?
                }
            }
        } else {
            Vec::new()
        };
        let task_rows = if include_task {
            match mode {
                LifecycleMode::Archive => {
                    self.task_repository
                        .list_archived(scope_space_id.as_deref())
                        .await?
                }
                LifecycleMode::Trash => {
                    self.task_repository
                        .list_deleted(scope_space_id.as_deref())
                        .await?
                }
            }
        } else {
            Vec::new()
        };

        let space_ids = project_rows
            .iter()
            .map(|project| project.space_id.clone())
            .chain(task_rows.iter().map(|task| task.space_id.clone()))
            .collect::<Vec<_>>();
        let project_ids = task_rows
            .iter()
            .filter_map(|task| task.project_id.clone())
            .collect::<Vec<_>>();
        let space_map = self
            .space_repository
            .list_by_ids(&space_ids)
            .await?
            .into_iter()
            .map(|space| (space.id.clone(), space))
            .collect::<HashMap<_, _>>();
        let project_map = self
            .project_repository
            .list_by_ids(&project_ids)
            .await?
            .into_iter()
            .map(|project| (project.id.clone(), project))
            .collect::<HashMap<_, _>>();

        let mut entries = Vec::new();
        entries.extend(space_rows.into_iter().map(|space| {
            let (source_type, source_id) = space_source(&space, mode);
            LifecycleEntry {
                id: space.id.clone(),
                entity_type: LifecycleEntityType::Space,
                title: space.name.clone(),
                space_id: Some(space.id.clone()),
                space_name: Some(space.name.clone()),
                project_id: None,
                project_name: None,
                archived_at: space.archived_at.clone(),
                deleted_at: space.deleted_at.clone(),
                source_type,
                source_id,
                restore_hint: restore_hint(LifecycleEntityType::Space),
            }
        }));
        entries.extend(project_rows.into_iter().map(|project| {
            let (source_type, source_id) = project_source(&project, mode);
            let space_name = space_map
                .get(&project.space_id)
                .map(|space| space.name.clone());
            LifecycleEntry {
                id: project.id.clone(),
                entity_type: LifecycleEntityType::Project,
                title: project.name.clone(),
                space_id: Some(project.space_id.clone()),
                space_name,
                project_id: Some(project.id.clone()),
                project_name: Some(project.name.clone()),
                archived_at: project.archived_at.clone(),
                deleted_at: project.deleted_at.clone(),
                source_type,
                source_id,
                restore_hint: restore_hint(LifecycleEntityType::Project),
            }
        }));
        entries.extend(task_rows.into_iter().map(|item| {
            let (source_type, source_id) = task_source(&item, mode);
            let project_name = item
                .project_id
                .as_ref()
                .and_then(|project_id| project_map.get(project_id))
                .map(|project| project.name.clone());
            let space_name = space_map
                .get(&item.space_id)
                .map(|space| space.name.clone());
            LifecycleEntry {
                id: item.id.clone(),
                entity_type: LifecycleEntityType::Task,
                title: item.title.clone(),
                space_id: Some(item.space_id.clone()),
                space_name,
                project_id: item.project_id.clone(),
                project_name,
                archived_at: item.archived_at.clone(),
                deleted_at: item.deleted_at.clone(),
                source_type,
                source_id,
                restore_hint: restore_hint(LifecycleEntityType::Task),
            }
        }));

        entries.sort_by(|left, right| {
            lifecycle_time(right, mode)
                .cmp(&lifecycle_time(left, mode))
                .then_with(|| left.entity_type.as_str().cmp(right.entity_type.as_str()))
                .then_with(|| left.id.cmp(&right.id))
        });

        Ok(entries)
    }

    async fn require_existing_space(&self, space_id: &str) -> Result<space::Model, AppError> {
        self.space_repository
            .get(space_id)
            .await?
            .ok_or_else(|| AppError::not_found("Space 不存在"))
    }

    async fn require_existing_project(&self, project_id: &str) -> Result<project::Model, AppError> {
        self.project_repository
            .get(project_id)
            .await?
            .ok_or_else(|| AppError::not_found("Project 不存在"))
    }

    async fn require_existing_task(&self, task_id: &str) -> Result<task::Model, AppError> {
        self.task_repository
            .get(task_id)
            .await?
            .ok_or_else(|| AppError::not_found("Task 不存在"))
    }

    async fn require_visible_space(&self, space_id: &str) -> Result<space::Model, AppError> {
        let space = self
            .space_repository
            .get(space_id)
            .await?
            .ok_or_else(|| AppError::not_found("Space 不存在"))?;

        if space.archived_at.is_some() || space.deleted_at.is_some() {
            return Err(AppError::conflict("当前 Space 不可用"));
        }

        Ok(space)
    }

    async fn record_space_activity(
        &self,
        transaction: &sea_orm::DatabaseTransaction,
        space: &space::Model,
        action: ActivityAction,
        summary: String,
        metadata: Option<serde_json::Value>,
        changes: Vec<ActivityChangeInput>,
    ) -> Result<(), AppError> {
        self.activity_service
            .record_activity_in_txn(
                transaction,
                RecordActivityInput {
                    entity_type: ActivityEntityKind::Space,
                    entity_id: space.id.clone(),
                    action,
                    actor_type: None,
                    source: None,
                    summary: Some(summary),
                    metadata,
                    changes,
                },
            )
            .await
    }

    async fn record_project_activity(
        &self,
        transaction: &sea_orm::DatabaseTransaction,
        project: &project::Model,
        action: ActivityAction,
        summary: String,
        metadata: Option<serde_json::Value>,
        changes: Vec<ActivityChangeInput>,
    ) -> Result<(), AppError> {
        self.activity_service
            .record_activity_in_txn(
                transaction,
                RecordActivityInput {
                    entity_type: ActivityEntityKind::Project,
                    entity_id: project.id.clone(),
                    action,
                    actor_type: None,
                    source: None,
                    summary: Some(summary),
                    metadata,
                    changes,
                },
            )
            .await
    }

    async fn record_task_activity(
        &self,
        transaction: &sea_orm::DatabaseTransaction,
        item: &task::Model,
        action: ActivityAction,
        summary: String,
        metadata: Option<serde_json::Value>,
        changes: Vec<ActivityChangeInput>,
    ) -> Result<(), AppError> {
        self.activity_service
            .record_activity_in_txn(
                transaction,
                RecordActivityInput {
                    entity_type: ActivityEntityKind::Task,
                    entity_id: item.id.clone(),
                    action,
                    actor_type: None,
                    source: None,
                    summary: Some(summary),
                    metadata,
                    changes,
                },
            )
            .await
    }
}

fn lifecycle_time(entry: &LifecycleEntry, mode: LifecycleMode) -> &str {
    match mode {
        LifecycleMode::Archive => entry.archived_at.as_deref().unwrap_or(""),
        LifecycleMode::Trash => entry.deleted_at.as_deref().unwrap_or(""),
    }
}

fn restore_hint(entity_type: LifecycleEntityType) -> String {
    match entity_type {
        LifecycleEntityType::Space => "只恢复 Space 本身，不恢复子 Project / Task".to_owned(),
        LifecycleEntityType::Project => "只恢复 Project 本身，前提是所属 Space 仍可用".to_owned(),
        LifecycleEntityType::Task => {
            "优先回原 Space；原 Project 不可用则回 Inbox；原 Space 不可用则落默认 Space".to_owned()
        }
    }
}

fn normalize_scope(input: &LifecycleScopeInput) -> Result<Option<String>, AppError> {
    match input.kind {
        LifecycleScopeKind::All => Ok(None),
        LifecycleScopeKind::Space => {
            let space_id = input
                .space_id
                .as_deref()
                .ok_or_else(|| AppError::validation("scope.type=space 时必须提供 spaceId"))?;
            Ok(Some(normalize_uuid_text(space_id, "spaceId")?))
        }
    }
}

fn normalize_uuid_text(value: &str, field: &str) -> Result<String, AppError> {
    let normalized = normalize_required_text(value, field)?;
    Uuid::parse_str(&normalized)
        .map_err(|_| AppError::validation(format!("{field} 必须是合法 UUID")))?;
    Ok(normalized)
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

fn ensure_deleted(deleted_at: &Option<String>, entity_name: &str) -> Result<(), AppError> {
    if deleted_at.is_none() {
        return Err(AppError::conflict(format!(
            "{entity_name} 只有处于删除态时才能永久删除"
        )));
    }
    Ok(())
}

fn space_source(space: &space::Model, mode: LifecycleMode) -> (Option<String>, Option<String>) {
    match mode {
        LifecycleMode::Archive if space.archived_at.is_some() => {
            (Some("self".to_owned()), Some(space.id.clone()))
        }
        LifecycleMode::Trash if space.deleted_at.is_some() => {
            (Some("self".to_owned()), Some(space.id.clone()))
        }
        _ => (None, None),
    }
}

fn project_source(
    project: &project::Model,
    mode: LifecycleMode,
) -> (Option<String>, Option<String>) {
    match mode {
        LifecycleMode::Archive => (
            Some(
                project
                    .archived_by_type
                    .clone()
                    .unwrap_or_else(|| "self".to_owned()),
            ),
            Some(
                project
                    .archived_by_id
                    .clone()
                    .unwrap_or_else(|| project.id.clone()),
            ),
        ),
        LifecycleMode::Trash => (
            Some(
                project
                    .deleted_by_type
                    .clone()
                    .unwrap_or_else(|| "self".to_owned()),
            ),
            Some(
                project
                    .deleted_by_id
                    .clone()
                    .unwrap_or_else(|| project.id.clone()),
            ),
        ),
    }
}

fn task_source(item: &task::Model, mode: LifecycleMode) -> (Option<String>, Option<String>) {
    match mode {
        LifecycleMode::Archive => (
            Some(
                item.archived_by_type
                    .clone()
                    .unwrap_or_else(|| "self".to_owned()),
            ),
            Some(
                item.archived_by_id
                    .clone()
                    .unwrap_or_else(|| item.id.clone()),
            ),
        ),
        LifecycleMode::Trash => (
            Some(
                item.deleted_by_type
                    .clone()
                    .unwrap_or_else(|| "self".to_owned()),
            ),
            Some(
                item.deleted_by_id
                    .clone()
                    .unwrap_or_else(|| item.id.clone()),
            ),
        ),
    }
}

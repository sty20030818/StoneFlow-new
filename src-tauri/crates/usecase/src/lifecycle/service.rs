//! Lifecycle 用例编排：Archive / Trash 与级联 Activity。

#![allow(async_fn_in_trait)]

use std::collections::HashMap;

use serde_json::json;
use stoneflow_domain::{
    ensure_deleted, ensure_not_only_active_default, ensure_space_mutable, now_utc,
    validate_project_id, validate_space_id, validate_task_id, ActivityEntityKind, DomainError,
    LifecycleMode,
};

use crate::{
    activity::{
        ActivityAction, ActivityChangeInput, ActivityPersistence, ActivityService,
        RecordActivityInput,
    },
    lifecycle::{
        executor::{build_lifecycle_entries, normalize_scope},
        types::{LifecycleProjectListRecord, LifecycleTaskListRecord, ListLifecycleEntriesInput},
    },
    project::ProjectRecord,
    space::SpaceRecord,
    task::{TaskRecord, UpdateTaskPatch},
    UsecaseError,
};

/// Space 生命周期持久化边界。
pub trait LifecycleSpacePersistence: Send + Sync {
    type Connection: Send + Sync;

    async fn begin(&self) -> Result<Self::Connection, UsecaseError>;
    async fn commit(&self, connection: Self::Connection) -> Result<(), UsecaseError>;
    async fn get(&self, space_id: &str) -> Result<Option<SpaceRecord>, UsecaseError>;
    async fn get_default(&self) -> Result<Option<SpaceRecord>, UsecaseError>;
    async fn list_by_ids(&self, space_ids: &[String]) -> Result<Vec<SpaceRecord>, UsecaseError>;
    async fn list_archived(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<SpaceRecord>, UsecaseError>;
    async fn list_deleted(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<SpaceRecord>, UsecaseError>;
    async fn archive_raw(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        archived_at: &str,
        updated_at: &str,
    ) -> Result<Option<SpaceRecord>, UsecaseError>;
    async fn restore_raw(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        updated_at: &str,
    ) -> Result<Option<SpaceRecord>, UsecaseError>;
    async fn delete_raw(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        deleted_at: &str,
        updated_at: &str,
    ) -> Result<Option<SpaceRecord>, UsecaseError>;
    async fn permanently_delete(
        &self,
        connection: &Self::Connection,
        space_id: &str,
    ) -> Result<(), UsecaseError>;
}

/// Project 生命周期持久化边界。
pub trait LifecycleProjectPersistence: Send + Sync {
    type Connection: Send + Sync;

    async fn begin(&self) -> Result<Self::Connection, UsecaseError>;
    async fn commit(&self, connection: Self::Connection) -> Result<(), UsecaseError>;
    async fn get(&self, project_id: &str) -> Result<Option<ProjectRecord>, UsecaseError>;
    async fn list_by_space(&self, space_id: &str) -> Result<Vec<ProjectRecord>, UsecaseError>;
    async fn list_by_ids(&self, project_ids: &[String])
        -> Result<Vec<ProjectRecord>, UsecaseError>;
    async fn list_archived(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<LifecycleProjectListRecord>, UsecaseError>;
    async fn list_deleted(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<LifecycleProjectListRecord>, UsecaseError>;
    async fn archive_raw(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        archived_at: &str,
        archived_by_id: &str,
        updated_at: &str,
    ) -> Result<Option<ProjectRecord>, UsecaseError>;
    async fn restore_raw(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        updated_at: &str,
    ) -> Result<Option<ProjectRecord>, UsecaseError>;
    async fn delete_raw(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        deleted_at: &str,
        deleted_by_id: &str,
        updated_at: &str,
    ) -> Result<Option<ProjectRecord>, UsecaseError>;
    async fn permanently_delete(
        &self,
        connection: &Self::Connection,
        project_id: &str,
    ) -> Result<(), UsecaseError>;
    async fn archive_by_space_raw(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        archived_at: &str,
        archived_by_id: &str,
        updated_at: &str,
    ) -> Result<(), UsecaseError>;
    async fn delete_by_space_raw(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        deleted_at: &str,
        deleted_by_id: &str,
        updated_at: &str,
    ) -> Result<(), UsecaseError>;
}

/// Task 生命周期持久化边界。
pub trait LifecycleTaskPersistence: Send + Sync {
    type Connection: Send + Sync;

    async fn begin(&self) -> Result<Self::Connection, UsecaseError>;
    async fn commit(&self, connection: Self::Connection) -> Result<(), UsecaseError>;
    async fn get(&self, task_id: &str) -> Result<Option<TaskRecord>, UsecaseError>;
    async fn list_by_space(&self, space_id: &str) -> Result<Vec<TaskRecord>, UsecaseError>;
    async fn list_by_project(&self, project_id: &str) -> Result<Vec<TaskRecord>, UsecaseError>;
    async fn list_archived(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<LifecycleTaskListRecord>, UsecaseError>;
    async fn list_deleted(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<LifecycleTaskListRecord>, UsecaseError>;
    async fn archive_raw(
        &self,
        connection: &Self::Connection,
        task_id: &str,
        archived_at: &str,
        archived_by_id: &str,
        updated_at: &str,
    ) -> Result<Option<TaskRecord>, UsecaseError>;
    async fn restore_raw(
        &self,
        connection: &Self::Connection,
        task_id: &str,
        updated_at: &str,
    ) -> Result<Option<TaskRecord>, UsecaseError>;
    async fn delete_raw(
        &self,
        connection: &Self::Connection,
        task_id: &str,
        deleted_at: &str,
        deleted_by_id: &str,
        updated_at: &str,
    ) -> Result<Option<TaskRecord>, UsecaseError>;
    async fn permanently_delete(
        &self,
        connection: &Self::Connection,
        task_id: &str,
    ) -> Result<(), UsecaseError>;
    async fn update(
        &self,
        connection: &Self::Connection,
        task_id: &str,
        patch: UpdateTaskPatch,
        updated_at: &str,
    ) -> Result<Option<TaskRecord>, UsecaseError>;
    async fn archive_by_space_raw(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        archived_at: &str,
        archived_by_id: &str,
        updated_at: &str,
    ) -> Result<(), UsecaseError>;
    async fn delete_by_space_raw(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        deleted_at: &str,
        deleted_by_id: &str,
        updated_at: &str,
    ) -> Result<(), UsecaseError>;
    async fn archive_by_project_raw(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        archived_at: &str,
        archived_by_id: &str,
        updated_at: &str,
    ) -> Result<(), UsecaseError>;
    async fn delete_by_project_raw(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        deleted_at: &str,
        deleted_by_id: &str,
        updated_at: &str,
    ) -> Result<(), UsecaseError>;
}

/// Lifecycle 用例编排。
#[derive(Debug, Clone)]
pub struct LifecycleService<SP, PP, TP, AP>
where
    SP: LifecycleSpacePersistence,
    PP: LifecycleProjectPersistence<Connection = SP::Connection>,
    TP: LifecycleTaskPersistence<Connection = SP::Connection>,
    AP: ActivityPersistence<Connection = SP::Connection>,
{
    spaces: SP,
    projects: PP,
    tasks: TP,
    activity: ActivityService<AP>,
}

impl<SP, PP, TP, AP> LifecycleService<SP, PP, TP, AP>
where
    SP: LifecycleSpacePersistence,
    PP: LifecycleProjectPersistence<Connection = SP::Connection>,
    TP: LifecycleTaskPersistence<Connection = SP::Connection>,
    AP: ActivityPersistence<Connection = SP::Connection>,
{
    pub fn new(spaces: SP, projects: PP, tasks: TP, activity: ActivityService<AP>) -> Self {
        Self {
            spaces,
            projects,
            tasks,
            activity,
        }
    }

    pub async fn archive_space(&self, space_id: &str) -> Result<SpaceRecord, UsecaseError> {
        let space_id = validate_space_id(space_id)?;
        let current = self.require_existing_space(&space_id).await?;
        ensure_space_mutable(current.deleted_at.as_deref()).map_err(map_space_mutable_error)?;
        ensure_not_only_active_default(
            current.is_default,
            current.archived_at.as_deref(),
            current.deleted_at.as_deref(),
            "当前唯一活跃默认 Space 不能直接归档，请先切换默认 Space",
        )
        .map_err(map_lifecycle_guard_error)?;

        if current.archived_at.is_some() {
            return Ok(current);
        }

        let now = now_utc().to_rfc3339();
        let transaction = self.spaces.begin().await?;
        let affected_projects = self
            .projects
            .list_by_space(&space_id)
            .await?
            .into_iter()
            .filter(|project| project.archived_at.is_none() && project.deleted_at.is_none())
            .collect::<Vec<_>>();
        let affected_tasks = self
            .tasks
            .list_by_space(&space_id)
            .await?
            .into_iter()
            .filter(|task| task.archived_at.is_none() && task.deleted_at.is_none())
            .collect::<Vec<_>>();

        let updated = self
            .spaces
            .archive_raw(&transaction, &space_id, &now, &now)
            .await?
            .ok_or_else(|| UsecaseError::not_found("Space 不存在"))?;

        self.projects
            .archive_by_space_raw(&transaction, &space_id, &now, &space_id, &now)
            .await?;
        self.tasks
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

        self.spaces.commit(transaction).await?;
        Ok(updated)
    }

    pub async fn restore_space(&self, space_id: &str) -> Result<SpaceRecord, UsecaseError> {
        let space_id = validate_space_id(space_id)?;
        let current = self.require_existing_space(&space_id).await?;
        let existing_default = self.spaces.get_default().await?;
        if current.is_default
            && current.deleted_at.is_some()
            && existing_default
                .as_ref()
                .is_some_and(|space| space.id != current.id)
        {
            return Err(UsecaseError::conflict(
                "已存在其他活跃默认 Space，无法直接恢复该默认 Space",
            ));
        }

        if current.archived_at.is_none() && current.deleted_at.is_none() {
            return Ok(current);
        }

        let updated_at = now_utc().to_rfc3339();
        let transaction = self.spaces.begin().await?;
        let restored = self
            .spaces
            .restore_raw(&transaction, &space_id, &updated_at)
            .await?
            .ok_or_else(|| UsecaseError::not_found("Space 不存在"))?;

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

        self.spaces.commit(transaction).await?;
        Ok(restored)
    }

    pub async fn delete_space(&self, space_id: &str) -> Result<SpaceRecord, UsecaseError> {
        let space_id = validate_space_id(space_id)?;
        let current = self.require_existing_space(&space_id).await?;
        ensure_not_only_active_default(
            current.is_default,
            current.archived_at.as_deref(),
            current.deleted_at.as_deref(),
            "当前唯一活跃默认 Space 不能直接删除，请先切换默认 Space",
        )
        .map_err(map_lifecycle_guard_error)?;

        if current.deleted_at.is_some() {
            return Ok(current);
        }

        let now = now_utc().to_rfc3339();
        let transaction = self.spaces.begin().await?;
        let affected_projects = self
            .projects
            .list_by_space(&space_id)
            .await?
            .into_iter()
            .filter(|project| project.deleted_at.is_none())
            .collect::<Vec<_>>();
        let affected_tasks = self
            .tasks
            .list_by_space(&space_id)
            .await?
            .into_iter()
            .filter(|task| task.deleted_at.is_none())
            .collect::<Vec<_>>();

        let updated = self
            .spaces
            .delete_raw(&transaction, &space_id, &now, &now)
            .await?
            .ok_or_else(|| UsecaseError::not_found("Space 不存在"))?;

        self.projects
            .delete_by_space_raw(&transaction, &space_id, &now, &space_id, &now)
            .await?;
        self.tasks
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

        self.spaces.commit(transaction).await?;
        Ok(updated)
    }

    pub async fn permanently_delete_space(&self, space_id: &str) -> Result<(), UsecaseError> {
        let space_id = validate_space_id(space_id)?;
        let current = self.require_existing_space(&space_id).await?;
        ensure_deleted(current.deleted_at.as_deref(), "Space")
            .map_err(map_lifecycle_guard_error)?;

        let transaction = self.spaces.begin().await?;
        let deleted_projects = self
            .projects
            .list_by_space(&space_id)
            .await?
            .into_iter()
            .filter(|project| project.deleted_at.is_some())
            .collect::<Vec<_>>();
        let deleted_tasks = self
            .tasks
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
            self.tasks
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
            self.projects
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

        self.spaces
            .permanently_delete(&transaction, &space_id)
            .await?;
        self.spaces.commit(transaction).await?;
        Ok(())
    }

    pub async fn archive_project(&self, project_id: &str) -> Result<ProjectRecord, UsecaseError> {
        let project_id = validate_project_id(project_id)?;
        let current = self.require_existing_project(&project_id).await?;

        if current.archived_at.is_some() {
            return Ok(current);
        }
        if current.deleted_at.is_some() {
            return Err(UsecaseError::conflict("已删除 Project 不能归档"));
        }

        let now = now_utc().to_rfc3339();
        let transaction = self.projects.begin().await?;
        let affected_tasks = self
            .tasks
            .list_by_project(&project_id)
            .await?
            .into_iter()
            .filter(|task| task.archived_at.is_none() && task.deleted_at.is_none())
            .collect::<Vec<_>>();

        let updated = self
            .projects
            .archive_raw(&transaction, &project_id, &now, &project_id, &now)
            .await?
            .ok_or_else(|| UsecaseError::not_found("Project 不存在"))?;
        self.tasks
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

        let task_activity_inputs = affected_tasks
            .iter()
            .map(|item| RecordActivityInput {
                entity_type: ActivityEntityKind::Task,
                entity_id: item.id.clone(),
                action: ActivityAction::TaskArchived,
                actor_type: None,
                source: None,
                summary: Some(format!("归档任务「{}」", item.title)),
                metadata: Some(json!({
                    "taskId": item.id,
                    "spaceId": item.space_id,
                    "projectId": item.project_id,
                    "sourceEntityType": "project",
                    "sourceEntityId": updated.id,
                    "cascade": true,
                })),
                changes: vec![ActivityChangeInput {
                    field: "archivedAt".to_owned(),
                    old_value: item.archived_at.clone().map(|value| json!(value)),
                    new_value: Some(json!(now.clone())),
                }],
            })
            .collect();

        self.activity
            .record_activities_in_txn(&transaction, task_activity_inputs)
            .await?;

        self.projects.commit(transaction).await?;
        Ok(updated)
    }

    pub async fn restore_project(&self, project_id: &str) -> Result<ProjectRecord, UsecaseError> {
        let project_id = validate_project_id(project_id)?;
        let current = self.require_existing_project(&project_id).await?;

        if current.archived_at.is_none() && current.deleted_at.is_none() {
            return Ok(current);
        }

        self.require_visible_space(&current.space_id).await?;

        let updated_at = now_utc().to_rfc3339();
        let transaction = self.projects.begin().await?;
        let updated = self
            .projects
            .restore_raw(&transaction, &project_id, &updated_at)
            .await?
            .ok_or_else(|| UsecaseError::not_found("Project 不存在"))?;

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

        self.projects.commit(transaction).await?;
        Ok(updated)
    }

    pub async fn delete_project(&self, project_id: &str) -> Result<ProjectRecord, UsecaseError> {
        let project_id = validate_project_id(project_id)?;
        let current = self.require_existing_project(&project_id).await?;

        if current.deleted_at.is_some() {
            return Ok(current);
        }

        let now = now_utc().to_rfc3339();
        let transaction = self.projects.begin().await?;
        let affected_tasks = self
            .tasks
            .list_by_project(&project_id)
            .await?
            .into_iter()
            .filter(|task| task.deleted_at.is_none())
            .collect::<Vec<_>>();

        let updated = self
            .projects
            .delete_raw(&transaction, &project_id, &now, &project_id, &now)
            .await?
            .ok_or_else(|| UsecaseError::not_found("Project 不存在"))?;
        self.tasks
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

        self.projects.commit(transaction).await?;
        Ok(updated)
    }

    pub async fn permanently_delete_project(&self, project_id: &str) -> Result<(), UsecaseError> {
        let project_id = validate_project_id(project_id)?;
        let current = self.require_existing_project(&project_id).await?;
        ensure_deleted(current.deleted_at.as_deref(), "Project")
            .map_err(map_lifecycle_guard_error)?;

        let transaction = self.projects.begin().await?;
        let deleted_tasks = self
            .tasks
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
            self.tasks
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

        self.projects
            .permanently_delete(&transaction, &project_id)
            .await?;
        self.projects.commit(transaction).await?;
        Ok(())
    }

    pub async fn archive_task(&self, task_id: &str) -> Result<TaskRecord, UsecaseError> {
        let task_id = validate_task_id(task_id)?;
        let current = self.require_existing_task(&task_id).await?;

        if current.deleted_at.is_some() {
            return Err(UsecaseError::not_found("Task 不存在"));
        }
        if current.archived_at.is_some() {
            return Ok(current);
        }

        let now = now_utc().to_rfc3339();
        let transaction = self.tasks.begin().await?;
        let updated = self
            .tasks
            .archive_raw(&transaction, &task_id, &now, &task_id, &now)
            .await?
            .ok_or_else(|| UsecaseError::not_found("Task 不存在"))?;

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

        self.tasks.commit(transaction).await?;
        Ok(updated)
    }

    pub async fn restore_task(&self, task_id: &str) -> Result<TaskRecord, UsecaseError> {
        let task_id = validate_task_id(task_id)?;
        let current = self.require_existing_task(&task_id).await?;

        if current.archived_at.is_none() && current.deleted_at.is_none() {
            return Ok(current);
        }

        let target_space = match self.spaces.get(&current.space_id).await? {
            Some(space) if space.archived_at.is_none() && space.deleted_at.is_none() => space,
            _ => self
                .spaces
                .get_default()
                .await?
                .ok_or_else(|| UsecaseError::conflict("默认 Space 不存在"))?,
        };

        let target_project_id = match current.project_id.as_deref() {
            Some(project_id) if target_space.id == current.space_id => {
                match self.projects.get(project_id).await? {
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
        let transaction = self.tasks.begin().await?;
        let _ = self
            .tasks
            .restore_raw(&transaction, &task_id, &updated_at)
            .await?
            .ok_or_else(|| UsecaseError::not_found("Task 不存在"))?;
        let updated = self
            .tasks
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
            .ok_or_else(|| UsecaseError::not_found("Task 不存在"))?;

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

        self.tasks.commit(transaction).await?;
        Ok(updated)
    }

    pub async fn delete_task(&self, task_id: &str) -> Result<TaskRecord, UsecaseError> {
        let task_id = validate_task_id(task_id)?;
        let current = self.require_existing_task(&task_id).await?;

        if current.deleted_at.is_some() {
            return Ok(current);
        }

        let now = now_utc().to_rfc3339();
        let transaction = self.tasks.begin().await?;
        let updated = self
            .tasks
            .delete_raw(&transaction, &task_id, &now, &task_id, &now)
            .await?
            .ok_or_else(|| UsecaseError::not_found("Task 不存在"))?;

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

        self.tasks.commit(transaction).await?;
        Ok(updated)
    }

    pub async fn permanently_delete_task(&self, task_id: &str) -> Result<(), UsecaseError> {
        let task_id = validate_task_id(task_id)?;
        let current = self.require_existing_task(&task_id).await?;
        ensure_deleted(current.deleted_at.as_deref(), "Task").map_err(map_lifecycle_guard_error)?;

        let transaction = self.tasks.begin().await?;
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

        self.tasks
            .permanently_delete(&transaction, &task_id)
            .await?;
        self.tasks.commit(transaction).await?;
        Ok(())
    }

    pub async fn list_archive_entries(
        &self,
        input: ListLifecycleEntriesInput,
    ) -> Result<Vec<crate::lifecycle::types::LifecycleEntry>, UsecaseError> {
        self.list_entries(LifecycleMode::Archive, input).await
    }

    pub async fn list_trash_entries(
        &self,
        input: ListLifecycleEntriesInput,
    ) -> Result<Vec<crate::lifecycle::types::LifecycleEntry>, UsecaseError> {
        self.list_entries(LifecycleMode::Trash, input).await
    }

    async fn list_entries(
        &self,
        mode: LifecycleMode,
        input: ListLifecycleEntriesInput,
    ) -> Result<Vec<crate::lifecycle::types::LifecycleEntry>, UsecaseError> {
        use stoneflow_domain::LifecycleEntityType;

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
                    self.spaces.list_archived(scope_space_id.as_deref()).await?
                }
                LifecycleMode::Trash => self.spaces.list_deleted(scope_space_id.as_deref()).await?,
            }
        } else {
            Vec::new()
        };
        let project_rows = if include_project {
            match mode {
                LifecycleMode::Archive => {
                    self.projects
                        .list_archived(scope_space_id.as_deref())
                        .await?
                }
                LifecycleMode::Trash => {
                    self.projects
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
                    self.tasks.list_archived(scope_space_id.as_deref()).await?
                }
                LifecycleMode::Trash => self.tasks.list_deleted(scope_space_id.as_deref()).await?,
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
            .spaces
            .list_by_ids(&space_ids)
            .await?
            .into_iter()
            .map(|space| (space.id.clone(), space))
            .collect::<HashMap<_, _>>();
        let project_map = self
            .projects
            .list_by_ids(&project_ids)
            .await?
            .into_iter()
            .map(|project| (project.id.clone(), project))
            .collect::<HashMap<_, _>>();

        Ok(build_lifecycle_entries(
            mode,
            space_rows,
            project_rows,
            task_rows,
            &space_map,
            &project_map,
        ))
    }

    async fn require_existing_space(&self, space_id: &str) -> Result<SpaceRecord, UsecaseError> {
        self.spaces
            .get(space_id)
            .await?
            .ok_or_else(|| UsecaseError::not_found("Space 不存在"))
    }

    async fn require_existing_project(
        &self,
        project_id: &str,
    ) -> Result<ProjectRecord, UsecaseError> {
        self.projects
            .get(project_id)
            .await?
            .ok_or_else(|| UsecaseError::not_found("Project 不存在"))
    }

    async fn require_existing_task(&self, task_id: &str) -> Result<TaskRecord, UsecaseError> {
        self.tasks
            .get(task_id)
            .await?
            .ok_or_else(|| UsecaseError::not_found("Task 不存在"))
    }

    async fn require_visible_space(&self, space_id: &str) -> Result<SpaceRecord, UsecaseError> {
        let space = self
            .spaces
            .get(space_id)
            .await?
            .ok_or_else(|| UsecaseError::not_found("Space 不存在"))?;

        if space.archived_at.is_some() || space.deleted_at.is_some() {
            return Err(UsecaseError::conflict("当前 Space 不可用"));
        }

        Ok(space)
    }

    async fn record_space_activity(
        &self,
        transaction: &SP::Connection,
        space: &SpaceRecord,
        action: ActivityAction,
        summary: String,
        metadata: Option<serde_json::Value>,
        changes: Vec<ActivityChangeInput>,
    ) -> Result<(), UsecaseError> {
        self.activity
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
        transaction: &SP::Connection,
        project: &ProjectRecord,
        action: ActivityAction,
        summary: String,
        metadata: Option<serde_json::Value>,
        changes: Vec<ActivityChangeInput>,
    ) -> Result<(), UsecaseError> {
        self.activity
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
        transaction: &SP::Connection,
        item: &TaskRecord,
        action: ActivityAction,
        summary: String,
        metadata: Option<serde_json::Value>,
        changes: Vec<ActivityChangeInput>,
    ) -> Result<(), UsecaseError> {
        self.activity
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

fn map_lifecycle_guard_error(error: DomainError) -> UsecaseError {
    match error {
        DomainError::Validation(message) => UsecaseError::conflict(message),
    }
}

fn map_space_mutable_error(error: DomainError) -> UsecaseError {
    match error {
        DomainError::Validation(message) => UsecaseError::conflict(message),
    }
}

//! Project Service：集中承载阶段 5 的 Project 业务规则、事务与 Activity 编排。

use std::collections::HashMap;

use sea_orm::TransactionTrait;
use serde::{Deserialize, Serialize};
use serde_json::json;
use stoneflow_entity::{common::ActivityEntityKind, project, space};
use uuid::Uuid;

use crate::{
    app::error::AppError,
    application::activity::{
        ActivityAction, ActivityChangeInput, ActivityService, RecordActivityInput,
    },
    domain::{create_id, normalize_required_text, now_utc},
    infrastructure::repositories::{
        CreateProjectRecord, ProjectOverviewView, ProjectRepository, ProjectTaskCount,
        SpaceRepository, TaskRepository, UpdateProjectPatch,
    },
};

/// 前端 Scope 在 Project 命令边界的序列化形状。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectScopeInput {
    #[serde(rename = "type")]
    pub kind: ProjectScopeKind,
    pub space_id: Option<String>,
}

/// Scope 类型。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProjectScopeKind {
    All,
    Space,
}

/// Project Overview 的单条列表项。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectOverviewItemDto {
    pub id: String,
    pub space_id: String,
    pub space_name: String,
    pub name: String,
    pub description: Option<String>,
    pub due_at: Option<String>,
    pub sort_order: i32,
    pub task_count: u64,
    pub active_task_count: u64,
    pub completed_at: Option<String>,
    pub updated_at: String,
    pub created_at: String,
}

/// Sidebar Projects 快捷区项目。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectSidebarItemDto {
    pub id: String,
    pub space_id: String,
    pub name: String,
    pub sort_order: i32,
    pub task_count: u64,
    pub active_task_count: u64,
    pub completed_at: Option<String>,
    pub updated_at: String,
}

/// Project Detail 的基础载荷。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectDetailDto {
    pub id: String,
    pub space_id: String,
    pub space_name: String,
    pub name: String,
    pub description: Option<String>,
    pub due_at: Option<String>,
    pub sort_order: i32,
    pub task_count: u64,
    pub active_task_count: u64,
    pub completed_at: Option<String>,
    pub archived_at: Option<String>,
    pub deleted_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// 创建 Project 的输入。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateProjectInput {
    pub space_id: String,
    pub name: String,
    pub description: Option<String>,
    pub due_at: Option<String>,
}

/// 更新 Project 的输入。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateProjectInput {
    pub project_id: String,
    pub name: Option<String>,
    #[serde(default)]
    pub description: Option<Option<String>>,
    #[serde(default)]
    pub due_at: Option<Option<String>>,
    pub sort_order: Option<i32>,
}

/// 仅携带 Project ID 的输入。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectIdInput {
    pub project_id: String,
}

/// Project Overview 的查询输入。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListProjectOverviewInput {
    pub scope: ProjectScopeInput,
    pub view_key: String,
}

/// Sidebar Projects 的查询输入。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListSidebarProjectsInput {
    pub scope: ProjectScopeInput,
    pub show_completed: bool,
    pub max_visible: Option<u16>,
}

#[derive(Debug, Clone)]
pub struct ProjectService {
    space_repository: SpaceRepository,
    repository: ProjectRepository,
    task_repository: TaskRepository,
    activity_service: ActivityService,
}

impl ProjectService {
    pub fn new(
        space_repository: SpaceRepository,
        repository: ProjectRepository,
        task_repository: TaskRepository,
        activity_service: ActivityService,
    ) -> Self {
        Self {
            space_repository,
            repository,
            task_repository,
            activity_service,
        }
    }

    pub fn repository(&self) -> &ProjectRepository {
        &self.repository
    }

    /// 列出 Project Overview。
    pub async fn list_project_overview(
        &self,
        input: ListProjectOverviewInput,
    ) -> Result<Vec<ProjectOverviewItemDto>, AppError> {
        let scope = normalize_scope(&input.scope)?;
        let view = parse_overview_view(&input.view_key)?;
        let projects = self
            .repository
            .list_overview_by_scope(scope.space_id(), view)
            .await?;
        let counts = self.load_task_counts(&projects).await?;
        let space_name_map = self.load_space_name_map(&projects).await?;

        Ok(projects
            .into_iter()
            .map(|project| {
                let count = counts.get(&project.id).copied().unwrap_or_default();
                ProjectOverviewItemDto {
                    id: project.id,
                    space_id: project.space_id.clone(),
                    space_name: space_name_map
                        .get(&project.space_id)
                        .cloned()
                        .unwrap_or(project.space_id),
                    name: project.name,
                    description: project.description,
                    due_at: project.due_at,
                    sort_order: project.sort_order,
                    task_count: count.total_count,
                    active_task_count: count.active_count,
                    completed_at: project.completed_at,
                    updated_at: project.updated_at,
                    created_at: project.created_at,
                }
            })
            .collect())
    }

    /// 列出 Sidebar Projects。
    pub async fn list_sidebar_projects(
        &self,
        input: ListSidebarProjectsInput,
    ) -> Result<Vec<ProjectSidebarItemDto>, AppError> {
        let scope = normalize_scope(&input.scope)?;
        let projects = self
            .repository
            .list_sidebar_by_scope(
                scope.space_id(),
                input.show_completed,
                input.max_visible.map(u64::from),
            )
            .await?;
        let counts = self.load_task_counts(&projects).await?;

        Ok(projects
            .into_iter()
            .map(|project| {
                let count = counts.get(&project.id).copied().unwrap_or_default();
                ProjectSidebarItemDto {
                    id: project.id,
                    space_id: project.space_id,
                    name: project.name,
                    sort_order: project.sort_order,
                    task_count: count.total_count,
                    active_task_count: count.active_count,
                    completed_at: project.completed_at,
                    updated_at: project.updated_at,
                }
            })
            .collect())
    }

    /// 读取单个 Project Detail。
    pub async fn get_project_detail(
        &self,
        input: ProjectIdInput,
    ) -> Result<ProjectDetailDto, AppError> {
        let project_id = normalize_project_id(&input.project_id)?;
        let current = self
            .repository
            .get(&project_id)
            .await?
            .ok_or_else(|| AppError::not_found("Project 不存在"))?;

        if current.archived_at.is_some() || current.deleted_at.is_some() {
            return Err(AppError::not_found("Project 不存在"));
        }

        self.build_project_detail(current).await
    }

    /// 创建 Project。
    pub async fn create_project(
        &self,
        input: CreateProjectInput,
    ) -> Result<ProjectDetailDto, AppError> {
        let space_id = normalize_space_id(&input.space_id)?;
        let name = normalize_required_text(&input.name, "Project name")?;
        let description = normalize_optional_text(input.description);
        let due_at = normalize_optional_text(input.due_at);
        let space = self.require_visible_space(&space_id).await?;

        if self
            .repository
            .get_visible_by_name(&space_id, &name)
            .await?
            .is_some()
        {
            return Err(AppError::conflict("当前 Space 下已存在同名 Project"));
        }

        let now = now_utc().to_rfc3339();
        let transaction = self.repository.connection().begin().await?;
        let sort_order = self
            .repository
            .next_sort_order(&transaction, &space_id)
            .await?;
        let project = self
            .repository
            .create(
                &transaction,
                CreateProjectRecord {
                    id: create_id().to_string(),
                    space_id: space_id.clone(),
                    name: name.clone(),
                    description: description.clone(),
                    due_at: due_at.clone(),
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
                    entity_type: ActivityEntityKind::Project,
                    entity_id: project.id.clone(),
                    action: ActivityAction::ProjectCreated,
                    actor_type: None,
                    source: None,
                    summary: Some(format!("创建 Project「{}」", project.name)),
                    metadata: Some(json!({
                        "projectId": project.id,
                        "spaceId": project.space_id,
                        "spaceName": space.name,
                    })),
                    changes: vec![
                        ActivityChangeInput {
                            field: "name".to_owned(),
                            old_value: None,
                            new_value: Some(json!(name)),
                        },
                        ActivityChangeInput {
                            field: "description".to_owned(),
                            old_value: None,
                            new_value: description.clone().map(|value| json!(value)),
                        },
                        ActivityChangeInput {
                            field: "dueAt".to_owned(),
                            old_value: None,
                            new_value: due_at.clone().map(|value| json!(value)),
                        },
                    ],
                },
            )
            .await?;

        transaction.commit().await?;
        self.build_project_detail(project).await
    }

    /// 更新 Project。
    pub async fn update_project(
        &self,
        input: UpdateProjectInput,
    ) -> Result<ProjectDetailDto, AppError> {
        let project_id = normalize_project_id(&input.project_id)?;
        let current = self.require_existing_project(&project_id).await?;
        ensure_project_mutable(&current)?;

        let next_name = normalize_optional_required_text(input.name.as_deref(), "Project name")?;
        let next_description = normalize_optional_nullable_text(input.description);
        let next_due_at = normalize_optional_nullable_text(input.due_at);

        if let Some(name) = next_name.as_deref() {
            if name != current.name {
                if let Some(conflict) = self
                    .repository
                    .get_visible_by_name(&current.space_id, name)
                    .await?
                {
                    if conflict.id != current.id {
                        return Err(AppError::conflict("当前 Space 下已存在同名 Project"));
                    }
                }
            }
        }

        let mut patch = UpdateProjectPatch::default();
        let mut activity_records = Vec::new();

        if let Some(name) = next_name {
            if name != current.name {
                patch.name = Some(name.clone());
                activity_records.push((
                    ActivityAction::ProjectNameUpdated,
                    "name".to_owned(),
                    Some(json!(current.name.clone())),
                    Some(json!(name)),
                ));
            }
        }
        if let Some(description) = next_description {
            if description != current.description {
                patch.description = Some(description.clone());
                activity_records.push((
                    ActivityAction::ProjectDescriptionUpdated,
                    "description".to_owned(),
                    current.description.clone().map(|value| json!(value)),
                    description.clone().map(|value| json!(value)),
                ));
            }
        }
        if let Some(due_at) = next_due_at {
            if due_at != current.due_at {
                patch.due_at = Some(due_at.clone());
                activity_records.push((
                    ActivityAction::ProjectDueUpdated,
                    "dueAt".to_owned(),
                    current.due_at.clone().map(|value| json!(value)),
                    due_at.clone().map(|value| json!(value)),
                ));
            }
        }
        if let Some(sort_order) = input.sort_order {
            if sort_order != current.sort_order {
                patch.sort_order = Some(sort_order);
                activity_records.push((
                    ActivityAction::ProjectSortChanged,
                    "sortOrder".to_owned(),
                    Some(json!(current.sort_order)),
                    Some(json!(sort_order)),
                ));
            }
        }

        if activity_records.is_empty() {
            return self.build_project_detail(current).await;
        }

        let updated_at = now_utc().to_rfc3339();
        let transaction = self.repository.connection().begin().await?;
        let updated = self
            .repository
            .update(&transaction, &project_id, patch, &updated_at)
            .await?
            .ok_or_else(|| AppError::not_found("Project 不存在"))?;

        for (action, field, old_value, new_value) in activity_records {
            self.activity_service
                .record_activity_in_txn(
                    &transaction,
                    RecordActivityInput {
                        entity_type: ActivityEntityKind::Project,
                        entity_id: updated.id.clone(),
                        action,
                        actor_type: None,
                        source: None,
                        summary: Some(format!("更新 Project「{}」", updated.name)),
                        metadata: Some(json!({
                            "projectId": updated.id,
                            "spaceId": updated.space_id,
                        })),
                        changes: vec![ActivityChangeInput {
                            field,
                            old_value,
                            new_value,
                        }],
                    },
                )
                .await?;
        }

        transaction.commit().await?;
        self.build_project_detail(updated).await
    }

    /// 完成 Project。
    pub async fn complete_project(
        &self,
        input: ProjectIdInput,
    ) -> Result<ProjectDetailDto, AppError> {
        let project_id = normalize_project_id(&input.project_id)?;
        let current = self.require_existing_project(&project_id).await?;
        ensure_project_mutable(&current)?;

        if current.completed_at.is_some() {
            return self.build_project_detail(current).await;
        }

        let now = now_utc().to_rfc3339();
        let transaction = self.repository.connection().begin().await?;
        let updated = self
            .repository
            .complete_raw(&transaction, &project_id, &now, &now)
            .await?
            .ok_or_else(|| AppError::not_found("Project 不存在"))?;

        self.activity_service
            .record_activity_in_txn(
                &transaction,
                RecordActivityInput {
                    entity_type: ActivityEntityKind::Project,
                    entity_id: updated.id.clone(),
                    action: ActivityAction::ProjectCompleted,
                    actor_type: None,
                    source: None,
                    summary: Some(format!("完成 Project「{}」", updated.name)),
                    metadata: Some(json!({ "projectId": updated.id })),
                    changes: vec![ActivityChangeInput {
                        field: "completedAt".to_owned(),
                        old_value: None,
                        new_value: Some(json!(now)),
                    }],
                },
            )
            .await?;

        transaction.commit().await?;
        self.build_project_detail(updated).await
    }

    /// 重开 Project。
    pub async fn reopen_project(
        &self,
        input: ProjectIdInput,
    ) -> Result<ProjectDetailDto, AppError> {
        let project_id = normalize_project_id(&input.project_id)?;
        let current = self.require_existing_project(&project_id).await?;
        ensure_project_mutable(&current)?;

        if current.completed_at.is_none() {
            return self.build_project_detail(current).await;
        }

        let updated_at = now_utc().to_rfc3339();
        let transaction = self.repository.connection().begin().await?;
        let updated = self
            .repository
            .reopen_raw(&transaction, &project_id, &updated_at)
            .await?
            .ok_or_else(|| AppError::not_found("Project 不存在"))?;

        self.activity_service
            .record_activity_in_txn(
                &transaction,
                RecordActivityInput {
                    entity_type: ActivityEntityKind::Project,
                    entity_id: updated.id.clone(),
                    action: ActivityAction::ProjectReopened,
                    actor_type: None,
                    source: None,
                    summary: Some(format!("重开 Project「{}」", updated.name)),
                    metadata: Some(json!({ "projectId": updated.id })),
                    changes: vec![ActivityChangeInput {
                        field: "completedAt".to_owned(),
                        old_value: current.completed_at.clone().map(|value| json!(value)),
                        new_value: None,
                    }],
                },
            )
            .await?;

        transaction.commit().await?;
        self.build_project_detail(updated).await
    }

    /// 归档 Project，并级联归档其下任务。
    pub async fn archive_project(
        &self,
        input: ProjectIdInput,
    ) -> Result<ProjectDetailDto, AppError> {
        let project_id = normalize_project_id(&input.project_id)?;
        let current = self.require_existing_project(&project_id).await?;

        if current.archived_at.is_some() {
            return self.build_project_detail(current).await;
        }
        if current.deleted_at.is_some() {
            return Err(AppError::conflict("已删除 Project 不能归档"));
        }

        let now = now_utc().to_rfc3339();
        let transaction = self.repository.connection().begin().await?;
        let updated = self
            .repository
            .archive_raw(&transaction, &project_id, &now, &project_id, &now)
            .await?
            .ok_or_else(|| AppError::not_found("Project 不存在"))?;
        let archived_task_count = self
            .task_repository
            .archive_by_project_raw(&transaction, &project_id, &now, &project_id, &now)
            .await?;

        self.activity_service
            .record_activity_in_txn(
                &transaction,
                RecordActivityInput {
                    entity_type: ActivityEntityKind::Project,
                    entity_id: updated.id.clone(),
                    action: ActivityAction::ProjectArchived,
                    actor_type: None,
                    source: None,
                    summary: Some(format!("归档 Project「{}」", updated.name)),
                    metadata: Some(json!({
                        "projectId": updated.id,
                        "archivedTaskCount": archived_task_count,
                    })),
                    changes: vec![ActivityChangeInput {
                        field: "archivedAt".to_owned(),
                        old_value: None,
                        new_value: Some(json!(now)),
                    }],
                },
            )
            .await?;

        transaction.commit().await?;
        self.build_project_detail(updated).await
    }

    /// 恢复 Project 自身，不自动恢复任务。
    pub async fn restore_project(
        &self,
        input: ProjectIdInput,
    ) -> Result<ProjectDetailDto, AppError> {
        let project_id = normalize_project_id(&input.project_id)?;
        let current = self.require_existing_project(&project_id).await?;

        if current.archived_at.is_none() && current.deleted_at.is_none() {
            return self.build_project_detail(current).await;
        }

        self.require_visible_space(&current.space_id).await?;

        let updated_at = now_utc().to_rfc3339();
        let transaction = self.repository.connection().begin().await?;
        let updated = self
            .repository
            .restore_raw(&transaction, &project_id, &updated_at)
            .await?
            .ok_or_else(|| AppError::not_found("Project 不存在"))?;

        self.activity_service
            .record_activity_in_txn(
                &transaction,
                RecordActivityInput {
                    entity_type: ActivityEntityKind::Project,
                    entity_id: updated.id.clone(),
                    action: ActivityAction::ProjectRestored,
                    actor_type: None,
                    source: None,
                    summary: Some(format!("恢复 Project「{}」", updated.name)),
                    metadata: Some(json!({ "projectId": updated.id })),
                    changes: vec![
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
                },
            )
            .await?;

        transaction.commit().await?;
        self.build_project_detail(updated).await
    }

    /// 删除 Project，并级联删除其下任务。
    pub async fn delete_project(
        &self,
        input: ProjectIdInput,
    ) -> Result<ProjectDetailDto, AppError> {
        let project_id = normalize_project_id(&input.project_id)?;
        let current = self.require_existing_project(&project_id).await?;

        if current.deleted_at.is_some() {
            return self.build_project_detail(current).await;
        }

        let now = now_utc().to_rfc3339();
        let transaction = self.repository.connection().begin().await?;
        let updated = self
            .repository
            .delete_raw(&transaction, &project_id, &now, &project_id, &now)
            .await?
            .ok_or_else(|| AppError::not_found("Project 不存在"))?;
        let deleted_task_count = self
            .task_repository
            .delete_by_project_raw(&transaction, &project_id, &now, &project_id, &now)
            .await?;

        self.activity_service
            .record_activity_in_txn(
                &transaction,
                RecordActivityInput {
                    entity_type: ActivityEntityKind::Project,
                    entity_id: updated.id.clone(),
                    action: ActivityAction::ProjectDeleted,
                    actor_type: None,
                    source: None,
                    summary: Some(format!("删除 Project「{}」", updated.name)),
                    metadata: Some(json!({
                        "projectId": updated.id,
                        "deletedTaskCount": deleted_task_count,
                    })),
                    changes: vec![ActivityChangeInput {
                        field: "deletedAt".to_owned(),
                        old_value: None,
                        new_value: Some(json!(now)),
                    }],
                },
            )
            .await?;

        transaction.commit().await?;
        self.build_project_detail(updated).await
    }

    async fn require_existing_project(&self, project_id: &str) -> Result<project::Model, AppError> {
        self.repository
            .get(project_id)
            .await?
            .ok_or_else(|| AppError::not_found("Project 不存在"))
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

    async fn build_project_detail(
        &self,
        project: project::Model,
    ) -> Result<ProjectDetailDto, AppError> {
        let space = self
            .space_repository
            .get(&project.space_id)
            .await?
            .ok_or_else(|| AppError::not_found("Project 所属 Space 不存在"))?;
        let counts = self
            .task_repository
            .count_by_project_ids(std::slice::from_ref(&project.id))
            .await?;
        let count = counts.get(&project.id).copied().unwrap_or_default();

        Ok(ProjectDetailDto {
            id: project.id,
            space_id: project.space_id,
            space_name: space.name,
            name: project.name,
            description: project.description,
            due_at: project.due_at,
            sort_order: project.sort_order,
            task_count: count.total_count,
            active_task_count: count.active_count,
            completed_at: project.completed_at,
            archived_at: project.archived_at,
            deleted_at: project.deleted_at,
            created_at: project.created_at,
            updated_at: project.updated_at,
        })
    }

    async fn load_task_counts(
        &self,
        projects: &[project::Model],
    ) -> Result<HashMap<String, ProjectTaskCount>, AppError> {
        let project_ids = projects
            .iter()
            .map(|project| project.id.clone())
            .collect::<Vec<_>>();
        self.task_repository
            .count_by_project_ids(&project_ids)
            .await
    }

    async fn load_space_name_map(
        &self,
        projects: &[project::Model],
    ) -> Result<HashMap<String, String>, AppError> {
        let space_ids = projects
            .iter()
            .map(|project| project.space_id.clone())
            .collect::<Vec<_>>();
        let spaces = self.space_repository.list_by_ids(&space_ids).await?;
        Ok(spaces
            .into_iter()
            .map(|space| (space.id, space.name))
            .collect())
    }
}

#[derive(Debug, Clone)]
struct NormalizedScope {
    space_id: Option<String>,
}

impl NormalizedScope {
    fn space_id(&self) -> Option<&str> {
        self.space_id.as_deref()
    }
}

fn normalize_scope(input: &ProjectScopeInput) -> Result<NormalizedScope, AppError> {
    match input.kind {
        ProjectScopeKind::All => Ok(NormalizedScope { space_id: None }),
        ProjectScopeKind::Space => Ok(NormalizedScope {
            space_id: Some(normalize_space_id(input.space_id.as_deref().ok_or_else(
                || AppError::validation("scope.type=space 时必须提供 spaceId"),
            )?)?),
        }),
    }
}

fn parse_overview_view(value: &str) -> Result<ProjectOverviewView, AppError> {
    match value.trim() {
        "active" | "active_projects" => Ok(ProjectOverviewView::Active),
        "completed" | "completed_projects" => Ok(ProjectOverviewView::Completed),
        "archived" | "archived_projects" => Ok(ProjectOverviewView::Archived),
        "all" | "all_projects" => Ok(ProjectOverviewView::All),
        _ => Err(AppError::validation("未知的 Project Overview 视图")),
    }
}

fn ensure_project_mutable(project: &project::Model) -> Result<(), AppError> {
    if project.deleted_at.is_some() {
        return Err(AppError::conflict("已删除 Project 不能继续编辑"));
    }
    if project.archived_at.is_some() {
        return Err(AppError::conflict("已归档 Project 不能继续编辑"));
    }
    Ok(())
}

fn normalize_optional_text(value: Option<String>) -> Option<String> {
    value.and_then(|value| {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_owned())
        }
    })
}

fn normalize_optional_required_text(
    value: Option<&str>,
    field: &str,
) -> Result<Option<String>, AppError> {
    value
        .map(|value| normalize_required_text(value, field))
        .transpose()
}

fn normalize_optional_nullable_text(value: Option<Option<String>>) -> Option<Option<String>> {
    value.map(normalize_optional_text)
}

fn normalize_space_id(space_id: &str) -> Result<String, AppError> {
    normalize_uuid_text(space_id, "spaceId")
}

fn normalize_project_id(project_id: &str) -> Result<String, AppError> {
    normalize_uuid_text(project_id, "projectId")
}

fn normalize_uuid_text(value: &str, field: &str) -> Result<String, AppError> {
    let normalized = normalize_required_text(value, field)?;
    Uuid::parse_str(&normalized)
        .map_err(|_| AppError::validation(format!("{field} 必须是合法 UUID")))?;
    Ok(normalized)
}

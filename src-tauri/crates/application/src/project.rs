//! Project 用例：CRUD、完成/重开与列表编排（生命周期操作由 runtime adapter 委托 lifecycle）。

#![allow(async_fn_in_trait)]

use std::collections::HashMap;

use serde::{Deserialize, Deserializer, Serialize};
use serde_json::json;
use stoneflow_domain::{
    create_id, normalize_required_text, now_utc, validate_project_id, validate_space_id,
    ActivityEntityKind, WorkStatus,
};

use crate::{
    activity::{
        ActivityAction, ActivityChangeInput, ActivityPersistence, ActivityService,
        RecordActivityInput,
    },
    ApplicationError,
};

/// Project 读模型。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProjectRecord {
    pub id: String,
    pub space_id: String,
    pub name: String,
    pub description: Option<String>,
    pub status: WorkStatus,
    pub priority: i32,
    pub planned_at: Option<String>,
    pub due_at: Option<String>,
    pub remind_at: Option<String>,
    pub status_changed_at: String,
    pub completed_at: Option<String>,
    pub position: i64,
    pub generation: i64,
    pub archived_at: Option<String>,
    pub deleted_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// 创建 Project 的持久化输入。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateProjectPersistenceRecord {
    pub id: String,
    pub space_id: String,
    pub name: String,
    pub description: Option<String>,
    pub status: WorkStatus,
    pub priority: i32,
    pub due_at: Option<String>,
    pub status_changed_at: String,
    pub position: i64,
    pub created_at: String,
    pub updated_at: String,
}

/// 更新 Project 基础字段 patch。
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct UpdateProjectPatch {
    pub name: Option<String>,
    pub description: Option<Option<String>>,
    pub due_at: Option<Option<String>>,
    pub position: Option<i64>,
}

/// Project Overview 的分页视图。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProjectOverviewView {
    Active,
    Completed,
    Archived,
    All,
}

/// 任务计数辅助结构。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct ProjectTaskCount {
    pub total_count: u64,
    pub active_count: u64,
}

/// Space 辅助读模型（Project 编排用）。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProjectSpaceRecord {
    pub id: String,
    pub name: String,
    pub archived_at: Option<String>,
}

/// Project 持久化边界。
pub trait ProjectPersistence: Send + Sync {
    type Connection: Send + Sync;

    async fn begin(&self) -> Result<Self::Connection, ApplicationError>;
    async fn commit(&self, connection: Self::Connection) -> Result<(), ApplicationError>;
    async fn get(&self, project_id: &str) -> Result<Option<ProjectRecord>, ApplicationError>;
    async fn get_visible_by_name(
        &self,
        space_id: &str,
        name: &str,
    ) -> Result<Option<ProjectRecord>, ApplicationError>;
    async fn next_position(
        &self,
        connection: &Self::Connection,
        space_id: &str,
    ) -> Result<i64, ApplicationError>;
    async fn create(
        &self,
        connection: &Self::Connection,
        record: CreateProjectPersistenceRecord,
    ) -> Result<ProjectRecord, ApplicationError>;
    async fn update(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        patch: UpdateProjectPatch,
        updated_at: &str,
    ) -> Result<Option<ProjectRecord>, ApplicationError>;
    async fn list_overview_by_scope(
        &self,
        space_id: Option<&str>,
        view: ProjectOverviewView,
    ) -> Result<Vec<ProjectRecord>, ApplicationError>;
    async fn list_sidebar_by_scope(
        &self,
        space_id: Option<&str>,
        show_completed: bool,
        max_visible: Option<u64>,
    ) -> Result<Vec<ProjectRecord>, ApplicationError>;
    async fn complete_raw(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        completed_at: &str,
        updated_at: &str,
    ) -> Result<Option<ProjectRecord>, ApplicationError>;
    async fn reopen_raw(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        updated_at: &str,
    ) -> Result<Option<ProjectRecord>, ApplicationError>;
}

/// Project 编排所需的 Space 读取边界。
pub trait ProjectSpaceReader: Send + Sync {
    async fn get(&self, space_id: &str) -> Result<Option<ProjectSpaceRecord>, ApplicationError>;
    async fn list_by_ids(
        &self,
        space_ids: &[String],
    ) -> Result<Vec<ProjectSpaceRecord>, ApplicationError>;
}

/// Project 编排所需的 Task 计数边界。
pub trait ProjectTaskCounter: Send + Sync {
    async fn count_by_project_ids(
        &self,
        project_ids: &[String],
    ) -> Result<HashMap<String, ProjectTaskCount>, ApplicationError>;
}

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
    pub position: i64,
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
    pub position: i64,
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
    pub position: i64,
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
    #[serde(deserialize_with = "deserialize_nullable_string_field")]
    pub description: Option<Option<String>>,
    #[serde(default)]
    #[serde(deserialize_with = "deserialize_nullable_string_field")]
    pub due_at: Option<Option<String>>,
    pub position: Option<i64>,
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

/// Project 用例编排（不含 archive / restore / delete）。
#[derive(Debug, Clone)]
pub struct ProjectService<P, A, S, T>
where
    P: ProjectPersistence,
    A: ActivityPersistence<Connection = P::Connection>,
    S: ProjectSpaceReader,
    T: ProjectTaskCounter,
{
    persistence: P,
    activity: ActivityService<A>,
    space_reader: S,
    task_counter: T,
}

impl<P, A, S, T> ProjectService<P, A, S, T>
where
    P: ProjectPersistence,
    A: ActivityPersistence<Connection = P::Connection>,
    S: ProjectSpaceReader,
    T: ProjectTaskCounter,
{
    pub fn new(
        persistence: P,
        activity: ActivityService<A>,
        space_reader: S,
        task_counter: T,
    ) -> Self {
        Self {
            persistence,
            activity,
            space_reader,
            task_counter,
        }
    }

    /// 列出 Project Overview。
    pub async fn list_project_overview(
        &self,
        input: ListProjectOverviewInput,
    ) -> Result<Vec<ProjectOverviewItemDto>, ApplicationError> {
        let scope = normalize_scope(&input.scope)?;
        let view = parse_overview_view(&input.view_key)?;
        let projects = self
            .persistence
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
                    position: project.position,
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
    ) -> Result<Vec<ProjectSidebarItemDto>, ApplicationError> {
        let scope = normalize_scope(&input.scope)?;
        let projects = self
            .persistence
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
                    position: project.position,
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
    ) -> Result<ProjectDetailDto, ApplicationError> {
        let project_id = validate_project_id(&input.project_id)?;
        let current = self
            .persistence
            .get(&project_id)
            .await?
            .ok_or_else(|| ApplicationError::not_found("Project 不存在"))?;

        if current.archived_at.is_some() {
            return Err(ApplicationError::not_found("Project 不存在"));
        }

        self.build_project_detail(current).await
    }

    /// 创建 Project。
    pub async fn create_project(
        &self,
        input: CreateProjectInput,
    ) -> Result<ProjectDetailDto, ApplicationError> {
        let space_id = validate_space_id(&input.space_id)?;
        let name = normalize_required_text(&input.name, "Project name")?;
        let description = normalize_optional_long_text(input.description);
        let due_at = normalize_optional_text(input.due_at);
        let space = self.require_visible_space(&space_id).await?;

        if self
            .persistence
            .get_visible_by_name(&space_id, &name)
            .await?
            .is_some()
        {
            return Err(ApplicationError::conflict(
                "当前 Space 下已存在同名 Project",
            ));
        }

        let now = now_utc().to_rfc3339();
        let transaction = self.persistence.begin().await?;
        let position = self
            .persistence
            .next_position(&transaction, &space_id)
            .await?;
        let project = self
            .persistence
            .create(
                &transaction,
                CreateProjectPersistenceRecord {
                    id: create_id().to_string(),
                    space_id: space_id.clone(),
                    name: name.clone(),
                    description: description.clone(),
                    status: WorkStatus::Todo,
                    priority: 0,
                    due_at: due_at.clone(),
                    status_changed_at: now.clone(),
                    position,
                    created_at: now.clone(),
                    updated_at: now.clone(),
                },
            )
            .await?;

        self.activity
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

        self.persistence.commit(transaction).await?;
        self.build_project_detail(project).await
    }

    /// 更新 Project。
    pub async fn update_project(
        &self,
        input: UpdateProjectInput,
    ) -> Result<ProjectDetailDto, ApplicationError> {
        let project_id = validate_project_id(&input.project_id)?;
        let current = self.require_editable_project(&project_id).await?;

        let next_name = normalize_optional_required_text(input.name.as_deref(), "Project name")?;
        let next_description = normalize_optional_nullable_long_text(input.description);
        let next_due_at = normalize_optional_nullable_text(input.due_at);

        if let Some(name) = next_name.as_deref() {
            if name != current.name {
                if let Some(conflict) = self
                    .persistence
                    .get_visible_by_name(&current.space_id, name)
                    .await?
                {
                    if conflict.id != current.id {
                        return Err(ApplicationError::conflict(
                            "当前 Space 下已存在同名 Project",
                        ));
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
        if let Some(position) = input.position {
            if position != current.position {
                patch.position = Some(position);
                activity_records.push((
                    ActivityAction::ProjectSortChanged,
                    "position".to_owned(),
                    Some(json!(current.position)),
                    Some(json!(position)),
                ));
            }
        }

        if activity_records.is_empty() {
            return self.build_project_detail(current).await;
        }

        let updated_at = now_utc().to_rfc3339();
        let transaction = self.persistence.begin().await?;
        let updated = self
            .persistence
            .update(&transaction, &project_id, patch, &updated_at)
            .await?
            .ok_or_else(|| ApplicationError::not_found("Project 不存在"))?;

        for (action, field, old_value, new_value) in activity_records {
            self.activity
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

        self.persistence.commit(transaction).await?;
        self.build_project_detail(updated).await
    }

    /// 完成 Project。
    pub async fn complete_project(
        &self,
        input: ProjectIdInput,
    ) -> Result<ProjectDetailDto, ApplicationError> {
        let project_id = validate_project_id(&input.project_id)?;
        let current = self.require_editable_project(&project_id).await?;

        if current.completed_at.is_some() {
            return self.build_project_detail(current).await;
        }

        let now = now_utc().to_rfc3339();
        let transaction = self.persistence.begin().await?;
        let updated = self
            .persistence
            .complete_raw(&transaction, &project_id, &now, &now)
            .await?
            .ok_or_else(|| ApplicationError::not_found("Project 不存在"))?;

        self.activity
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

        self.persistence.commit(transaction).await?;
        self.build_project_detail(updated).await
    }

    /// 重开 Project。
    pub async fn reopen_project(
        &self,
        input: ProjectIdInput,
    ) -> Result<ProjectDetailDto, ApplicationError> {
        let project_id = validate_project_id(&input.project_id)?;
        let current = self.require_editable_project(&project_id).await?;

        if current.completed_at.is_none() {
            return self.build_project_detail(current).await;
        }

        let updated_at = now_utc().to_rfc3339();
        let transaction = self.persistence.begin().await?;
        let updated = self
            .persistence
            .reopen_raw(&transaction, &project_id, &updated_at)
            .await?
            .ok_or_else(|| ApplicationError::not_found("Project 不存在"))?;

        self.activity
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

        self.persistence.commit(transaction).await?;
        self.build_project_detail(updated).await
    }

    /// 从已有读模型构建 Detail（供 lifecycle 壳层复用）。
    pub async fn build_project_detail_from_record(
        &self,
        project: ProjectRecord,
    ) -> Result<ProjectDetailDto, ApplicationError> {
        self.build_project_detail(project).await
    }

    async fn require_existing_project(
        &self,
        project_id: &str,
    ) -> Result<ProjectRecord, ApplicationError> {
        self.persistence
            .get(project_id)
            .await?
            .ok_or_else(|| ApplicationError::not_found("Project 不存在"))
    }

    /// 归档的 Project 不允许继续编辑（R2：无 deleted_at，仅需拦截已归档）。
    async fn require_editable_project(
        &self,
        project_id: &str,
    ) -> Result<ProjectRecord, ApplicationError> {
        let project = self.require_existing_project(project_id).await?;
        if project.archived_at.is_some() {
            return Err(ApplicationError::conflict("已归档 Project 不能修改"));
        }
        Ok(project)
    }

    async fn require_visible_space(
        &self,
        space_id: &str,
    ) -> Result<ProjectSpaceRecord, ApplicationError> {
        let space = self
            .space_reader
            .get(space_id)
            .await?
            .ok_or_else(|| ApplicationError::not_found("Space 不存在"))?;

        if space.archived_at.is_some() {
            return Err(ApplicationError::conflict("当前 Space 不可用"));
        }

        Ok(space)
    }

    async fn build_project_detail(
        &self,
        project: ProjectRecord,
    ) -> Result<ProjectDetailDto, ApplicationError> {
        let space = self
            .space_reader
            .get(&project.space_id)
            .await?
            .ok_or_else(|| ApplicationError::not_found("Project 所属 Space 不存在"))?;
        let counts = self
            .task_counter
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
            position: project.position,
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
        projects: &[ProjectRecord],
    ) -> Result<HashMap<String, ProjectTaskCount>, ApplicationError> {
        let project_ids = projects
            .iter()
            .map(|project| project.id.clone())
            .collect::<Vec<_>>();
        self.task_counter.count_by_project_ids(&project_ids).await
    }

    async fn load_space_name_map(
        &self,
        projects: &[ProjectRecord],
    ) -> Result<HashMap<String, String>, ApplicationError> {
        let space_ids = projects
            .iter()
            .map(|project| project.space_id.clone())
            .collect::<Vec<_>>();
        let spaces = self.space_reader.list_by_ids(&space_ids).await?;
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

fn normalize_scope(input: &ProjectScopeInput) -> Result<NormalizedScope, ApplicationError> {
    match input.kind {
        ProjectScopeKind::All => Ok(NormalizedScope { space_id: None }),
        ProjectScopeKind::Space => Ok(NormalizedScope {
            space_id: Some(validate_space_id(input.space_id.as_deref().ok_or_else(
                || ApplicationError::validation("scope.type=space 时必须提供 spaceId"),
            )?)?),
        }),
    }
}

fn deserialize_nullable_string_field<'de, D>(
    deserializer: D,
) -> Result<Option<Option<String>>, D::Error>
where
    D: Deserializer<'de>,
{
    Option::<String>::deserialize(deserializer).map(Some)
}

fn parse_overview_view(value: &str) -> Result<ProjectOverviewView, ApplicationError> {
    match value.trim() {
        "active" | "active_projects" => Ok(ProjectOverviewView::Active),
        "completed" | "completed_projects" => Ok(ProjectOverviewView::Completed),
        "archived" | "archived_projects" => Ok(ProjectOverviewView::Archived),
        "all" | "all_projects" => Ok(ProjectOverviewView::All),
        _ => Err(ApplicationError::validation("未知的 Project Overview 视图")),
    }
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

fn normalize_optional_long_text(value: Option<String>) -> Option<String> {
    value.and_then(|value| {
        if value.trim().is_empty() {
            None
        } else {
            Some(value)
        }
    })
}

fn normalize_optional_required_text(
    value: Option<&str>,
    field: &str,
) -> Result<Option<String>, ApplicationError> {
    Ok(value
        .map(|value| normalize_required_text(value, field))
        .transpose()?)
}

fn normalize_optional_nullable_text(value: Option<Option<String>>) -> Option<Option<String>> {
    value.map(normalize_optional_text)
}

fn normalize_optional_nullable_long_text(value: Option<Option<String>>) -> Option<Option<String>> {
    value.map(normalize_optional_long_text)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_overview_view_should_accept_aliases() {
        assert_eq!(
            parse_overview_view("active_projects").expect("view should parse"),
            ProjectOverviewView::Active
        );
    }
}

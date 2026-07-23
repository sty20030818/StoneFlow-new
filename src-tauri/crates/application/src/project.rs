//! Project 用例：CRUD、完成/重开与列表编排（生命周期操作由 runtime adapter 委托 lifecycle）。

#![allow(async_fn_in_trait)]

use std::collections::HashMap;

use serde::{Deserialize, Deserializer, Serialize};
use serde_json::{json, Map, Value};
use stoneflow_domain::{
    create_id, normalize_required_text, now_utc, parse_optional_utc_rfc3339, validate_project_id,
    validate_space_id, ActivityEntityKind, WorkPriority, WorkStatus,
};

use crate::{
    activity::{
        ActivityAction, ActivityChangeInput, ActivityPersistence, ActivityService,
        RecordActivityInput,
    },
    operation::{
        changed_outbox_fields, OperationContext, OutboxEnqueueRecord, OutboxLifecycleState,
        OutboxOpKind, OutboxPayload, SyncEntityKind,
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
    pub archived_by_operation_id: Option<String>,
    pub deleted_by_operation_id: Option<String>,
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
    pub planned_at: Option<String>,
    pub due_at: Option<String>,
    pub remind_at: Option<String>,
    pub status_changed_at: String,
    pub completed_at: Option<String>,
    pub position: i64,
    pub created_at: String,
    pub updated_at: String,
}

/// 更新 Project 基础字段 patch。
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct UpdateProjectPatch {
    pub name: Option<String>,
    pub description: Option<Option<String>>,
    pub status: Option<WorkStatus>,
    pub priority: Option<i32>,
    pub planned_at: Option<Option<String>>,
    pub due_at: Option<Option<String>>,
    pub remind_at: Option<Option<String>>,
    pub status_changed_at: Option<String>,
    pub completed_at: Option<Option<String>>,
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

/// Project 管理操作影响的实体范围。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProjectCascadeRecord {
    pub project: ProjectRecord,
    pub affected_task_count: u64,
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
    async fn enqueue(
        &self,
        connection: &Self::Connection,
        record: &OutboxEnqueueRecord,
    ) -> Result<(), ApplicationError>;
    async fn archive_cascade(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        operation_id: &str,
        archived_at: &str,
    ) -> Result<Option<ProjectCascadeRecord>, ApplicationError>;
    async fn soft_delete_cascade(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        operation_id: &str,
        deleted_at: &str,
    ) -> Result<Option<ProjectCascadeRecord>, ApplicationError>;
    async fn restore_archive_cascade(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        operation_id: &str,
        updated_at: &str,
    ) -> Result<Option<ProjectCascadeRecord>, ApplicationError>;
    async fn restore_deleted_cascade(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        operation_id: &str,
        updated_at: &str,
    ) -> Result<Option<ProjectCascadeRecord>, ApplicationError>;
    async fn permanently_delete_cascade(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        deleted_at: &str,
    ) -> Result<Option<ProjectCascadeRecord>, ApplicationError>;
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
    pub status: WorkStatus,
    pub priority: i32,
    pub planned_at: Option<String>,
    pub due_at: Option<String>,
    pub remind_at: Option<String>,
    pub status_changed_at: String,
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
    pub status: WorkStatus,
    pub priority: i32,
    pub planned_at: Option<String>,
    pub due_at: Option<String>,
    pub remind_at: Option<String>,
    pub status_changed_at: String,
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
    pub status: Option<WorkStatus>,
    pub priority: Option<i32>,
    pub planned_at: Option<String>,
    pub due_at: Option<String>,
    pub remind_at: Option<String>,
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
    pub status: Option<WorkStatus>,
    pub priority: Option<i32>,
    #[serde(default)]
    #[serde(deserialize_with = "deserialize_nullable_string_field")]
    pub planned_at: Option<Option<String>>,
    #[serde(default)]
    #[serde(deserialize_with = "deserialize_nullable_string_field")]
    pub due_at: Option<Option<String>>,
    #[serde(default)]
    #[serde(deserialize_with = "deserialize_nullable_string_field")]
    pub remind_at: Option<Option<String>>,
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
                    status: project.status,
                    priority: project.priority,
                    planned_at: project.planned_at,
                    due_at: project.due_at,
                    remind_at: project.remind_at,
                    status_changed_at: project.status_changed_at,
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
        let status = input.status.unwrap_or(WorkStatus::Todo);
        let priority = WorkPriority::from_i32(input.priority.unwrap_or(0))?.as_i32();
        let planned_at = normalize_timestamp(input.planned_at, "plannedAt")?;
        let due_at = normalize_timestamp(input.due_at, "dueAt")?;
        let remind_at = normalize_timestamp(input.remind_at, "remindAt")?;
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
        let completed_at = status.is_done().then(|| now.clone());
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
                    status,
                    priority,
                    planned_at: planned_at.clone(),
                    due_at: due_at.clone(),
                    remind_at: remind_at.clone(),
                    status_changed_at: now.clone(),
                    completed_at: completed_at.clone(),
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
                    operation_id: None,
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
                            field: "status".to_owned(),
                            old_value: None,
                            new_value: Some(json!(status.as_str())),
                        },
                        ActivityChangeInput {
                            field: "priority".to_owned(),
                            old_value: None,
                            new_value: Some(json!(priority)),
                        },
                        ActivityChangeInput {
                            field: "plannedAt".to_owned(),
                            old_value: None,
                            new_value: planned_at.clone().map(|value| json!(value)),
                        },
                        ActivityChangeInput {
                            field: "dueAt".to_owned(),
                            old_value: None,
                            new_value: due_at.clone().map(|value| json!(value)),
                        },
                        ActivityChangeInput {
                            field: "remindAt".to_owned(),
                            old_value: None,
                            new_value: remind_at.clone().map(|value| json!(value)),
                        },
                    ],
                },
            )
            .await?;

        self.enqueue_project_operation(
            &transaction,
            &project,
            &OperationContext::new("local"),
            OutboxOpKind::Upsert,
            "create",
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
        let next_status = input.status;
        let next_priority = input
            .priority
            .map(WorkPriority::from_i32)
            .transpose()?
            .map(WorkPriority::as_i32);
        let next_planned_at = normalize_nullable_timestamp(input.planned_at, "plannedAt")?;
        let next_due_at = normalize_nullable_timestamp(input.due_at, "dueAt")?;
        let next_remind_at = normalize_nullable_timestamp(input.remind_at, "remindAt")?;

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
        if let Some(status) = next_status {
            if status != current.status {
                patch.status = Some(status);
                patch.status_changed_at = Some(now_utc().to_rfc3339());
                patch.completed_at = Some(status.is_done().then(|| now_utc().to_rfc3339()));
                activity_records.push((
                    ActivityAction::ProjectStatusChanged,
                    "status".to_owned(),
                    Some(json!(current.status.as_str())),
                    Some(json!(status.as_str())),
                ));
            }
        }
        if let Some(priority) = next_priority {
            if priority != current.priority {
                patch.priority = Some(priority);
                activity_records.push((
                    ActivityAction::ProjectPriorityChanged,
                    "priority".to_owned(),
                    Some(json!(current.priority)),
                    Some(json!(priority)),
                ));
            }
        }
        if let Some(planned_at) = next_planned_at {
            if planned_at != current.planned_at {
                patch.planned_at = Some(planned_at.clone());
                activity_records.push((
                    ActivityAction::ProjectPlannedUpdated,
                    "plannedAt".to_owned(),
                    current.planned_at.clone().map(|value| json!(value)),
                    planned_at.map(|value| json!(value)),
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
        if let Some(remind_at) = next_remind_at {
            if remind_at != current.remind_at {
                patch.remind_at = Some(remind_at.clone());
                activity_records.push((
                    ActivityAction::ProjectRemindUpdated,
                    "remindAt".to_owned(),
                    current.remind_at.clone().map(|value| json!(value)),
                    remind_at.map(|value| json!(value)),
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
                        operation_id: None,
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

        self.enqueue_project_patch(
            &transaction,
            &updated,
            &OperationContext::new("local"),
            changed_outbox_fields(&project_fields(&current), &project_fields(&updated)),
        )
        .await?;

        self.persistence.commit(transaction).await?;
        self.build_project_detail(updated).await
    }

    /// 归档 Project 并精确级联当次受影响的 Task。
    pub async fn archive_project(
        &self,
        input: ProjectIdInput,
    ) -> Result<ProjectDetailDto, ApplicationError> {
        self.remove_project(input, true).await
    }

    /// 将 Project 移入回收站并精确级联当次受影响的 Task。
    pub async fn delete_project(
        &self,
        input: ProjectIdInput,
    ) -> Result<ProjectDetailDto, ApplicationError> {
        self.remove_project(input, false).await
    }

    /// 恢复 Project，仅恢复由对应管理操作影响的 Task。
    pub async fn restore_project(
        &self,
        input: ProjectIdInput,
    ) -> Result<ProjectDetailDto, ApplicationError> {
        let project_id = validate_project_id(&input.project_id)?;
        let transaction = self.persistence.begin().await?;
        let current = self
            .persistence
            .get(&project_id)
            .await?
            .ok_or_else(|| ApplicationError::not_found("Project 不存在"))?;
        let updated_at = now_utc().to_rfc3339();
        let cascade = if let Some(operation_id) = current.deleted_by_operation_id.as_deref() {
            self.persistence
                .restore_deleted_cascade(&transaction, &project_id, operation_id, &updated_at)
                .await?
        } else if let Some(operation_id) = current.archived_by_operation_id.as_deref() {
            self.persistence
                .restore_archive_cascade(&transaction, &project_id, operation_id, &updated_at)
                .await?
        } else {
            None
        }
        .ok_or_else(|| ApplicationError::conflict("Project 当前不可恢复"))?;
        let operation = OperationContext::new("local");
        self.activity
            .record_activity_in_txn(
                &transaction,
                RecordActivityInput {
                    operation_id: None,
                    entity_type: ActivityEntityKind::Project,
                    entity_id: cascade.project.id.clone(),
                    action: ActivityAction::ProjectRestored,
                    actor_type: None,
                    source: None,
                    summary: Some(format!("恢复 Project「{}」", cascade.project.name)),
                    metadata: None,
                    changes: Vec::new(),
                },
            )
            .await?;
        self.enqueue_project_operation(
            &transaction,
            &cascade.project,
            &operation,
            OutboxOpKind::Restore,
            "restore",
        )
        .await?;
        self.persistence.commit(transaction).await?;
        self.build_project_detail(cascade.project).await
    }

    /// 物理删除 Project 及其 Task，并写入最小 tombstone。
    pub async fn permanently_delete_project(
        &self,
        input: ProjectIdInput,
    ) -> Result<(), ApplicationError> {
        let project_id = validate_project_id(&input.project_id)?;
        let transaction = self.persistence.begin().await?;
        let current = self
            .persistence
            .get(&project_id)
            .await?
            .ok_or_else(|| ApplicationError::not_found("Project 不存在"))?;
        if current.deleted_at.is_none() {
            return Err(ApplicationError::conflict(
                "Project 必须先移入回收站才能永久删除",
            ));
        }
        let deleted_at = now_utc().to_rfc3339();
        let cascade = self
            .persistence
            .permanently_delete_cascade(&transaction, &project_id, &deleted_at)
            .await?
            .ok_or_else(|| ApplicationError::not_found("Project 不存在"))?;
        let operation = OperationContext::new("local");
        self.enqueue_project_operation(
            &transaction,
            &cascade.project,
            &operation,
            OutboxOpKind::Delete,
            "permanentlyDelete",
        )
        .await?;
        self.persistence.commit(transaction).await
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

    async fn remove_project(
        &self,
        input: ProjectIdInput,
        archive: bool,
    ) -> Result<ProjectDetailDto, ApplicationError> {
        let project_id = validate_project_id(&input.project_id)?;
        let transaction = self.persistence.begin().await?;
        let current = self
            .persistence
            .get(&project_id)
            .await?
            .ok_or_else(|| ApplicationError::not_found("Project 不存在"))?;
        if current.archived_at.is_some() || current.deleted_at.is_some() {
            return Err(ApplicationError::conflict("Project 当前不可归档或删除"));
        }
        let operation = OperationContext::new("local");
        let updated_at = operation.created_at.clone();
        let cascade = if archive {
            self.persistence
                .archive_cascade(
                    &transaction,
                    &project_id,
                    &operation.operation_id,
                    &updated_at,
                )
                .await?
        } else {
            self.persistence
                .soft_delete_cascade(
                    &transaction,
                    &project_id,
                    &operation.operation_id,
                    &updated_at,
                )
                .await?
        }
        .ok_or_else(|| ApplicationError::conflict("Project 当前不可归档或删除"))?;
        self.activity
            .record_activity_in_txn(
                &transaction,
                RecordActivityInput {
                    operation_id: None,
                    entity_type: ActivityEntityKind::Project,
                    entity_id: cascade.project.id.clone(),
                    action: if archive {
                        ActivityAction::ProjectArchived
                    } else {
                        ActivityAction::ProjectDeleted
                    },
                    actor_type: None,
                    source: None,
                    summary: Some(format!(
                        "{} Project「{}」",
                        if archive { "归档" } else { "删除" },
                        cascade.project.name
                    )),
                    metadata: Some(json!({ "affectedTaskCount": cascade.affected_task_count })),
                    changes: Vec::new(),
                },
            )
            .await?;
        self.enqueue_project_operation(
            &transaction,
            &cascade.project,
            &operation,
            if archive {
                OutboxOpKind::Patch
            } else {
                OutboxOpKind::Delete
            },
            if archive { "archive" } else { "delete" },
        )
        .await?;
        self.persistence.commit(transaction).await?;
        self.build_project_detail(cascade.project).await
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
            status: project.status,
            priority: project.priority,
            planned_at: project.planned_at,
            due_at: project.due_at,
            remind_at: project.remind_at,
            status_changed_at: project.status_changed_at,
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

    async fn enqueue_project_operation(
        &self,
        connection: &P::Connection,
        project: &ProjectRecord,
        operation: &OperationContext,
        operation_type: OutboxOpKind,
        action: &str,
    ) -> Result<(), ApplicationError> {
        let payload = match action {
            "create" => OutboxPayload::Patch {
                fields: project_fields(project),
            },
            "archive" => OutboxPayload::Lifecycle {
                state: OutboxLifecycleState::Archived,
            },
            "delete" => OutboxPayload::Lifecycle {
                state: OutboxLifecycleState::Trashed,
            },
            "restore" => OutboxPayload::Lifecycle {
                state: OutboxLifecycleState::Active,
            },
            "permanentlyDelete" => OutboxPayload::Tombstone {
                deleted_at: operation.created_at.clone(),
            },
            other => {
                return Err(ApplicationError::internal(format!(
                    "未知 Project Outbox action: {other}"
                )))
            }
        };
        self.persistence
            .enqueue(
                connection,
                &OutboxEnqueueRecord {
                    id: create_id().to_string(),
                    operation_id: operation.operation_id.clone(),
                    entity_type: SyncEntityKind::Project,
                    entity_id: project.id.clone(),
                    generation: project.generation,
                    operation_type,
                    payload_json: payload.to_json()?,
                    created_at: operation.created_at.clone(),
                    available_at: operation.created_at.clone(),
                },
            )
            .await
    }

    async fn enqueue_project_patch(
        &self,
        connection: &P::Connection,
        project: &ProjectRecord,
        operation: &OperationContext,
        fields: Map<String, Value>,
    ) -> Result<(), ApplicationError> {
        self.persistence
            .enqueue(
                connection,
                &OutboxEnqueueRecord {
                    id: create_id().to_string(),
                    operation_id: operation.operation_id.clone(),
                    entity_type: SyncEntityKind::Project,
                    entity_id: project.id.clone(),
                    generation: project.generation,
                    operation_type: OutboxOpKind::Patch,
                    payload_json: OutboxPayload::Patch { fields }.to_json()?,
                    created_at: operation.created_at.clone(),
                    available_at: operation.created_at.clone(),
                },
            )
            .await
    }
}

fn project_fields(project: &ProjectRecord) -> Map<String, Value> {
    Map::from_iter([
        ("space_id".to_owned(), json!(project.space_id)),
        ("name".to_owned(), json!(project.name)),
        ("description".to_owned(), json!(project.description)),
        ("status".to_owned(), json!(project.status.as_str())),
        ("priority".to_owned(), json!(project.priority)),
        ("planned_at".to_owned(), json!(project.planned_at)),
        ("due_at".to_owned(), json!(project.due_at)),
        ("remind_at".to_owned(), json!(project.remind_at)),
        (
            "status_changed_at".to_owned(),
            json!(project.status_changed_at),
        ),
        ("completed_at".to_owned(), json!(project.completed_at)),
        ("position".to_owned(), json!(project.position)),
        ("created_at".to_owned(), json!(project.created_at)),
        ("updated_at".to_owned(), json!(project.updated_at)),
    ])
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

fn normalize_optional_long_text(value: Option<String>) -> Option<String> {
    value.filter(|value| !value.trim().is_empty())
}

fn normalize_optional_required_text(
    value: Option<&str>,
    field: &str,
) -> Result<Option<String>, ApplicationError> {
    Ok(value
        .map(|value| normalize_required_text(value, field))
        .transpose()?)
}

fn normalize_timestamp(
    value: Option<String>,
    field: &str,
) -> Result<Option<String>, ApplicationError> {
    parse_optional_utc_rfc3339(value.as_deref(), field)
        .map(|value| value.map(|value| value.to_rfc3339()))
        .map_err(Into::into)
}

fn normalize_nullable_timestamp(
    value: Option<Option<String>>,
    field: &str,
) -> Result<Option<Option<String>>, ApplicationError> {
    value
        .map(|value| normalize_timestamp(value, field))
        .transpose()
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

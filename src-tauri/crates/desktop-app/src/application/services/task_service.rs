//! Task Service：集中承载阶段 6 的 Task 规则、事务与 Activity 编排。

use std::cmp::Ordering;
use std::collections::HashMap;

use chrono::NaiveDate;
use sea_orm::TransactionTrait;
use serde::{Deserialize, Deserializer, Serialize};
use serde_json::json;
use stoneflow_entity::{
    common::{ActivityEntityKind, TaskStatus},
    project, space, task,
};

use crate::{
    app::error::AppError,
    application::activity::{
        ActivityAction, ActivityChangeInput, ActivityService, RecordActivityInput,
    },
    application::services::LifecycleService,
    domain::{
        create_id, normalize_required_text, normalize_slug, now_utc, parse_calendar_date,
        today_local_date,
    },
    infrastructure::repositories::{
        CreateTaskRecord, ProjectRepository, SpaceRepository, TaskLifecycleView, TaskListQuery,
        TaskPlacementQuery, TaskRepository, UpdateTaskPatch,
    },
};

/// 前端 Scope 在 Task 命令边界的序列化形状。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskScopeInput {
    #[serde(rename = "type")]
    pub kind: TaskScopeKind,
    pub space_id: Option<String>,
}

/// Scope 类型。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TaskScopeKind {
    All,
    Space,
}

/// Task 列表查询输入。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListTasksInput {
    pub scope: TaskScopeInput,
    pub view_key: String,
    pub placement: ListTasksPlacementInput,
}

/// Task 列表 placement 查询输入。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListTasksPlacementInput {
    #[serde(rename = "kind")]
    pub kind: ListTasksPlacementKind,
    pub project_id: Option<String>,
}

/// Task 列表 placement 类型。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ListTasksPlacementKind {
    All,
    Project,
    Inbox,
    NoProject,
}

/// Task 列表单条记录。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskListItemDto {
    pub id: String,
    pub space_id: String,
    pub space_name: String,
    pub space_slug: String,
    pub project_id: Option<String>,
    pub project_name: Option<String>,
    pub inbox_at: Option<String>,
    pub title: String,
    pub note: Option<String>,
    pub status: TaskStatus,
    pub status_changed_at: String,
    pub priority: i32,
    pub due_at: Option<String>,
    pub scheduled_at: Option<String>,
    pub reminder_at: Option<String>,
    pub completed_at: Option<String>,
    pub canceled_at: Option<String>,
    pub archived_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Task 详情载荷。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskDetailDto {
    pub id: String,
    pub space_id: String,
    pub space_name: String,
    pub space_slug: String,
    pub project_id: Option<String>,
    pub project_name: Option<String>,
    pub title: String,
    pub note: Option<String>,
    pub status: TaskStatus,
    pub status_changed_at: String,
    pub priority: i32,
    pub inbox_at: Option<String>,
    pub due_at: Option<String>,
    pub scheduled_at: Option<String>,
    pub reminder_at: Option<String>,
    pub sort_order: i32,
    pub completed_at: Option<String>,
    pub canceled_at: Option<String>,
    pub archived_at: Option<String>,
    pub deleted_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// 创建 Task 的输入。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskInput {
    pub space_id: Option<String>,
    pub placement: CreateTaskPlacementInput,
    pub title: String,
    pub note: Option<String>,
    pub status: Option<TaskStatus>,
    pub priority: Option<i32>,
    pub due_at: Option<String>,
    pub scheduled_at: Option<String>,
    pub reminder_at: Option<String>,
}

/// 创建 Task 时的归属策略输入。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskPlacementInput {
    #[serde(rename = "kind")]
    pub kind: CreateTaskPlacementKind,
    pub project_id: Option<String>,
}

/// 创建 Task 时的 placement 类型。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum CreateTaskPlacementKind {
    Project,
    Inbox,
    NoProject,
}

/// 更新 Task 的输入。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTaskInput {
    pub task_id: String,
    pub title: Option<String>,
    #[serde(default)]
    #[serde(deserialize_with = "deserialize_nullable_string_field")]
    pub note: Option<Option<String>>,
    pub status: Option<TaskStatus>,
    pub priority: Option<i32>,
    pub placement: Option<UpdateTaskPlacementInput>,
    #[serde(default)]
    #[serde(deserialize_with = "deserialize_nullable_string_field")]
    pub due_at: Option<Option<String>>,
    #[serde(default)]
    #[serde(deserialize_with = "deserialize_nullable_string_field")]
    pub scheduled_at: Option<Option<String>>,
    #[serde(default)]
    #[serde(deserialize_with = "deserialize_nullable_string_field")]
    pub reminder_at: Option<Option<String>>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTaskPlacementInput {
    #[serde(rename = "kind")]
    pub kind: UpdateTaskPlacementKind,
    pub space_id: String,
    pub project_id: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum UpdateTaskPlacementKind {
    Project,
    Inbox,
    NoProject,
}

/// 仅携带 Task ID 的输入。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskIdInput {
    pub task_id: String,
}

#[derive(Debug, Clone)]
struct TaskScope {
    space_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum TaskPlacement {
    All,
    Project(String),
    Inbox,
    NoProject,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum TaskViewPreset {
    Lifecycle(TaskLifecycleView),
    Today,
    Focus,
    Upcoming,
    Overdue,
}

#[derive(Debug, Clone)]
pub struct TaskService {
    space_repository: SpaceRepository,
    project_repository: ProjectRepository,
    repository: TaskRepository,
    activity_service: ActivityService,
}

impl TaskService {
    pub fn new(
        space_repository: SpaceRepository,
        project_repository: ProjectRepository,
        repository: TaskRepository,
        activity_service: ActivityService,
    ) -> Self {
        Self {
            space_repository,
            project_repository,
            repository,
            activity_service,
        }
    }

    fn lifecycle_service(&self) -> LifecycleService {
        LifecycleService::new(
            self.space_repository.clone(),
            self.project_repository.clone(),
            self.repository.clone(),
            self.activity_service.clone(),
        )
    }

    pub fn repository(&self) -> &TaskRepository {
        &self.repository
    }

    /// 列出 Task 列表。
    pub async fn list_tasks(
        &self,
        input: ListTasksInput,
    ) -> Result<Vec<TaskListItemDto>, AppError> {
        let scope = normalize_scope(&input.scope)?;
        let view_preset = parse_view_key(&input.view_key)?;
        let placement = normalize_list_placement(&input.placement)?;
        let tasks = self
            .repository
            .list(TaskListQuery {
                space_id: scope.space_id,
                placement: to_placement_query(&placement),
                lifecycle: repository_lifecycle_for_preset(view_preset),
            })
            .await?;
        let tasks = apply_view_preset(tasks, view_preset);

        self.build_task_list(tasks).await
    }

    /// 读取 Task 详情。
    pub async fn get_task_detail(&self, input: TaskIdInput) -> Result<TaskDetailDto, AppError> {
        let task_id = normalize_task_id(&input.task_id)?;
        let current = self
            .repository
            .get(&task_id)
            .await?
            .ok_or_else(|| AppError::not_found("Task 不存在"))?;

        if current.deleted_at.is_some() {
            return Err(AppError::not_found("Task 不存在"));
        }

        self.build_task_detail(current).await
    }

    /// 创建 Task。
    pub async fn create_task(&self, input: CreateTaskInput) -> Result<TaskDetailDto, AppError> {
        let title = normalize_required_text(&input.title, "Task title")?;
        let note = normalize_optional_long_text(input.note);
        let due_at = normalize_optional_text(input.due_at);
        let scheduled_at = normalize_optional_text(input.scheduled_at);
        let reminder_at = normalize_optional_text(input.reminder_at);
        let status = input.status.unwrap_or(TaskStatus::Todo);
        let priority = normalize_priority(input.priority.unwrap_or(0))?;
        let placement = normalize_create_placement(&input.placement)?;
        let project = match &placement {
            TaskPlacement::Project(project_id) => {
                Some(self.require_visible_project(project_id).await?)
            }
            TaskPlacement::Inbox | TaskPlacement::NoProject | TaskPlacement::All => None,
        };
        let space = match (&placement, &project) {
            (TaskPlacement::Project(_), Some(project)) => {
                self.require_visible_space(&project.space_id).await?
            }
            (TaskPlacement::Inbox | TaskPlacement::NoProject, None) => {
                let raw_space_id = input
                    .space_id
                    .as_deref()
                    .ok_or_else(|| AppError::validation("创建 Task 时必须提供 spaceId"))?;
                self.require_visible_space(raw_space_id).await?
            }
            _ => return Err(AppError::validation("创建 Task placement 非法")),
        };

        let now = now_utc().to_rfc3339();
        let transaction = self.repository.connection().begin().await?;
        let sort_order = self
            .repository
            .next_sort_order(
                &transaction,
                &space.id,
                project.as_ref().map(|item| item.id.as_str()),
            )
            .await?;
        let (completed_at, canceled_at) = timestamps_for_status(status, &now);
        let inbox_at = match &placement {
            TaskPlacement::Inbox => Some(now.clone()),
            TaskPlacement::Project(_) | TaskPlacement::NoProject | TaskPlacement::All => None,
        };
        let created = self
            .repository
            .create(
                &transaction,
                CreateTaskRecord {
                    id: create_id().to_string(),
                    space_id: space.id.clone(),
                    project_id: project.as_ref().map(|item| item.id.clone()),
                    title: title.clone(),
                    note: note.clone(),
                    status,
                    status_changed_at: now.clone(),
                    priority,
                    inbox_at,
                    due_at: due_at.clone(),
                    scheduled_at: scheduled_at.clone(),
                    reminder_at: reminder_at.clone(),
                    sort_order,
                    completed_at: completed_at.clone(),
                    canceled_at: canceled_at.clone(),
                    created_at: now.clone(),
                    updated_at: now.clone(),
                },
            )
            .await?;

        self.activity_service
            .record_activity_in_txn(
                &transaction,
                RecordActivityInput {
                    entity_type: ActivityEntityKind::Task,
                    entity_id: created.id.clone(),
                    action: ActivityAction::TaskCreated,
                    actor_type: None,
                    source: None,
                    summary: Some(format!("创建任务「{}」", created.title)),
                    metadata: Some(json!({
                        "taskId": created.id,
                        "spaceId": created.space_id,
                        "spaceName": space.name,
                        "projectId": created.project_id,
                        "placement": placement_key(&placement),
                    })),
                    changes: Vec::new(),
                },
            )
            .await?;

        transaction.commit().await?;
        self.build_task_detail(created).await
    }

    /// 更新 Task 基础字段。
    pub async fn update_task(&self, input: UpdateTaskInput) -> Result<TaskDetailDto, AppError> {
        let task_id = normalize_task_id(&input.task_id)?;
        let current = self
            .repository
            .get(&task_id)
            .await?
            .ok_or_else(|| AppError::not_found("Task 不存在"))?;

        if current.deleted_at.is_some() {
            return Err(AppError::not_found("Task 不存在"));
        }

        let mut patch = UpdateTaskPatch::default();
        let mut changes = Vec::new();
        let now = now_utc().to_rfc3339();

        let mut next_space_id = current.space_id.clone();
        let mut next_project_id = current.project_id.clone();
        let mut next_inbox_at = current.inbox_at.clone();

        if let Some(placement) = input.placement.as_ref() {
            match placement.kind {
                UpdateTaskPlacementKind::Project => {
                    let project_id = placement.project_id.as_deref().ok_or_else(|| {
                        AppError::validation("placement.kind=project 时必须提供 projectId")
                    })?;
                    let project = self.require_visible_project(project_id).await?;
                    if project.space_id != placement.space_id {
                        return Err(AppError::validation("placement.spaceId 与 project.spaceId 不一致"));
                    }
                    next_space_id = project.space_id.clone();
                    next_project_id = Some(project.id.clone());
                    next_inbox_at = None;
                }
                UpdateTaskPlacementKind::Inbox => {
                    let space = self.require_visible_space(&placement.space_id).await?;
                    next_space_id = space.id.clone();
                    next_project_id = None;
                    next_inbox_at = Some(now.clone());
                }
                UpdateTaskPlacementKind::NoProject => {
                    let space = self.require_visible_space(&placement.space_id).await?;
                    next_space_id = space.id.clone();
                    next_project_id = None;
                    next_inbox_at = None;
                }
            }
        }

        if let Some(title) = input.title {
            let title = normalize_required_text(&title, "Task title")?;
            if title != current.title {
                push_change(
                    &mut changes,
                    "title",
                    Some(json!(current.title)),
                    Some(json!(title.clone())),
                );
                patch.title = Some(title);
            }
        }

        if let Some(note) = input.note {
            let note = normalize_optional_long_text_option(note);
            if note != current.note {
                push_change(
                    &mut changes,
                    "note",
                    json_option_string(&current.note),
                    json_option_string(&note),
                );
                patch.note = Some(note);
            }
        }

        if let Some(priority) = input.priority {
            let priority = normalize_priority(priority)?;
            if priority != current.priority {
                push_change(
                    &mut changes,
                    "priority",
                    Some(json!(current.priority)),
                    Some(json!(priority)),
                );
                patch.priority = Some(priority);
            }
        }

        if next_space_id != current.space_id {
            push_change(
                &mut changes,
                "space_id",
                Some(json!(current.space_id)),
                Some(json!(next_space_id.clone())),
            );
            patch.space_id = Some(next_space_id.clone());
        }

        if next_project_id != current.project_id {
            push_change(
                &mut changes,
                "project_id",
                json_option_string(&current.project_id),
                json_option_string(&next_project_id),
            );
            patch.project_id = Some(next_project_id.clone());
        }

        if let Some(status) = input.status {
            if matches!(status, TaskStatus::Done | TaskStatus::Canceled) {
                next_inbox_at = None;
            }
        }

        if next_inbox_at != current.inbox_at {
            push_change(
                &mut changes,
                "inbox_at",
                json_option_string(&current.inbox_at),
                json_option_string(&next_inbox_at),
            );
            patch.inbox_at = Some(next_inbox_at.clone());
        }

        if let Some(due_at) = input.due_at {
            let due_at = normalize_optional_text_option(due_at);
            if due_at != current.due_at {
                push_change(
                    &mut changes,
                    "due_at",
                    json_option_string(&current.due_at),
                    json_option_string(&due_at),
                );
                patch.due_at = Some(due_at);
            }
        }

        if let Some(scheduled_at) = input.scheduled_at {
            let scheduled_at = normalize_optional_text_option(scheduled_at);
            if scheduled_at != current.scheduled_at {
                push_change(
                    &mut changes,
                    "scheduled_at",
                    json_option_string(&current.scheduled_at),
                    json_option_string(&scheduled_at),
                );
                patch.scheduled_at = Some(scheduled_at);
            }
        }

        if let Some(reminder_at) = input.reminder_at {
            let reminder_at = normalize_optional_text_option(reminder_at);
            if reminder_at != current.reminder_at {
                push_change(
                    &mut changes,
                    "reminder_at",
                    json_option_string(&current.reminder_at),
                    json_option_string(&reminder_at),
                );
                patch.reminder_at = Some(reminder_at);
            }
        }

        if let Some(status) = input.status {
            if status != current.status {
                push_change(
                    &mut changes,
                    "status",
                    Some(json!(status_key(current.status))),
                    Some(json!(status_key(status))),
                );
                patch.status = Some(status);

                if current.status_changed_at != now {
                    push_change(
                        &mut changes,
                        "status_changed_at",
                        Some(json!(current.status_changed_at)),
                        Some(json!(now.clone())),
                    );
                }
                patch.status_changed_at = Some(now.clone());

                let (next_completed_at, next_canceled_at) = timestamps_for_status(status, &now);
                if next_completed_at != current.completed_at {
                    push_change(
                        &mut changes,
                        "completed_at",
                        json_option_string(&current.completed_at),
                        json_option_string(&next_completed_at),
                    );
                    patch.completed_at = Some(next_completed_at);
                }
                if next_canceled_at != current.canceled_at {
                    push_change(
                        &mut changes,
                        "canceled_at",
                        json_option_string(&current.canceled_at),
                        json_option_string(&next_canceled_at),
                    );
                    patch.canceled_at = Some(next_canceled_at);
                }
            }
        }

        if changes.is_empty() {
            return self.build_task_detail(current).await;
        }

        let action = select_update_action(&current, patch.status, &changes);
        let summary = Some(build_update_summary(action, &current.title));
        let transaction = self.repository.connection().begin().await?;
        let updated = self
            .repository
            .update(&transaction, &task_id, patch, &now)
            .await?
            .ok_or_else(|| AppError::not_found("Task 不存在"))?;

        self.activity_service
            .record_activity_in_txn(
                &transaction,
                RecordActivityInput {
                    entity_type: ActivityEntityKind::Task,
                    entity_id: updated.id.clone(),
                    action,
                    actor_type: None,
                    source: None,
                    summary,
                    metadata: Some(json!({
                        "taskId": updated.id,
                        "spaceId": updated.space_id,
                        "projectId": updated.project_id,
                    })),
                    changes,
                },
            )
            .await?;

        transaction.commit().await?;
        self.build_task_detail(updated).await
    }

    /// 归档 Task。
    pub async fn archive_task(&self, input: TaskIdInput) -> Result<TaskDetailDto, AppError> {
        let task_id = normalize_task_id(&input.task_id)?;
        let updated = self.lifecycle_service().archive_task(&task_id).await?;
        self.build_task_detail(updated).await
    }

    /// 恢复 Task。
    pub async fn restore_task(&self, input: TaskIdInput) -> Result<TaskDetailDto, AppError> {
        let task_id = normalize_task_id(&input.task_id)?;
        let updated = self.lifecycle_service().restore_task(&task_id).await?;
        self.build_task_detail(updated).await
    }

    /// 删除 Task。
    pub async fn delete_task(&self, input: TaskIdInput) -> Result<TaskDetailDto, AppError> {
        let task_id = normalize_task_id(&input.task_id)?;
        let updated = self.lifecycle_service().delete_task(&task_id).await?;
        self.build_task_detail(updated).await
    }

    async fn build_task_list(
        &self,
        tasks: Vec<task::Model>,
    ) -> Result<Vec<TaskListItemDto>, AppError> {
        let space_map = self.load_space_map(&tasks).await?;
        let project_map = self.load_project_map(&tasks).await?;

        Ok(tasks
            .into_iter()
            .map(|item| {
                let (space_name, space_slug) = space_map
                    .get(&item.space_id)
                    .map(|space| (space.name.clone(), normalize_slug(&space.name)))
                    .unwrap_or_else(|| (item.space_id.clone(), "unknown".to_owned()));
                let project_name = item
                    .project_id
                    .as_ref()
                    .and_then(|project_id| project_map.get(project_id))
                    .map(|project| project.name.clone());

                TaskListItemDto {
                    id: item.id,
                    space_id: item.space_id,
                    space_name,
                    space_slug,
                    project_id: item.project_id,
                    project_name,
                    inbox_at: item.inbox_at,
                    title: item.title,
                    note: item.note,
                    status: item.status,
                    status_changed_at: item.status_changed_at,
                    priority: item.priority,
                    due_at: item.due_at,
                    scheduled_at: item.scheduled_at,
                    reminder_at: item.reminder_at,
                    completed_at: item.completed_at,
                    canceled_at: item.canceled_at,
                    archived_at: item.archived_at,
                    created_at: item.created_at,
                    updated_at: item.updated_at,
                }
            })
            .collect())
    }

    async fn build_task_detail(&self, item: task::Model) -> Result<TaskDetailDto, AppError> {
        let space = self
            .space_repository
            .get(&item.space_id)
            .await?
            .ok_or_else(|| AppError::not_found("Task 所属 Space 不存在"))?;
        let project = match item.project_id.as_deref() {
            Some(project_id) => self.project_repository.get(project_id).await?,
            None => None,
        };

        Ok(TaskDetailDto {
            id: item.id,
            space_id: item.space_id,
            space_name: space.name.clone(),
            space_slug: normalize_slug(&space.name),
            project_id: item.project_id,
            project_name: project.map(|project| project.name),
            title: item.title,
            note: item.note,
            status: item.status,
            status_changed_at: item.status_changed_at,
            priority: item.priority,
            inbox_at: item.inbox_at,
            due_at: item.due_at,
            scheduled_at: item.scheduled_at,
            reminder_at: item.reminder_at,
            sort_order: item.sort_order,
            completed_at: item.completed_at,
            canceled_at: item.canceled_at,
            archived_at: item.archived_at,
            deleted_at: item.deleted_at,
            created_at: item.created_at,
            updated_at: item.updated_at,
        })
    }

    async fn require_visible_space(&self, space_id: &str) -> Result<space::Model, AppError> {
        let space_id = normalize_space_id(space_id)?;
        let space = self
            .space_repository
            .get(&space_id)
            .await?
            .ok_or_else(|| AppError::not_found("Space 不存在"))?;

        if space.archived_at.is_some() || space.deleted_at.is_some() {
            return Err(AppError::not_found("Space 不存在"));
        }

        Ok(space)
    }

    async fn require_visible_project(&self, project_id: &str) -> Result<project::Model, AppError> {
        let project_id = normalize_project_id(project_id)?;
        let project = self
            .project_repository
            .get(&project_id)
            .await?
            .ok_or_else(|| AppError::not_found("Project 不存在"))?;

        if project.archived_at.is_some() || project.deleted_at.is_some() {
            return Err(AppError::not_found("Project 不存在"));
        }

        Ok(project)
    }

    async fn load_space_map(
        &self,
        tasks: &[task::Model],
    ) -> Result<HashMap<String, space::Model>, AppError> {
        let space_ids = tasks
            .iter()
            .map(|item| item.space_id.clone())
            .collect::<Vec<_>>();
        let spaces = self.space_repository.list_by_ids(&space_ids).await?;

        Ok(spaces
            .into_iter()
            .map(|item| (item.id.clone(), item))
            .collect::<HashMap<_, _>>())
    }

    async fn load_project_map(
        &self,
        tasks: &[task::Model],
    ) -> Result<HashMap<String, project::Model>, AppError> {
        let project_ids = tasks
            .iter()
            .filter_map(|item| item.project_id.clone())
            .collect::<Vec<_>>();
        let projects = self.project_repository.list_by_ids(&project_ids).await?;

        Ok(projects
            .into_iter()
            .map(|item| (item.id.clone(), item))
            .collect::<HashMap<_, _>>())
    }
}

fn normalize_scope(input: &TaskScopeInput) -> Result<TaskScope, AppError> {
    match input.kind {
        TaskScopeKind::All => Ok(TaskScope { space_id: None }),
        TaskScopeKind::Space => {
            let space_id = input
                .space_id
                .as_deref()
                .ok_or_else(|| AppError::validation("type=space 时必须提供 spaceId"))?;
            Ok(TaskScope {
                space_id: Some(normalize_space_id(space_id)?),
            })
        }
    }
}

fn normalize_list_placement(input: &ListTasksPlacementInput) -> Result<TaskPlacement, AppError> {
    match input.kind {
        ListTasksPlacementKind::All => Ok(TaskPlacement::All),
        ListTasksPlacementKind::Inbox => Ok(TaskPlacement::Inbox),
        ListTasksPlacementKind::NoProject => Ok(TaskPlacement::NoProject),
        ListTasksPlacementKind::Project => {
            let project_id = input
                .project_id
                .as_deref()
                .ok_or_else(|| AppError::validation("kind=project 时必须提供 projectId"))?;
            Ok(TaskPlacement::Project(normalize_project_id(project_id)?))
        }
    }
}

fn normalize_create_placement(input: &CreateTaskPlacementInput) -> Result<TaskPlacement, AppError> {
    match input.kind {
        CreateTaskPlacementKind::Inbox => Ok(TaskPlacement::Inbox),
        CreateTaskPlacementKind::NoProject => Ok(TaskPlacement::NoProject),
        CreateTaskPlacementKind::Project => {
            let project_id = input
                .project_id
                .as_deref()
                .ok_or_else(|| AppError::validation("kind=project 时必须提供 projectId"))?;
            Ok(TaskPlacement::Project(normalize_project_id(project_id)?))
        }
    }
}

fn to_placement_query(placement: &TaskPlacement) -> TaskPlacementQuery {
    match placement {
        TaskPlacement::All => TaskPlacementQuery::All,
        TaskPlacement::Project(project_id) => TaskPlacementQuery::Project(project_id.clone()),
        TaskPlacement::Inbox => TaskPlacementQuery::Inbox,
        TaskPlacement::NoProject => TaskPlacementQuery::NoProject,
    }
}

fn placement_key(placement: &TaskPlacement) -> &'static str {
    match placement {
        TaskPlacement::All => "all",
        TaskPlacement::Project(_) => "project",
        TaskPlacement::Inbox => "inbox",
        TaskPlacement::NoProject => "noProject",
    }
}

fn parse_view_key(view_key: &str) -> Result<TaskViewPreset, AppError> {
    match view_key.trim().to_ascii_lowercase().as_str() {
        "active" => Ok(TaskViewPreset::Lifecycle(TaskLifecycleView::Active)),
        "completed" => Ok(TaskViewPreset::Lifecycle(TaskLifecycleView::Completed)),
        "canceled" => Ok(TaskViewPreset::Lifecycle(TaskLifecycleView::Canceled)),
        "archived" => Ok(TaskViewPreset::Lifecycle(TaskLifecycleView::Archived)),
        "all" => Ok(TaskViewPreset::Lifecycle(TaskLifecycleView::All)),
        "today" => Ok(TaskViewPreset::Today),
        "focus" => Ok(TaskViewPreset::Focus),
        "upcoming" => Ok(TaskViewPreset::Upcoming),
        "overdue" => Ok(TaskViewPreset::Overdue),
        _ => Err(AppError::validation("未知 Task viewKey")),
    }
}

fn repository_lifecycle_for_preset(view_preset: TaskViewPreset) -> TaskLifecycleView {
    match view_preset {
        TaskViewPreset::Lifecycle(lifecycle) => lifecycle,
        TaskViewPreset::Today
        | TaskViewPreset::Focus
        | TaskViewPreset::Upcoming
        | TaskViewPreset::Overdue => TaskLifecycleView::Active,
    }
}

fn apply_view_preset(mut tasks: Vec<task::Model>, view_preset: TaskViewPreset) -> Vec<task::Model> {
    match view_preset {
        TaskViewPreset::Lifecycle(_) => tasks,
        TaskViewPreset::Today => {
            let today = today_local_date();
            tasks.retain(|task| matches_today(task, today));
            tasks.sort_by(|left, right| compare_today_tasks(left, right, today));
            tasks
        }
        TaskViewPreset::Focus => {
            tasks.retain(matches_focus);
            tasks.sort_by(compare_focus_tasks);
            tasks
        }
        TaskViewPreset::Upcoming => {
            let today = today_local_date();
            tasks.retain(|task| matches_upcoming(task, today));
            tasks.sort_by(|left, right| compare_upcoming_tasks(left, right, today));
            tasks
        }
        TaskViewPreset::Overdue => {
            let today = today_local_date();
            tasks.retain(|task| matches_overdue(task, today));
            tasks.sort_by(compare_overdue_tasks);
            tasks
        }
    }
}

fn normalize_task_id(value: &str) -> Result<String, AppError> {
    normalize_required_text(value, "Task id")
}

fn normalize_space_id(value: &str) -> Result<String, AppError> {
    normalize_required_text(value, "Space id")
}

fn normalize_project_id(value: &str) -> Result<String, AppError> {
    normalize_required_text(value, "Project id")
}

fn deserialize_nullable_string_field<'de, D>(
    deserializer: D,
) -> Result<Option<Option<String>>, D::Error>
where
    D: Deserializer<'de>,
{
    Option::<String>::deserialize(deserializer).map(Some)
}

fn normalize_priority(priority: i32) -> Result<i32, AppError> {
    if (0..=4).contains(&priority) {
        Ok(priority)
    } else {
        Err(AppError::validation("Task priority 必须在 0 到 4 之间"))
    }
}

fn normalize_optional_text(value: Option<String>) -> Option<String> {
    value.and_then(|text| {
        let trimmed = text.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_owned())
        }
    })
}

fn normalize_optional_long_text(value: Option<String>) -> Option<String> {
    value.and_then(|text| {
        if text.trim().is_empty() {
            None
        } else {
            Some(text)
        }
    })
}

fn normalize_optional_text_option(value: Option<String>) -> Option<String> {
    value.and_then(|text| {
        let trimmed = text.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_owned())
        }
    })
}

fn normalize_optional_long_text_option(value: Option<String>) -> Option<String> {
    normalize_optional_long_text(value)
}

fn json_option_string(value: &Option<String>) -> Option<serde_json::Value> {
    value.as_ref().map(|item| json!(item))
}

fn status_key(status: TaskStatus) -> &'static str {
    match status {
        TaskStatus::Todo => "todo",
        TaskStatus::Doing => "doing",
        TaskStatus::Waiting => "waiting",
        TaskStatus::Done => "done",
        TaskStatus::Canceled => "canceled",
    }
}

fn timestamps_for_status(status: TaskStatus, now: &str) -> (Option<String>, Option<String>) {
    match status {
        TaskStatus::Done => (Some(now.to_owned()), None),
        TaskStatus::Canceled => (None, Some(now.to_owned())),
        TaskStatus::Todo | TaskStatus::Doing | TaskStatus::Waiting => (None, None),
    }
}

fn matches_focus(task: &task::Model) -> bool {
    matches!(task.status, TaskStatus::Todo | TaskStatus::Doing) && task.priority >= 3
}

fn matches_today(task: &task::Model, today: NaiveDate) -> bool {
    let due_date = due_date(task);
    let scheduled_date = scheduled_date(task);
    scheduled_date == Some(today)
        || due_date == Some(today)
        || due_date.is_some_and(|value| value < today)
}

fn matches_upcoming(task: &task::Model, today: NaiveDate) -> bool {
    due_date(task).is_some_and(|value| value > today)
        || scheduled_date(task).is_some_and(|value| value > today)
}

fn matches_overdue(task: &task::Model, today: NaiveDate) -> bool {
    due_date(task).is_some_and(|value| value < today)
}

fn compare_today_tasks(left: &task::Model, right: &task::Model, today: NaiveDate) -> Ordering {
    compare_ordering_chain([
        today_bucket(left, today).cmp(&today_bucket(right, today)),
        right.priority.cmp(&left.priority),
        left.sort_order.cmp(&right.sort_order),
        right.updated_at.cmp(&left.updated_at),
    ])
}

fn compare_focus_tasks(left: &task::Model, right: &task::Model) -> Ordering {
    compare_ordering_chain([
        right.priority.cmp(&left.priority),
        compare_option_date_asc(due_date(left), due_date(right)),
        compare_option_date_asc(scheduled_date(left), scheduled_date(right)),
        left.sort_order.cmp(&right.sort_order),
        right.updated_at.cmp(&left.updated_at),
    ])
}

fn compare_upcoming_tasks(left: &task::Model, right: &task::Model, today: NaiveDate) -> Ordering {
    compare_ordering_chain([
        compare_option_date_asc(
            next_upcoming_date(left, today),
            next_upcoming_date(right, today),
        ),
        right.priority.cmp(&left.priority),
        left.sort_order.cmp(&right.sort_order),
        right.updated_at.cmp(&left.updated_at),
    ])
}

fn compare_overdue_tasks(left: &task::Model, right: &task::Model) -> Ordering {
    compare_ordering_chain([
        compare_option_date_asc(due_date(left), due_date(right)),
        right.priority.cmp(&left.priority),
        left.sort_order.cmp(&right.sort_order),
        right.updated_at.cmp(&left.updated_at),
    ])
}

fn today_bucket(task: &task::Model, today: NaiveDate) -> u8 {
    if due_date(task).is_some_and(|value| value < today) {
        return 0;
    }
    if due_date(task) == Some(today) {
        return 1;
    }
    if scheduled_date(task) == Some(today) {
        return 2;
    }
    3
}

fn next_upcoming_date(task: &task::Model, today: NaiveDate) -> Option<NaiveDate> {
    [scheduled_date(task), due_date(task)]
        .into_iter()
        .flatten()
        .filter(|date| *date > today)
        .min()
}

fn due_date(task: &task::Model) -> Option<NaiveDate> {
    task.due_at.as_deref().and_then(parse_calendar_date)
}

fn scheduled_date(task: &task::Model) -> Option<NaiveDate> {
    task.scheduled_at.as_deref().and_then(parse_calendar_date)
}

fn compare_option_date_asc(left: Option<NaiveDate>, right: Option<NaiveDate>) -> Ordering {
    match (left, right) {
        (Some(left), Some(right)) => left.cmp(&right),
        (Some(_), None) => Ordering::Less,
        (None, Some(_)) => Ordering::Greater,
        (None, None) => Ordering::Equal,
    }
}

fn compare_ordering_chain<const N: usize>(orderings: [Ordering; N]) -> Ordering {
    orderings
        .into_iter()
        .find(|ordering| *ordering != Ordering::Equal)
        .unwrap_or(Ordering::Equal)
}

fn push_change(
    changes: &mut Vec<ActivityChangeInput>,
    field: &str,
    old_value: Option<serde_json::Value>,
    new_value: Option<serde_json::Value>,
) {
    if old_value == new_value {
        return;
    }

    changes.push(ActivityChangeInput {
        field: field.to_owned(),
        old_value,
        new_value,
    });
}

fn select_update_action(
    current: &task::Model,
    next_status: Option<TaskStatus>,
    changes: &[ActivityChangeInput],
) -> ActivityAction {
    if let Some(status) = next_status {
        return match status {
            TaskStatus::Done => ActivityAction::TaskCompleted,
            TaskStatus::Canceled => ActivityAction::TaskCanceled,
            TaskStatus::Todo | TaskStatus::Doing | TaskStatus::Waiting
                if matches!(current.status, TaskStatus::Done | TaskStatus::Canceled) =>
            {
                ActivityAction::TaskReopened
            }
            TaskStatus::Todo | TaskStatus::Doing | TaskStatus::Waiting => {
                ActivityAction::TaskStatusChanged
            }
        };
    }

    let changed_fields = changes
        .iter()
        .map(|change| change.field.as_str())
        .collect::<Vec<_>>();
    if changed_fields.contains(&"inbox_at") {
        return if current.inbox_at.is_some() {
            ActivityAction::TaskInboxLeft
        } else {
            ActivityAction::TaskInboxEntered
        };
    }
    if changed_fields.contains(&"project_id") {
        return ActivityAction::TaskMovedProject;
    }
    if changed_fields.contains(&"space_id") {
        return ActivityAction::TaskMovedSpace;
    }
    if changed_fields.contains(&"priority") {
        return ActivityAction::TaskPriorityChanged;
    }
    if changed_fields.contains(&"due_at") {
        return ActivityAction::TaskDueUpdated;
    }
    if changed_fields.contains(&"scheduled_at") {
        return ActivityAction::TaskScheduledUpdated;
    }
    if changed_fields.contains(&"reminder_at") {
        return ActivityAction::TaskReminderUpdated;
    }
    if changed_fields.contains(&"note") {
        return ActivityAction::TaskNoteUpdated;
    }

    ActivityAction::TaskTitleUpdated
}

fn build_update_summary(action: ActivityAction, title: &str) -> String {
    match action {
        ActivityAction::TaskCompleted => format!("完成任务「{title}」"),
        ActivityAction::TaskCanceled => format!("取消任务「{title}」"),
        ActivityAction::TaskReopened => format!("重新打开任务「{title}」"),
        ActivityAction::TaskStatusChanged => format!("更新任务状态「{title}」"),
        ActivityAction::TaskMovedProject => format!("调整任务所属项目「{title}」"),
        ActivityAction::TaskMovedSpace => format!("调整任务所属 Space「{title}」"),
        ActivityAction::TaskPriorityChanged => format!("更新任务优先级「{title}」"),
        ActivityAction::TaskInboxEntered => format!("将任务放回 Inbox「{title}」"),
        ActivityAction::TaskInboxLeft => format!("将任务移出 Inbox「{title}」"),
        ActivityAction::TaskDueUpdated => format!("更新任务截止时间「{title}」"),
        ActivityAction::TaskScheduledUpdated => format!("更新任务计划时间「{title}」"),
        ActivityAction::TaskReminderUpdated => format!("更新任务提醒时间「{title}」"),
        ActivityAction::TaskNoteUpdated => format!("更新任务备注「{title}」"),
        _ => format!("更新任务「{title}」"),
    }
}

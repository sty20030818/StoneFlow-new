//! Task 用例编排：CRUD、列表与 Activity 记录。

#![allow(async_fn_in_trait)]

use std::collections::HashMap;

use serde::{Deserialize, Deserializer, Serialize};
use serde_json::{json, Value};
use stoneflow_domain::{
    create_id, normalize_required_text, normalize_slug, now_utc, validate_project_id,
    validate_space_id, validate_task_id, validate_task_priority, ActivityEntityKind,
    TaskStatus,
};

use crate::{
    activity::{
        ActivityAction, ActivityChangeInput, ActivityPersistence, ActivityService,
        RecordActivityInput,
    },
    task::{
        executor::{
            apply_view_preset, build_update_summary, parse_view_key,
            repository_lifecycle_for_preset, select_update_action, status_key,
            timestamps_for_status,
        },
        types::{
            CreateTaskPersistenceRecord, TaskListQuery, TaskPlacement, TaskPlacementQuery,
            TaskProjectRecord, TaskRecord, TaskScope, TaskSpaceRecord, UpdateTaskPatch,
        },
    },
    UsecaseError,
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

/// Task 持久化边界。
pub trait TaskPersistence: Send + Sync {
    type Connection: Send + Sync;

    async fn begin(&self) -> Result<Self::Connection, UsecaseError>;
    async fn commit(&self, connection: Self::Connection) -> Result<(), UsecaseError>;
    async fn get(&self, task_id: &str) -> Result<Option<TaskRecord>, UsecaseError>;
    async fn list(&self, query: TaskListQuery) -> Result<Vec<TaskRecord>, UsecaseError>;
    async fn next_sort_order(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        project_id: Option<&str>,
    ) -> Result<i32, UsecaseError>;
    async fn create(
        &self,
        connection: &Self::Connection,
        record: CreateTaskPersistenceRecord,
    ) -> Result<TaskRecord, UsecaseError>;
    async fn update(
        &self,
        connection: &Self::Connection,
        task_id: &str,
        patch: UpdateTaskPatch,
        updated_at: &str,
    ) -> Result<Option<TaskRecord>, UsecaseError>;
}

/// Task 编排所需的 Space 读取边界。
pub trait TaskSpaceReader: Send + Sync {
    async fn get(&self, space_id: &str) -> Result<Option<TaskSpaceRecord>, UsecaseError>;
    async fn list_by_ids(
        &self,
        space_ids: &[String],
    ) -> Result<Vec<TaskSpaceRecord>, UsecaseError>;
}

/// Task 编排所需的 Project 读取边界。
pub trait TaskProjectReader: Send + Sync {
    async fn get(&self, project_id: &str) -> Result<Option<TaskProjectRecord>, UsecaseError>;
    async fn list_by_ids(
        &self,
        project_ids: &[String],
    ) -> Result<Vec<TaskProjectRecord>, UsecaseError>;
}

/// Task 用例编排（不含 archive / restore / delete）。
#[derive(Debug, Clone)]
pub struct TaskService<P, A, S, PR>
where
    P: TaskPersistence,
    A: ActivityPersistence<Connection = P::Connection>,
    S: TaskSpaceReader,
    PR: TaskProjectReader,
{
    persistence: P,
    activity: ActivityService<A>,
    space_reader: S,
    project_reader: PR,
}

impl<P, A, S, PR> TaskService<P, A, S, PR>
where
    P: TaskPersistence,
    A: ActivityPersistence<Connection = P::Connection>,
    S: TaskSpaceReader,
    PR: TaskProjectReader,
{
    pub fn new(
        persistence: P,
        activity: ActivityService<A>,
        space_reader: S,
        project_reader: PR,
    ) -> Self {
        Self {
            persistence,
            activity,
            space_reader,
            project_reader,
        }
    }

    /// 列出 Task 列表。
    pub async fn list_tasks(
        &self,
        input: ListTasksInput,
    ) -> Result<Vec<TaskListItemDto>, UsecaseError> {
        let scope = normalize_scope(&input.scope)?;
        let view_preset = parse_view_key(&input.view_key)?;
        let placement = normalize_list_placement(&input.placement)?;
        let tasks = self
            .persistence
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
    pub async fn get_task_detail(&self, input: TaskIdInput) -> Result<TaskDetailDto, UsecaseError> {
        let task_id = validate_task_id(&input.task_id)?;
        let current = self
            .persistence
            .get(&task_id)
            .await?
            .ok_or_else(|| UsecaseError::not_found("Task 不存在"))?;

        if current.deleted_at.is_some() {
            return Err(UsecaseError::not_found("Task 不存在"));
        }

        self.build_task_detail(current).await
    }

    /// 创建 Task。
    pub async fn create_task(&self, input: CreateTaskInput) -> Result<TaskDetailDto, UsecaseError> {
        let title = normalize_required_text(&input.title, "Task title")?;
        let note = normalize_optional_long_text(input.note);
        let due_at = normalize_optional_text(input.due_at);
        let scheduled_at = normalize_optional_text(input.scheduled_at);
        let reminder_at = normalize_optional_text(input.reminder_at);
        let status = input.status.unwrap_or(TaskStatus::Todo);
        let priority = validate_task_priority(input.priority.unwrap_or(0))?;
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
                    .ok_or_else(|| UsecaseError::validation("创建 Task 时必须提供 spaceId"))?;
                self.require_visible_space(raw_space_id).await?
            }
            _ => return Err(UsecaseError::validation("创建 Task placement 非法")),
        };

        let now = now_utc().to_rfc3339();
        let transaction = self.persistence.begin().await?;
        let sort_order = self
            .persistence
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
            .persistence
            .create(
                &transaction,
                CreateTaskPersistenceRecord {
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

        self.activity
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

        self.persistence.commit(transaction).await?;
        self.build_task_detail(created).await
    }

    /// 更新 Task 基础字段。
    pub async fn update_task(&self, input: UpdateTaskInput) -> Result<TaskDetailDto, UsecaseError> {
        let task_id = validate_task_id(&input.task_id)?;
        let current = self
            .persistence
            .get(&task_id)
            .await?
            .ok_or_else(|| UsecaseError::not_found("Task 不存在"))?;

        if current.deleted_at.is_some() {
            return Err(UsecaseError::not_found("Task 不存在"));
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
                        UsecaseError::validation("placement.kind=project 时必须提供 projectId")
                    })?;
                    let project = self.require_visible_project(project_id).await?;
                    if project.space_id != placement.space_id {
                        return Err(UsecaseError::validation(
                            "placement.spaceId 与 project.spaceId 不一致",
                        ));
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
            let priority = validate_task_priority(priority)?;
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
        let transaction = self.persistence.begin().await?;
        let updated = self
            .persistence
            .update(&transaction, &task_id, patch, &now)
            .await?
            .ok_or_else(|| UsecaseError::not_found("Task 不存在"))?;

        self.activity
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

        self.persistence.commit(transaction).await?;
        self.build_task_detail(updated).await
    }

    /// 从持久化记录构建 Task 详情（供 lifecycle 委托后复用）。
    pub async fn build_task_detail_from_record(
        &self,
        task: TaskRecord,
    ) -> Result<TaskDetailDto, UsecaseError> {
        self.build_task_detail(task).await
    }

    async fn build_task_list(&self, tasks: Vec<TaskRecord>) -> Result<Vec<TaskListItemDto>, UsecaseError> {
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

    async fn build_task_detail(&self, item: TaskRecord) -> Result<TaskDetailDto, UsecaseError> {
        let space = self
            .space_reader
            .get(&item.space_id)
            .await?
            .ok_or_else(|| UsecaseError::not_found("Task 所属 Space 不存在"))?;
        let project = match item.project_id.as_deref() {
            Some(project_id) => self.project_reader.get(project_id).await?,
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

    async fn require_visible_space(&self, space_id: &str) -> Result<TaskSpaceRecord, UsecaseError> {
        let space_id = validate_space_id(space_id)?;
        let space = self
            .space_reader
            .get(&space_id)
            .await?
            .ok_or_else(|| UsecaseError::not_found("Space 不存在"))?;

        if space.archived_at.is_some() || space.deleted_at.is_some() {
            return Err(UsecaseError::not_found("Space 不存在"));
        }

        Ok(space)
    }

    async fn require_visible_project(
        &self,
        project_id: &str,
    ) -> Result<TaskProjectRecord, UsecaseError> {
        let project_id = validate_project_id(project_id)?;
        let project = self
            .project_reader
            .get(&project_id)
            .await?
            .ok_or_else(|| UsecaseError::not_found("Project 不存在"))?;

        if project.archived_at.is_some() || project.deleted_at.is_some() {
            return Err(UsecaseError::not_found("Project 不存在"));
        }

        Ok(project)
    }

    async fn load_space_map(
        &self,
        tasks: &[TaskRecord],
    ) -> Result<HashMap<String, TaskSpaceRecord>, UsecaseError> {
        let space_ids = tasks
            .iter()
            .map(|item| item.space_id.clone())
            .collect::<Vec<_>>();
        let spaces = self.space_reader.list_by_ids(&space_ids).await?;

        Ok(spaces
            .into_iter()
            .map(|item| (item.id.clone(), item))
            .collect::<HashMap<_, _>>())
    }

    async fn load_project_map(
        &self,
        tasks: &[TaskRecord],
    ) -> Result<HashMap<String, TaskProjectRecord>, UsecaseError> {
        let project_ids = tasks
            .iter()
            .filter_map(|item| item.project_id.clone())
            .collect::<Vec<_>>();
        let projects = self.project_reader.list_by_ids(&project_ids).await?;

        Ok(projects
            .into_iter()
            .map(|item| (item.id.clone(), item))
            .collect::<HashMap<_, _>>())
    }
}

fn normalize_scope(input: &TaskScopeInput) -> Result<TaskScope, UsecaseError> {
    match input.kind {
        TaskScopeKind::All => Ok(TaskScope { space_id: None }),
        TaskScopeKind::Space => {
            let space_id = input
                .space_id
                .as_deref()
                .ok_or_else(|| UsecaseError::validation("type=space 时必须提供 spaceId"))?;
            Ok(TaskScope {
                space_id: Some(validate_space_id(space_id)?),
            })
        }
    }
}

fn normalize_list_placement(
    input: &ListTasksPlacementInput,
) -> Result<TaskPlacement, UsecaseError> {
    match input.kind {
        ListTasksPlacementKind::All => Ok(TaskPlacement::All),
        ListTasksPlacementKind::Inbox => Ok(TaskPlacement::Inbox),
        ListTasksPlacementKind::NoProject => Ok(TaskPlacement::NoProject),
        ListTasksPlacementKind::Project => {
            let project_id = input
                .project_id
                .as_deref()
                .ok_or_else(|| UsecaseError::validation("kind=project 时必须提供 projectId"))?;
            Ok(TaskPlacement::Project(validate_project_id(project_id)?))
        }
    }
}

fn normalize_create_placement(
    input: &CreateTaskPlacementInput,
) -> Result<TaskPlacement, UsecaseError> {
    match input.kind {
        CreateTaskPlacementKind::Inbox => Ok(TaskPlacement::Inbox),
        CreateTaskPlacementKind::NoProject => Ok(TaskPlacement::NoProject),
        CreateTaskPlacementKind::Project => {
            let project_id = input
                .project_id
                .as_deref()
                .ok_or_else(|| UsecaseError::validation("kind=project 时必须提供 projectId"))?;
            Ok(TaskPlacement::Project(validate_project_id(project_id)?))
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

fn deserialize_nullable_string_field<'de, D>(
    deserializer: D,
) -> Result<Option<Option<String>>, D::Error>
where
    D: Deserializer<'de>,
{
    Option::<String>::deserialize(deserializer).map(Some)
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

fn json_option_string(value: &Option<String>) -> Option<Value> {
    value.as_ref().map(|item| json!(item))
}

fn push_change(
    changes: &mut Vec<ActivityChangeInput>,
    field: &str,
    old_value: Option<Value>,
    new_value: Option<Value>,
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

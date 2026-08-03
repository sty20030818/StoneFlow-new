//! Task 用例编排：CRUD、列表与 Activity 记录。

#![allow(async_fn_in_trait)]

use std::collections::{HashMap, HashSet};

use serde::{Deserialize, Deserializer, Serialize};
use serde_json::{json, Map, Value};
use stoneflow_domain::{
    create_id, normalize_required_text, normalize_slug, now_utc, parse_optional_utc_rfc3339,
    parse_utc_rfc3339, validate_project_id, validate_space_id, validate_task_id,
    ActivityEntityKind, WorkPriority, WorkState, WorkStatus,
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
    task::{
        executor::{
            apply_view_preset, build_update_summary, parse_view_key,
            repository_lifecycle_for_preset, select_update_action, status_key,
        },
        types::{
            CreatePlacement, CreateTaskPersistenceRecord, TaskListDateFilter, TaskListQuery,
            TaskPlacementQuery, TaskProjectRecord, TaskRecord, TaskScope, TaskSpaceRecord,
            UpdateTaskPatch,
        },
    },
    ApplicationError,
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

/// 默认列表页大小（首屏 + 续拉窗口）。
pub const DEFAULT_TASK_LIST_PAGE_SIZE: u32 = 150;

/// 列表日期筛选输入（与 page filter 对齐）。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListTasksDateFilterInput {
    /// hasDate | noDate | range
    pub mode: String,
    #[serde(default)]
    pub from: Option<String>,
    #[serde(default)]
    pub to: Option<String>,
}

/// Task 列表查询输入。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListTasksInput {
    pub scope: TaskScopeInput,
    pub view_key: String,
    pub placement: ListTasksPlacementInput,
    /// 可选 status 白名单；省略或空 = 不限。
    #[serde(default)]
    pub statuses: Option<Vec<WorkStatus>>,
    /// 可选 priority 白名单；省略或空 = 不限。
    #[serde(default)]
    pub priorities: Option<Vec<i32>>,
    /// 可选日期筛选。
    #[serde(default)]
    pub date_filter: Option<ListTasksDateFilterInput>,
    /// 页大小；省略用默认。
    #[serde(default)]
    pub limit: Option<u32>,
    /// opaque keyset cursor（上一页最后一条的 cursor）。
    #[serde(default)]
    pub cursor: Option<String>,
}

/// 分页列表输出。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ListTasksPageDto {
    pub items: Vec<TaskListItemDto>,
    pub next_cursor: Option<String>,
    /// 当前过滤条件下的任务总数；首屏即可定死滚动条总高。
    pub total_count: u64,
}

/// Task 列表 placement 查询输入。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListTasksPlacementInput {
    #[serde(rename = "kind")]
    pub kind: ListTasksPlacementKind,
    pub project_id: Option<String>,
}

/// Task 列表 placement 类型（未分配 Project = Standalone）。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ListTasksPlacementKind {
    All,
    Project,
    Standalone,
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
    pub title: String,
    pub status: WorkStatus,
    pub status_changed_at: String,
    pub priority: i32,
    pub planned_at: Option<String>,
    pub due_at: Option<String>,
    pub remind_at: Option<String>,
    pub completed_at: Option<String>,
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
    pub status: WorkStatus,
    pub status_changed_at: String,
    pub priority: i32,
    pub planned_at: Option<String>,
    pub due_at: Option<String>,
    pub remind_at: Option<String>,
    pub position: i64,
    pub completed_at: Option<String>,
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
    pub status: Option<WorkStatus>,
    pub priority: Option<i32>,
    pub due_at: Option<String>,
    pub planned_at: Option<String>,
    pub remind_at: Option<String>,
}

/// 创建 Task 时的归属策略输入。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskPlacementInput {
    #[serde(rename = "kind")]
    pub kind: TaskWritePlacementKind,
    pub project_id: Option<String>,
}

/// create / update 共用的写入归属 kind（无 All）。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TaskWritePlacementKind {
    Project,
    Standalone,
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
    pub status: Option<WorkStatus>,
    pub priority: Option<i32>,
    pub placement: Option<UpdateTaskPlacementInput>,
    #[serde(default)]
    #[serde(deserialize_with = "deserialize_nullable_string_field")]
    pub due_at: Option<Option<String>>,
    #[serde(default)]
    #[serde(deserialize_with = "deserialize_nullable_string_field")]
    pub planned_at: Option<Option<String>>,
    #[serde(default)]
    #[serde(deserialize_with = "deserialize_nullable_string_field")]
    pub remind_at: Option<Option<String>>,
    pub position: Option<i64>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTaskPlacementInput {
    #[serde(rename = "kind")]
    pub kind: TaskWritePlacementKind,
    pub space_id: String,
    pub project_id: Option<String>,
}

/// 仅携带 Task ID 的输入。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskIdInput {
    pub task_id: String,
}

/// 批量操作只允许现有 UI 已暴露的明确业务意图，不接受泛化字段 patch。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum BulkTaskAction {
    Archive,
    Delete,
    SetPriority { priority: i32 },
    SetStatus { status: WorkStatus },
    SetDueAt { due_at: Option<String> },
    SetPlacement { placement: UpdateTaskPlacementInput },
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BulkUpdateTasksInput {
    pub task_ids: Vec<String>,
    pub action: BulkTaskAction,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BulkUpdateTasksDto {
    pub task_ids: Vec<String>,
    pub operation_id: String,
}

/// Task 持久化边界。
pub trait TaskPersistence: Send + Sync {
    type Connection: Send + Sync;

    async fn begin(&self) -> Result<Self::Connection, ApplicationError>;
    async fn commit(&self, connection: Self::Connection) -> Result<(), ApplicationError>;
    async fn get(&self, task_id: &str) -> Result<Option<TaskRecord>, ApplicationError>;
    async fn list(&self, query: TaskListQuery) -> Result<Vec<TaskRecord>, ApplicationError>;
    /// 与 list 相同过滤条件的任务总数（忽略 cursor/limit）。
    async fn count(&self, query: TaskListQuery) -> Result<u64, ApplicationError>;
    async fn next_position(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        project_id: Option<&str>,
    ) -> Result<i64, ApplicationError>;
    async fn create(
        &self,
        connection: &Self::Connection,
        record: CreateTaskPersistenceRecord,
    ) -> Result<TaskRecord, ApplicationError>;
    async fn update(
        &self,
        connection: &Self::Connection,
        task_id: &str,
        patch: UpdateTaskPatch,
        updated_at: &str,
    ) -> Result<Option<TaskRecord>, ApplicationError>;
    async fn enqueue(
        &self,
        connection: &Self::Connection,
        record: &OutboxEnqueueRecord,
    ) -> Result<(), ApplicationError>;
    async fn archive(
        &self,
        connection: &Self::Connection,
        task_id: &str,
        operation_id: &str,
        archived_at: &str,
    ) -> Result<Option<TaskRecord>, ApplicationError>;
    async fn soft_delete(
        &self,
        connection: &Self::Connection,
        task_id: &str,
        operation_id: &str,
        deleted_at: &str,
    ) -> Result<Option<TaskRecord>, ApplicationError>;
    async fn restore(
        &self,
        connection: &Self::Connection,
        task_id: &str,
        operation_id: &str,
        updated_at: &str,
    ) -> Result<Option<TaskRecord>, ApplicationError>;
    async fn permanently_delete(
        &self,
        connection: &Self::Connection,
        task_id: &str,
        deleted_at: &str,
    ) -> Result<Option<TaskRecord>, ApplicationError>;
}

/// Task 编排所需的 Space 读取边界。
pub trait TaskSpaceReader: Send + Sync {
    async fn get(&self, space_id: &str) -> Result<Option<TaskSpaceRecord>, ApplicationError>;
    async fn list_by_ids(
        &self,
        space_ids: &[String],
    ) -> Result<Vec<TaskSpaceRecord>, ApplicationError>;
}

/// Task 编排所需的 Project 读取边界。
pub trait TaskProjectReader: Send + Sync {
    async fn get(&self, project_id: &str) -> Result<Option<TaskProjectRecord>, ApplicationError>;
    async fn list_by_ids(
        &self,
        project_ids: &[String],
    ) -> Result<Vec<TaskProjectRecord>, ApplicationError>;
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

    /// 列出 Task 列表（keyset 分页）。
    pub async fn list_tasks(
        &self,
        input: ListTasksInput,
    ) -> Result<ListTasksPageDto, ApplicationError> {
        let scope = normalize_scope(&input.scope)?;
        let view_preset = parse_view_key(&input.view_key)?;
        let placement = normalize_list_placement(&input.placement)?;
        let statuses = input
            .statuses
            .as_ref()
            .filter(|items| !items.is_empty())
            .cloned();
        let limit = input
            .limit
            .unwrap_or(DEFAULT_TASK_LIST_PAGE_SIZE)
            .clamp(1, 500);
        let cursor = input
            .cursor
            .as_deref()
            .map(decode_task_list_cursor)
            .transpose()?;
        let priorities = input
            .priorities
            .as_ref()
            .filter(|items| !items.is_empty())
            .cloned();
        let date_filter = normalize_list_date_filter(input.date_filter.as_ref())?;
        let list_query = TaskListQuery {
            space_id: scope.space_id.clone(),
            placement: placement.clone(),
            lifecycle: repository_lifecycle_for_preset(view_preset),
            statuses: statuses.clone(),
            priorities: priorities.clone(),
            date_filter: date_filter.clone(),
            // 多取 1 条用于判断是否还有下一页；lifecycle 二次滤后可能不足，见下
            limit: Some(limit.saturating_add(1)),
            cursor,
        };
        // 总数与 list 同过滤、无分页；首屏即可锁定滚动条拇指高度
        let total_count = self
            .persistence
            .count(TaskListQuery {
                space_id: scope.space_id,
                placement,
                lifecycle: repository_lifecycle_for_preset(view_preset),
                statuses,
                priorities,
                date_filter,
                limit: None,
                cursor: None,
            })
            .await?;
        let mut tasks = self.persistence.list(list_query).await?;
        tasks = apply_view_preset(tasks, view_preset);

        let next_cursor = if tasks.len() as u32 > limit {
            let last = &tasks[limit as usize - 1];
            let cursor = encode_task_list_cursor(last.position, &last.id);
            tasks.truncate(limit as usize);
            Some(cursor)
        } else {
            None
        };

        let items = self.build_task_list(tasks).await?;
        Ok(ListTasksPageDto {
            items,
            next_cursor,
            total_count,
        })
    }

    /// 读取 Task 详情。
    pub async fn get_task_detail(
        &self,
        input: TaskIdInput,
    ) -> Result<TaskDetailDto, ApplicationError> {
        let task_id = validate_task_id(&input.task_id)?;
        let current = self
            .persistence
            .get(&task_id)
            .await?
            .ok_or_else(|| ApplicationError::not_found("Task 不存在"))?;

        self.build_task_detail(current).await
    }

    /// 创建 Task。
    pub async fn create_task(
        &self,
        input: CreateTaskInput,
    ) -> Result<TaskDetailDto, ApplicationError> {
        let title = normalize_required_text(&input.title, "Task title")?;
        let note = normalize_optional_long_text(input.note);
        let due_at = normalize_timestamp(input.due_at, "dueAt")?;
        let planned_at = normalize_timestamp(input.planned_at, "plannedAt")?;
        let remind_at = normalize_timestamp(input.remind_at, "remindAt")?;
        let status = input.status.unwrap_or(WorkStatus::Todo);
        let priority = validate_task_priority(input.priority)?;
        let placement = normalize_create_placement(&input.placement)?;
        let (space, project) = match placement {
            CreatePlacement::Project(project_id) => {
                let project = self.require_visible_project(&project_id).await?;
                let space = self.require_visible_space(&project.space_id).await?;
                (space, Some(project))
            }
            CreatePlacement::Standalone => {
                let raw_space_id = input.space_id.as_deref().ok_or_else(|| {
                    ApplicationError::validation("创建独立事项时必须提供 spaceId")
                })?;
                let space = self.require_visible_space(raw_space_id).await?;
                (space, None)
            }
        };

        let now_time = now_utc();
        let now = now_time.to_rfc3339();
        let operation = OperationContext::new("local");
        let transaction = self.persistence.begin().await?;
        let position = self
            .persistence
            .next_position(
                &transaction,
                &space.id,
                project.as_ref().map(|item| item.id.as_str()),
            )
            .await?;
        let completed_at = WorkState::new_todo(now_time)
            .with_priority(WorkPriority::from_i32(priority)?)
            .with_status(status, now_time)
            .completed_at
            .map(|value| value.to_rfc3339());
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
                    planned_at: planned_at.clone(),
                    due_at: due_at.clone(),
                    remind_at: remind_at.clone(),
                    position,
                    completed_at: completed_at.clone(),
                    created_at: now.clone(),
                    updated_at: now.clone(),
                },
            )
            .await?;

        self.activity
            .record_activity_in_txn(
                &transaction,
                RecordActivityInput {
                    operation_id: Some(operation.operation_id.clone()),
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
                        "placement": if created.project_id.is_some() {
                            "project"
                        } else {
                            "standalone"
                        },
                    })),
                    changes: Vec::new(),
                },
            )
            .await?;
        self.enqueue_task_operation(
            &transaction,
            &created,
            &operation,
            OutboxOpKind::Upsert,
            "create",
        )
        .await?;

        self.persistence.commit(transaction).await?;
        self.build_task_detail(created).await
    }

    /// 更新 Task 基础字段。
    pub async fn update_task(
        &self,
        input: UpdateTaskInput,
    ) -> Result<TaskDetailDto, ApplicationError> {
        let task_id = validate_task_id(&input.task_id)?;
        let current = self
            .persistence
            .get(&task_id)
            .await?
            .ok_or_else(|| ApplicationError::not_found("Task 不存在"))?;

        let mut patch = UpdateTaskPatch::default();
        let mut changes = Vec::new();
        let now = now_utc().to_rfc3339();

        let mut next_space_id = current.space_id.clone();
        let mut next_project_id = current.project_id.clone();

        if let Some(placement) = input.placement.as_ref() {
            let resolved = self.resolve_write_placement(placement).await?;
            next_space_id = resolved.0;
            next_project_id = resolved.1;
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
                push_change(&mut changes, "note", None, None);
                patch.note = Some(note);
            }
        }

        if let Some(priority) = input.priority {
            let priority = validate_task_priority(Some(priority))?;
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

        if let Some(position) = input.position {
            if position < 0 {
                return Err(ApplicationError::validation("Task position 不能小于 0"));
            }
            if position != current.position {
                patch.position = Some(position);
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

        if let Some(due_at) = input.due_at {
            let due_at = normalize_timestamp(due_at, "dueAt")?;
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

        if let Some(planned_at) = input.planned_at {
            let planned_at = normalize_timestamp(planned_at, "plannedAt")?;
            if planned_at != current.planned_at {
                push_change(
                    &mut changes,
                    "planned_at",
                    json_option_string(&current.planned_at),
                    json_option_string(&planned_at),
                );
                patch.planned_at = Some(planned_at);
            }
        }

        if let Some(remind_at) = input.remind_at {
            let remind_at = normalize_timestamp(remind_at, "remindAt")?;
            if remind_at != current.remind_at {
                push_change(
                    &mut changes,
                    "remind_at",
                    json_option_string(&current.remind_at),
                    json_option_string(&remind_at),
                );
                patch.remind_at = Some(remind_at);
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

                let current_state = WorkState {
                    status: current.status,
                    priority: WorkPriority::from_i32(current.priority)?,
                    planned_at: None,
                    due_at: None,
                    remind_at: None,
                    status_changed_at: parse_utc_rfc3339(
                        &current.status_changed_at,
                        "Task status_changed_at",
                    )?,
                    completed_at: parse_optional_utc_rfc3339(
                        current.completed_at.as_deref(),
                        "Task completed_at",
                    )?,
                };
                let next_completed_at = current_state
                    .with_status(status, now_utc())
                    .completed_at
                    .map(|value| value.to_rfc3339());
                if next_completed_at != current.completed_at {
                    push_change(
                        &mut changes,
                        "completed_at",
                        json_option_string(&current.completed_at),
                        json_option_string(&next_completed_at),
                    );
                    patch.completed_at = Some(next_completed_at);
                }
            }
        }

        let should_record_activity = !changes.is_empty();
        if !should_record_activity && patch.position.is_none() {
            return self.build_task_detail(current).await;
        }

        let action = select_update_action(&current, patch.status, &changes);
        let summary = Some(build_update_summary(action, &current.title));
        let operation = OperationContext::new("local");
        let transaction = self.persistence.begin().await?;
        if patch.position.is_none() && (patch.space_id.is_some() || patch.project_id.is_some()) {
            // 跨容器移动没有显式排序目标时，追加到目标容器末尾。
            patch.position = Some(
                self.persistence
                    .next_position(&transaction, &next_space_id, next_project_id.as_deref())
                    .await?,
            );
        }
        let updated = self
            .persistence
            .update(&transaction, &task_id, patch, &now)
            .await?
            .ok_or_else(|| ApplicationError::not_found("Task 不存在"))?;

        if should_record_activity {
            self.activity
                .record_activity_in_txn(
                    &transaction,
                    RecordActivityInput {
                        operation_id: Some(operation.operation_id.clone()),
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
        }
        self.enqueue_task_patch(
            &transaction,
            &updated,
            &operation,
            changed_outbox_fields(&task_fields(&current), &task_fields(&updated)),
        )
        .await?;

        self.persistence.commit(transaction).await?;
        self.build_task_detail(updated).await
    }

    pub async fn archive_task(
        &self,
        input: TaskIdInput,
    ) -> Result<TaskDetailDto, ApplicationError> {
        self.remove_task(input, true).await
    }

    /// 同类 Task 的批量操作：所有校验完成后才开始事务，任一写入失败即整体回滚。
    pub async fn bulk_update_tasks(
        &self,
        input: BulkUpdateTasksInput,
    ) -> Result<BulkUpdateTasksDto, ApplicationError> {
        if input.task_ids.is_empty() {
            return Err(ApplicationError::validation("批量操作至少需要一个 Task"));
        }
        let mut seen = HashSet::new();
        let mut tasks = Vec::with_capacity(input.task_ids.len());
        for raw_id in &input.task_ids {
            let task_id = validate_task_id(raw_id)?;
            if !seen.insert(task_id.clone()) {
                return Err(ApplicationError::validation("批量操作不能包含重复 Task"));
            }
            let task = self
                .persistence
                .get(&task_id)
                .await?
                .ok_or_else(|| ApplicationError::not_found("Task 不存在"))?;
            if task.archived_at.is_some() || task.deleted_at.is_some() {
                return Err(ApplicationError::conflict("批量操作包含不可编辑 Task"));
            }
            tasks.push(task);
        }

        let placement = match &input.action {
            BulkTaskAction::SetPlacement { placement } => {
                Some(self.resolve_write_placement(placement).await?)
            }
            _ => None,
        };
        let priority = match &input.action {
            BulkTaskAction::SetPriority { priority } => {
                Some(validate_task_priority(Some(*priority))?)
            }
            _ => None,
        };
        let due_at = match &input.action {
            BulkTaskAction::SetDueAt { due_at } => {
                Some(normalize_timestamp(due_at.clone(), "dueAt")?)
            }
            _ => None,
        };

        let operation = OperationContext::new("local");
        let transaction = self.persistence.begin().await?;
        for current in tasks {
            let now = operation.created_at.clone();
            let mut patch = UpdateTaskPatch::default();
            let mut changes = Vec::new();
            let action = match &input.action {
                BulkTaskAction::Archive => {
                    let updated = self
                        .persistence
                        .archive(&transaction, &current.id, &operation.operation_id, &now)
                        .await?
                        .ok_or_else(|| ApplicationError::conflict("Task 当前不可归档"))?;
                    self.record_bulk_activity(
                        &transaction,
                        &operation,
                        &updated,
                        ActivityAction::TaskArchived,
                        Vec::new(),
                    )
                    .await?;
                    self.enqueue_task_operation(
                        &transaction,
                        &updated,
                        &operation,
                        OutboxOpKind::Patch,
                        "archive",
                    )
                    .await?;
                    continue;
                }
                BulkTaskAction::Delete => {
                    let updated = self
                        .persistence
                        .soft_delete(&transaction, &current.id, &operation.operation_id, &now)
                        .await?
                        .ok_or_else(|| ApplicationError::conflict("Task 当前不可删除"))?;
                    self.record_bulk_activity(
                        &transaction,
                        &operation,
                        &updated,
                        ActivityAction::TaskDeleted,
                        Vec::new(),
                    )
                    .await?;
                    self.enqueue_task_operation(
                        &transaction,
                        &updated,
                        &operation,
                        OutboxOpKind::Patch,
                        "delete",
                    )
                    .await?;
                    continue;
                }
                BulkTaskAction::SetPriority { .. } => {
                    let priority = priority
                        .ok_or_else(|| ApplicationError::internal("批量优先级预校验丢失"))?;
                    if priority != current.priority {
                        patch.priority = Some(priority);
                        push_change(
                            &mut changes,
                            "priority",
                            Some(json!(current.priority)),
                            Some(json!(priority)),
                        );
                    }
                    ActivityAction::TaskPriorityChanged
                }
                BulkTaskAction::SetDueAt { .. } => {
                    let due_at = due_at
                        .clone()
                        .ok_or_else(|| ApplicationError::internal("批量时间预校验丢失"))?;
                    if due_at != current.due_at {
                        patch.due_at = Some(due_at.clone());
                        push_change(
                            &mut changes,
                            "due_at",
                            json_option_string(&current.due_at),
                            json_option_string(&due_at),
                        );
                    }
                    ActivityAction::TaskDueUpdated
                }
                BulkTaskAction::SetPlacement { .. } => {
                    let (space_id, project_id) = placement
                        .clone()
                        .ok_or_else(|| ApplicationError::internal("批量归属预校验丢失"))?;
                    if space_id != current.space_id {
                        patch.space_id = Some(space_id.clone());
                        push_change(
                            &mut changes,
                            "space_id",
                            Some(json!(current.space_id)),
                            Some(json!(space_id)),
                        );
                    }
                    if project_id != current.project_id {
                        patch.project_id = Some(project_id.clone());
                        push_change(
                            &mut changes,
                            "project_id",
                            json_option_string(&current.project_id),
                            json_option_string(&project_id),
                        );
                    }
                    ActivityAction::TaskMovedProject
                }
                BulkTaskAction::SetStatus { status } => {
                    if *status != current.status {
                        patch.status = Some(*status);
                        patch.status_changed_at = Some(now.clone());
                        push_change(
                            &mut changes,
                            "status",
                            Some(json!(status_key(current.status))),
                            Some(json!(status_key(*status))),
                        );
                        let next_completed_at = WorkState {
                            status: current.status,
                            priority: WorkPriority::from_i32(current.priority)?,
                            planned_at: None,
                            due_at: None,
                            remind_at: None,
                            status_changed_at: parse_utc_rfc3339(
                                &current.status_changed_at,
                                "Task status_changed_at",
                            )?,
                            completed_at: parse_optional_utc_rfc3339(
                                current.completed_at.as_deref(),
                                "Task completed_at",
                            )?,
                        }
                        .with_status(*status, now_utc())
                        .completed_at
                        .map(|value| value.to_rfc3339());
                        if next_completed_at != current.completed_at {
                            patch.completed_at = Some(next_completed_at.clone());
                            push_change(
                                &mut changes,
                                "completed_at",
                                json_option_string(&current.completed_at),
                                json_option_string(&next_completed_at),
                            );
                        }
                    }
                    select_update_action(&current, Some(*status), &changes)
                }
            };
            if changes.is_empty() {
                continue;
            }
            let updated = self
                .persistence
                .update(&transaction, &current.id, patch, &now)
                .await?
                .ok_or_else(|| ApplicationError::not_found("Task 不存在"))?;
            self.record_bulk_activity(&transaction, &operation, &updated, action, changes)
                .await?;
            self.enqueue_task_patch(
                &transaction,
                &updated,
                &operation,
                changed_outbox_fields(&task_fields(&current), &task_fields(&updated)),
            )
            .await?;
        }
        self.persistence.commit(transaction).await?;
        Ok(BulkUpdateTasksDto {
            task_ids: input.task_ids,
            operation_id: operation.operation_id,
        })
    }

    pub async fn delete_task(&self, input: TaskIdInput) -> Result<TaskDetailDto, ApplicationError> {
        self.remove_task(input, false).await
    }

    pub async fn restore_task(
        &self,
        input: TaskIdInput,
    ) -> Result<TaskDetailDto, ApplicationError> {
        let task_id = validate_task_id(&input.task_id)?;
        let current = self
            .persistence
            .get(&task_id)
            .await?
            .ok_or_else(|| ApplicationError::not_found("Task 不存在"))?;
        let operation_id = current
            .deleted_by_operation_id
            .as_deref()
            .or(current.archived_by_operation_id.as_deref())
            .ok_or_else(|| ApplicationError::conflict("Task 当前不可恢复"))?;
        let transaction = self.persistence.begin().await?;
        let operation = OperationContext::new("local");
        let restored = self
            .persistence
            .restore(&transaction, &task_id, operation_id, &operation.created_at)
            .await?
            .ok_or_else(|| ApplicationError::conflict("Task 当前不可恢复"))?;
        self.activity
            .record_activity_in_txn(
                &transaction,
                RecordActivityInput {
                    operation_id: Some(operation.operation_id.clone()),
                    entity_type: ActivityEntityKind::Task,
                    entity_id: restored.id.clone(),
                    action: ActivityAction::TaskRestored,
                    actor_type: None,
                    source: None,
                    summary: Some(format!("恢复任务「{}」", restored.title)),
                    metadata: None,
                    changes: Vec::new(),
                },
            )
            .await?;
        self.enqueue_task_operation(
            &transaction,
            &restored,
            &operation,
            OutboxOpKind::Restore,
            "restore",
        )
        .await?;
        self.persistence.commit(transaction).await?;
        self.build_task_detail(restored).await
    }

    pub async fn permanently_delete_task(
        &self,
        input: TaskIdInput,
    ) -> Result<(), ApplicationError> {
        let task_id = validate_task_id(&input.task_id)?;
        let current = self
            .persistence
            .get(&task_id)
            .await?
            .ok_or_else(|| ApplicationError::not_found("Task 不存在"))?;
        if current.deleted_at.is_none() {
            return Err(ApplicationError::conflict(
                "Task 必须先移入回收站才能永久删除",
            ));
        }
        let transaction = self.persistence.begin().await?;
        let operation = OperationContext::new("local");
        let deleted = self
            .persistence
            .permanently_delete(&transaction, &task_id, &operation.created_at)
            .await?
            .ok_or_else(|| ApplicationError::not_found("Task 不存在"))?;
        self.enqueue_task_operation(
            &transaction,
            &deleted,
            &operation,
            OutboxOpKind::Delete,
            "permanentlyDelete",
        )
        .await?;
        self.persistence.commit(transaction).await
    }

    /// 从持久化记录构建 Task 详情（供 lifecycle 委托后复用）。
    pub async fn build_task_detail_from_record(
        &self,
        task: TaskRecord,
    ) -> Result<TaskDetailDto, ApplicationError> {
        self.build_task_detail(task).await
    }

    async fn remove_task(
        &self,
        input: TaskIdInput,
        archive: bool,
    ) -> Result<TaskDetailDto, ApplicationError> {
        let task_id = validate_task_id(&input.task_id)?;
        let current = self
            .persistence
            .get(&task_id)
            .await?
            .ok_or_else(|| ApplicationError::not_found("Task 不存在"))?;
        if current.deleted_at.is_some() || (archive && current.archived_at.is_some()) {
            return Err(ApplicationError::conflict("Task 当前不可归档或删除"));
        }
        let transaction = self.persistence.begin().await?;
        let operation = OperationContext::new("local");
        let updated = if archive {
            self.persistence
                .archive(
                    &transaction,
                    &task_id,
                    &operation.operation_id,
                    &operation.created_at,
                )
                .await?
        } else {
            self.persistence
                .soft_delete(
                    &transaction,
                    &task_id,
                    &operation.operation_id,
                    &operation.created_at,
                )
                .await?
        }
        .ok_or_else(|| ApplicationError::conflict("Task 当前不可归档或删除"))?;
        let action = if archive {
            ActivityAction::TaskArchived
        } else {
            ActivityAction::TaskDeleted
        };
        self.activity
            .record_activity_in_txn(
                &transaction,
                RecordActivityInput {
                    operation_id: Some(operation.operation_id.clone()),
                    entity_type: ActivityEntityKind::Task,
                    entity_id: updated.id.clone(),
                    action,
                    actor_type: None,
                    source: None,
                    summary: Some(format!(
                        "{}任务「{}」",
                        if archive { "归档" } else { "删除" },
                        updated.title
                    )),
                    metadata: None,
                    changes: Vec::new(),
                },
            )
            .await?;
        self.enqueue_task_operation(
            &transaction,
            &updated,
            &operation,
            OutboxOpKind::Patch,
            if archive { "archive" } else { "delete" },
        )
        .await?;
        self.persistence.commit(transaction).await?;
        self.build_task_detail(updated).await
    }

    async fn build_task_list(
        &self,
        tasks: Vec<TaskRecord>,
    ) -> Result<Vec<TaskListItemDto>, ApplicationError> {
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
                    title: item.title,
                    status: item.status,
                    status_changed_at: item.status_changed_at,
                    priority: item.priority,
                    due_at: item.due_at,
                    planned_at: item.planned_at,
                    remind_at: item.remind_at,
                    completed_at: item.completed_at,
                    archived_at: item.archived_at,
                    created_at: item.created_at,
                    updated_at: item.updated_at,
                }
            })
            .collect())
    }

    async fn build_task_detail(&self, item: TaskRecord) -> Result<TaskDetailDto, ApplicationError> {
        let space = self
            .space_reader
            .get(&item.space_id)
            .await?
            .ok_or_else(|| ApplicationError::not_found("Task 所属 Space 不存在"))?;
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
            planned_at: item.planned_at,
            due_at: item.due_at,
            remind_at: item.remind_at,
            position: item.position,
            completed_at: item.completed_at,
            archived_at: item.archived_at,
            deleted_at: item.deleted_at,
            created_at: item.created_at,
            updated_at: item.updated_at,
        })
    }

    async fn require_visible_space(
        &self,
        space_id: &str,
    ) -> Result<TaskSpaceRecord, ApplicationError> {
        let space_id = validate_space_id(space_id)?;
        let space = self
            .space_reader
            .get(&space_id)
            .await?
            .ok_or_else(|| ApplicationError::not_found("Space 不存在"))?;

        if space.archived_at.is_some() || space.deleted_at.is_some() {
            return Err(ApplicationError::not_found("Space 不存在"));
        }

        Ok(space)
    }

    async fn require_visible_project(
        &self,
        project_id: &str,
    ) -> Result<TaskProjectRecord, ApplicationError> {
        let project_id = validate_project_id(project_id)?;
        let project = self
            .project_reader
            .get(&project_id)
            .await?
            .ok_or_else(|| ApplicationError::not_found("Project 不存在"))?;

        if project.archived_at.is_some() || project.deleted_at.is_some() {
            return Err(ApplicationError::not_found("Project 不存在"));
        }

        Ok(project)
    }

    async fn load_space_map(
        &self,
        tasks: &[TaskRecord],
    ) -> Result<HashMap<String, TaskSpaceRecord>, ApplicationError> {
        let space_ids = tasks
            .iter()
            .map(|item| item.space_id.clone())
            .collect::<HashSet<_>>()
            .into_iter()
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
    ) -> Result<HashMap<String, TaskProjectRecord>, ApplicationError> {
        let project_ids = tasks
            .iter()
            .filter_map(|item| item.project_id.clone())
            .collect::<HashSet<_>>()
            .into_iter()
            .collect::<Vec<_>>();
        let projects = self.project_reader.list_by_ids(&project_ids).await?;

        Ok(projects
            .into_iter()
            .map(|item| (item.id.clone(), item))
            .collect::<HashMap<_, _>>())
    }

    async fn enqueue_task_operation(
        &self,
        connection: &P::Connection,
        task: &TaskRecord,
        operation: &OperationContext,
        operation_type: OutboxOpKind,
        action: &str,
    ) -> Result<(), ApplicationError> {
        let payload = match action {
            "create" => OutboxPayload::Patch {
                fields: task_fields(task),
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
                    "未知 Task Outbox action: {other}"
                )))
            }
        };
        self.persistence
            .enqueue(
                connection,
                &OutboxEnqueueRecord {
                    id: create_id().to_string(),
                    operation_id: operation.operation_id.clone(),
                    entity_type: SyncEntityKind::Task,
                    entity_id: task.id.clone(),
                    generation: task.generation,
                    operation_type,
                    payload_json: payload.to_json()?,
                    created_at: operation.created_at.clone(),
                    available_at: operation.created_at.clone(),
                },
            )
            .await
    }

    async fn enqueue_task_patch(
        &self,
        connection: &P::Connection,
        task: &TaskRecord,
        operation: &OperationContext,
        fields: Map<String, Value>,
    ) -> Result<(), ApplicationError> {
        self.persistence
            .enqueue(
                connection,
                &OutboxEnqueueRecord {
                    id: create_id().to_string(),
                    operation_id: operation.operation_id.clone(),
                    entity_type: SyncEntityKind::Task,
                    entity_id: task.id.clone(),
                    generation: task.generation,
                    operation_type: OutboxOpKind::Patch,
                    payload_json: OutboxPayload::Patch { fields }.to_json()?,
                    created_at: operation.created_at.clone(),
                    available_at: operation.created_at.clone(),
                },
            )
            .await
    }

    async fn record_bulk_activity(
        &self,
        connection: &P::Connection,
        operation: &OperationContext,
        task: &TaskRecord,
        action: ActivityAction,
        changes: Vec<ActivityChangeInput>,
    ) -> Result<(), ApplicationError> {
        self.activity
            .record_activity_in_txn(
                connection,
                RecordActivityInput {
                    operation_id: Some(operation.operation_id.clone()),
                    entity_type: ActivityEntityKind::Task,
                    entity_id: task.id.clone(),
                    action,
                    actor_type: None,
                    source: None,
                    summary: Some(build_update_summary(action, &task.title)),
                    metadata: Some(json!({
                        "taskId": task.id,
                        "spaceId": task.space_id,
                        "projectId": task.project_id,
                    })),
                    changes,
                },
            )
            .await
    }

    /// update / bulk 共用：解析写入归属为 (space_id, project_id)。
    async fn resolve_write_placement(
        &self,
        placement: &UpdateTaskPlacementInput,
    ) -> Result<(String, Option<String>), ApplicationError> {
        match placement.kind {
            TaskWritePlacementKind::Project => {
                let project_id = placement.project_id.as_deref().ok_or_else(|| {
                    ApplicationError::validation("placement.kind=project 时必须提供 projectId")
                })?;
                let project = self.require_visible_project(project_id).await?;
                if project.space_id != placement.space_id {
                    return Err(ApplicationError::validation(
                        "placement.spaceId 与 project.spaceId 不一致",
                    ));
                }
                Ok((project.space_id, Some(project.id)))
            }
            TaskWritePlacementKind::Standalone => {
                let space = self.require_visible_space(&placement.space_id).await?;
                Ok((space.id, None))
            }
        }
    }
}

fn normalize_scope(input: &TaskScopeInput) -> Result<TaskScope, ApplicationError> {
    match input.kind {
        TaskScopeKind::All => Ok(TaskScope { space_id: None }),
        TaskScopeKind::Space => {
            let space_id = input
                .space_id
                .as_deref()
                .ok_or_else(|| ApplicationError::validation("type=space 时必须提供 spaceId"))?;
            Ok(TaskScope {
                space_id: Some(validate_space_id(space_id)?),
            })
        }
    }
}

fn normalize_list_placement(
    input: &ListTasksPlacementInput,
) -> Result<TaskPlacementQuery, ApplicationError> {
    match input.kind {
        ListTasksPlacementKind::All => Ok(TaskPlacementQuery::All),
        ListTasksPlacementKind::Standalone => Ok(TaskPlacementQuery::Standalone),
        ListTasksPlacementKind::Project => {
            let project_id = input
                .project_id
                .as_deref()
                .ok_or_else(|| ApplicationError::validation("kind=project 时必须提供 projectId"))?;
            Ok(TaskPlacementQuery::Project(validate_project_id(
                project_id,
            )?))
        }
    }
}

fn normalize_list_date_filter(
    input: Option<&ListTasksDateFilterInput>,
) -> Result<Option<TaskListDateFilter>, ApplicationError> {
    let Some(input) = input else {
        return Ok(None);
    };
    match input.mode.as_str() {
        "hasDate" => Ok(Some(TaskListDateFilter::HasDate)),
        "noDate" => Ok(Some(TaskListDateFilter::NoDate)),
        "range" => Ok(Some(TaskListDateFilter::Range {
            from: input.from.clone(),
            to: input.to.clone(),
        })),
        other => Err(ApplicationError::validation(format!(
            "未知 dateFilter.mode: {other}"
        ))),
    }
}

fn normalize_create_placement(
    input: &CreateTaskPlacementInput,
) -> Result<CreatePlacement, ApplicationError> {
    match input.kind {
        TaskWritePlacementKind::Standalone => Ok(CreatePlacement::Standalone),
        TaskWritePlacementKind::Project => {
            let project_id = input
                .project_id
                .as_deref()
                .ok_or_else(|| ApplicationError::validation("kind=project 时必须提供 projectId"))?;
            Ok(CreatePlacement::Project(validate_project_id(project_id)?))
        }
    }
}

/// 校验并归一化优先级：未提供时取 WorkPriority::None。
fn validate_task_priority(value: Option<i32>) -> Result<i32, ApplicationError> {
    let value = value.unwrap_or(0);
    Ok(WorkPriority::from_i32(value)?.as_i32())
}

fn deserialize_nullable_string_field<'de, D>(
    deserializer: D,
) -> Result<Option<Option<String>>, D::Error>
where
    D: Deserializer<'de>,
{
    Option::<String>::deserialize(deserializer).map(Some)
}

fn normalize_timestamp(
    value: Option<String>,
    field: &str,
) -> Result<Option<String>, ApplicationError> {
    value
        .map(|value| parse_utc_rfc3339(&value, field).map(|timestamp| timestamp.to_rfc3339()))
        .transpose()
        .map_err(Into::into)
}

fn normalize_optional_long_text(value: Option<String>) -> Option<String> {
    value.filter(|text| !text.trim().is_empty())
}

fn encode_task_list_cursor(position: i64, id: &str) -> String {
    format!("{position}\u{1f}{id}")
}

fn decode_task_list_cursor(raw: &str) -> Result<crate::task::TaskListCursor, ApplicationError> {
    let (position_raw, id) = raw.split_once('\u{1f}').ok_or_else(|| {
        ApplicationError::validation("列表 cursor 无效")
    })?;
    let position = position_raw
        .parse::<i64>()
        .map_err(|_| ApplicationError::validation("列表 cursor 无效"))?;
    if id.is_empty() {
        return Err(ApplicationError::validation("列表 cursor 无效"));
    }
    Ok(crate::task::TaskListCursor {
        position,
        id: id.to_owned(),
    })
}

fn normalize_optional_long_text_option(value: Option<String>) -> Option<String> {
    normalize_optional_long_text(value)
}

fn task_fields(task: &TaskRecord) -> Map<String, Value> {
    Map::from_iter([
        ("space_id".to_owned(), json!(task.space_id)),
        ("project_id".to_owned(), json!(task.project_id)),
        ("title".to_owned(), json!(task.title)),
        ("note".to_owned(), json!(task.note)),
        ("status".to_owned(), json!(task.status.as_str())),
        ("priority".to_owned(), json!(task.priority)),
        ("planned_at".to_owned(), json!(task.planned_at)),
        ("due_at".to_owned(), json!(task.due_at)),
        ("remind_at".to_owned(), json!(task.remind_at)),
        (
            "status_changed_at".to_owned(),
            json!(task.status_changed_at),
        ),
        ("completed_at".to_owned(), json!(task.completed_at)),
        ("position".to_owned(), json!(task.position)),
        ("created_at".to_owned(), json!(task.created_at)),
        ("updated_at".to_owned(), json!(task.updated_at)),
    ])
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

#[cfg(test)]
mod tests {
    use super::normalize_timestamp;

    #[test]
    fn task_timestamp_should_require_rfc3339() {
        assert!(normalize_timestamp(Some("2026-07-23".to_owned()), "dueAt").is_err());
    }
}

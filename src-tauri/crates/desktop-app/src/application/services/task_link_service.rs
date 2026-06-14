//! Task Link Service：承载阶段 5 URL Links 的校验、事务与 Activity 编排。

use sea_orm::TransactionTrait;
use serde::{Deserialize, Serialize};
use serde_json::json;
use stoneflow_schema::{common::ActivityEntityKind, task, task_link};
use tauri::Url;

use crate::{
    app::error::AppError,
    application::{
        activity::{ActivityAction, ActivityChangeInput, ActivityService, RecordActivityInput},
    },
    domain::{create_id, normalize_required_text, now_utc},
    infrastructure::repositories::{
        CreateTaskLinkRecord, TaskLinkRepository, TaskRepository, UpdateTaskLinkPatch,
    },
};

/// Task Link 返回载荷。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskLinkDto {
    pub id: String,
    pub task_id: String,
    pub title: String,
    pub url: String,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

/// 读取某个 Task 全部 Links 的输入。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListTaskLinksInput {
    pub task_id: String,
}

/// 创建 Task Link 的输入。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskLinkInput {
    pub task_id: String,
    pub title: String,
    pub url: String,
}

/// 更新 Task Link 的输入。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTaskLinkInput {
    pub link_id: String,
    pub title: Option<String>,
    pub url: Option<String>,
}

/// 删除 Task Link 的输入。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteTaskLinkInput {
    pub link_id: String,
}

#[derive(Debug, Clone)]
pub struct TaskLinkService {
    task_repository: TaskRepository,
    repository: TaskLinkRepository,
    activity_service: ActivityService,
}

impl TaskLinkService {
    pub fn new(
        task_repository: TaskRepository,
        repository: TaskLinkRepository,
        activity_service: ActivityService,
    ) -> Self {
        Self {
            task_repository,
            repository,
            activity_service,
        }
    }

    /// 读取某个 Task 下的全部 Links。
    pub async fn list_task_links(
        &self,
        input: ListTaskLinksInput,
    ) -> Result<Vec<TaskLinkDto>, AppError> {
        let task_id = normalize_task_id(&input.task_id)?;
        self.require_visible_task(&task_id).await?;
        let items = self.repository.list_by_task(&task_id).await?;
        Ok(items.into_iter().map(map_task_link_dto).collect())
    }

    /// 创建一条 URL Link。
    pub async fn create_task_link(
        &self,
        input: CreateTaskLinkInput,
    ) -> Result<TaskLinkDto, AppError> {
        let task_id = normalize_task_id(&input.task_id)?;
        let title = normalize_required_text(&input.title, "Link title")?;
        let url = normalize_link_url(&input.url)?;
        let task = self.require_visible_task(&task_id).await?;
        let now = now_utc().to_rfc3339();
        let transaction = self.repository.connection().begin().await?;
        let sort_order = self.repository.next_sort_order(&transaction, &task_id).await?;
        let created = self
            .repository
            .create(
                &transaction,
                CreateTaskLinkRecord {
                    id: create_id().to_string(),
                    task_id: task_id.clone(),
                    title: title.clone(),
                    url: url.clone(),
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
                    entity_type: ActivityEntityKind::Task,
                    entity_id: task.id.clone(),
                    action: ActivityAction::TaskLinkAdded,
                    actor_type: None,
                    source: None,
                    summary: Some(format!("为任务「{}」添加链接", task.title)),
                    metadata: Some(json!({
                        "taskId": task.id,
                        "linkId": created.id,
                        "title": created.title,
                        "url": created.url,
                    })),
                    changes: Vec::new(),
                },
            )
            .await?;

        transaction.commit().await?;
        Ok(map_task_link_dto(created))
    }

    /// 更新一条 URL Link。
    pub async fn update_task_link(
        &self,
        input: UpdateTaskLinkInput,
    ) -> Result<TaskLinkDto, AppError> {
        let link_id = normalize_link_id(&input.link_id)?;
        let current = self
            .repository
            .get(&link_id)
            .await?
            .ok_or_else(|| AppError::not_found("链接不存在"))?;
        let task = self.require_visible_task(&current.task_id).await?;
        let mut patch = UpdateTaskLinkPatch::default();
        let mut changes = Vec::new();

        if let Some(title) = input.title {
            let title = normalize_required_text(&title, "Link title")?;
            if title != current.title {
                patch.title = Some(title.clone());
                push_change(
                    &mut changes,
                    "title",
                    Some(json!(current.title)),
                    Some(json!(title)),
                );
            }
        }

        if let Some(url) = input.url {
            let url = normalize_link_url(&url)?;
            if url != current.url {
                patch.url = Some(url.clone());
                push_change(
                    &mut changes,
                    "url",
                    Some(json!(current.url)),
                    Some(json!(url)),
                );
            }
        }

        if changes.is_empty() {
            return Ok(map_task_link_dto(current));
        }

        let now = now_utc().to_rfc3339();
        let transaction = self.repository.connection().begin().await?;
        let updated = self
            .repository
            .update(&transaction, &link_id, patch, &now)
            .await?
            .ok_or_else(|| AppError::not_found("链接不存在"))?;

        self.activity_service
            .record_activity_in_txn(
                &transaction,
                RecordActivityInput {
                    entity_type: ActivityEntityKind::Task,
                    entity_id: task.id.clone(),
                    action: ActivityAction::TaskLinkUpdated,
                    actor_type: None,
                    source: None,
                    summary: Some(format!("更新任务「{}」的链接", task.title)),
                    metadata: Some(json!({
                        "taskId": task.id,
                        "linkId": updated.id,
                        "title": updated.title,
                        "url": updated.url,
                    })),
                    changes,
                },
            )
            .await?;

        transaction.commit().await?;
        Ok(map_task_link_dto(updated))
    }

    /// 删除一条 URL Link。
    pub async fn delete_task_link(
        &self,
        input: DeleteTaskLinkInput,
    ) -> Result<TaskLinkDto, AppError> {
        let link_id = normalize_link_id(&input.link_id)?;
        let current = self
            .repository
            .get(&link_id)
            .await?
            .ok_or_else(|| AppError::not_found("链接不存在"))?;
        let task = self.require_visible_task(&current.task_id).await?;

        let transaction = self.repository.connection().begin().await?;
        let deleted = self.repository.delete(&transaction, &link_id).await?;
        if !deleted {
            return Err(AppError::not_found("链接不存在"));
        }

        self.activity_service
            .record_activity_in_txn(
                &transaction,
                RecordActivityInput {
                    entity_type: ActivityEntityKind::Task,
                    entity_id: task.id.clone(),
                    action: ActivityAction::TaskLinkRemoved,
                    actor_type: None,
                    source: None,
                    summary: Some(format!("移除任务「{}」的链接", task.title)),
                    metadata: Some(json!({
                        "taskId": task.id,
                        "linkId": current.id,
                        "title": current.title,
                        "url": current.url,
                    })),
                    changes: Vec::new(),
                },
            )
            .await?;

        transaction.commit().await?;
        Ok(map_task_link_dto(current))
    }

    async fn require_visible_task(&self, task_id: &str) -> Result<task::Model, AppError> {
        let task = self
            .task_repository
            .get(task_id)
            .await?
            .ok_or_else(|| AppError::not_found("Task 不存在"))?;

        if task.deleted_at.is_some() {
            return Err(AppError::not_found("Task 不存在"));
        }

        Ok(task)
    }
}

fn map_task_link_dto(item: task_link::Model) -> TaskLinkDto {
    TaskLinkDto {
        id: item.id,
        task_id: item.task_id,
        title: item.title,
        url: item.url,
        sort_order: item.sort_order,
        created_at: item.created_at,
        updated_at: item.updated_at,
    }
}

fn normalize_task_id(value: &str) -> Result<String, AppError> {
    normalize_required_text(value, "Task id")
}

fn normalize_link_id(value: &str) -> Result<String, AppError> {
    normalize_required_text(value, "Link id")
}

fn normalize_link_url(value: &str) -> Result<String, AppError> {
    let normalized = normalize_required_text(value, "Link URL")?;
    let parsed =
        Url::parse(&normalized).map_err(|_| AppError::validation("Link URL 必须是合法 URL"))?;
    match parsed.scheme() {
        "http" | "https" => Ok(parsed.to_string()),
        _ => Err(AppError::validation("Link URL 仅支持 http 或 https")),
    }
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

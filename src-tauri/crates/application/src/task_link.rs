//! Task Link 用例：URL Links 的校验、事务与 Activity 编排。

#![allow(async_fn_in_trait)]

use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use stoneflow_domain::{
    create_id, now_utc, validate_http_https_url, validate_link_id, validate_task_id_for_link,
    ActivityEntityKind,
};

use crate::{
    activity::{
        ActivityAction, ActivityChangeInput, ActivityPersistence, ActivityService,
        RecordActivityInput,
    },
    operation::{
        changed_outbox_fields, OperationContext, OutboxEnqueueRecord, OutboxOpKind, OutboxPayload,
        SyncEntityKind,
    },
    ApplicationError,
};

/// Task Link 读模型。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TaskLinkRecord {
    pub id: String,
    pub task_id: String,
    pub title: String,
    pub url: String,
    pub position: i64,
    pub created_at: String,
    pub updated_at: String,
}

/// 创建 Task Link 的持久化输入。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateTaskLinkPersistenceRecord {
    pub id: String,
    pub task_id: String,
    pub title: String,
    pub url: String,
    pub position: i64,
    pub created_at: String,
    pub updated_at: String,
}

/// 更新 Task Link 基础字段 patch。
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct UpdateTaskLinkPatch {
    pub title: Option<String>,
    pub url: Option<String>,
}

/// Link 操作所需的 Task 读模型。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TaskLinkTaskRecord {
    pub id: String,
    pub title: String,
}

/// Task Link 持久化边界。
pub trait TaskLinkPersistence: Send + Sync {
    type Connection: Send + Sync;

    async fn begin(&self) -> Result<Self::Connection, ApplicationError>;
    async fn commit(&self, connection: Self::Connection) -> Result<(), ApplicationError>;
    async fn get(&self, link_id: &str) -> Result<Option<TaskLinkRecord>, ApplicationError>;
    async fn list_by_task(&self, task_id: &str) -> Result<Vec<TaskLinkRecord>, ApplicationError>;
    async fn next_position(
        &self,
        connection: &Self::Connection,
        task_id: &str,
    ) -> Result<i64, ApplicationError>;
    async fn create(
        &self,
        connection: &Self::Connection,
        record: CreateTaskLinkPersistenceRecord,
    ) -> Result<TaskLinkRecord, ApplicationError>;
    async fn update(
        &self,
        connection: &Self::Connection,
        link_id: &str,
        patch: UpdateTaskLinkPatch,
        updated_at: &str,
    ) -> Result<Option<TaskLinkRecord>, ApplicationError>;
    async fn delete(
        &self,
        connection: &Self::Connection,
        link_id: &str,
    ) -> Result<bool, ApplicationError>;
    async fn enqueue(
        &self,
        connection: &Self::Connection,
        record: &OutboxEnqueueRecord,
    ) -> Result<(), ApplicationError>;
}

/// Task Link 所需的 Task 读取边界。
pub trait TaskLinkTaskReader: Send + Sync {
    async fn get(&self, task_id: &str) -> Result<Option<TaskLinkTaskRecord>, ApplicationError>;
}

/// Task Link 返回载荷。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskLinkDto {
    pub id: String,
    pub task_id: String,
    pub title: String,
    pub url: String,
    pub position: i64,
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

/// Task Link 用例编排。
#[derive(Debug, Clone)]
pub struct TaskLinkService<P, A, T>
where
    P: TaskLinkPersistence,
    A: ActivityPersistence<Connection = P::Connection>,
    T: TaskLinkTaskReader,
{
    persistence: P,
    activity: ActivityService<A>,
    task_reader: T,
}

impl<P, A, T> TaskLinkService<P, A, T>
where
    P: TaskLinkPersistence,
    A: ActivityPersistence<Connection = P::Connection>,
    T: TaskLinkTaskReader,
{
    pub fn new(persistence: P, activity: ActivityService<A>, task_reader: T) -> Self {
        Self {
            persistence,
            activity,
            task_reader,
        }
    }

    /// 读取某个 Task 下的全部 Links。
    pub async fn list_task_links(
        &self,
        input: ListTaskLinksInput,
    ) -> Result<Vec<TaskLinkDto>, ApplicationError> {
        let task_id = validate_task_id_for_link(&input.task_id)?;
        self.require_visible_task(&task_id).await?;
        let items = self.persistence.list_by_task(&task_id).await?;
        Ok(items.into_iter().map(map_task_link_dto).collect())
    }

    /// 创建一条 URL Link。
    pub async fn create_task_link(
        &self,
        input: CreateTaskLinkInput,
    ) -> Result<TaskLinkDto, ApplicationError> {
        let task_id = validate_task_id_for_link(&input.task_id)?;
        let title = stoneflow_domain::normalize_required_text(&input.title, "Link title")?;
        let url = validate_http_https_url(&input.url)?;
        let task = self.require_visible_task(&task_id).await?;
        let now = now_utc().to_rfc3339();
        let operation = OperationContext::new("local");
        let transaction = self.persistence.begin().await?;
        let position = self
            .persistence
            .next_position(&transaction, &task_id)
            .await?;
        let created = self
            .persistence
            .create(
                &transaction,
                CreateTaskLinkPersistenceRecord {
                    id: create_id().to_string(),
                    task_id: task_id.clone(),
                    title: title.clone(),
                    url: url.clone(),
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
                    operation_id: Some(operation.operation_id.clone()),
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
        self.enqueue_link_operation(
            &transaction,
            &created,
            &operation,
            OutboxOpKind::Upsert,
            OutboxPayload::Patch {
                fields: task_link_fields(&created),
            },
        )
        .await?;

        self.persistence.commit(transaction).await?;
        Ok(map_task_link_dto(created))
    }

    /// 更新一条 URL Link。
    pub async fn update_task_link(
        &self,
        input: UpdateTaskLinkInput,
    ) -> Result<TaskLinkDto, ApplicationError> {
        let link_id = validate_link_id(&input.link_id)?;
        let current = self
            .persistence
            .get(&link_id)
            .await?
            .ok_or_else(|| ApplicationError::not_found("链接不存在"))?;
        let task = self.require_visible_task(&current.task_id).await?;
        let mut patch = UpdateTaskLinkPatch::default();
        let mut changes = Vec::new();

        if let Some(title) = input.title {
            let title = stoneflow_domain::normalize_required_text(&title, "Link title")?;
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
            let url = validate_http_https_url(&url)?;
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
        let operation = OperationContext::new("local");
        let transaction = self.persistence.begin().await?;
        let updated = self
            .persistence
            .update(&transaction, &link_id, patch, &now)
            .await?
            .ok_or_else(|| ApplicationError::not_found("链接不存在"))?;

        self.activity
            .record_activity_in_txn(
                &transaction,
                RecordActivityInput {
                    operation_id: Some(operation.operation_id.clone()),
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
        self.enqueue_link_operation(
            &transaction,
            &updated,
            &operation,
            OutboxOpKind::Patch,
            OutboxPayload::Patch {
                fields: changed_outbox_fields(
                    &task_link_fields(&current),
                    &task_link_fields(&updated),
                ),
            },
        )
        .await?;

        self.persistence.commit(transaction).await?;
        Ok(map_task_link_dto(updated))
    }

    /// 删除一条 URL Link。
    pub async fn delete_task_link(
        &self,
        input: DeleteTaskLinkInput,
    ) -> Result<TaskLinkDto, ApplicationError> {
        let link_id = validate_link_id(&input.link_id)?;
        let current = self
            .persistence
            .get(&link_id)
            .await?
            .ok_or_else(|| ApplicationError::not_found("链接不存在"))?;
        let task = self.require_visible_task(&current.task_id).await?;

        let operation = OperationContext::new("local");
        let transaction = self.persistence.begin().await?;
        let deleted = self.persistence.delete(&transaction, &link_id).await?;
        if !deleted {
            return Err(ApplicationError::not_found("链接不存在"));
        }

        self.activity
            .record_activity_in_txn(
                &transaction,
                RecordActivityInput {
                    operation_id: Some(operation.operation_id.clone()),
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
        self.enqueue_link_operation(
            &transaction,
            &current,
            &operation,
            OutboxOpKind::Delete,
            OutboxPayload::Tombstone {
                deleted_at: operation.created_at.clone(),
            },
        )
        .await?;

        self.persistence.commit(transaction).await?;
        Ok(map_task_link_dto(current))
    }

    async fn require_visible_task(
        &self,
        task_id: &str,
    ) -> Result<TaskLinkTaskRecord, ApplicationError> {
        self.task_reader
            .get(task_id)
            .await?
            .ok_or_else(|| ApplicationError::not_found("Task 不存在"))
    }

    async fn enqueue_link_operation(
        &self,
        connection: &P::Connection,
        link: &TaskLinkRecord,
        operation: &OperationContext,
        operation_type: OutboxOpKind,
        payload: OutboxPayload,
    ) -> Result<(), ApplicationError> {
        self.persistence
            .enqueue(
                connection,
                &OutboxEnqueueRecord {
                    id: create_id().to_string(),
                    operation_id: operation.operation_id.clone(),
                    entity_type: SyncEntityKind::TaskLink,
                    entity_id: link.id.clone(),
                    generation: 1,
                    operation_type,
                    payload_json: payload.to_json()?,
                    created_at: operation.created_at.clone(),
                    available_at: operation.created_at.clone(),
                },
            )
            .await
    }
}

fn task_link_fields(link: &TaskLinkRecord) -> Map<String, Value> {
    Map::from_iter([
        ("task_id".to_owned(), json!(link.task_id)),
        ("title".to_owned(), json!(link.title)),
        ("url".to_owned(), json!(link.url)),
        ("position".to_owned(), json!(link.position)),
        ("created_at".to_owned(), json!(link.created_at)),
        ("updated_at".to_owned(), json!(link.updated_at)),
    ])
}

fn map_task_link_dto(item: TaskLinkRecord) -> TaskLinkDto {
    TaskLinkDto {
        id: item.id,
        task_id: item.task_id,
        title: item.title,
        url: item.url,
        position: item.position,
        created_at: item.created_at,
        updated_at: item.updated_at,
    }
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
    use stoneflow_domain::DomainError;

    use super::*;

    #[test]
    fn validate_http_https_url_should_reject_custom_scheme() {
        let error = validate_http_https_url("obsidian://vault/spec").expect_err("should fail");
        assert!(matches!(error, DomainError::Validation(_)));
    }
}

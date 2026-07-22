//! Space 用例：Space CRUD 与默认切换编排（生命周期操作由 runtime adapter 委托 lifecycle）。

#![allow(async_fn_in_trait)]

use serde::{Deserialize, Serialize};
use serde_json::json;
use stoneflow_domain::{create_id, normalize_required_text, now_utc, validate_space_id};

use crate::{
    operation::{OperationContext, OutboxEnqueueRecord, OutboxOpKind, SyncEntityKind},
    ApplicationError,
};

/// Space 读模型。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SpaceRecord {
    pub id: String,
    pub name: String,
    pub icon_key: String,
    pub color_key: String,
    pub is_default: bool,
    pub position: i64,
    pub generation: i64,
    pub archived_at: Option<String>,
    pub deleted_at: Option<String>,
    pub archived_by_operation_id: Option<String>,
    pub deleted_by_operation_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// 创建 Space 的持久化输入。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateSpacePersistenceRecord {
    pub id: String,
    pub name: String,
    pub icon_key: String,
    pub color_key: String,
    pub is_default: bool,
    pub position: i64,
    pub created_at: String,
    pub updated_at: String,
}

/// 更新 Space 基础字段 patch。
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct UpdateSpacePatch {
    pub name: Option<String>,
    pub icon_key: Option<String>,
    pub color_key: Option<String>,
}

/// Space 生命周期操作的持久化结果。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SpaceCascadeRecord {
    pub space: SpaceRecord,
    pub affected_project_count: u64,
    pub affected_task_count: u64,
}

/// Space 持久化边界。
pub trait SpacePersistence: Send + Sync {
    type Connection: Send + Sync;

    async fn begin(&self) -> Result<Self::Connection, ApplicationError>;
    async fn commit(&self, connection: Self::Connection) -> Result<(), ApplicationError>;
    async fn list_visible(&self) -> Result<Vec<SpaceRecord>, ApplicationError>;
    async fn get_in_connection(
        &self,
        connection: &Self::Connection,
        space_id: &str,
    ) -> Result<Option<SpaceRecord>, ApplicationError>;
    async fn has_active(&self, connection: &Self::Connection) -> Result<bool, ApplicationError>;
    async fn get(&self, space_id: &str) -> Result<Option<SpaceRecord>, ApplicationError>;
    async fn next_position(&self, connection: &Self::Connection) -> Result<i64, ApplicationError>;
    async fn create(
        &self,
        connection: &Self::Connection,
        record: CreateSpacePersistenceRecord,
    ) -> Result<SpaceRecord, ApplicationError>;
    async fn update(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        patch: UpdateSpacePatch,
        updated_at: &str,
    ) -> Result<Option<SpaceRecord>, ApplicationError>;
    async fn clear_default(
        &self,
        connection: &Self::Connection,
        updated_at: &str,
    ) -> Result<(), ApplicationError>;
    async fn set_default(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        updated_at: &str,
    ) -> Result<Option<SpaceRecord>, ApplicationError>;
    async fn list_active_except(
        &self,
        connection: &Self::Connection,
        excluded_space_id: &str,
    ) -> Result<Vec<SpaceRecord>, ApplicationError>;
    async fn archive_cascade(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        operation_id: &str,
        archived_at: &str,
    ) -> Result<Option<SpaceCascadeRecord>, ApplicationError>;
    async fn soft_delete_cascade(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        operation_id: &str,
        deleted_at: &str,
    ) -> Result<Option<SpaceCascadeRecord>, ApplicationError>;
    async fn restore_archive_cascade(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        operation_id: &str,
        updated_at: &str,
    ) -> Result<Option<SpaceCascadeRecord>, ApplicationError>;
    async fn restore_deleted_cascade(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        operation_id: &str,
        updated_at: &str,
    ) -> Result<Option<SpaceCascadeRecord>, ApplicationError>;
    async fn permanently_delete_cascade(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        deleted_at: &str,
    ) -> Result<Option<SpaceCascadeRecord>, ApplicationError>;
    async fn enqueue(
        &self,
        connection: &Self::Connection,
        record: &OutboxEnqueueRecord,
    ) -> Result<(), ApplicationError>;
}

/// 提供给前端消费的 Space 数据。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpaceDto {
    pub id: String,
    pub name: String,
    pub icon_key: String,
    pub color_key: String,
    pub is_default: bool,
    pub position: i64,
    pub archived_at: Option<String>,
    pub deleted_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// 创建 Space 的输入。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSpaceInput {
    pub name: String,
    pub icon_key: String,
    pub color_key: String,
}

/// 更新 Space 的输入。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSpaceInput {
    pub space_id: String,
    pub name: Option<String>,
    pub icon_key: Option<String>,
    pub color_key: Option<String>,
}

/// 仅携带 Space ID 的命令输入。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SpaceIdInput {
    pub space_id: String,
}

/// 设置默认 Space 的输入。
pub type SetDefaultSpaceInput = SpaceIdInput;

/// Space 归档、回收站与恢复命令的稳定返回值。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SpaceLifecycleResult {
    pub space: SpaceDto,
    pub replacement_space_id: Option<String>,
    pub affected_project_count: u64,
    pub affected_task_count: u64,
}

struct SpaceOutboxOperation<'a> {
    space: &'a SpaceRecord,
    operation: &'a OperationContext,
    operation_type: OutboxOpKind,
    action: &'a str,
    replacement_space_id: Option<String>,
    affected_project_count: u64,
    affected_task_count: u64,
}

/// Space 用例编排（不含 archive / restore / delete）。
#[derive(Debug, Clone)]
pub struct SpaceService<P>
where
    P: SpacePersistence,
{
    persistence: P,
}

impl<P> SpaceService<P>
where
    P: SpacePersistence,
{
    pub fn new(persistence: P) -> Self {
        Self { persistence }
    }

    /// 列出所有可见 Space。
    pub async fn list_visible_spaces(&self) -> Result<Vec<SpaceDto>, ApplicationError> {
        let spaces = self.persistence.list_visible().await?;
        Ok(spaces.into_iter().map(map_space_record).collect())
    }

    /// 获取单个 Space，包括归档或回收站中的管理详情。
    pub async fn get_space(&self, input: SpaceIdInput) -> Result<SpaceDto, ApplicationError> {
        let space_id = validate_space_id(&input.space_id)?;
        Ok(map_space_record(
            self.require_existing_space(&space_id).await?,
        ))
    }

    /// 创建一个新的活跃 Space。
    pub async fn create_space(
        &self,
        input: CreateSpaceInput,
    ) -> Result<SpaceDto, ApplicationError> {
        let now = now_utc().to_rfc3339();
        let name = normalize_required_text(&input.name, "Space name")?;
        let icon_key = normalize_required_text(&input.icon_key, "Space iconKey")?;
        let color_key = normalize_required_text(&input.color_key, "Space colorKey")?;
        let transaction = self.persistence.begin().await?;
        let position = self.persistence.next_position(&transaction).await?;
        let is_default = !self.persistence.has_active(&transaction).await?;

        let space = self
            .persistence
            .create(
                &transaction,
                CreateSpacePersistenceRecord {
                    id: create_id().to_string(),
                    name: name.clone(),
                    icon_key: icon_key.clone(),
                    color_key: color_key.clone(),
                    is_default,
                    position,
                    created_at: now.clone(),
                    updated_at: now.clone(),
                },
            )
            .await?;

        let operation = OperationContext::new("local");
        self.enqueue_space_operation(
            &transaction,
            SpaceOutboxOperation {
                space: &space,
                operation: &operation,
                operation_type: OutboxOpKind::Upsert,
                action: "create",
                replacement_space_id: None,
                affected_project_count: 0,
                affected_task_count: 0,
            },
        )
        .await?;

        self.persistence.commit(transaction).await?;
        Ok(map_space_record(space))
    }

    /// 更新 Space 的基础展示字段。
    pub async fn update_space(
        &self,
        input: UpdateSpaceInput,
    ) -> Result<SpaceDto, ApplicationError> {
        let space_id = validate_space_id(&input.space_id)?;
        let current = self.require_existing_space(&space_id).await?;
        ensure_active(&current)?;

        let next_name = normalize_optional_required_text(input.name.as_deref(), "Space name")?;
        let next_icon_key =
            normalize_optional_required_text(input.icon_key.as_deref(), "Space iconKey")?;
        let next_color_key =
            normalize_optional_required_text(input.color_key.as_deref(), "Space colorKey")?;

        let mut patch = UpdateSpacePatch::default();
        let mut changed = false;

        if let Some(name) = next_name {
            if name != current.name {
                patch.name = Some(name.clone());
                changed = true;
            }
        }
        if let Some(icon_key) = next_icon_key {
            if icon_key != current.icon_key {
                patch.icon_key = Some(icon_key.clone());
                changed = true;
            }
        }
        if let Some(color_key) = next_color_key {
            if color_key != current.color_key {
                patch.color_key = Some(color_key.clone());
                changed = true;
            }
        }

        if !changed {
            return Ok(map_space_record(current));
        }

        let updated_at = now_utc().to_rfc3339();
        let transaction = self.persistence.begin().await?;
        let updated = self
            .persistence
            .update(&transaction, &space_id, patch, &updated_at)
            .await?
            .ok_or_else(|| ApplicationError::not_found("Space 不存在"))?;
        let operation = OperationContext::new("local");
        self.enqueue_space_operation(
            &transaction,
            SpaceOutboxOperation {
                space: &updated,
                operation: &operation,
                operation_type: OutboxOpKind::Patch,
                action: "update",
                replacement_space_id: None,
                affected_project_count: 0,
                affected_task_count: 0,
            },
        )
        .await?;

        self.persistence.commit(transaction).await?;
        Ok(map_space_record(updated))
    }

    /// 切换默认 Space。
    pub async fn set_default_space(
        &self,
        input: SetDefaultSpaceInput,
    ) -> Result<SpaceDto, ApplicationError> {
        let space_id = validate_space_id(&input.space_id)?;
        let current = self.require_existing_space(&space_id).await?;
        ensure_active(&current)?;

        if current.is_default {
            return Ok(map_space_record(current));
        }

        let updated_at = now_utc().to_rfc3339();
        let transaction = self.persistence.begin().await?;
        self.persistence
            .clear_default(&transaction, &updated_at)
            .await?;
        let updated = self
            .persistence
            .set_default(&transaction, &space_id, &updated_at)
            .await?
            .ok_or_else(|| ApplicationError::not_found("Space 不存在"))?;
        let operation = OperationContext::new("local");
        self.enqueue_space_operation(
            &transaction,
            SpaceOutboxOperation {
                space: &updated,
                operation: &operation,
                operation_type: OutboxOpKind::Patch,
                action: "set_default",
                replacement_space_id: None,
                affected_project_count: 0,
                affected_task_count: 0,
            },
        )
        .await?;

        self.persistence.commit(transaction).await?;
        Ok(map_space_record(updated))
    }

    async fn require_existing_space(
        &self,
        space_id: &str,
    ) -> Result<SpaceRecord, ApplicationError> {
        self.persistence
            .get(space_id)
            .await?
            .ok_or_else(|| ApplicationError::not_found("Space 不存在"))
    }

    /// 归档 Space，并在需要时自动切换默认 Space。
    pub async fn archive_space(
        &self,
        input: SpaceIdInput,
    ) -> Result<SpaceLifecycleResult, ApplicationError> {
        self.remove_space(input.space_id, true).await
    }

    /// 软删 Space 到回收站，并在需要时自动切换默认 Space。
    pub async fn delete_space(
        &self,
        input: SpaceIdInput,
    ) -> Result<SpaceLifecycleResult, ApplicationError> {
        self.remove_space(input.space_id, false).await
    }

    /// 只恢复本次管理操作级联影响的对象。
    pub async fn restore_space(
        &self,
        input: SpaceIdInput,
    ) -> Result<SpaceLifecycleResult, ApplicationError> {
        let space_id = validate_space_id(&input.space_id)?;
        let transaction = self.persistence.begin().await?;
        let current = self
            .persistence
            .get_in_connection(&transaction, &space_id)
            .await?
            .ok_or_else(|| ApplicationError::not_found("Space 不存在"))?;
        let updated_at = now_utc().to_rfc3339();
        let operation = OperationContext::new("local");
        let cascade = if let Some(operation_id) = current.deleted_by_operation_id.as_deref() {
            self.persistence
                .restore_deleted_cascade(&transaction, &space_id, operation_id, &updated_at)
                .await?
        } else if let Some(operation_id) = current.archived_by_operation_id.as_deref() {
            self.persistence
                .restore_archive_cascade(&transaction, &space_id, operation_id, &updated_at)
                .await?
        } else {
            return Err(ApplicationError::conflict("Space 当前不可恢复"));
        }
        .ok_or_else(|| ApplicationError::conflict("Space 已被后续操作改变，无法恢复"))?;

        self.enqueue_space_operation(
            &transaction,
            SpaceOutboxOperation {
                space: &cascade.space,
                operation: &operation,
                operation_type: OutboxOpKind::Restore,
                action: "restore",
                replacement_space_id: None,
                affected_project_count: cascade.affected_project_count,
                affected_task_count: cascade.affected_task_count,
            },
        )
        .await?;
        self.persistence.commit(transaction).await?;
        Ok(map_lifecycle_result(cascade, None))
    }

    /// 从回收站永久删除 Space，并写入最小 tombstone。
    pub async fn permanently_delete_space(
        &self,
        input: SpaceIdInput,
    ) -> Result<SpaceLifecycleResult, ApplicationError> {
        let space_id = validate_space_id(&input.space_id)?;
        let transaction = self.persistence.begin().await?;
        let current = self
            .persistence
            .get_in_connection(&transaction, &space_id)
            .await?
            .ok_or_else(|| ApplicationError::not_found("Space 不存在"))?;
        if current.deleted_at.is_none() {
            return Err(ApplicationError::conflict("仅回收站中的 Space 可永久删除"));
        }

        let operation = OperationContext::new("local");
        let cascade = self
            .persistence
            .permanently_delete_cascade(&transaction, &space_id, &operation.created_at)
            .await?
            .ok_or_else(|| ApplicationError::not_found("Space 不存在"))?;
        self.enqueue_space_operation(
            &transaction,
            SpaceOutboxOperation {
                space: &cascade.space,
                operation: &operation,
                operation_type: OutboxOpKind::Delete,
                action: "permanently_delete",
                replacement_space_id: None,
                affected_project_count: cascade.affected_project_count,
                affected_task_count: cascade.affected_task_count,
            },
        )
        .await?;
        self.persistence.commit(transaction).await?;
        Ok(map_lifecycle_result(cascade, None))
    }

    async fn remove_space(
        &self,
        raw_space_id: String,
        archive: bool,
    ) -> Result<SpaceLifecycleResult, ApplicationError> {
        let space_id = validate_space_id(&raw_space_id)?;
        let transaction = self.persistence.begin().await?;
        let current = self
            .persistence
            .get_in_connection(&transaction, &space_id)
            .await?
            .ok_or_else(|| ApplicationError::not_found("Space 不存在"))?;
        ensure_active(&current)?;

        let replacement = if current.is_default {
            self.persistence
                .list_active_except(&transaction, &space_id)
                .await?
                .into_iter()
                .next()
                .ok_or_else(|| ApplicationError::conflict("最后一个活跃 Space 不可归档或删除"))?
        } else {
            current.clone()
        };
        let replacement_id = current.is_default.then(|| replacement.id.clone());
        let updated_at = now_utc().to_rfc3339();
        if current.is_default {
            self.persistence
                .clear_default(&transaction, &updated_at)
                .await?;
            self.persistence
                .set_default(&transaction, &replacement.id, &updated_at)
                .await?
                .ok_or_else(|| ApplicationError::not_found("替代默认 Space 不存在"))?;
        }

        let operation = OperationContext::new("local");
        let cascade = if archive {
            self.persistence
                .archive_cascade(
                    &transaction,
                    &space_id,
                    &operation.operation_id,
                    &updated_at,
                )
                .await?
        } else {
            self.persistence
                .soft_delete_cascade(
                    &transaction,
                    &space_id,
                    &operation.operation_id,
                    &updated_at,
                )
                .await?
        }
        .ok_or_else(|| ApplicationError::conflict("Space 当前不可归档或删除"))?;

        self.enqueue_space_operation(
            &transaction,
            SpaceOutboxOperation {
                space: &cascade.space,
                operation: &operation,
                operation_type: if archive {
                    OutboxOpKind::Patch
                } else {
                    OutboxOpKind::Delete
                },
                action: if archive { "archive" } else { "delete" },
                replacement_space_id: replacement_id.clone(),
                affected_project_count: cascade.affected_project_count,
                affected_task_count: cascade.affected_task_count,
            },
        )
        .await?;
        self.persistence.commit(transaction).await?;
        Ok(map_lifecycle_result(cascade, replacement_id))
    }

    async fn enqueue_space_operation(
        &self,
        connection: &P::Connection,
        entry: SpaceOutboxOperation<'_>,
    ) -> Result<(), ApplicationError> {
        let payload = json!({
            "version": 1,
            "operationId": entry.operation.operation_id,
            "action": entry.action,
            "space": map_space_record(entry.space.clone()),
            "replacementSpaceId": entry.replacement_space_id,
            "affectedProjectCount": entry.affected_project_count,
            "affectedTaskCount": entry.affected_task_count,
        });
        self.persistence
            .enqueue(
                connection,
                &OutboxEnqueueRecord {
                    id: create_id().to_string(),
                    operation_id: entry.operation.operation_id.clone(),
                    entity_type: SyncEntityKind::Space,
                    entity_id: entry.space.id.clone(),
                    generation: entry.space.generation,
                    operation_type: entry.operation_type,
                    payload_json: serde_json::to_string(&payload)
                        .map_err(|error| ApplicationError::internal(error.to_string()))?,
                    created_at: entry.operation.created_at.clone(),
                    available_at: entry.operation.created_at.clone(),
                },
            )
            .await
    }
}

fn map_space_record(record: SpaceRecord) -> SpaceDto {
    SpaceDto {
        id: record.id,
        name: record.name,
        icon_key: record.icon_key,
        color_key: record.color_key,
        is_default: record.is_default,
        position: record.position,
        archived_at: record.archived_at,
        deleted_at: record.deleted_at,
        created_at: record.created_at,
        updated_at: record.updated_at,
    }
}

impl From<SpaceRecord> for SpaceDto {
    fn from(record: SpaceRecord) -> Self {
        map_space_record(record)
    }
}

fn map_lifecycle_result(
    record: SpaceCascadeRecord,
    replacement_space_id: Option<String>,
) -> SpaceLifecycleResult {
    SpaceLifecycleResult {
        space: map_space_record(record.space),
        replacement_space_id,
        affected_project_count: record.affected_project_count,
        affected_task_count: record.affected_task_count,
    }
}

fn ensure_active(space: &SpaceRecord) -> Result<(), ApplicationError> {
    if space.deleted_at.is_some() {
        return Err(ApplicationError::conflict("回收站中的 Space 不可编辑"));
    }
    if space.archived_at.is_some() {
        return Err(ApplicationError::conflict("已归档的 Space 不可编辑"));
    }
    Ok(())
}

fn normalize_optional_required_text(
    value: Option<&str>,
    field: &str,
) -> Result<Option<String>, ApplicationError> {
    Ok(value
        .map(|value| normalize_required_text(value, field))
        .transpose()?)
}

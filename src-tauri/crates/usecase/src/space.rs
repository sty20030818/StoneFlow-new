//! Space 用例：Space CRUD 与默认切换编排（生命周期操作由 runtime adapter 委托 lifecycle）。

#![allow(async_fn_in_trait)]

use serde::{Deserialize, Serialize};
use serde_json::json;
use stoneflow_domain::{
    create_id, ensure_space_mutable, normalize_required_text, now_utc, validate_space_id,
    ActivityEntityKind,
};

use crate::{
    activity::{
        ActivityAction, ActivityChangeInput, ActivityPersistence, ActivityService,
        RecordActivityInput,
    },
    UsecaseError,
};

/// Space 读模型。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SpaceRecord {
    pub id: String,
    pub name: String,
    pub icon_key: String,
    pub color_key: String,
    pub is_default: bool,
    pub sort_order: i32,
    pub archived_at: Option<String>,
    pub deleted_at: Option<String>,
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
    pub sort_order: i32,
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

/// Space 持久化边界。
pub trait SpacePersistence: Send + Sync {
    type Connection: Send + Sync;

    async fn begin(&self) -> Result<Self::Connection, UsecaseError>;
    async fn commit(&self, connection: Self::Connection) -> Result<(), UsecaseError>;
    async fn list_visible(&self) -> Result<Vec<SpaceRecord>, UsecaseError>;
    async fn get(&self, space_id: &str) -> Result<Option<SpaceRecord>, UsecaseError>;
    async fn next_sort_order(
        &self,
        connection: &Self::Connection,
    ) -> Result<i32, UsecaseError>;
    async fn create(
        &self,
        connection: &Self::Connection,
        record: CreateSpacePersistenceRecord,
    ) -> Result<SpaceRecord, UsecaseError>;
    async fn update(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        patch: UpdateSpacePatch,
        updated_at: &str,
    ) -> Result<Option<SpaceRecord>, UsecaseError>;
    async fn clear_default(
        &self,
        connection: &Self::Connection,
        updated_at: &str,
    ) -> Result<(), UsecaseError>;
    async fn set_default(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        updated_at: &str,
    ) -> Result<Option<SpaceRecord>, UsecaseError>;
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
    pub sort_order: i32,
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

/// Space 用例编排（不含 archive / restore / delete）。
#[derive(Debug, Clone)]
pub struct SpaceService<P, A>
where
    P: SpacePersistence,
    A: ActivityPersistence<Connection = P::Connection>,
{
    persistence: P,
    activity: ActivityService<A>,
}

impl<P, A> SpaceService<P, A>
where
    P: SpacePersistence,
    A: ActivityPersistence<Connection = P::Connection>,
{
    pub fn new(persistence: P, activity: ActivityService<A>) -> Self {
        Self {
            persistence,
            activity,
        }
    }

    /// 列出所有可见 Space。
    pub async fn list_visible_spaces(&self) -> Result<Vec<SpaceDto>, UsecaseError> {
        let spaces = self.persistence.list_visible().await?;
        Ok(spaces.into_iter().map(map_space_record).collect())
    }

    /// 创建一个新的活跃 Space。
    pub async fn create_space(&self, input: CreateSpaceInput) -> Result<SpaceDto, UsecaseError> {
        let now = now_utc().to_rfc3339();
        let name = normalize_required_text(&input.name, "Space name")?;
        let icon_key = normalize_required_text(&input.icon_key, "Space iconKey")?;
        let color_key = normalize_required_text(&input.color_key, "Space colorKey")?;
        let transaction = self.persistence.begin().await?;
        let sort_order = self.persistence.next_sort_order(&transaction).await?;

        let space = self
            .persistence
            .create(
                &transaction,
                CreateSpacePersistenceRecord {
                    id: create_id().to_string(),
                    name: name.clone(),
                    icon_key: icon_key.clone(),
                    color_key: color_key.clone(),
                    is_default: false,
                    sort_order,
                    created_at: now.clone(),
                    updated_at: now.clone(),
                },
            )
            .await?;

        self.activity
            .record_activity_in_txn(
                &transaction,
                RecordActivityInput {
                    entity_type: ActivityEntityKind::Space,
                    entity_id: space.id.clone(),
                    action: ActivityAction::SpaceCreated,
                    actor_type: None,
                    source: None,
                    summary: Some(format!("创建 Space「{}」", space.name)),
                    metadata: Some(json!({ "spaceId": space.id })),
                    changes: vec![
                        ActivityChangeInput {
                            field: "name".to_owned(),
                            old_value: None,
                            new_value: Some(json!(name)),
                        },
                        ActivityChangeInput {
                            field: "iconKey".to_owned(),
                            old_value: None,
                            new_value: Some(json!(icon_key)),
                        },
                        ActivityChangeInput {
                            field: "colorKey".to_owned(),
                            old_value: None,
                            new_value: Some(json!(color_key)),
                        },
                    ],
                },
            )
            .await?;

        self.persistence.commit(transaction).await?;
        Ok(map_space_record(space))
    }

    /// 更新 Space 的基础展示字段。
    pub async fn update_space(&self, input: UpdateSpaceInput) -> Result<SpaceDto, UsecaseError> {
        let space_id = validate_space_id(&input.space_id)?;
        let current = self.require_existing_space(&space_id).await?;
        ensure_space_mutable(current.deleted_at.as_deref())?;

        let next_name = normalize_optional_required_text(input.name.as_deref(), "Space name")?;
        let next_icon_key =
            normalize_optional_required_text(input.icon_key.as_deref(), "Space iconKey")?;
        let next_color_key =
            normalize_optional_required_text(input.color_key.as_deref(), "Space colorKey")?;

        let mut patch = UpdateSpacePatch::default();
        let mut activity_records = Vec::new();

        if let Some(name) = next_name {
            if name != current.name {
                patch.name = Some(name.clone());
                activity_records.push((
                    ActivityAction::SpaceNameUpdated,
                    "name".to_owned(),
                    json!(current.name.clone()),
                    json!(name),
                ));
            }
        }
        if let Some(icon_key) = next_icon_key {
            if icon_key != current.icon_key {
                patch.icon_key = Some(icon_key.clone());
                activity_records.push((
                    ActivityAction::SpaceIconUpdated,
                    "iconKey".to_owned(),
                    json!(current.icon_key.clone()),
                    json!(icon_key),
                ));
            }
        }
        if let Some(color_key) = next_color_key {
            if color_key != current.color_key {
                patch.color_key = Some(color_key.clone());
                activity_records.push((
                    ActivityAction::SpaceColorUpdated,
                    "colorKey".to_owned(),
                    json!(current.color_key.clone()),
                    json!(color_key),
                ));
            }
        }

        if activity_records.is_empty() {
            return Ok(map_space_record(current));
        }

        let updated_at = now_utc().to_rfc3339();
        let transaction = self.persistence.begin().await?;
        let updated = self
            .persistence
            .update(&transaction, &space_id, patch, &updated_at)
            .await?
            .ok_or_else(|| UsecaseError::not_found("Space 不存在"))?;

        for (action, field, old_value, new_value) in activity_records {
            self.activity
                .record_activity_in_txn(
                    &transaction,
                    RecordActivityInput {
                        entity_type: ActivityEntityKind::Space,
                        entity_id: updated.id.clone(),
                        action,
                        actor_type: None,
                        source: None,
                        summary: Some(format!("更新 Space「{}」", updated.name)),
                        metadata: Some(json!({ "spaceId": updated.id })),
                        changes: vec![ActivityChangeInput {
                            field,
                            old_value: Some(old_value),
                            new_value: Some(new_value),
                        }],
                    },
                )
                .await?;
        }

        self.persistence.commit(transaction).await?;
        Ok(map_space_record(updated))
    }

    /// 切换默认 Space。
    pub async fn set_default_space(
        &self,
        input: SetDefaultSpaceInput,
    ) -> Result<SpaceDto, UsecaseError> {
        let space_id = validate_space_id(&input.space_id)?;
        let current = self.require_existing_space(&space_id).await?;
        ensure_space_mutable(current.deleted_at.as_deref())?;

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
            .ok_or_else(|| UsecaseError::not_found("Space 不存在"))?;

        self.activity
            .record_activity_in_txn(
                &transaction,
                RecordActivityInput {
                    entity_type: ActivityEntityKind::Space,
                    entity_id: updated.id.clone(),
                    action: ActivityAction::SpaceDefaultChanged,
                    actor_type: None,
                    source: None,
                    summary: Some(format!("设置默认 Space 为「{}」", updated.name)),
                    metadata: Some(json!({ "spaceId": updated.id })),
                    changes: vec![ActivityChangeInput {
                        field: "isDefault".to_owned(),
                        old_value: Some(json!(false)),
                        new_value: Some(json!(true)),
                    }],
                },
            )
            .await?;

        self.persistence.commit(transaction).await?;
        Ok(map_space_record(updated))
    }

    async fn require_existing_space(&self, space_id: &str) -> Result<SpaceRecord, UsecaseError> {
        self.persistence
            .get(space_id)
            .await?
            .ok_or_else(|| UsecaseError::not_found("Space 不存在"))
    }
}

fn map_space_record(record: SpaceRecord) -> SpaceDto {
    SpaceDto {
        id: record.id,
        name: record.name,
        icon_key: record.icon_key,
        color_key: record.color_key,
        is_default: record.is_default,
        sort_order: record.sort_order,
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

fn normalize_optional_required_text(
    value: Option<&str>,
    field: &str,
) -> Result<Option<String>, UsecaseError> {
    Ok(value
        .map(|value| normalize_required_text(value, field))
        .transpose()?)
}

#[cfg(test)]
mod tests {
    use stoneflow_domain::DomainError;

    use super::*;

    #[test]
    fn ensure_space_mutable_should_reject_deleted_space() {
        let error =
            ensure_space_mutable(Some("2026-01-01T00:00:00Z")).expect_err("deleted should fail");
        assert!(matches!(error, DomainError::Validation(_)));
    }
}

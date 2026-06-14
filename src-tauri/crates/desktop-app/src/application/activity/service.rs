//! Activity Service：负责输入校验、事务边界与仓储编排。

use sea_orm::{DatabaseTransaction, TransactionTrait};
use serde_json::Value;
use stoneflow_schema::common::{ActivityActorKind, ActivitySourceKind};

use crate::app::error::AppError;
use crate::domain::{create_id, normalize_required_text, now_utc};
use crate::infrastructure::repositories::{
    ActivityChangeRecord, ActivityEventRecord, ActivityQuery, ActivityRepository,
};

use super::{ActivityTimelineEntry, GetEntityActivitiesInput, RecordActivityInput};

#[derive(Debug, Clone)]
pub struct ActivityService {
    repository: ActivityRepository,
}

impl ActivityService {
    pub fn new(repository: ActivityRepository) -> Self {
        Self { repository }
    }

    /// 以独立事务记录一条 Activity。
    pub async fn record_activity(&self, input: RecordActivityInput) -> Result<(), AppError> {
        let transaction = self.repository.connection().begin().await?;
        self.record_activity_in_txn(&transaction, input).await?;
        transaction.commit().await?;
        Ok(())
    }

    /// 在外部事务中记录 Activity，供后续业务服务复用。
    pub async fn record_activity_in_txn(
        &self,
        transaction: &DatabaseTransaction,
        input: RecordActivityInput,
    ) -> Result<(), AppError> {
        let event_id = create_id().to_string();
        let created_at = now_utc().to_rfc3339();
        let entity_id = normalize_required_text(&input.entity_id, "Activity entity_id")?;
        let summary = normalize_optional_text(input.summary);
        let metadata = normalize_optional_value(input.metadata);

        let changes = input
            .changes
            .into_iter()
            .map(|change| {
                Ok(ActivityChangeRecord {
                    id: create_id().to_string(),
                    event_id: event_id.clone(),
                    field: normalize_required_text(&change.field, "Activity field")?,
                    old_value: normalize_optional_value(change.old_value),
                    new_value: normalize_optional_value(change.new_value),
                    created_at: created_at.clone(),
                })
            })
            .collect::<Result<Vec<_>, AppError>>()?;

        let event = ActivityEventRecord {
            id: event_id,
            entity_type: input.entity_type,
            entity_id,
            action: input.action.to_string(),
            actor_type: input.actor_type.unwrap_or(ActivityActorKind::User),
            source: input.source.unwrap_or(ActivitySourceKind::App),
            summary,
            metadata,
            created_at,
        };

        self.repository
            .insert_event_with_changes(transaction, &event, &changes)
            .await
    }

    /// 在外部事务中批量记录多条 Activity，供归档等批量操作使用。
    pub async fn record_activities_in_txn(
        &self,
        transaction: &DatabaseTransaction,
        inputs: Vec<RecordActivityInput>,
    ) -> Result<(), AppError> {
        if inputs.is_empty() {
            return Ok(());
        }

        let mut records = Vec::with_capacity(inputs.len());

        for input in inputs {
            let event_id = create_id().to_string();
            let created_at = now_utc().to_rfc3339();
            let entity_id = normalize_required_text(&input.entity_id, "Activity entity_id")?;
            let summary = normalize_optional_text(input.summary);
            let metadata = normalize_optional_value(input.metadata);

            let changes = input
                .changes
                .into_iter()
                .map(|change| {
                    Ok(ActivityChangeRecord {
                        id: create_id().to_string(),
                        event_id: event_id.clone(),
                        field: normalize_required_text(&change.field, "Activity field")?,
                        old_value: normalize_optional_value(change.old_value),
                        new_value: normalize_optional_value(change.new_value),
                        created_at: created_at.clone(),
                    })
                })
                .collect::<Result<Vec<_>, AppError>>()?;

            let event = ActivityEventRecord {
                id: event_id,
                entity_type: input.entity_type,
                entity_id,
                action: input.action.to_string(),
                actor_type: input.actor_type.unwrap_or(ActivityActorKind::User),
                source: input.source.unwrap_or(ActivitySourceKind::App),
                summary,
                metadata,
                created_at,
            };

            records.push((event, changes));
        }

        self.repository
            .insert_events_with_changes(transaction, &records)
            .await
    }

    /// 查询单个实体的 Activity timeline。
    pub async fn get_entity_activities(
        &self,
        input: GetEntityActivitiesInput,
    ) -> Result<Vec<ActivityTimelineEntry>, AppError> {
        let entity_id = normalize_required_text(&input.entity_id, "Activity entity_id")?;
        let limit = input.limit.unwrap_or(50);
        if limit == 0 {
            return Err(AppError::validation("Activity limit 必须大于 0"));
        }

        self.repository
            .list_by_entity(ActivityQuery {
                entity_type: input.entity_type,
                entity_id,
                limit: u64::from(limit),
            })
            .await
    }

    pub fn repository(&self) -> &ActivityRepository {
        &self.repository
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

fn normalize_optional_value(value: Option<Value>) -> Option<Value> {
    match value {
        Some(Value::Null) | None => None,
        Some(value) => Some(value),
    }
}

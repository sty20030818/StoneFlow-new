//! Activity Repository：只负责 Activity 数据持久化与 timeline 查询。

use std::collections::HashMap;

use crate::entities::{
    activity_change, activity_event,
    common::{ActivityActorKind, ActivityEntityKind, ActivitySourceKind},
    prelude::{ActivityChange, ActivityEvent},
};
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DatabaseConnection, EntityTrait, QueryFilter,
    QueryOrder, QuerySelect, Set,
};
use serde_json::Value;

use crate::error::StorageError;
use crate::mappers::{
    activity_actor_kind_to_domain, activity_entity_kind_to_domain, activity_source_kind_to_domain,
};
use stoneflow_application::activity::{ActivityTimelineChange, ActivityTimelineEntry};

/// 写入一条 Activity event 所需的持久化字段。
#[derive(Debug, Clone)]
pub struct ActivityEventRecord {
    pub id: String,
    pub entity_type: ActivityEntityKind,
    pub entity_id: String,
    pub action: String,
    pub actor_type: ActivityActorKind,
    pub source: ActivitySourceKind,
    pub summary: Option<String>,
    pub metadata: Option<Value>,
    pub created_at: String,
}

/// 写入单个 Activity change 所需的持久化字段。
#[derive(Debug, Clone)]
pub struct ActivityChangeRecord {
    pub id: String,
    pub event_id: String,
    pub field: String,
    pub old_value: Option<Value>,
    pub new_value: Option<Value>,
    pub created_at: String,
}

/// 查询某个实体 timeline 的过滤条件。
#[derive(Debug, Clone)]
pub struct ActivityQuery {
    pub entity_type: ActivityEntityKind,
    pub entity_id: String,
    pub limit: u64,
}

#[derive(Debug, Clone)]
pub struct ActivityRepository {
    db: DatabaseConnection,
}

impl ActivityRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub fn connection(&self) -> &DatabaseConnection {
        &self.db
    }

    /// 插入 event 与其字段变化；事务由调用方控制。
    pub async fn insert_event_with_changes<C>(
        &self,
        connection: &C,
        event: &ActivityEventRecord,
        changes: &[ActivityChangeRecord],
    ) -> Result<(), StorageError>
    where
        C: ConnectionTrait,
    {
        activity_event::ActiveModel {
            id: Set(event.id.clone()),
            entity_type: Set(event.entity_type),
            entity_id: Set(event.entity_id.clone()),
            action: Set(event.action.clone()),
            actor_type: Set(event.actor_type),
            source: Set(event.source),
            summary: Set(event.summary.clone()),
            metadata: Set(serialize_optional_json(&event.metadata)?),
            created_at: Set(event.created_at.clone()),
        }
        .insert(connection)
        .await?;

        if changes.is_empty() {
            return Ok(());
        }

        let change_models = changes
            .iter()
            .map(|change| {
                Ok(activity_change::ActiveModel {
                    id: Set(change.id.clone()),
                    event_id: Set(change.event_id.clone()),
                    field: Set(change.field.clone()),
                    old_value: Set(serialize_optional_json(&change.old_value)?),
                    new_value: Set(serialize_optional_json(&change.new_value)?),
                    created_at: Set(change.created_at.clone()),
                })
            })
            .collect::<Result<Vec<_>, StorageError>>()?;

        ActivityChange::insert_many(change_models)
            .exec(connection)
            .await?;

        Ok(())
    }

    /// 批量插入多条 event 及其字段变化；事务由调用方控制。
    pub async fn insert_events_with_changes<C>(
        &self,
        connection: &C,
        records: &[(ActivityEventRecord, Vec<ActivityChangeRecord>)],
    ) -> Result<(), StorageError>
    where
        C: ConnectionTrait,
    {
        if records.is_empty() {
            return Ok(());
        }

        // 批量插入所有 events
        let event_models: Vec<activity_event::ActiveModel> = records
            .iter()
            .map(|(event, _)| {
                Ok(activity_event::ActiveModel {
                    id: Set(event.id.clone()),
                    entity_type: Set(event.entity_type),
                    entity_id: Set(event.entity_id.clone()),
                    action: Set(event.action.clone()),
                    actor_type: Set(event.actor_type),
                    source: Set(event.source),
                    summary: Set(event.summary.clone()),
                    metadata: Set(serialize_optional_json(&event.metadata)?),
                    created_at: Set(event.created_at.clone()),
                })
            })
            .collect::<Result<Vec<_>, StorageError>>()?;

        ActivityEvent::insert_many(event_models)
            .exec(connection)
            .await?;

        // 批量插入所有 changes
        let all_change_models: Vec<activity_change::ActiveModel> = records
            .iter()
            .flat_map(|(_, changes)| changes.iter())
            .map(|change| {
                Ok(activity_change::ActiveModel {
                    id: Set(change.id.clone()),
                    event_id: Set(change.event_id.clone()),
                    field: Set(change.field.clone()),
                    old_value: Set(serialize_optional_json(&change.old_value)?),
                    new_value: Set(serialize_optional_json(&change.new_value)?),
                    created_at: Set(change.created_at.clone()),
                })
            })
            .collect::<Result<Vec<_>, StorageError>>()?;

        if !all_change_models.is_empty() {
            ActivityChange::insert_many(all_change_models)
                .exec(connection)
                .await?;
        }

        Ok(())
    }

    /// 按实体查询 timeline，并聚合对应字段变化。
    pub async fn list_by_entity(
        &self,
        query: ActivityQuery,
    ) -> Result<Vec<ActivityTimelineEntry>, StorageError> {
        let events = ActivityEvent::find()
            .filter(activity_event::Column::EntityType.eq(query.entity_type))
            .filter(activity_event::Column::EntityId.eq(query.entity_id.clone()))
            .order_by_desc(activity_event::Column::CreatedAt)
            .limit(query.limit)
            .all(self.connection())
            .await?;

        if events.is_empty() {
            return Ok(Vec::new());
        }

        let event_ids = events
            .iter()
            .map(|event| event.id.clone())
            .collect::<Vec<_>>();
        let changes = ActivityChange::find()
            .filter(activity_change::Column::EventId.is_in(event_ids.clone()))
            .order_by_asc(activity_change::Column::CreatedAt)
            .order_by_asc(activity_change::Column::Id)
            .all(self.connection())
            .await?;

        let mut grouped_changes = HashMap::<String, Vec<ActivityTimelineChange>>::new();
        for change in changes {
            grouped_changes
                .entry(change.event_id.clone())
                .or_default()
                .push(ActivityTimelineChange {
                    id: change.id,
                    field: change.field,
                    old_value: deserialize_optional_json(change.old_value)?,
                    new_value: deserialize_optional_json(change.new_value)?,
                    created_at: change.created_at,
                });
        }

        let mut timeline = Vec::with_capacity(events.len());
        for event in events {
            let event_id = event.id.clone();
            timeline.push(ActivityTimelineEntry {
                id: event_id.clone(),
                entity_type: activity_entity_kind_to_domain(event.entity_type),
                entity_id: event.entity_id,
                action: event.action,
                actor_type: activity_actor_kind_to_domain(event.actor_type),
                source: activity_source_kind_to_domain(event.source),
                summary: event.summary,
                metadata: deserialize_optional_json(event.metadata)?,
                created_at: event.created_at,
                changes: grouped_changes.remove(&event_id).unwrap_or_default(),
            });
        }

        Ok(timeline)
    }
}

fn serialize_optional_json(value: &Option<Value>) -> Result<Option<String>, StorageError> {
    value
        .as_ref()
        .map(|value| {
            serde_json::to_string(value).map_err(|error| {
                StorageError::database(format!("Activity JSON 序列化失败: {error}"))
            })
        })
        .transpose()
}

fn deserialize_optional_json(value: Option<String>) -> Result<Option<Value>, StorageError> {
    value
        .map(|value| {
            serde_json::from_str::<Value>(&value).map_err(|error| {
                StorageError::database(format!("Activity JSON 反序列化失败: {error}"))
            })
        })
        .transpose()
}

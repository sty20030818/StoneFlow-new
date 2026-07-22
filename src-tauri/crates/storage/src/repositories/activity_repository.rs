//! 通用 Activity event/change 的持久化实现。

use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, ConnectionTrait, EntityTrait, QueryFilter,
    QueryOrder, QuerySelect,
};
use stoneflow_application::activity::{
    ActivityChangeRecord, ActivityEventRecord, ActivityTimelineChange, ActivityTimelineEntry,
    GetEntityActivitiesInput,
};

use crate::{
    entities::{activity_change, activity_event},
    error::StorageError,
};

#[derive(Debug, Clone)]
pub struct ActivityRepository {}

impl ActivityRepository {
    pub fn new() -> Self {
        Self {}
    }

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
            entity_type: Set(match event.entity_type {
                stoneflow_domain::ActivityEntityKind::Project => "project".to_owned(),
                stoneflow_domain::ActivityEntityKind::Task => "task".to_owned(),
                stoneflow_domain::ActivityEntityKind::Space => "space".to_owned(),
                stoneflow_domain::ActivityEntityKind::View => "view".to_owned(),
                stoneflow_domain::ActivityEntityKind::Setting => "setting".to_owned(),
            }),
            entity_id: Set(event.entity_id.clone()),
            operation_id: Set(event.id.clone()),
            action: Set(event.action.clone()),
            actor_type: Set(format!("{:?}", event.actor_type).to_lowercase()),
            source: Set(format!("{:?}", event.source).to_lowercase()),
            summary: Set(event.summary.clone()),
            metadata_json: Set(event.metadata.as_ref().map(serde_json::Value::to_string)),
            created_at: Set(event.created_at.clone()),
        }
        .insert(connection)
        .await?;

        for change in changes {
            activity_change::ActiveModel {
                id: Set(change.id.clone()),
                event_id: Set(change.event_id.clone()),
                field_key: Set(change.field.clone()),
                old_value: Set(change.old_value.as_ref().map(serde_json::Value::to_string)),
                new_value: Set(change.new_value.as_ref().map(serde_json::Value::to_string)),
                created_at: Set(change.created_at.clone()),
            }
            .insert(connection)
            .await?;
        }
        Ok(())
    }

    pub async fn list_by_entity<C>(
        &self,
        connection: &C,
        input: &GetEntityActivitiesInput,
    ) -> Result<Vec<ActivityTimelineEntry>, StorageError>
    where
        C: ConnectionTrait,
    {
        let events = activity_event::Entity::find()
            .filter(activity_event::Column::EntityType.eq(entity_type_key(input.entity_type)))
            .filter(activity_event::Column::EntityId.eq(&input.entity_id))
            .order_by_desc(activity_event::Column::CreatedAt)
            .limit(u64::from(input.limit.unwrap_or(50)))
            .all(connection)
            .await?;
        let mut timeline = Vec::with_capacity(events.len());
        for event in events {
            let changes = activity_change::Entity::find()
                .filter(activity_change::Column::EventId.eq(&event.id))
                .order_by_asc(activity_change::Column::CreatedAt)
                .all(connection)
                .await?
                .into_iter()
                .map(|change| {
                    Ok(ActivityTimelineChange {
                        id: change.id,
                        field: change.field_key,
                        old_value: parse_optional_json(change.old_value)?,
                        new_value: parse_optional_json(change.new_value)?,
                        created_at: change.created_at,
                    })
                })
                .collect::<Result<Vec<_>, StorageError>>()?;
            timeline.push(ActivityTimelineEntry {
                id: event.id,
                entity_type: input.entity_type,
                entity_id: event.entity_id,
                action: event.action,
                actor_type: parse_actor_type(&event.actor_type)?,
                source: parse_source(&event.source)?,
                summary: event.summary,
                metadata: parse_optional_json(event.metadata_json)?,
                created_at: event.created_at,
                changes,
            });
        }
        Ok(timeline)
    }
}

impl Default for ActivityRepository {
    fn default() -> Self {
        Self::new()
    }
}

fn entity_type_key(value: stoneflow_domain::ActivityEntityKind) -> &'static str {
    match value {
        stoneflow_domain::ActivityEntityKind::Task => "task",
        stoneflow_domain::ActivityEntityKind::Project => "project",
        stoneflow_domain::ActivityEntityKind::Space => "space",
        stoneflow_domain::ActivityEntityKind::View => "view",
        stoneflow_domain::ActivityEntityKind::Setting => "setting",
    }
}

fn parse_optional_json(value: Option<String>) -> Result<Option<serde_json::Value>, StorageError> {
    value
        .map(|value| {
            serde_json::from_str(&value).map_err(|error| StorageError::database(error.to_string()))
        })
        .transpose()
}

fn parse_actor_type(value: &str) -> Result<stoneflow_domain::ActivityActorKind, StorageError> {
    match value {
        "user" => Ok(stoneflow_domain::ActivityActorKind::User),
        "system" => Ok(stoneflow_domain::ActivityActorKind::System),
        "ai" => Ok(stoneflow_domain::ActivityActorKind::Ai),
        _ => Err(StorageError::database("Activity actor_type 非法")),
    }
}

fn parse_source(value: &str) -> Result<stoneflow_domain::ActivitySourceKind, StorageError> {
    match value {
        "app" => Ok(stoneflow_domain::ActivitySourceKind::App),
        "shortcut" => Ok(stoneflow_domain::ActivitySourceKind::Shortcut),
        "command" => Ok(stoneflow_domain::ActivitySourceKind::Command),
        "import" => Ok(stoneflow_domain::ActivitySourceKind::Import),
        "automation" => Ok(stoneflow_domain::ActivitySourceKind::Automation),
        _ => Err(StorageError::database("Activity source 非法")),
    }
}

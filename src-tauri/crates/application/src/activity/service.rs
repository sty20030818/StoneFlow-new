//! Activity Service：负责输入校验、事务边界与持久化编排。

use serde_json::Value;
use stoneflow_domain::{
    create_id, normalize_required_text, now_utc, ActivityActorKind, ActivitySourceKind,
};

use crate::ApplicationError;

use super::{
    ports::{ActivityChangeRecord, ActivityEventRecord, ActivityPersistence},
    ActivityTimelineEntry, GetEntityActivitiesInput, RecordActivityInput,
};

/// Activity 用例编排。
#[derive(Debug, Clone)]
pub struct ActivityService<P>
where
    P: ActivityPersistence,
{
    persistence: P,
}

impl<P> ActivityService<P>
where
    P: ActivityPersistence,
{
    pub fn new(persistence: P) -> Self {
        Self { persistence }
    }

    /// 以独立事务记录一条 Activity。
    pub async fn record_activity(
        &self,
        input: RecordActivityInput,
    ) -> Result<(), ApplicationError> {
        let transaction = self.persistence.begin().await?;
        self.record_activity_in_txn(&transaction, input).await?;
        self.persistence.commit(transaction).await
    }

    /// 在外部事务中记录 Activity，供后续业务服务复用。
    pub async fn record_activity_in_txn(
        &self,
        connection: &P::Connection,
        input: RecordActivityInput,
    ) -> Result<(), ApplicationError> {
        let (event, changes) = build_activity_records(input)?;
        self.persistence
            .insert_event_with_changes(connection, &event, &changes)
            .await
    }

    /// 在外部事务中批量记录多条 Activity，供归档等批量操作使用。
    pub async fn record_activities_in_txn(
        &self,
        connection: &P::Connection,
        inputs: Vec<RecordActivityInput>,
    ) -> Result<(), ApplicationError> {
        if inputs.is_empty() {
            return Ok(());
        }

        let records = inputs
            .into_iter()
            .map(build_activity_records)
            .collect::<Result<Vec<_>, ApplicationError>>()?;

        self.persistence
            .insert_events_with_changes(connection, &records)
            .await
    }

    /// 查询单个实体的 Activity timeline。
    pub async fn get_entity_activities(
        &self,
        input: GetEntityActivitiesInput,
    ) -> Result<Vec<ActivityTimelineEntry>, ApplicationError> {
        let entity_id = normalize_required_text(&input.entity_id, "Activity entity_id")?;
        let limit = input.limit.unwrap_or(50);
        if limit == 0 {
            return Err(ApplicationError::validation("Activity limit 必须大于 0"));
        }

        self.persistence
            .list_by_entity(GetEntityActivitiesInput {
                entity_type: input.entity_type,
                entity_id,
                limit: Some(limit),
            })
            .await
    }
}

fn build_activity_records(
    input: RecordActivityInput,
) -> Result<(ActivityEventRecord, Vec<ActivityChangeRecord>), ApplicationError> {
    let event_id = create_id().to_string();
    let operation_id = input.operation_id.unwrap_or_else(|| event_id.clone());
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
        .collect::<Result<Vec<_>, ApplicationError>>()?;

    let event = ActivityEventRecord {
        id: event_id,
        operation_id,
        entity_type: input.entity_type,
        entity_id,
        action: input.action.to_string(),
        actor_type: input.actor_type.unwrap_or(ActivityActorKind::User),
        source: input.source.unwrap_or(ActivitySourceKind::App),
        summary,
        metadata,
        created_at,
    };

    Ok((event, changes))
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

#[cfg(test)]
mod tests {
    use std::sync::{Arc, Mutex};

    use serde_json::json;
    use stoneflow_domain::ActivityEntityKind;

    use super::*;
    use crate::activity::{ActivityAction, ActivityChangeInput};

    #[derive(Debug, Default)]
    struct FakePersistence {
        events: Arc<Mutex<Vec<ActivityEventRecord>>>,
        changes: Arc<Mutex<Vec<ActivityChangeRecord>>>,
    }

    impl ActivityPersistence for FakePersistence {
        type Connection = ();

        async fn begin(&self) -> Result<Self::Connection, ApplicationError> {
            Ok(())
        }

        async fn commit(&self, _connection: Self::Connection) -> Result<(), ApplicationError> {
            Ok(())
        }

        async fn insert_event_with_changes(
            &self,
            _connection: &Self::Connection,
            event: &ActivityEventRecord,
            changes: &[ActivityChangeRecord],
        ) -> Result<(), ApplicationError> {
            self.events.lock().expect("lock").push(event.clone());
            self.changes
                .lock()
                .expect("lock")
                .extend(changes.iter().cloned());
            Ok(())
        }

        async fn insert_events_with_changes(
            &self,
            connection: &Self::Connection,
            records: &[(ActivityEventRecord, Vec<ActivityChangeRecord>)],
        ) -> Result<(), ApplicationError> {
            for (event, changes) in records {
                self.insert_event_with_changes(connection, event, changes)
                    .await?;
            }
            Ok(())
        }

        async fn list_by_entity(
            &self,
            input: GetEntityActivitiesInput,
        ) -> Result<Vec<ActivityTimelineEntry>, ApplicationError> {
            let events = self.events.lock().expect("lock");
            let changes = self.changes.lock().expect("lock");
            let limit = usize::from(input.limit.unwrap_or(50));

            Ok(events
                .iter()
                .filter(|event| {
                    event.entity_type == input.entity_type && event.entity_id == input.entity_id
                })
                .take(limit)
                .map(|event| ActivityTimelineEntry {
                    id: event.id.clone(),
                    entity_type: event.entity_type,
                    entity_id: event.entity_id.clone(),
                    action: event.action.clone(),
                    actor_type: event.actor_type,
                    source: event.source,
                    summary: event.summary.clone(),
                    metadata: event.metadata.clone(),
                    created_at: event.created_at.clone(),
                    changes: changes
                        .iter()
                        .filter(|change| change.event_id == event.id)
                        .map(|change| super::super::ActivityTimelineChange {
                            id: change.id.clone(),
                            field: change.field.clone(),
                            old_value: change.old_value.clone(),
                            new_value: change.new_value.clone(),
                            created_at: change.created_at.clone(),
                        })
                        .collect(),
                })
                .collect())
        }
    }

    #[tokio::test]
    async fn record_activity_should_persist_event_and_changes() {
        let persistence = FakePersistence::default();
        let persistence_probe = persistence.events.clone();
        let changes_probe = persistence.changes.clone();
        let service = ActivityService::new(persistence);

        service
            .record_activity(RecordActivityInput {
                operation_id: None,
                entity_type: ActivityEntityKind::Task,
                entity_id: "task-1".to_owned(),
                action: ActivityAction::TaskStatusChanged,
                actor_type: None,
                source: None,
                summary: None,
                metadata: None,
                changes: vec![
                    ActivityChangeInput {
                        field: "status".to_owned(),
                        old_value: Some(json!("todo")),
                        new_value: Some(json!("doing")),
                    },
                    ActivityChangeInput {
                        field: "status_changed_at".to_owned(),
                        old_value: None,
                        new_value: Some(json!("2026-04-29T01:00:00Z")),
                    },
                ],
            })
            .await
            .expect("record should succeed");

        assert_eq!(persistence_probe.lock().expect("lock").len(), 1);
        assert_eq!(changes_probe.lock().expect("lock").len(), 2);
    }

    #[tokio::test]
    async fn record_activity_should_keep_the_caller_operation_id() {
        let persistence = FakePersistence::default();
        let events = persistence.events.clone();
        let service = ActivityService::new(persistence);

        service
            .record_activity(RecordActivityInput {
                operation_id: Some("operation-1".to_owned()),
                entity_type: ActivityEntityKind::Task,
                entity_id: "task-1".to_owned(),
                action: ActivityAction::TaskCreated,
                actor_type: None,
                source: None,
                summary: None,
                metadata: None,
                changes: Vec::new(),
            })
            .await
            .expect("activity should persist");

        assert_eq!(events.lock().expect("lock")[0].operation_id, "operation-1");
    }

    #[tokio::test]
    async fn get_entity_activities_should_reject_zero_limit() {
        let service = ActivityService::new(FakePersistence::default());

        let error = service
            .get_entity_activities(GetEntityActivitiesInput {
                entity_type: ActivityEntityKind::Task,
                entity_id: "task-1".to_owned(),
                limit: Some(0),
            })
            .await
            .expect_err("zero limit should fail");

        assert!(matches!(error, ApplicationError::Validation(_)));
    }
}

//! Activity 持久化 adapter：将 usecase port 接到 SeaORM repository。

use sea_orm::{DatabaseTransaction, TransactionTrait};
use stoneflow_application::activity::{
    ActivityChangeRecord as UsecaseActivityChangeRecord,
    ActivityEventRecord as UsecaseActivityEventRecord, ActivityPersistence, ActivityTimelineEntry,
    GetEntityActivitiesInput,
};

use crate::app::error::AppError;
use stoneflow_storage::{
    mappers::{
        activity_actor_kind_to_schema, activity_entity_kind_to_schema,
        activity_source_kind_to_schema,
    },
    repositories::{ActivityChangeRecord, ActivityEventRecord, ActivityQuery, ActivityRepository},
};

/// Activity 持久化 adapter。
#[derive(Debug, Clone)]
pub struct ActivityPersistenceAdapter {
    repository: ActivityRepository,
}

impl ActivityPersistenceAdapter {
    pub fn new(repository: ActivityRepository) -> Self {
        Self { repository }
    }
}

impl ActivityPersistence for ActivityPersistenceAdapter {
    type Connection = DatabaseTransaction;

    async fn begin(&self) -> Result<Self::Connection, stoneflow_application::ApplicationError> {
        self.repository
            .connection()
            .begin()
            .await
            .map_err(map_db_error)
    }

    async fn commit(
        &self,
        connection: Self::Connection,
    ) -> Result<(), stoneflow_application::ApplicationError> {
        connection.commit().await.map_err(map_db_error)
    }

    async fn insert_event_with_changes(
        &self,
        connection: &Self::Connection,
        event: &UsecaseActivityEventRecord,
        changes: &[UsecaseActivityChangeRecord],
    ) -> Result<(), stoneflow_application::ApplicationError> {
        self.repository
            .insert_event_with_changes(
                connection,
                &map_event_to_infrastructure(event),
                &changes
                    .iter()
                    .map(map_change_to_infrastructure)
                    .collect::<Vec<_>>(),
            )
            .await
            .map_err(|error| map_app_error(error.into()))
    }

    async fn insert_events_with_changes(
        &self,
        connection: &Self::Connection,
        records: &[(UsecaseActivityEventRecord, Vec<UsecaseActivityChangeRecord>)],
    ) -> Result<(), stoneflow_application::ApplicationError> {
        let mapped = records
            .iter()
            .map(|(event, changes)| {
                (
                    map_event_to_infrastructure(event),
                    changes
                        .iter()
                        .map(map_change_to_infrastructure)
                        .collect::<Vec<_>>(),
                )
            })
            .collect::<Vec<_>>();

        self.repository
            .insert_events_with_changes(connection, &mapped)
            .await
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list_by_entity(
        &self,
        input: GetEntityActivitiesInput,
    ) -> Result<Vec<ActivityTimelineEntry>, stoneflow_application::ApplicationError> {
        self.repository
            .list_by_entity(ActivityQuery {
                entity_type: activity_entity_kind_to_schema(input.entity_type),
                entity_id: input.entity_id,
                limit: u64::from(input.limit.unwrap_or(50)),
            })
            .await
            .map_err(|error| map_app_error(error.into()))
    }
}

fn map_db_error(error: sea_orm::DbErr) -> stoneflow_application::ApplicationError {
    map_app_error(AppError::from(error))
}

fn map_event_to_infrastructure(event: &UsecaseActivityEventRecord) -> ActivityEventRecord {
    ActivityEventRecord {
        id: event.id.clone(),
        entity_type: activity_entity_kind_to_schema(event.entity_type),
        entity_id: event.entity_id.clone(),
        action: event.action.clone(),
        actor_type: activity_actor_kind_to_schema(event.actor_type),
        source: activity_source_kind_to_schema(event.source),
        summary: event.summary.clone(),
        metadata: event.metadata.clone(),
        created_at: event.created_at.clone(),
    }
}

fn map_change_to_infrastructure(change: &UsecaseActivityChangeRecord) -> ActivityChangeRecord {
    ActivityChangeRecord {
        id: change.id.clone(),
        event_id: change.event_id.clone(),
        field: change.field.clone(),
        old_value: change.old_value.clone(),
        new_value: change.new_value.clone(),
        created_at: change.created_at.clone(),
    }
}

fn map_app_error(error: AppError) -> stoneflow_application::ApplicationError {
    match error {
        AppError::Validation(message) => {
            stoneflow_application::ApplicationError::validation(message)
        }
        AppError::NotFound(message) => stoneflow_application::ApplicationError::not_found(message),
        AppError::Conflict(message) => stoneflow_application::ApplicationError::conflict(message),
        AppError::Database(message) => stoneflow_application::ApplicationError::storage(message),
        AppError::Initialization(message) => {
            stoneflow_application::ApplicationError::initialization(message)
        }
        AppError::Internal(message)
        | AppError::Forbidden(message)
        | AppError::CaptureSpaceUnavailable(message)
        | AppError::DefaultSpaceUnavailable(message)
        | AppError::CapturePersistence(message) => {
            stoneflow_application::ApplicationError::internal(message)
        }
    }
}

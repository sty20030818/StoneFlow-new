//! Activity 持久化适配：通用实体时间线读写。

use sea_orm::{DatabaseConnection, DatabaseTransaction, TransactionTrait};
use stoneflow_application::activity::{
    ActivityChangeRecord, ActivityEventRecord, ActivityPersistence, ActivityTimelineEntry,
    GetEntityActivitiesInput,
};
use stoneflow_application::ApplicationError;
use stoneflow_storage::repositories::ActivityRepository;

use crate::app::error::AppError;

#[derive(Debug, Clone)]
pub struct ActivityPersistenceAdapter {
    db: DatabaseConnection,
    repository: ActivityRepository,
}

impl ActivityPersistenceAdapter {
    pub fn new(db: DatabaseConnection) -> Self {
        Self {
            db,
            repository: ActivityRepository::new(),
        }
    }
}

impl ActivityPersistence for ActivityPersistenceAdapter {
    type Connection = DatabaseTransaction;

    async fn begin(&self) -> Result<Self::Connection, ApplicationError> {
        self.db
            .begin()
            .await
            .map_err(|error| ApplicationError::storage(error.to_string()))
    }

    async fn commit(&self, connection: Self::Connection) -> Result<(), ApplicationError> {
        connection
            .commit()
            .await
            .map_err(|error| ApplicationError::storage(error.to_string()))
    }

    async fn insert_event_with_changes(
        &self,
        connection: &Self::Connection,
        event: &ActivityEventRecord,
        changes: &[ActivityChangeRecord],
    ) -> Result<(), ApplicationError> {
        self.repository
            .insert_event_with_changes(connection, event, changes)
            .await
            .map_err(|error| ApplicationError::storage(error.to_string()))
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
        self.repository
            .list_by_entity(&self.db, &input)
            .await
            .map_err(|error| ApplicationError::storage(error.to_string()))
    }
}

/// 构造独立 ActivityService（命令侧查询用）。
pub fn build_activity_service(
    db: DatabaseConnection,
) -> stoneflow_application::activity::ActivityService<ActivityPersistenceAdapter> {
    stoneflow_application::activity::ActivityService::new(ActivityPersistenceAdapter::new(db))
}

#[allow(dead_code)]
pub fn map_activity_error(error: ApplicationError) -> AppError {
    error.into()
}

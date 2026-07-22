//! Activity 持久化适配（R2：activity 表已变为 task 专属；通用写入暂 no-op，保证编译）。

use sea_orm::{DatabaseConnection, DatabaseTransaction, TransactionTrait};
use stoneflow_application::activity::{
    ActivityChangeRecord, ActivityEventRecord, ActivityPersistence, ActivityTimelineEntry,
    GetEntityActivitiesInput,
};
use stoneflow_application::ApplicationError;

use crate::app::error::AppError;

/// R2 过渡适配：不写入旧多实体 activity schema。
#[derive(Debug, Clone)]
pub struct ActivityPersistenceAdapter {
    db: DatabaseConnection,
}

impl ActivityPersistenceAdapter {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
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
        _connection: &Self::Connection,
        _event: &ActivityEventRecord,
        _changes: &[ActivityChangeRecord],
    ) -> Result<(), ApplicationError> {
        // R2：通用 entity activity 写路径已拆除；后续按 task timeline 重建。
        Ok(())
    }

    async fn insert_events_with_changes(
        &self,
        _connection: &Self::Connection,
        _records: &[(ActivityEventRecord, Vec<ActivityChangeRecord>)],
    ) -> Result<(), ApplicationError> {
        Ok(())
    }

    async fn list_by_entity(
        &self,
        _input: GetEntityActivitiesInput,
    ) -> Result<Vec<ActivityTimelineEntry>, ApplicationError> {
        Ok(Vec::new())
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

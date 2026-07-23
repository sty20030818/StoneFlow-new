//! Activity port 实现与 application service 工厂。

use sea_orm::{DatabaseConnection, DatabaseTransaction, TransactionTrait};
use stoneflow_application::activity::{
    ActivityChangeRecord, ActivityEventRecord, ActivityPersistence, ActivityService,
    ActivityTimelineEntry, GetEntityActivitiesInput,
};
use stoneflow_application::ApplicationError;

use crate::adapters::error::{from_db, from_storage};
use crate::repositories::ActivityRepository;

/// 已装配的 Activity application service。
pub type ActivityAppService = ActivityService<ActivityPersistenceAdapter>;

/// 从数据库连接构造 Activity 用例。
pub fn build_activity_service(connection: DatabaseConnection) -> ActivityAppService {
    ActivityService::new(ActivityPersistenceAdapter::new(connection))
}

/// Activity 持久化 adapter。
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
        self.db.begin().await.map_err(from_db)
    }

    async fn commit(&self, connection: Self::Connection) -> Result<(), ApplicationError> {
        connection.commit().await.map_err(from_db)
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
            .map_err(from_storage)
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
            .map_err(from_storage)
    }
}

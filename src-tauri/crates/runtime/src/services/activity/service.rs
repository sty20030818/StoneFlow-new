//! Activity Service 兼容壳：真实编排已迁到 `stoneflow-application`。

use sea_orm::DatabaseTransaction;
use stoneflow_application::activity::{
    ActivityService as ActivityUsecase, ActivityTimelineEntry, GetEntityActivitiesInput,
    RecordActivityInput,
};

use crate::{app::error::AppError, services::activity::adapter::ActivityPersistenceAdapter};
use stoneflow_storage::repositories::ActivityRepository;

pub use stoneflow_application::activity::{
    create_changes, ActivityAction, ActivityChangeInput, ActivityTimelineChange,
};

/// Activity 编排兼容壳。
#[derive(Debug, Clone)]
pub struct ActivityService {
    inner: ActivityUsecase<ActivityPersistenceAdapter>,
    repository: ActivityRepository,
}

impl ActivityService {
    pub fn new(repository: ActivityRepository) -> Self {
        let repository_for_accessor = repository.clone();
        Self {
            inner: ActivityUsecase::new(ActivityPersistenceAdapter::new(repository)),
            repository: repository_for_accessor,
        }
    }

    /// 以独立事务记录一条 Activity。
    pub async fn record_activity(&self, input: RecordActivityInput) -> Result<(), AppError> {
        self.inner
            .record_activity(input)
            .await
            .map_err(AppError::from)
    }

    /// 在外部事务中记录 Activity，供后续业务服务复用。
    pub async fn record_activity_in_txn(
        &self,
        transaction: &DatabaseTransaction,
        input: RecordActivityInput,
    ) -> Result<(), AppError> {
        self.inner
            .record_activity_in_txn(transaction, input)
            .await
            .map_err(AppError::from)
    }

    /// 在外部事务中批量记录多条 Activity。
    pub async fn record_activities_in_txn(
        &self,
        transaction: &DatabaseTransaction,
        inputs: Vec<RecordActivityInput>,
    ) -> Result<(), AppError> {
        self.inner
            .record_activities_in_txn(transaction, inputs)
            .await
            .map_err(AppError::from)
    }

    /// 查询单个实体的 Activity timeline。
    pub async fn get_entity_activities(
        &self,
        input: GetEntityActivitiesInput,
    ) -> Result<Vec<ActivityTimelineEntry>, AppError> {
        self.inner
            .get_entity_activities(input)
            .await
            .map_err(AppError::from)
    }

    pub fn repository(&self) -> &ActivityRepository {
        &self.repository
    }
}

//! Activity 运行时薄壳：timeline 查询走 application，R2 下恒返回空。

use stoneflow_application::activity::{
    ActivityService as ActivityUsecase, ActivityTimelineEntry, GetEntityActivitiesInput,
};
use stoneflow_storage::database::DatabaseRuntimeState;

use crate::app::error::AppError;

use super::adapter::{build_activity_service, ActivityPersistenceAdapter};

pub use stoneflow_application::activity::{
    create_changes, ActivityAction, ActivityChangeInput, ActivityTimelineChange,
};

/// Runtime Activity Service。
pub struct ActivityService {
    inner: ActivityUsecase<ActivityPersistenceAdapter>,
}

impl ActivityService {
    pub fn new(database: &DatabaseRuntimeState) -> Self {
        Self {
            inner: build_activity_service(database.connection().clone()),
        }
    }

    pub async fn get_entity_activities(
        &self,
        input: GetEntityActivitiesInput,
    ) -> Result<Vec<ActivityTimelineEntry>, AppError> {
        self.inner
            .get_entity_activities(input)
            .await
            .map_err(AppError::from)
    }
}

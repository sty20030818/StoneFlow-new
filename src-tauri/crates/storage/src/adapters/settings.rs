//! Settings port 实现与 application service 工厂。

use sea_orm::{DatabaseConnection, DatabaseTransaction, TransactionTrait};
use stoneflow_application::{
    activity::ActivityService,
    settings::{SettingsPersistence, SettingsService},
    ApplicationError,
};

use crate::adapters::activity::ActivityPersistenceAdapter;
use crate::adapters::error::{from_db, from_storage};
use crate::repositories::SettingsRepository;

/// 已装配的 Settings application service。
pub type SettingsAppService =
    SettingsService<SettingsPersistenceAdapter, ActivityPersistenceAdapter>;

/// 从数据库连接构造 Settings 用例。
pub fn build_settings_service(connection: DatabaseConnection) -> SettingsAppService {
    let repository = SettingsRepository::new(connection.clone());
    let activity = ActivityService::new(ActivityPersistenceAdapter::new(connection));
    SettingsService::new(SettingsPersistenceAdapter { repository }, activity)
}

/// Settings 持久化 adapter。
#[derive(Debug, Clone)]
pub struct SettingsPersistenceAdapter {
    repository: SettingsRepository,
}

impl SettingsPersistence for SettingsPersistenceAdapter {
    type Connection = DatabaseTransaction;

    async fn begin(&self) -> Result<Self::Connection, ApplicationError> {
        self.repository.connection().begin().await.map_err(from_db)
    }

    async fn commit(&self, connection: Self::Connection) -> Result<(), ApplicationError> {
        connection.commit().await.map_err(from_db)
    }

    async fn find_raw_setting(&self, key: &str) -> Result<Option<String>, ApplicationError> {
        self.repository
            .find_raw_setting(key)
            .await
            .map_err(from_storage)
    }

    async fn set_raw_setting_in_connection(
        &self,
        connection: &Self::Connection,
        key: &str,
        raw_value: &str,
        updated_at: &str,
    ) -> Result<(), ApplicationError> {
        self.repository
            .set_raw_setting_in_connection(connection, key, raw_value, updated_at)
            .await
            .map_err(from_storage)
    }
}

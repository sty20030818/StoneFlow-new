//! Settings Service：真源在 application；R2 去掉 mutation 双写。

use sea_orm::TransactionTrait;
use stoneflow_application::{
    activity::ActivityService as ActivityUsecase,
    settings::{SettingsPersistence, SettingsService as SettingsUsecase},
};
use stoneflow_storage::repositories::SettingsRepository;

use crate::{app::error::AppError, services::activity::ActivityPersistenceAdapter};

pub use stoneflow_application::settings::{
    GetSidebarSettingsOutput, SidebarFooterItemKey, SidebarItemConfig, SidebarItemVisibilityTarget,
    SidebarMainItemKey, SidebarMainItems, SidebarPreferenceSettings,
    SidebarProjectSectionPreferenceConfig, UpdateSidebarItemVisibilityInput,
    UpdateSidebarProjectSectionInput,
};

#[derive(Debug, Clone)]
pub struct SettingsService {
    inner: SettingsUsecase<SettingsPersistenceAdapter, ActivityPersistenceAdapter>,
}

impl SettingsService {
    pub fn new(repository: SettingsRepository) -> Self {
        let activity = ActivityUsecase::new(ActivityPersistenceAdapter::new(
            repository.connection().clone(),
        ));
        Self {
            inner: SettingsUsecase::new(SettingsPersistenceAdapter { repository }, activity),
        }
    }

    pub async fn get_sidebar_settings(&self) -> Result<SidebarPreferenceSettings, AppError> {
        self.inner
            .get_sidebar_settings()
            .await
            .map_err(AppError::from)
    }

    pub async fn update_sidebar_item_visibility(
        &self,
        input: UpdateSidebarItemVisibilityInput,
    ) -> Result<SidebarPreferenceSettings, AppError> {
        self.inner
            .update_sidebar_item_visibility(input)
            .await
            .map_err(AppError::from)
    }

    pub async fn update_sidebar_project_section(
        &self,
        input: UpdateSidebarProjectSectionInput,
    ) -> Result<SidebarPreferenceSettings, AppError> {
        self.inner
            .update_sidebar_project_section(input)
            .await
            .map_err(AppError::from)
    }
}

#[derive(Debug, Clone)]
struct SettingsPersistenceAdapter {
    repository: SettingsRepository,
}

impl SettingsPersistence for SettingsPersistenceAdapter {
    type Connection = sea_orm::DatabaseTransaction;

    async fn begin(&self) -> Result<Self::Connection, stoneflow_application::ApplicationError> {
        self.repository
            .connection()
            .begin()
            .await
            .map_err(|error| stoneflow_application::ApplicationError::storage(error.to_string()))
    }

    async fn commit(
        &self,
        connection: Self::Connection,
    ) -> Result<(), stoneflow_application::ApplicationError> {
        connection
            .commit()
            .await
            .map_err(|error| stoneflow_application::ApplicationError::storage(error.to_string()))
    }

    async fn find_raw_setting(
        &self,
        key: &str,
    ) -> Result<Option<String>, stoneflow_application::ApplicationError> {
        self.repository
            .find_raw_setting(key)
            .await
            .map_err(|error| stoneflow_application::ApplicationError::storage(error.to_string()))
    }

    async fn set_raw_setting_in_connection(
        &self,
        connection: &Self::Connection,
        key: &str,
        raw_value: &str,
        updated_at: &str,
    ) -> Result<(), stoneflow_application::ApplicationError> {
        self.repository
            .set_raw_setting_in_connection(connection, key, raw_value, updated_at)
            .await
            .map_err(|error| stoneflow_application::ApplicationError::storage(error.to_string()))
    }
}

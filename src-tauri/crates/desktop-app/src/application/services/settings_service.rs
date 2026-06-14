//! Settings Service 兼容壳：真实编排已迁到 `stoneflow-usecase`。

use sea_orm::{DatabaseTransaction, TransactionTrait};
use stoneflow_usecase::{
    activity::ActivityService as ActivityUsecase,
    settings::{SettingsPersistence, SettingsService as SettingsUsecase},
};

use crate::{
    app::error::AppError,
    application::activity::ActivityPersistenceAdapter,
    infrastructure::repositories::SettingsRepository,
};

pub use stoneflow_usecase::settings::{
    GetLegacyShellDevicePreferencesOutput, GetSidebarSettingsOutput,
    LegacySidebarDevicePreferences, LegacyUiDevicePreferences, SidebarDesktopPreference,
    SidebarFooterItemKey, SidebarItemConfig, SidebarItemVisibilityTarget, SidebarMainItemKey,
    SidebarMainItems, SidebarPreferenceSettings, SidebarProjectSectionPreferenceConfig,
    UpdateSidebarItemVisibilityInput, UpdateSidebarProjectSectionInput,
};

/// Settings 编排兼容壳。
#[derive(Debug, Clone)]
pub struct SettingsService {
    inner: SettingsUsecase<SettingsPersistenceAdapter, ActivityPersistenceAdapter>,
    repository: SettingsRepository,
}

impl SettingsService {
    pub fn new(
        repository: SettingsRepository,
        activity_service: crate::application::activity::ActivityService,
    ) -> Self {
        let activity_repo = activity_service.repository().clone();
        let repository_for_accessor = repository.clone();
        Self {
            inner: SettingsUsecase::new(
                SettingsPersistenceAdapter::new(repository.clone()),
                ActivityUsecase::new(ActivityPersistenceAdapter::new(activity_repo)),
            ),
            repository: repository_for_accessor,
        }
    }

    pub fn repository(&self) -> &SettingsRepository {
        &self.repository
    }

    pub async fn get_sidebar_settings(&self) -> Result<SidebarPreferenceSettings, AppError> {
        self.inner
            .get_sidebar_settings()
            .await
            .map_err(AppError::from)
    }

    pub async fn get_legacy_shell_device_preferences(
        &self,
    ) -> Result<GetLegacyShellDevicePreferencesOutput, AppError> {
        self.inner
            .get_legacy_shell_device_preferences()
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

impl SettingsPersistenceAdapter {
    fn new(repository: SettingsRepository) -> Self {
        Self { repository }
    }
}

impl SettingsPersistence for SettingsPersistenceAdapter {
    type Connection = DatabaseTransaction;

    async fn begin(&self) -> Result<Self::Connection, stoneflow_usecase::UsecaseError> {
        self.repository
            .connection()
            .begin()
            .await
            .map_err(map_db_error)
    }

    async fn commit(
        &self,
        connection: Self::Connection,
    ) -> Result<(), stoneflow_usecase::UsecaseError> {
        connection.commit().await.map_err(map_db_error)
    }

    async fn find_raw_setting(
        &self,
        key: &str,
    ) -> Result<Option<String>, stoneflow_usecase::UsecaseError> {
        self.repository
            .find_raw_setting(key)
            .await
            .map_err(map_app_error)
    }

    async fn set_raw_setting_in_connection(
        &self,
        connection: &Self::Connection,
        key: &str,
        raw_value: &str,
        updated_at: &str,
    ) -> Result<(), stoneflow_usecase::UsecaseError> {
        self.repository
            .set_raw_setting_in_connection(connection, key, raw_value, updated_at)
            .await
            .map_err(map_app_error)
    }
}

fn map_db_error(error: sea_orm::DbErr) -> stoneflow_usecase::UsecaseError {
    map_app_error(AppError::from(error))
}

fn map_app_error(error: AppError) -> stoneflow_usecase::UsecaseError {
    match error {
        AppError::Validation(message) => stoneflow_usecase::UsecaseError::validation(message),
        AppError::NotFound(message) => stoneflow_usecase::UsecaseError::not_found(message),
        AppError::Conflict(message) => stoneflow_usecase::UsecaseError::conflict(message),
        AppError::Database(message) => stoneflow_usecase::UsecaseError::storage(message),
        AppError::Initialization(message) => {
            stoneflow_usecase::UsecaseError::initialization(message)
        }
        AppError::Internal(message)
        | AppError::Forbidden(message)
        | AppError::CaptureSpaceUnavailable(message)
        | AppError::DefaultSpaceUnavailable(message)
        | AppError::CapturePersistence(message) => {
            stoneflow_usecase::UsecaseError::internal(message)
        }
    }
}

//! 更新服务运行时包装：组合 adapter 和 settings store，作为 Tauri state 管理。

use super::adapter::TauriUpdateAdapter;
use super::settings_store::FileUpdateSettingsAdapter;
use stoneflow_application::ApplicationError;

/// 具体类型的更新服务，注册为 Tauri managed state。
pub type RuntimeUpdateService =
    stoneflow_application::update::UpdateService<TauriUpdateAdapter, FileUpdateSettingsAdapter>;

/// 构建运行时更新服务实例。
pub fn build_update_service(
    app: &tauri::AppHandle,
) -> Result<RuntimeUpdateService, ApplicationError> {
    let adapter = TauriUpdateAdapter::new(app.clone());
    let settings_adapter = FileUpdateSettingsAdapter::new(app)?;
    Ok(stoneflow_application::update::UpdateService::new(
        adapter,
        settings_adapter,
    ))
}

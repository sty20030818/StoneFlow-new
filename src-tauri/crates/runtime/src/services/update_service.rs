//! 更新服务运行时包装：组合 adapter 和 settings store，作为 Tauri state 管理。

use super::update_adapter::TauriUpdateAdapter;
use super::update_settings_store::StoreUpdateSettingsAdapter;

/// 具体类型的更新服务，注册为 Tauri managed state。
pub type RuntimeUpdateService =
    stoneflow_usecase::update::UpdateService<TauriUpdateAdapter, StoreUpdateSettingsAdapter>;

/// 构建运行时更新服务实例。
pub fn build_update_service(app: &tauri::AppHandle) -> RuntimeUpdateService {
    let adapter = TauriUpdateAdapter::new(app.clone());
    let settings_adapter = StoreUpdateSettingsAdapter::new(app.clone());
    stoneflow_usecase::update::UpdateService::new(adapter, settings_adapter)
}

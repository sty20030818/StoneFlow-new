//! 云同步命令：配置、状态读取与手动同步（设置页唯一 surface）。

use tauri::State;

use crate::{
    app::error::AppError,
    app::state::AppState,
    sync::{
        self, ConfigureSyncInput, RebindSyncInput, SyncDiagnosticsPayload, SyncStatusPayload,
        UpdateSyncPolicyInput,
    },
};

#[tauri::command]
pub async fn get_sync_status(state: State<'_, AppState>) -> Result<SyncStatusPayload, AppError> {
    sync::get_sync_status(&state.sync, &state.database).await
}

#[tauri::command]
pub async fn configure_sync(
    app_handle: tauri::AppHandle,
    input: ConfigureSyncInput,
    state: State<'_, AppState>,
) -> Result<SyncStatusPayload, AppError> {
    // 保存前已验证并绑定实例；后台继续完成灌库或增量同步。
    let payload = sync::configure_sync(&state.database, &state.sync, input).await?;
    sync::trigger_startup_sync(&app_handle);
    Ok(payload)
}

#[tauri::command]
pub async fn adopt_legacy_sync_remote(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    sync::adopt_legacy_sync_remote(&app_handle, &state.database, &state.sync).await?;
    sync::trigger_startup_sync(&app_handle);
    Ok(())
}

#[tauri::command]
pub async fn rebind_sync(
    app_handle: tauri::AppHandle,
    input: RebindSyncInput,
    state: State<'_, AppState>,
) -> Result<SyncStatusPayload, AppError> {
    let payload = sync::rebind_sync(&app_handle, &state.database, &state.sync, input).await?;
    sync::trigger_startup_sync(&app_handle);
    Ok(payload)
}

#[tauri::command]
pub async fn update_sync_policy(
    input: UpdateSyncPolicyInput,
    state: State<'_, AppState>,
) -> Result<SyncStatusPayload, AppError> {
    sync::update_sync_policy(&state.database, &state.sync, input).await
}

#[tauri::command]
pub async fn get_sync_diagnostics(
    app_handle: tauri::AppHandle,
) -> Result<SyncDiagnosticsPayload, AppError> {
    sync::get_sync_diagnostics(&app_handle).await
}

#[tauri::command]
pub async fn run_sync(app_handle: tauri::AppHandle) -> Result<SyncStatusPayload, AppError> {
    sync::run_sync(&app_handle).await
}

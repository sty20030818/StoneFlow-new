//! 云同步命令：配置、状态读取与手动同步（设置页唯一 surface）。

use tauri::State;

use crate::{
    app::error::AppError,
    app::state::AppState,
    sync::{
        self, ConfigureSyncInput, SyncDiagnosticsPayload, SyncStatusPayload, UpdateSyncPolicyInput,
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
    // 先快速写本机配置（不连远端）；再后台跑一轮完整同步做验证/灌库。
    let payload = sync::configure_sync(&state.database, &state.sync, input).await?;
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

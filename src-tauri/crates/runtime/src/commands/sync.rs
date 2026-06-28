//! 云同步命令：配置、状态读取与手动同步。

use tauri::State;

use crate::{
    app::error::AppError,
    sync::{
        self, ConfigureSyncInput, RestoreSyncPayload, SyncDiagnosticsPayload, SyncRuntimeState,
        SyncStatusPayload,
    },
};
use stoneflow_storage::database::DatabaseRuntimeState;

#[tauri::command]
pub async fn get_sync_status(
    database: State<'_, DatabaseRuntimeState>,
    sync_state: State<'_, SyncRuntimeState>,
) -> Result<SyncStatusPayload, AppError> {
    sync::get_sync_status(sync_state.inner(), database.inner()).await
}

#[tauri::command]
pub async fn configure_sync(
    input: ConfigureSyncInput,
    database: State<'_, DatabaseRuntimeState>,
    sync_state: State<'_, SyncRuntimeState>,
) -> Result<SyncStatusPayload, AppError> {
    sync::configure_sync(database.inner(), sync_state.inner(), input).await
}

#[tauri::command]
pub async fn get_sync_diagnostics(
    app_handle: tauri::AppHandle,
) -> Result<SyncDiagnosticsPayload, AppError> {
    sync::get_sync_diagnostics(&app_handle).await
}

#[tauri::command]
pub async fn force_sync(app_handle: tauri::AppHandle) -> Result<SyncStatusPayload, AppError> {
    sync::force_sync(&app_handle).await
}

#[tauri::command]
pub async fn restore_sync(app_handle: tauri::AppHandle) -> Result<RestoreSyncPayload, AppError> {
    sync::restore_sync(&app_handle).await
}

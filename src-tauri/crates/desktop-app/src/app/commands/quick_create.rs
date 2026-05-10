//! Quick Create 基座命令。

use tauri::State;

use crate::app::{
    error::AppError,
    helper_runtime,
    state::{CommandHelperSnapshot, CommandHelperState, PendingCommandOpenIntent},
};

#[tauri::command]
pub async fn restore_main_window(app_handle: tauri::AppHandle) -> Result<(), AppError> {
    helper_runtime::restore_main_window(&app_handle).await
}

#[tauri::command]
pub async fn quit_stoneflow(
    app_handle: tauri::AppHandle,
    helper_state: State<'_, CommandHelperState>,
) -> Result<(), AppError> {
    helper_runtime::shutdown(helper_state.inner().clone()).await;
    app_handle.exit(0);
    Ok(())
}

#[tauri::command]
pub async fn get_quick_create_runtime_status(
    helper_state: State<'_, CommandHelperState>,
) -> Result<CommandHelperSnapshot, AppError> {
    Ok(helper_state.snapshot().await)
}

#[tauri::command]
pub async fn take_pending_command_open_intent(
    helper_state: State<'_, CommandHelperState>,
) -> Result<Option<PendingCommandOpenIntent>, AppError> {
    Ok(helper_state.take_pending_command_open().await)
}

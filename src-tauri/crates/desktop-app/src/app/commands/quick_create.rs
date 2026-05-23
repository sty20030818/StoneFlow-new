//! Quick Create 基座命令。

use tauri::Manager;
use tauri::State;

use crate::app::{
    error::AppError,
    state::{CommandHelperSnapshot, CommandHelperState, PendingCommandOpenIntent},
    supervisor,
};

#[tauri::command]
pub async fn restore_main_window(app_handle: tauri::AppHandle) -> Result<(), AppError> {
    crate::app::helper_runtime::restore_main_window(&app_handle).await
}

#[tauri::command]
pub async fn quit_stoneflow(
    app_handle: tauri::AppHandle,
) -> Result<(), AppError> {
    if let Some(handle) = app_handle.try_state::<supervisor::SupervisorHandle>() {
        handle.request_shutdown();
        handle.wait_stopped();
    }
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

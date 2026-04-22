//! Quick Capture 浮窗相关 Tauri Commands。

use tauri::{AppHandle, State};

use crate::app::command_helper::{
    open_quick_capture_from_helper, quit_from_helper, restore_main_window_from_helper,
    CommandHelperInvokeSource, CommandHelperSnapshot, CommandHelperState,
};
use crate::app::error::AppError;

#[tauri::command]
pub async fn open_quick_capture(
    app_handle: AppHandle,
    helper_state: State<'_, CommandHelperState>,
) -> Result<(), AppError> {
    open_quick_capture_from_helper(
        &app_handle,
        helper_state.inner(),
        CommandHelperInvokeSource::MainApp,
    )
    .map_err(|error| AppError::Internal(error.to_string()))
}

#[tauri::command]
pub async fn restore_main_window(
    app_handle: AppHandle,
    helper_state: State<'_, CommandHelperState>,
) -> Result<(), AppError> {
    restore_main_window_from_helper(&app_handle, helper_state.inner())
        .map_err(|error| AppError::Internal(error.to_string()))
}

#[tauri::command]
pub async fn quit_stoneflow(
    app_handle: AppHandle,
    helper_state: State<'_, CommandHelperState>,
) -> Result<(), AppError> {
    quit_from_helper(&app_handle, helper_state.inner())
        .map_err(|error| AppError::Internal(error.to_string()))
}

#[tauri::command]
pub async fn get_command_helper_status(
    helper_state: State<'_, CommandHelperState>,
) -> Result<CommandHelperSnapshot, AppError> {
    helper_state
        .snapshot()
        .map_err(|error| AppError::Internal(error.to_string()))
}

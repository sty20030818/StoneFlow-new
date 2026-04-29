//! Quick Capture 基座命令。

use tauri::{Manager, State};

use crate::app::error::AppError;
use crate::app::state::{CommandHelperSnapshot, CommandHelperState};
use crate::app::MAIN_WINDOW_LABEL;

#[tauri::command]
pub async fn restore_main_window(
    app_handle: tauri::AppHandle,
    helper_state: State<'_, CommandHelperState>,
) -> Result<(), AppError> {
    if let Some(window) = app_handle.get_webview_window(MAIN_WINDOW_LABEL) {
        window
            .show()
            .map_err(|error| AppError::internal(error.to_string()))?;
        window
            .unminimize()
            .map_err(|error| AppError::internal(error.to_string()))?;
        window
            .set_focus()
            .map_err(|error| AppError::internal(error.to_string()))?;
    }

    helper_state
        .record(true, None)
        .map_err(|error| AppError::internal(error.to_string()))?;
    Ok(())
}

#[tauri::command]
pub async fn quit_stoneflow(
    app_handle: tauri::AppHandle,
    helper_state: State<'_, CommandHelperState>,
) -> Result<(), AppError> {
    helper_state
        .record(true, None)
        .map_err(|error| AppError::internal(error.to_string()))?;
    app_handle.exit(0);
    Ok(())
}

#[tauri::command]
pub async fn get_command_helper_status(
    helper_state: State<'_, CommandHelperState>,
) -> Result<CommandHelperSnapshot, AppError> {
    helper_state
        .snapshot()
        .map_err(|error| AppError::internal(error.to_string()))
}

//! Launcher 命令：基座、业务与窗口 session。

pub mod domain;
pub mod error;
pub mod window;

pub use error::{
    LauncherErrorPayload, LauncherInitialStateResponse, LauncherOpenSessionResponse,
};

use tauri::State;

use crate::app::{
    error::AppError,
    state::{CommandOpenState, PendingCommandOpenIntent},
};
use crate::exit_coordinator::{request_exit_and_quit, ExitReason};

#[tauri::command]
pub async fn restore_main_window(app_handle: tauri::AppHandle) -> Result<(), AppError> {
    crate::command_open::restore_main_window(&app_handle).await
}

#[tauri::command]
pub async fn quit_stoneflow(app_handle: tauri::AppHandle) -> Result<(), AppError> {
    request_exit_and_quit(&app_handle, ExitReason::CommandQuit).await;
    Ok(())
}

#[tauri::command]
pub async fn take_pending_command_open_intent(
    command_open_state: State<'_, CommandOpenState>,
) -> Result<Option<PendingCommandOpenIntent>, AppError> {
    Ok(command_open_state.take_pending_command_open().await)
}

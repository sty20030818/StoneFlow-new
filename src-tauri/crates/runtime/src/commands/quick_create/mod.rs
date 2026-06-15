//! Quick Create 命令：基座、业务与窗口 session。

pub mod domain;
pub mod error;
pub mod window;

pub use error::{
    QuickCreateErrorPayload, QuickCreateInitialStateResponse, QuickCreateOpenSessionResponse,
};

use tauri::{Manager, State};

use crate::exit_coordinator::{ExitCoordinator, ExitReason};
use desktop_app::app::{
    error::AppError,
    state::{CommandHelperState, PendingCommandOpenIntent},
};

#[tauri::command]
pub async fn restore_main_window(app_handle: tauri::AppHandle) -> Result<(), AppError> {
    crate::command_open::restore_main_window(&app_handle).await
}

#[tauri::command]
pub async fn quit_stoneflow(app_handle: tauri::AppHandle) -> Result<(), AppError> {
    if let Some(exit_coordinator) = app_handle.try_state::<ExitCoordinator>() {
        exit_coordinator
            .request_exit(ExitReason::CommandQuit)
            .await?;
    }
    app_handle.exit(0);
    Ok(())
}

#[tauri::command]
pub async fn take_pending_command_open_intent(
    helper_state: State<'_, CommandHelperState>,
) -> Result<Option<PendingCommandOpenIntent>, AppError> {
    Ok(helper_state.take_pending_command_open().await)
}

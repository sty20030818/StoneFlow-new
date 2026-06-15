//! Quick Create 命令：基座、业务与窗口 session。

pub mod domain;
pub mod error;
pub mod window;

pub use error::{
    QuickCreateErrorPayload, QuickCreateInitialStateResponse, QuickCreateOpenSessionResponse,
};

use tauri::{Manager, State};

use crate::{
    exit_coordinator::{ExitCoordinator, ExitReason},
    supervisor::SupervisorHandle,
};
use desktop_app::app::{
    error::AppError,
    state::{CommandHelperSnapshot, CommandHelperState, PendingCommandOpenIntent},
};

#[tauri::command]
pub async fn restore_main_window(app_handle: tauri::AppHandle) -> Result<(), AppError> {
    crate::helper_runtime::restore_main_window(&app_handle).await
}

#[tauri::command]
pub async fn quit_stoneflow(app_handle: tauri::AppHandle) -> Result<(), AppError> {
    if let (Some(exit_coordinator), Some(handle)) = (
        app_handle.try_state::<ExitCoordinator>(),
        app_handle.try_state::<SupervisorHandle>(),
    ) {
        exit_coordinator
            .request_exit(&handle, ExitReason::CommandQuit)
            .await?;
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

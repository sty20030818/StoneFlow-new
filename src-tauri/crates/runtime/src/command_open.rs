//! 主窗口 command/open 意图投递。

use tauri::{Emitter, Manager};

use desktop_app::app::{
    error::AppError,
    state::{CommandHelperState, PendingCommandOpenIntent},
};

use crate::MAIN_WINDOW_LABEL;

const COMMAND_OPEN_EVENT: &str = "stoneflow://command/open";

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "snake_case")]
pub(crate) struct CommandOpenPayload {
    pub(crate) kind: &'static str,
    pub(crate) id: String,
    pub(crate) space_id: String,
    pub(crate) project_id: Option<String>,
    pub(crate) placement: &'static str,
}

pub async fn restore_main_window(app_handle: &tauri::AppHandle) -> Result<(), AppError> {
    if let Some(window) = app_handle.get_webview_window(MAIN_WINDOW_LABEL) {
        window
            .show()
            .map_err(|error: tauri::Error| AppError::internal(error.to_string()))?;
        window
            .unminimize()
            .map_err(|error: tauri::Error| AppError::internal(error.to_string()))?;
        window
            .set_focus()
            .map_err(|error: tauri::Error| AppError::internal(error.to_string()))?;
    }

    Ok(())
}

pub(crate) async fn dispatch_command_open(
    app_handle: &tauri::AppHandle,
    helper_state: &CommandHelperState,
    payload: CommandOpenPayload,
) -> Result<(), AppError> {
    helper_state
        .set_pending_command_open(PendingCommandOpenIntent {
            kind: payload.kind.to_owned(),
            id: payload.id.clone(),
            space_id: payload.space_id.clone(),
            project_id: payload.project_id.clone(),
            placement: payload.placement.to_owned(),
        })
        .await;

    match emit_command_open(app_handle, payload) {
        Ok(()) => Ok(()),
        Err(error) => {
            log::warn!("command open 事件即时投递失败，将保留待消费意图: {error}");
            Err(error)
        }
    }
}

fn emit_command_open(
    app_handle: &tauri::AppHandle,
    payload: CommandOpenPayload,
) -> Result<(), AppError> {
    app_handle
        .emit(COMMAND_OPEN_EVENT, payload)
        .map_err(|error| AppError::internal(error.to_string()))
}

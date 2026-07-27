//! Launcher 窗口 session 命令。

use tauri::State;

use crate::window::launcher::{
    runtime::LauncherWindowRuntimeState,
    session::{
        close_launcher_session, present_launcher_session, LauncherCloseSessionInput,
        LauncherSessionInput,
    },
    warmup::LauncherWarmupState,
};

use super::error::LauncherErrorPayload;

#[tauri::command]
pub async fn launcher_present_session(
    app_handle: tauri::AppHandle,
    runtime: State<'_, LauncherWindowRuntimeState>,
    input: LauncherSessionInput,
) -> Result<(), LauncherErrorPayload> {
    present_launcher_session(app_handle, runtime.inner(), &input.session_id).await
}

#[tauri::command]
pub async fn launcher_close_session(
    app_handle: tauri::AppHandle,
    runtime: State<'_, LauncherWindowRuntimeState>,
    input: LauncherCloseSessionInput,
) -> Result<(), LauncherErrorPayload> {
    close_launcher_session(app_handle, runtime.inner(), input).await
}

#[tauri::command]
pub async fn launcher_frontend_ready(
    warmup: State<'_, LauncherWarmupState>,
) -> Result<(), LauncherErrorPayload> {
    warmup.inner().mark_ready().await;
    Ok(())
}

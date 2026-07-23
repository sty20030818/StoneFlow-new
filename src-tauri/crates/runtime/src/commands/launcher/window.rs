//! Launcher 窗口 session 命令。

use tauri::State;

use crate::app::state::{ActiveScopeState, AppState};
use crate::window::launcher::{
    frontend::LauncherFrontendState,
    runtime::LauncherWindowRuntimeState,
    session::{
        close_launcher_session, prepare_launcher_session, present_launcher_session,
        LauncherCloseSessionInput, LauncherSessionInput,
    },
};

use super::error::{LauncherErrorPayload, LauncherOpenSessionResponse};

#[tauri::command]
pub async fn launcher_prepare_session(
    app_handle: tauri::AppHandle,
    frontend: State<'_, LauncherFrontendState>,
    runtime: State<'_, LauncherWindowRuntimeState>,
    state: State<'_, AppState>,
    active_scope: State<'_, ActiveScopeState>,
) -> Result<LauncherOpenSessionResponse, LauncherErrorPayload> {
    prepare_launcher_session(
        app_handle,
        frontend.inner(),
        runtime.inner(),
        state.inner(),
        active_scope.inner(),
    )
    .await
}

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
    frontend: State<'_, LauncherFrontendState>,
) -> Result<(), LauncherErrorPayload> {
    frontend.inner().mark_ready().await;
    log::debug!("runtime: launcher 前端监听器已就绪");
    Ok(())
}

#[tauri::command]
pub async fn launcher_frontend_unready(
    frontend: State<'_, LauncherFrontendState>,
) -> Result<(), LauncherErrorPayload> {
    frontend.inner().mark_unready().await;
    log::debug!("runtime: launcher 前端监听器已卸载");
    Ok(())
}

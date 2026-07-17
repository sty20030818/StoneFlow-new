//! Quick Create 窗口 session 命令。

use stoneflow_storage::database::DatabaseRuntimeState;
use tauri::State;

use crate::app::state::ActiveScopeState;
use crate::window::quick_create::{
    frontend::QuickCreateFrontendState,
    runtime::QuickPopupRuntimeState,
    session::{
        close_quick_create_session, prepare_quick_create_session, present_quick_create_session,
        QuickCreateCloseSessionInput, QuickCreateSessionInput,
    },
};

use super::error::{QuickCreateErrorPayload, QuickCreateOpenSessionResponse};

#[tauri::command]
pub async fn quick_create_prepare_session(
    app_handle: tauri::AppHandle,
    frontend: State<'_, QuickCreateFrontendState>,
    runtime: State<'_, QuickPopupRuntimeState>,
    database: State<'_, DatabaseRuntimeState>,
    active_scope: State<'_, ActiveScopeState>,
) -> Result<QuickCreateOpenSessionResponse, QuickCreateErrorPayload> {
    prepare_quick_create_session(
        app_handle,
        frontend.inner(),
        runtime.inner(),
        database.inner(),
        active_scope.inner(),
    )
    .await
}

#[tauri::command]
pub async fn quick_create_present_session(
    app_handle: tauri::AppHandle,
    runtime: State<'_, QuickPopupRuntimeState>,
    input: QuickCreateSessionInput,
) -> Result<(), QuickCreateErrorPayload> {
    present_quick_create_session(app_handle, runtime.inner(), &input.session_id).await
}

#[tauri::command]
pub async fn quick_create_close_session(
    app_handle: tauri::AppHandle,
    runtime: State<'_, QuickPopupRuntimeState>,
    input: QuickCreateCloseSessionInput,
) -> Result<(), QuickCreateErrorPayload> {
    close_quick_create_session(app_handle, runtime.inner(), input).await
}

#[tauri::command]
pub async fn quick_create_frontend_ready(
    frontend: State<'_, QuickCreateFrontendState>,
) -> Result<(), QuickCreateErrorPayload> {
    frontend.inner().mark_ready().await;
    log::debug!("runtime: quick create 前端监听器已就绪");
    Ok(())
}

#[tauri::command]
pub async fn quick_create_frontend_unready(
    frontend: State<'_, QuickCreateFrontendState>,
) -> Result<(), QuickCreateErrorPayload> {
    frontend.inner().mark_unready().await;
    log::debug!("runtime: quick create 前端监听器已卸载");
    Ok(())
}

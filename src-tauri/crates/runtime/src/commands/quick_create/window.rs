//! Quick Create 窗口 session 命令。

use serde::Deserialize;
use tauri::{Manager, State};
use stoneflow_storage::database::DatabaseRuntimeState;

use crate::window::{
    quick_create::{
        frontend::QuickCreateFrontendState,
        runtime::QuickPopupRuntimeState,
        session::{
            close_quick_create_session, commit_quick_create_layout, prepare_quick_create_session,
            present_quick_create_session, QuickCreateCloseSessionInput,
            QuickCreateCommitLayoutInput, QuickCreateSessionInput,
        },
    },
};
use crate::app::state::ActiveScopeState;

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
pub async fn quick_create_commit_layout(
    app_handle: tauri::AppHandle,
    runtime: State<'_, QuickPopupRuntimeState>,
    input: QuickCreateCommitLayoutInput,
) -> Result<(), QuickCreateErrorPayload> {
    commit_quick_create_layout(app_handle, runtime.inner(), input).await
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

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)] // 前端上报完整 DOM 指标；Rust 侧当前只记录关键字段
pub struct QuickCreateLayoutDiagnosticsInput {
    pub phase: String,
    pub target_height: f64,
    pub viewport_height: f64,
    pub device_pixel_ratio: f64,
    pub visual_viewport_width: f64,
    pub visual_viewport_height: f64,
    pub visual_viewport_scale: f64,
    pub document_client_height: f64,
    pub document_scroll_height: f64,
    pub body_client_height: f64,
    pub body_scroll_height: f64,
    pub root_client_height: f64,
    pub root_scroll_height: f64,
    pub surface_offset_height: f64,
    pub surface_scroll_height: f64,
    pub content_offset_height: f64,
    pub content_scroll_height: f64,
    pub footer_offset_height: f64,
    pub footer_scroll_height: f64,
}

#[tauri::command]
pub async fn quick_create_report_layout_diagnostics(
    app_handle: tauri::AppHandle,
    input: QuickCreateLayoutDiagnosticsInput,
) -> Result<(), QuickCreateErrorPayload> {
    use stoneflow_platform::quick_window::spec::QUICK_CREATE_LABEL;

    let native_metrics = app_handle
        .get_webview_window(QUICK_CREATE_LABEL)
        .map(|window| {
            let scale_factor = window.scale_factor().unwrap_or(1.0);
            let inner = window
                .inner_size()
                .map(|size| format!("{}×{}", size.width, size.height))
                .unwrap_or_else(|error| format!("err:{error}"));
            format!("native(scale={scale_factor:.2} inner={inner})")
        })
        .unwrap_or_else(|| "native(window=missing)".to_owned());

    log::debug!(
        "runtime: quick create layout diagnostics phase={} target={:.1} viewport={:.1} dpr={:.3} {}",
        input.phase,
        input.target_height,
        input.viewport_height,
        input.device_pixel_ratio,
        native_metrics,
    );

    Ok(())
}

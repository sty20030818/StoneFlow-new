//! Launcher 窗口 session 编排（单 Binary 路径）。

use serde::{Deserialize, Serialize};
use stoneflow_platform::launcher_window::spec::LAUNCHER_LABEL;
use tauri::{Emitter, Manager};

use super::controller::build_quick_controller;

use crate::app::error::AppError;
use crate::app::state::{map_active_scope, ActiveScopeState, AppState};

use super::runtime::{
    LauncherWindowCloseReason, LauncherWindowOpenReason, LauncherWindowRuntimeState,
};

use crate::commands::launcher::{LauncherErrorPayload, LauncherOpenSessionResponse};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherSessionInput {
    pub session_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherCloseSessionInput {
    pub session_id: String,
    pub reason: LauncherCloseReasonInput,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum LauncherCloseReasonInput {
    Escape,
    Blur,
    Submit,
    Toggle,
    Invalidated,
}

pub async fn prepare_launcher_session(
    app_handle: tauri::AppHandle,
    runtime: &LauncherWindowRuntimeState,
    app_state: &AppState,
    active_scope: &ActiveScopeState,
) -> Result<LauncherOpenSessionResponse, LauncherErrorPayload> {
    let prepare_started_at = std::time::Instant::now();
    let controller = build_quick_controller(app_handle.clone());
    let session = runtime
        .begin_open(LauncherWindowOpenReason::GlobalShortcut)
        .await
        .map_err(|message| LauncherErrorPayload {
            type_: "Internal",
            message: message.to_owned(),
        })?;

    if let Err(message) = controller.prepare_hidden() {
        runtime.mark_error().await;
        runtime.reset_to_idle().await;
        return Err(LauncherErrorPayload {
            type_: "Internal",
            message,
        });
    }

    let open_context = app_state
        .launcher_context
        .get_open_context(map_active_scope(active_scope.get().await))
        .await
        .map_err(|error| LauncherErrorPayload::from(AppError::from(error)))?;
    log::info!(
        "launcher.session_prepared context_ms={}",
        prepare_started_at.elapsed().as_millis()
    );

    let response = LauncherOpenSessionResponse {
        session_id: session.session_id.clone(),
        opened_at: session.opened_at.to_rfc3339(),
        open_context,
    };

    let Some(window) = app_handle.get_webview_window(LAUNCHER_LABEL) else {
        runtime.reset_to_idle().await;
        return Err(LauncherErrorPayload {
            type_: "Internal",
            message: "launcher 窗口未初始化".to_owned(),
        });
    };

    if let Err(error) = window.emit("launcher:session-prepared", response.clone()) {
        runtime.mark_error().await;
        runtime.reset_to_idle().await;
        return Err(LauncherErrorPayload {
            type_: "Internal",
            message: format!("launcher:session-prepared 事件发送失败: {error}"),
        });
    }

    Ok(response)
}

pub async fn emit_launcher_session_invalidated(
    app_handle: &tauri::AppHandle,
    runtime: &LauncherWindowRuntimeState,
    session_id: &str,
    reason: LauncherWindowCloseReason,
) {
    let reason_payload = map_close_reason_output(reason);

    if let Some(window) = app_handle.get_webview_window(LAUNCHER_LABEL) {
        if let Err(error) = window.emit(
            "launcher:session-invalidated",
            serde_json::json!({
                "sessionId": session_id,
                "reason": reason_payload,
            }),
        ) {
            log::warn!("runtime: launcher:session-invalidated 事件发送失败: {error}");
        }
    }

    if let Err(error) = runtime.begin_close_for(session_id, reason).await {
        log::warn!("runtime: invalidated session 进入 closing 失败: {error}");
        runtime.mark_error().await;
    }

    if let Err(error) = runtime.finish_close_for(session_id).await {
        log::warn!("runtime: invalidated session 清理失败: {error}");
        runtime.reset_to_idle().await;
    }
}

pub async fn present_launcher_session(
    app_handle: tauri::AppHandle,
    runtime: &LauncherWindowRuntimeState,
    session_id: &str,
) -> Result<(), LauncherErrorPayload> {
    runtime
        .mark_presenting_for(session_id)
        .await
        .map_err(|message| LauncherErrorPayload {
            type_: "Internal",
            message: message.to_owned(),
        })?;

    let controller = build_quick_controller(app_handle);
    controller
        .present()
        .map_err(|message| LauncherErrorPayload {
            type_: "Internal",
            message,
        })
}

pub async fn close_launcher_session(
    app_handle: tauri::AppHandle,
    runtime: &LauncherWindowRuntimeState,
    input: LauncherCloseSessionInput,
) -> Result<(), LauncherErrorPayload> {
    let controller = build_quick_controller(app_handle);
    let reason = map_close_reason(input.reason);

    if runtime
        .begin_close_for(&input.session_id, reason)
        .await
        .map_err(|message| LauncherErrorPayload {
            type_: "Internal",
            message: message.to_owned(),
        })?
        .is_some()
    {
        controller.hide().map_err(|message| LauncherErrorPayload {
            type_: "Internal",
            message,
        })?;
        runtime
            .finish_close_for(&input.session_id)
            .await
            .map_err(|message| LauncherErrorPayload {
                type_: "Internal",
                message: message.to_owned(),
            })?;
    }

    Ok(())
}

pub async fn shutdown_launcher(
    app_handle: &tauri::AppHandle,
    runtime: &LauncherWindowRuntimeState,
) {
    let controller = build_quick_controller(app_handle.clone());
    if let Some(session_id) = runtime.active_session_id().await {
        match runtime
            .begin_close_for(&session_id, LauncherWindowCloseReason::Invalidated)
            .await
        {
            Ok(Some(session)) => {
                if let Err(error) = controller.hide() {
                    log::warn!("runtime: shutdown 隐藏 launcher 失败: {error}");
                }
                if let Err(error) = runtime.finish_close_for(&session.session_id).await {
                    log::warn!("runtime: shutdown 清理 launcher session 失败: {error}");
                    runtime.reset_to_idle().await;
                }
            }
            Ok(None) => {
                let _ = controller.hide();
                runtime.reset_to_idle().await;
            }
            Err(error) => {
                log::warn!("runtime: shutdown 进入 closing 失败: {error}");
                let _ = controller.hide();
                runtime.reset_to_idle().await;
            }
        }
    } else {
        let _ = controller.hide();
        runtime.reset_to_idle().await;
    }
}

pub fn map_close_reason(reason: LauncherCloseReasonInput) -> LauncherWindowCloseReason {
    match reason {
        LauncherCloseReasonInput::Escape => LauncherWindowCloseReason::Escape,
        LauncherCloseReasonInput::Blur => LauncherWindowCloseReason::Blur,
        LauncherCloseReasonInput::Submit => LauncherWindowCloseReason::Submit,
        LauncherCloseReasonInput::Toggle => LauncherWindowCloseReason::Toggle,
        LauncherCloseReasonInput::Invalidated => LauncherWindowCloseReason::Invalidated,
    }
}

fn map_close_reason_output(reason: LauncherWindowCloseReason) -> &'static str {
    match reason {
        LauncherWindowCloseReason::Escape => "escape",
        LauncherWindowCloseReason::Blur => "blur",
        LauncherWindowCloseReason::Submit => "submit",
        LauncherWindowCloseReason::Toggle => "toggle",
        LauncherWindowCloseReason::Invalidated => "invalidated",
    }
}

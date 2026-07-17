//! Quick Create 窗口 session 编排（单 Binary 路径）。

use serde::{Deserialize, Serialize};
use stoneflow_platform::quick_window::spec::QUICK_CREATE_LABEL;
use tauri::{Emitter, Manager};

use super::controller::build_quick_controller;
use stoneflow_storage::database::DatabaseRuntimeState;

use crate::app::state::ActiveScopeState;
use crate::composition::build_quick_create_session_bridge;

use super::frontend::QuickCreateFrontendState;
use super::runtime::{QuickPopupCloseReason, QuickPopupOpenReason, QuickPopupRuntimeState};

use crate::commands::quick_create::{
    QuickCreateErrorPayload, QuickCreateInitialStateResponse, QuickCreateOpenSessionResponse,
};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickCreateSessionInput {
    pub session_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickCreateCloseSessionInput {
    pub session_id: String,
    pub reason: QuickCreateCloseReasonInput,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum QuickCreateCloseReasonInput {
    Escape,
    Blur,
    Submit,
    Toggle,
    Invalidated,
}

pub async fn prepare_quick_create_session(
    app_handle: tauri::AppHandle,
    frontend: &QuickCreateFrontendState,
    runtime: &QuickPopupRuntimeState,
    database: &DatabaseRuntimeState,
    active_scope: &ActiveScopeState,
) -> Result<QuickCreateOpenSessionResponse, QuickCreateErrorPayload> {
    if !frontend.is_ready().await {
        return Err(QuickCreateErrorPayload {
            type_: "Internal",
            message: "quick create 前端未 ready，无法准备 session".to_owned(),
        });
    }

    let controller = build_quick_controller(app_handle.clone());
    let session = runtime
        .begin_open(QuickPopupOpenReason::GlobalShortcut)
        .await
        .map_err(|message| QuickCreateErrorPayload {
            type_: "Internal",
            message: message.to_owned(),
        })?;

    if let Err(message) = controller.prepare_hidden() {
        runtime.mark_error().await;
        runtime.reset_to_idle().await;
        return Err(QuickCreateErrorPayload {
            type_: "Internal",
            message,
        });
    }

    let bridge = build_quick_create_session_bridge(database);
    let open_context = bridge
        .prepare_initial_state(active_scope.get().await)
        .await
        .map_err(QuickCreateErrorPayload::from)?;

    let open_context = QuickCreateInitialStateResponse::from_dto(open_context);
    let response = QuickCreateOpenSessionResponse {
        session_id: session.session_id.clone(),
        opened_at: session.opened_at.to_rfc3339(),
        open_context,
    };

    let Some(window) = app_handle.get_webview_window(QUICK_CREATE_LABEL) else {
        runtime.reset_to_idle().await;
        return Err(QuickCreateErrorPayload {
            type_: "Internal",
            message: "quick create 窗口未初始化".to_owned(),
        });
    };

    if let Err(error) = window.emit("quick-create:session-prepared", response.clone()) {
        runtime.mark_error().await;
        runtime.reset_to_idle().await;
        return Err(QuickCreateErrorPayload {
            type_: "Internal",
            message: format!("quick-create:session-prepared 事件发送失败: {error}"),
        });
    }

    Ok(response)
}

pub async fn emit_quick_create_session_invalidated(
    app_handle: &tauri::AppHandle,
    runtime: &QuickPopupRuntimeState,
    session_id: &str,
    reason: QuickPopupCloseReason,
) {
    let reason_payload = map_close_reason_output(reason);

    if let Some(window) = app_handle.get_webview_window(QUICK_CREATE_LABEL) {
        if let Err(error) = window.emit(
            "quick-create:session-invalidated",
            serde_json::json!({
                "sessionId": session_id,
                "reason": reason_payload,
            }),
        ) {
            log::warn!("runtime: quick-create:session-invalidated 事件发送失败: {error}");
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

pub async fn present_quick_create_session(
    app_handle: tauri::AppHandle,
    runtime: &QuickPopupRuntimeState,
    session_id: &str,
) -> Result<(), QuickCreateErrorPayload> {
    runtime
        .mark_presenting_for(session_id)
        .await
        .map_err(|message| QuickCreateErrorPayload {
            type_: "Internal",
            message: message.to_owned(),
        })?;

    let controller = build_quick_controller(app_handle);
    controller
        .present()
        .map_err(|message| QuickCreateErrorPayload {
            type_: "Internal",
            message,
        })
}

pub async fn close_quick_create_session(
    app_handle: tauri::AppHandle,
    runtime: &QuickPopupRuntimeState,
    input: QuickCreateCloseSessionInput,
) -> Result<(), QuickCreateErrorPayload> {
    let controller = build_quick_controller(app_handle);
    let reason = map_close_reason(input.reason);

    if runtime
        .begin_close_for(&input.session_id, reason)
        .await
        .map_err(|message| QuickCreateErrorPayload {
            type_: "Internal",
            message: message.to_owned(),
        })?
        .is_some()
    {
        controller
            .hide()
            .map_err(|message| QuickCreateErrorPayload {
                type_: "Internal",
                message,
            })?;
        runtime
            .finish_close_for(&input.session_id)
            .await
            .map_err(|message| QuickCreateErrorPayload {
                type_: "Internal",
                message: message.to_owned(),
            })?;
    }

    Ok(())
}

pub async fn shutdown_quick_create(
    app_handle: &tauri::AppHandle,
    runtime: &QuickPopupRuntimeState,
) {
    let controller = build_quick_controller(app_handle.clone());
    if let Some(session_id) = runtime.active_session_id().await {
        match runtime
            .begin_close_for(&session_id, QuickPopupCloseReason::Invalidated)
            .await
        {
            Ok(Some(session)) => {
                if let Err(error) = controller.hide() {
                    log::warn!("runtime: shutdown 隐藏 quick create 失败: {error}");
                }
                if let Err(error) = runtime.finish_close_for(&session.session_id).await {
                    log::warn!("runtime: shutdown 清理 quick create session 失败: {error}");
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

pub fn map_close_reason(reason: QuickCreateCloseReasonInput) -> QuickPopupCloseReason {
    match reason {
        QuickCreateCloseReasonInput::Escape => QuickPopupCloseReason::Escape,
        QuickCreateCloseReasonInput::Blur => QuickPopupCloseReason::Blur,
        QuickCreateCloseReasonInput::Submit => QuickPopupCloseReason::Submit,
        QuickCreateCloseReasonInput::Toggle => QuickPopupCloseReason::Toggle,
        QuickCreateCloseReasonInput::Invalidated => QuickPopupCloseReason::Invalidated,
    }
}

fn map_close_reason_output(reason: QuickPopupCloseReason) -> &'static str {
    match reason {
        QuickPopupCloseReason::Escape => "escape",
        QuickPopupCloseReason::Blur => "blur",
        QuickPopupCloseReason::Submit => "submit",
        QuickPopupCloseReason::Toggle => "toggle",
        QuickPopupCloseReason::Invalidated => "invalidated",
    }
}

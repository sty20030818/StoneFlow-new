//! Quick Create 窗口 session 编排（单 Binary 路径）。

use serde::{Deserialize, Serialize};
use stoneflow_platform::quick_window::spec::{
    QUICK_CREATE_LABEL, QUICK_CREATE_WINDOW_MIN_HEIGHT, QUICK_CREATE_WINDOW_WIDTH,
};
use tauri::{Emitter, LogicalSize, Manager, Size};

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
pub struct QuickCreateCommitLayoutInput {
    pub session_id: String,
    pub height: f64,
    #[serde(default)]
    pub device_pixel_ratio: Option<f64>,
}

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

pub async fn commit_quick_create_layout(
    app_handle: tauri::AppHandle,
    runtime: &QuickPopupRuntimeState,
    input: QuickCreateCommitLayoutInput,
) -> Result<(), QuickCreateErrorPayload> {
    let Some(window) = app_handle.get_webview_window(QUICK_CREATE_LABEL) else {
        return Err(QuickCreateErrorPayload {
            type_: "Internal",
            message: "quick create 窗口未初始化".to_owned(),
        });
    };

    runtime
        .mark_waiting_layout_for(&input.session_id)
        .await
        .map_err(|message| QuickCreateErrorPayload {
            type_: "Internal",
            message: message.to_owned(),
        })?;

    let native_scale_factor = window.scale_factor().unwrap_or(1.0);
    let css_to_native_logical_ratio =
        quick_create_css_to_native_logical_ratio(input.device_pixel_ratio, native_scale_factor);
    let target_css_height = input.height.max(QUICK_CREATE_WINDOW_MIN_HEIGHT);
    let target_window_width = QUICK_CREATE_WINDOW_WIDTH * css_to_native_logical_ratio;
    let target_window_height = target_css_height * css_to_native_logical_ratio;

    window
        .set_min_size(Some(Size::Logical(LogicalSize::new(
            QUICK_CREATE_WINDOW_WIDTH * css_to_native_logical_ratio,
            QUICK_CREATE_WINDOW_MIN_HEIGHT * css_to_native_logical_ratio,
        ))))
        .map_err(|error| QuickCreateErrorPayload {
            type_: "Internal",
            message: format!("设置 quick create 最小窗口尺寸失败: {error}"),
        })?;

    let controller = build_quick_controller(app_handle);
    controller
        .apply_height(target_window_height)
        .map_err(|message| QuickCreateErrorPayload {
            type_: "Internal",
            message,
        })?;

    runtime
        .require_active_session(&input.session_id)
        .await
        .map_err(|message| QuickCreateErrorPayload {
            type_: "Internal",
            message: message.to_owned(),
        })?;

    let _ = (target_window_width, target_window_height);
    Ok(())
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

fn quick_create_css_to_native_logical_ratio(
    device_pixel_ratio: Option<f64>,
    native_scale_factor: f64,
) -> f64 {
    let safe_native_scale_factor = positive_or_one(native_scale_factor);
    let safe_device_pixel_ratio = device_pixel_ratio
        .filter(|ratio| ratio.is_finite() && *ratio > 0.0)
        .unwrap_or(safe_native_scale_factor);

    safe_device_pixel_ratio / safe_native_scale_factor
}

fn positive_or_one(value: f64) -> f64 {
    if value.is_finite() && value > 0.0 {
        value
    } else {
        1.0
    }
}

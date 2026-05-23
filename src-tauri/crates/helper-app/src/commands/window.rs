use serde::{Deserialize, Serialize};
use tauri::{Emitter, LogicalSize, Manager, Size};

use crate::{
    ipc_client,
    commands::domain::{helper_quick_get_initial_state, HelperQuickInitialStateResponse},
    lifecycle::HelperLifecycleState,
    runtime::{QuickPopupCloseReason, QuickPopupRuntimeState},
    window_controller,
    window_spec::{QUICK_CREATE_LABEL, QUICK_CREATE_WINDOW_MIN_HEIGHT, QUICK_CREATE_WINDOW_WIDTH},
};

use super::QuickCreateErrorPayload;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HelperQuickOpenSessionResponse {
    pub session_id: String,
    pub opened_at: String,
    #[serde(flatten)]
    pub open_context: HelperQuickInitialStateResponse,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HelperQuickCommitLayoutInput {
    pub session_id: String,
    pub height: f64,
    #[serde(default)]
    pub device_pixel_ratio: Option<f64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HelperQuickSessionInput {
    pub session_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HelperQuickCloseSessionInput {
    pub session_id: String,
    pub reason: HelperQuickCloseReasonInput,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum HelperQuickCloseReasonInput {
    Escape,
    Blur,
    Submit,
    Toggle,
    Invalidated,
}

pub async fn prepare_quick_create_session(
    app_handle: tauri::AppHandle,
    lifecycle: &HelperLifecycleState,
    runtime: &QuickPopupRuntimeState,
) -> Result<HelperQuickOpenSessionResponse, QuickCreateErrorPayload> {
    lifecycle
        .guard_running("prepare_session")
        .await
        .map_err(|message| QuickCreateErrorPayload {
            type_: "Internal",
            message: message.to_owned(),
        })?;

    if !lifecycle.is_frontend_ready().await {
        return Err(QuickCreateErrorPayload {
            type_: "Internal",
            message: "quick create 前端未 ready，无法准备 session".to_owned(),
        });
    }

    let controller = window_controller::build_controller(app_handle.clone());
    let session = runtime
        .begin_open(crate::runtime::QuickPopupOpenReason::GlobalShortcut)
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

    let open_context = match helper_quick_get_initial_state().await {
        Ok(open_context) => open_context,
        Err(error) => {
            runtime.mark_error().await;
            runtime.reset_to_idle().await;
            return Err(error);
        }
    };
    let response = HelperQuickOpenSessionResponse {
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
            log::warn!("helper: quick-create:session-invalidated 事件发送失败: {error}");
        }
    }

    if let Err(error) = runtime.begin_close_for(session_id, reason).await {
        log::warn!("helper: invalidated session 进入 closing 失败: {error}");
        runtime.mark_error().await;
    }

    if let Err(error) = runtime.finish_close_for(session_id).await {
        log::warn!("helper: invalidated session 清理失败: {error}");
        runtime.reset_to_idle().await;
    }
}

#[tauri::command]
pub async fn helper_quick_prepare_session(
    app_handle: tauri::AppHandle,
    lifecycle: tauri::State<'_, HelperLifecycleState>,
    runtime: tauri::State<'_, QuickPopupRuntimeState>,
) -> Result<HelperQuickOpenSessionResponse, QuickCreateErrorPayload> {
    prepare_quick_create_session(app_handle, lifecycle.inner(), runtime.inner()).await
}

#[tauri::command]
pub async fn helper_quick_commit_layout(
    app_handle: tauri::AppHandle,
    runtime: tauri::State<'_, QuickPopupRuntimeState>,
    input: HelperQuickCommitLayoutInput,
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

    log::debug!(
        "helper: quick create commit_layout session={} css_size={:.1}×{:.1} dpr={} native_scale={:.3} ratio={:.4} -> applied_logical={:.1}×{:.1}",
        input.session_id,
        QUICK_CREATE_WINDOW_WIDTH,
        input.height,
        format_optional_f64(input.device_pixel_ratio),
        native_scale_factor,
        css_to_native_logical_ratio,
        target_window_width,
        target_window_height
    );

    window
        .set_min_size(Some(Size::Logical(LogicalSize::new(
            QUICK_CREATE_WINDOW_WIDTH * css_to_native_logical_ratio,
            QUICK_CREATE_WINDOW_MIN_HEIGHT * css_to_native_logical_ratio,
        ))))
        .map_err(|error| QuickCreateErrorPayload {
            type_: "Internal",
            message: format!("设置 quick create 最小窗口尺寸失败: {error}"),
        })?;

    let controller = window_controller::build_controller(app_handle.clone());
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

    Ok(())
}

#[tauri::command]
pub async fn helper_quick_present_session(
    app_handle: tauri::AppHandle,
    lifecycle: tauri::State<'_, HelperLifecycleState>,
    runtime: tauri::State<'_, QuickPopupRuntimeState>,
    input: HelperQuickSessionInput,
) -> Result<(), QuickCreateErrorPayload> {
    lifecycle
        .guard_running("present_session")
        .await
        .map_err(|message| QuickCreateErrorPayload {
            type_: "Internal",
            message: message.to_owned(),
        })?;

    runtime
        .mark_presenting_for(&input.session_id)
        .await
        .map_err(|message| QuickCreateErrorPayload {
            type_: "Internal",
            message: message.to_owned(),
        })?;

    let controller = window_controller::build_controller(app_handle);
    controller.present().map_err(|message| QuickCreateErrorPayload {
        type_: "Internal",
        message,
    })?;

    Ok(())
}

#[tauri::command]
pub async fn helper_quick_close_session(
    app_handle: tauri::AppHandle,
    runtime: tauri::State<'_, QuickPopupRuntimeState>,
    input: HelperQuickCloseSessionInput,
) -> Result<(), QuickCreateErrorPayload> {
    let controller = window_controller::build_controller(app_handle);
    let reason = map_close_reason(input.reason);

    match runtime
        .begin_close_for(&input.session_id, reason)
        .await
        .map_err(|message| QuickCreateErrorPayload {
            type_: "Internal",
            message: message.to_owned(),
        })? {
        Some(_) => {
            controller.hide().map_err(|message| QuickCreateErrorPayload {
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
        None => {}
    }

    Ok(())
}

#[tauri::command]
pub async fn helper_quick_frontend_ready(
    lifecycle: tauri::State<'_, HelperLifecycleState>,
) -> Result<(), QuickCreateErrorPayload> {
    apply_frontend_ready(lifecycle.inner(), || ipc_client::notify_window_ready()).await?;
    log::debug!("helper: quick create 前端监听器已就绪");
    Ok(())
}

#[tauri::command]
pub async fn helper_quick_frontend_unready(
    lifecycle: tauri::State<'_, HelperLifecycleState>,
) -> Result<(), QuickCreateErrorPayload> {
    apply_frontend_unready(lifecycle.inner(), || ipc_client::notify_window_unready()).await?;
    log::debug!("helper: quick create 前端监听器已卸载");
    Ok(())
}

pub async fn shutdown_quick_create(
    app_handle: &tauri::AppHandle,
    runtime: &QuickPopupRuntimeState,
) {
    let controller = window_controller::build_controller(app_handle.clone());
    if let Some(session_id) = runtime.active_session_id().await {
        match runtime
            .begin_close_for(&session_id, QuickPopupCloseReason::Invalidated)
            .await
        {
            Ok(Some(session)) => {
                log::info!("helper: shutdown 关闭 quick create session={}", session.session_id);
                if let Err(error) = controller.hide() {
                    log::warn!("helper: shutdown 隐藏 quick create 失败: {error}");
                }
                if let Err(error) = runtime.finish_close_for(&session.session_id).await {
                    log::warn!("helper: shutdown 清理 quick create session 失败: {error}");
                    runtime.reset_to_idle().await;
                }
            }
            Ok(None) => {
                if let Err(error) = controller.hide() {
                    log::warn!("helper: shutdown 隐藏 idle quick create 失败: {error}");
                }
                runtime.reset_to_idle().await;
            }
            Err(error) => {
                log::warn!("helper: shutdown 进入 closing 失败: {error}");
                if let Err(hide_error) = controller.hide() {
                    log::warn!("helper: shutdown 隐藏 quick create 失败: {hide_error}");
                }
                runtime.reset_to_idle().await;
            }
        }
    } else {
        if let Err(error) = controller.hide() {
            log::warn!("helper: shutdown 隐藏 quick create 失败: {error}");
        }
        runtime.reset_to_idle().await;
    }
}

async fn apply_frontend_ready<F, Fut>(
    lifecycle: &HelperLifecycleState,
    notify: F,
) -> Result<(), QuickCreateErrorPayload>
where
    F: FnOnce() -> Fut,
    Fut: std::future::Future<Output = Result<(), stoneflow_ipc_protocol::IpcError>>,
{
    lifecycle.mark_frontend_ready().await;
    notify().await.map_err(|error| QuickCreateErrorPayload {
        type_: "Internal",
        message: format!("quick create window ready 上报失败: {error}"),
    })?;
    Ok(())
}

async fn apply_frontend_unready<F, Fut>(
    lifecycle: &HelperLifecycleState,
    notify: F,
) -> Result<(), QuickCreateErrorPayload>
where
    F: FnOnce() -> Fut,
    Fut: std::future::Future<Output = Result<(), stoneflow_ipc_protocol::IpcError>>,
{
    lifecycle.mark_frontend_unready().await;
    notify().await.map_err(|error| QuickCreateErrorPayload {
        type_: "Internal",
        message: format!("quick create window unready 上报失败: {error}"),
    })?;
    Ok(())
}

fn map_close_reason(reason: HelperQuickCloseReasonInput) -> QuickPopupCloseReason {
    match reason {
        HelperQuickCloseReasonInput::Escape => QuickPopupCloseReason::Escape,
        HelperQuickCloseReasonInput::Blur => QuickPopupCloseReason::Blur,
        HelperQuickCloseReasonInput::Submit => QuickPopupCloseReason::Submit,
        HelperQuickCloseReasonInput::Toggle => QuickPopupCloseReason::Toggle,
        HelperQuickCloseReasonInput::Invalidated => QuickPopupCloseReason::Invalidated,
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

fn format_optional_f64(value: Option<f64>) -> String {
    value
        .map(|value| format!("{value:.3}"))
        .unwrap_or_else(|| "missing".to_owned())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{
        atomic::{AtomicUsize, Ordering},
        Arc,
    };
    use stoneflow_ipc_protocol::IpcError;

    #[tokio::test]
    async fn frontend_ready_should_mark_runtime_and_notify_main_app() {
        let lifecycle = HelperLifecycleState::default();
        let notify_calls = Arc::new(AtomicUsize::new(0));
        let notify_calls_for_closure = notify_calls.clone();

        apply_frontend_ready(&lifecycle, move || {
            let notify_calls = notify_calls_for_closure.clone();
            async move {
                notify_calls.fetch_add(1, Ordering::SeqCst);
                Ok(())
            }
        })
        .await
        .expect("frontend ready should succeed");

        assert!(lifecycle.is_frontend_ready().await);
        assert_eq!(notify_calls.load(Ordering::SeqCst), 1);
    }

    #[tokio::test]
    async fn frontend_unready_should_clear_runtime_and_notify_main_app() {
        let lifecycle = HelperLifecycleState::default();
        lifecycle.mark_frontend_ready().await;
        let notify_calls = Arc::new(AtomicUsize::new(0));
        let notify_calls_for_closure = notify_calls.clone();

        apply_frontend_unready(&lifecycle, move || {
            let notify_calls = notify_calls_for_closure.clone();
            async move {
                notify_calls.fetch_add(1, Ordering::SeqCst);
                Ok(())
            }
        })
        .await
        .expect("frontend unready should succeed");

        assert!(!lifecycle.is_frontend_ready().await);
        assert_eq!(notify_calls.load(Ordering::SeqCst), 1);
    }

    #[tokio::test]
    async fn frontend_ready_should_return_notify_error() {
        let lifecycle = HelperLifecycleState::default();

        let error = apply_frontend_ready(&lifecycle, || async {
            Err(IpcError::Internal("notify failed".to_owned()))
        })
        .await
        .expect_err("notify failure should bubble up");

        assert!(lifecycle.is_frontend_ready().await);
        assert_eq!(error.type_, "Internal");
        assert!(error.message.contains("quick create window ready 上报失败"));
    }

}

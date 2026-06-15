//! 主应用注入给 platform 的 Quick Create 窗口回调。

use std::sync::Arc;

use tauri::{AppHandle, Emitter, Manager, Wry};
use stoneflow_platform::quick_window::{spec::QUICK_CREATE_LABEL, QuickWindowCallbacks};

use super::quick_runtime::{QuickPopupCloseReason, QuickPopupRuntimeState};
use super::quick_session::emit_quick_create_session_invalidated;

pub fn runtime_quick_window_callbacks() -> QuickWindowCallbacks {
    QuickWindowCallbacks {
        on_became_key: Arc::new(on_became_key),
        on_resign_key: Arc::new(on_resign_key),
    }
}

fn on_became_key(app: AppHandle<Wry>) {
    if let Some(runtime_state) = app.try_state::<QuickPopupRuntimeState>() {
        let runtime = runtime_state.inner().clone();
        let app_for_presented = app.clone();
        tauri::async_runtime::spawn(async move {
            let Some(session_id) = runtime.active_session_id().await else {
                log::warn!("runtime: quick create visible 时缺少 active session");
                return;
            };
            if let Err(error) = runtime.mark_visible_for(&session_id).await {
                log::warn!("runtime: quick create 标记 visible 失败: {error}");
                return;
            }
            if let Some(window) = app_for_presented.get_webview_window(QUICK_CREATE_LABEL) {
                if let Err(error) = window.emit(
                    "quick-create:session-presented",
                    serde_json::json!({ "sessionId": session_id }),
                ) {
                    log::warn!("runtime: quick-create:session-presented 事件发送失败: {error}");
                }
            }
        });
    }
}

fn on_resign_key(app: AppHandle<Wry>) {
    if let Some(runtime_state) = app.try_state::<QuickPopupRuntimeState>() {
        let runtime = runtime_state.inner().clone();
        let app_for_close = app.clone();
        tauri::async_runtime::spawn(async move {
            let Some(session_id) = runtime.active_session_id().await else {
                return;
            };
            emit_quick_create_session_invalidated(
                &app_for_close,
                &runtime,
                &session_id,
                QuickPopupCloseReason::Blur,
            )
            .await;
        });
    }
}

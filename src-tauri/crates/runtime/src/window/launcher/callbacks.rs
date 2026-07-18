//! 主应用注入给 platform 的 Launcher 窗口回调。

use std::sync::Arc;

use stoneflow_platform::launcher_window::{spec::LAUNCHER_LABEL, LauncherWindowCallbacks};
use tauri::{AppHandle, Emitter, Manager, Wry};

use super::runtime::{LauncherWindowCloseReason, LauncherWindowRuntimeState};
use super::session::emit_launcher_session_invalidated;

pub fn runtime_launcher_window_callbacks() -> LauncherWindowCallbacks {
    LauncherWindowCallbacks {
        on_became_key: Arc::new(on_became_key),
        on_resign_key: Arc::new(on_resign_key),
    }
}

fn on_became_key(app: AppHandle<Wry>) {
    if let Some(runtime_state) = app.try_state::<LauncherWindowRuntimeState>() {
        let runtime = runtime_state.inner().clone();
        let app_for_presented = app.clone();
        tauri::async_runtime::spawn(async move {
            let Some(session_id) = runtime.active_session_id().await else {
                log::warn!("runtime: launcher visible 时缺少 active session");
                return;
            };
            if let Err(error) = runtime.mark_visible_for(&session_id).await {
                log::warn!("runtime: launcher 标记 visible 失败: {error}");
                return;
            }
            if let Some(window) = app_for_presented.get_webview_window(LAUNCHER_LABEL) {
                if let Err(error) = window.emit(
                    "launcher:session-presented",
                    serde_json::json!({ "sessionId": session_id }),
                ) {
                    log::warn!("runtime: launcher:session-presented 事件发送失败: {error}");
                }
            }
        });
    }
}

fn on_resign_key(app: AppHandle<Wry>) {
    if let Some(runtime_state) = app.try_state::<LauncherWindowRuntimeState>() {
        let runtime = runtime_state.inner().clone();
        let app_for_close = app.clone();
        tauri::async_runtime::spawn(async move {
            let Some(session_id) = runtime.active_session_id().await else {
                return;
            };
            emit_launcher_session_invalidated(
                &app_for_close,
                &runtime,
                &session_id,
                LauncherWindowCloseReason::Blur,
            )
            .await;
        });
    }
}

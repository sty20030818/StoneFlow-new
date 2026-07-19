//! 主应用真实退出编排 owner。

use std::sync::Arc;

use tauri::Manager;
use tokio::sync::{Mutex, Notify};

use crate::app::error::AppError;
use crate::window::main::persist_main_window_geometry;

#[derive(Debug, Clone, Copy)]
pub enum ExitReason {
    TrayQuit,
    CommandQuit,
    RunEventExitRequested,
    RunEventExit,
}

#[derive(Clone, Default)]
pub struct ExitCoordinator {
    inner: Arc<ExitCoordinatorInner>,
}

#[derive(Default)]
struct ExitCoordinatorInner {
    state: Mutex<ExitState>,
    finished: Notify,
}

#[derive(Default)]
struct ExitState {
    in_progress: bool,
    completed: bool,
    allow_process_exit: bool,
    result: Option<Result<(), String>>,
}

impl ExitCoordinator {
    pub async fn should_allow_process_exit(&self) -> bool {
        self.inner.state.lock().await.allow_process_exit
    }

    pub async fn request_exit(&self, _reason: ExitReason) -> Result<(), AppError> {
        let should_run = {
            let mut state = self.inner.state.lock().await;
            if state.completed {
                return state
                    .result
                    .clone()
                    .unwrap_or(Ok(()))
                    .map_err(AppError::initialization);
            }

            if state.in_progress {
                false
            } else {
                state.in_progress = true;
                true
            }
        };

        if should_run {
            let mut state = self.inner.state.lock().await;
            state.completed = true;
            state.in_progress = false;
            state.allow_process_exit = true;
            state.result = Some(Ok(()));
            drop(state);
            self.inner.finished.notify_waiters();
        } else {
            self.inner.finished.notified().await;
        }

        let state = self.inner.state.lock().await;
        state
            .result
            .clone()
            .unwrap_or(Ok(()))
            .map_err(AppError::initialization)
    }
}

/// 真正退出前：落盘几何 → destroy 全部 WebView（绕过 main 的 hide）→ `exit`。
/// 减少 Windows 上 `Chrome_WidgetWin_0` / Error 1412 的拆窗竞态噪音。
pub async fn request_exit_and_quit(app_handle: &tauri::AppHandle, reason: ExitReason) {
    if let Some(exit_coordinator) = app_handle.try_state::<ExitCoordinator>() {
        if let Err(error) = exit_coordinator.request_exit(reason).await {
            log::warn!("请求退出失败 ({reason:?}): {error}");
        }
    }

    persist_main_window_geometry(app_handle);

    // 必须用 destroy：main 的 CloseRequested 会 prevent_close + hide，close() 退不出去。
    for (label, window) in app_handle.webview_windows() {
        if let Err(error) = window.destroy() {
            log::warn!("退出前销毁窗口 {label} 失败: {error}");
        }
    }

    app_handle.exit(0);
}

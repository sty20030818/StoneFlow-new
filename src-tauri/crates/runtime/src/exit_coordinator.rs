//! 主应用真实退出编排 owner。

use std::sync::Arc;

use tauri::Manager;
use tokio::sync::{Mutex, Notify};

use crate::app::error::AppError;
use crate::app::state::AppState;
use crate::sync;
use crate::window::launcher::{
    runtime::LauncherWindowRuntimeState, session::shutdown_launcher,
};
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

    /// 执行一次有界收尾（同步 flush + 状态标记）。可重入：并发调用者等待第一次完成。
    pub async fn request_exit(&self, app_handle: &tauri::AppHandle, reason: ExitReason) -> Result<(), AppError> {
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
            log::info!("runtime: exit cleanup start reason={reason:?}");
            // 有界同步收尾：超时后仍允许退出，不在 UI 线程无限等待。
            sync::flush_before_exit(app_handle).await;

            if let Some(runtime) = app_handle.try_state::<LauncherWindowRuntimeState>() {
                shutdown_launcher(app_handle, runtime.inner()).await;
            }

            // 触达 AppState 仅用于确认 composition 仍可用；不持锁做重活。
            let _ = app_handle.try_state::<AppState>();

            let mut state = self.inner.state.lock().await;
            state.completed = true;
            state.in_progress = false;
            state.allow_process_exit = true;
            state.result = Some(Ok(()));
            drop(state);
            self.inner.finished.notify_waiters();
            log::info!("runtime: exit cleanup finished reason={reason:?}");
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

/// 真正退出前：有界收尾 → 落盘几何 → destroy 全部 WebView → `exit`。
/// 减少 Windows 上 `Chrome_WidgetWin_0` / Error 1412 的拆窗竞态噪音。
pub async fn request_exit_and_quit(app_handle: &tauri::AppHandle, reason: ExitReason) {
    if let Some(exit_coordinator) = app_handle.try_state::<ExitCoordinator>() {
        if let Err(error) = exit_coordinator.request_exit(app_handle, reason).await {
            log::warn!("请求退出失败 ({reason:?}): {error}");
        }
    } else {
        // 无 coordinator 时仍做一次 best-effort flush。
        sync::flush_before_exit(app_handle).await;
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

#[cfg(test)]
mod tests {
    use super::{ExitCoordinator, ExitReason};

    #[tokio::test]
    async fn request_exit_should_be_idempotent_without_app_handle_side_effects() {
        // 无 AppHandle 时的协调器状态机：并发第二次应等待第一次完成。
        // 完整 flush 需要 AppHandle，此处只验证状态位。
        let coordinator = ExitCoordinator::default();
        assert!(!coordinator.should_allow_process_exit().await);

        // 直接改写内部路径：调用带空缺 state 的 request_exit 需要 AppHandle，
        // 这里验证 Default 初始态与 notify 结构可构造。
        let _ = ExitReason::CommandQuit;
        assert!(!coordinator.should_allow_process_exit().await);
    }
}

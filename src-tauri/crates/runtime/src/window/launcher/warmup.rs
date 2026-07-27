//! Launcher 进程级预热：隐藏窗口创建与前端监听器就绪。

use std::{
    sync::Arc,
    time::{Duration, Instant},
};

use stoneflow_platform::launcher_window::spec::LAUNCHER_LABEL;
use tauri::{AppHandle, Manager, Wry};
use tokio::sync::{Mutex, Notify};

use super::callbacks::runtime_launcher_window_callbacks;

const FRONTEND_READY_TIMEOUT: Duration = Duration::from_secs(10);

#[derive(Debug, Clone, PartialEq, Eq)]
enum LauncherWarmupPhase {
    Cold,
    Warming(Instant),
    Ready,
    Failed(String),
}

#[derive(Debug, Clone)]
pub struct LauncherWarmupState {
    phase: Arc<Mutex<LauncherWarmupPhase>>,
    changed: Arc<Notify>,
}

impl Default for LauncherWarmupState {
    fn default() -> Self {
        Self {
            phase: Arc::new(Mutex::new(LauncherWarmupPhase::Cold)),
            changed: Arc::new(Notify::new()),
        }
    }
}

impl LauncherWarmupState {
    async fn begin_warming(&self) -> bool {
        let mut phase = self.phase.lock().await;
        match &*phase {
            LauncherWarmupPhase::Cold | LauncherWarmupPhase::Failed(_) => {
                *phase = LauncherWarmupPhase::Warming(Instant::now());
                true
            }
            LauncherWarmupPhase::Warming(_) | LauncherWarmupPhase::Ready => false,
        }
    }

    pub async fn mark_ready(&self) {
        let mut phase = self.phase.lock().await;
        let LauncherWarmupPhase::Warming(started_at) = &*phase else {
            return;
        };
        let elapsed_ms = started_at.elapsed().as_millis();
        *phase = LauncherWarmupPhase::Ready;
        self.changed.notify_waiters();
        log::info!("launcher.frontend_ready warmup_ms={elapsed_ms}");
    }

    async fn mark_failed_if_warming(&self, message: String) {
        let mut phase = self.phase.lock().await;
        if !matches!(&*phase, LauncherWarmupPhase::Warming(_)) {
            return;
        }
        *phase = LauncherWarmupPhase::Failed(message);
        self.changed.notify_waiters();
    }

    async fn wait_until_ready(&self) -> Result<(), String> {
        loop {
            let notified = self.changed.notified();
            // 必须在 await 前释放 MutexGuard，否则 mark_ready/mark_failed 无法推进状态。
            let phase = { self.phase.lock().await.clone() };
            match phase {
                LauncherWarmupPhase::Ready => return Ok(()),
                LauncherWarmupPhase::Failed(message) => return Err(message),
                LauncherWarmupPhase::Cold | LauncherWarmupPhase::Warming(_) => notified.await,
            }
        }
    }
}

/// 在调用方不 await 的前提下开始预热；重复调用会加入同一轮预热。
pub fn schedule_launcher_warmup(app_handle: AppHandle<Wry>, warmup: LauncherWarmupState) {
    tauri::async_runtime::spawn(async move {
        if let Err(error) = ensure_launcher_ready(app_handle, warmup).await {
            log::warn!("runtime: launcher 预热失败: {error}");
        }
    });
}

/// 确保隐藏窗口和其前端监听器均已就绪。
pub async fn ensure_launcher_ready(
    app_handle: AppHandle<Wry>,
    warmup: LauncherWarmupState,
) -> Result<(), String> {
    if warmup.begin_warming().await {
        log::info!("launcher.warmup_started");
        let should_reload_frontend = app_handle.get_webview_window(LAUNCHER_LABEL).is_some();
        if let Err(error) = initialize_launcher_panel(&app_handle) {
            warmup.mark_failed_if_warming(error.clone()).await;
            return Err(error);
        }
        if should_reload_frontend {
            let reload_result = app_handle
                .get_webview_window(LAUNCHER_LABEL)
                .ok_or_else(|| "launcher 窗口在重试预热时丢失".to_owned())
                .and_then(|window| {
                    window
                        .reload()
                        .map_err(|error| format!("launcher 前端重载失败: {error}"))
                });
            if let Err(error) = reload_result {
                warmup.mark_failed_if_warming(error.clone()).await;
                return Err(error);
            }
            log::info!("launcher.warmup_reloading_frontend");
        }
        log::info!("launcher.warmup_waiting_for_frontend");

        let timeout_state = warmup.clone();
        tauri::async_runtime::spawn(async move {
            match tokio::time::timeout(FRONTEND_READY_TIMEOUT, timeout_state.wait_until_ready())
                .await
            {
                Ok(Ok(())) => {}
                Ok(Err(error)) => log::warn!("launcher.warmup_failed error={error}"),
                Err(_) => {
                    log::warn!(
                        "launcher.warmup_timed_out timeout_ms={}",
                        FRONTEND_READY_TIMEOUT.as_millis()
                    );
                    timeout_state
                        .mark_failed_if_warming("launcher 前端启动超时".to_owned())
                        .await;
                }
            }
        });
    }

    warmup.wait_until_ready().await
}

fn initialize_launcher_panel(app_handle: &AppHandle<Wry>) -> Result<(), String> {
    if app_handle.get_webview_window(LAUNCHER_LABEL).is_some() {
        return Ok(());
    }

    let callbacks = runtime_launcher_window_callbacks();

    #[cfg(target_os = "macos")]
    {
        let app_handle = app_handle.clone();
        app_handle
            .clone()
            .run_on_main_thread(move || {
                stoneflow_platform::macos::panel::init_launcher_panel(&app_handle, callbacks);
            })
            .map_err(|error| format!("launcher panel 主线程初始化失败: {error}"))?;
    }

    #[cfg(target_os = "windows")]
    stoneflow_platform::windows::panel::init_launcher_panel(app_handle, callbacks);

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let _ = callbacks;
        return Err("当前平台尚未实现 Launcher 浮窗".to_owned());
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn warmup_should_be_single_flight_until_frontend_is_ready() {
        let state = LauncherWarmupState::default();

        assert!(state.begin_warming().await);
        assert!(!state.begin_warming().await);
        state.mark_ready().await;

        assert!(!state.begin_warming().await);
        assert!(state.wait_until_ready().await.is_ok());
    }

    #[tokio::test]
    async fn failed_warmup_should_be_retryable() {
        let state = LauncherWarmupState::default();

        assert!(state.begin_warming().await);
        state
            .mark_failed_if_warming("WebView 创建失败".to_owned())
            .await;

        assert_eq!(
            state
                .wait_until_ready()
                .await
                .expect_err("failed warmup should surface error"),
            "WebView 创建失败"
        );
        assert!(state.begin_warming().await);
    }

    #[tokio::test]
    async fn waiting_for_frontend_should_not_block_failure_transition() {
        let state = LauncherWarmupState::default();

        assert!(state.begin_warming().await);
        let waiting = tokio::spawn({
            let state = state.clone();
            async move { state.wait_until_ready().await }
        });
        tokio::task::yield_now().await;

        state
            .mark_failed_if_warming("WebView 启动失败".to_owned())
            .await;

        assert_eq!(
            waiting
                .await
                .expect("waiting task should finish")
                .expect_err("failure should surface"),
            "WebView 启动失败"
        );
    }
}

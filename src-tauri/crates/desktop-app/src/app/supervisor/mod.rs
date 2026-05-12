//! Helper Supervisor Actor：管理 Helper 进程生命周期。

mod restart_policy;

use std::path::PathBuf;
use std::process::Stdio;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

use tokio::process::{Child, Command};
use tokio::sync::Notify;
use tokio::time::{sleep, timeout};

use crate::app::error::AppError;
use crate::app::state::{CommandHelperState, IpcServerStatus};

use restart_policy::{RestartDecision, RestartPolicy, RestartPolicyConfig};

const HANDSHAKE_TIMEOUT: Duration = Duration::from_secs(10);
const HEALTH_CHECK_INTERVAL: Duration = Duration::from_secs(30);
const HELPER_RESTART_BACKOFF_MS: u64 = 1_500;
const HELPER_SHUTDOWN_TIMEOUT: Duration = Duration::from_secs(2);

/// Supervisor 状态机。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum SupervisorState {
    Idle,
    Starting,
    WaitingHandshake,
    Ready,
    Restarting,
    CircuitOpen,
    Stopped,
}

/// Supervisor 句柄，用于外部请求关闭。
#[derive(Clone)]
pub struct SupervisorHandle {
    shutdown_notify: Arc<Notify>,
    stopped: Arc<AtomicBool>,
}

impl SupervisorHandle {
    pub fn request_shutdown(&self) {
        self.shutdown_notify.notify_one();
    }

    pub fn wait_stopped(&self) {
        while !self.stopped.load(Ordering::SeqCst) {
            std::thread::sleep(Duration::from_millis(20));
        }
    }
}

/// Helper Supervisor Actor。
pub struct HelperSupervisor {
    #[allow(dead_code)]
    app_handle: tauri::AppHandle,
    helper_state: CommandHelperState,
    policy: RestartPolicy,
    handshake_notify: Arc<Notify>,
    shutdown_notify: Arc<Notify>,
    stopped: Arc<AtomicBool>,
    current_child: Option<Child>,
    state: SupervisorState,
}

impl HelperSupervisor {
    pub fn new(
        app_handle: tauri::AppHandle,
        helper_state: CommandHelperState,
        handshake_notify: Arc<Notify>,
    ) -> Self {
        Self {
            app_handle,
            helper_state,
            policy: RestartPolicy::new(RestartPolicyConfig::default()),
            handshake_notify,
            shutdown_notify: Arc::new(Notify::new()),
            stopped: Arc::new(AtomicBool::new(false)),
            current_child: None,
            state: SupervisorState::Idle,
        }
    }

    /// 获取句柄，用于外部请求关闭。
    pub fn handle(&self) -> SupervisorHandle {
        SupervisorHandle {
            shutdown_notify: self.shutdown_notify.clone(),
            stopped: self.stopped.clone(),
        }
    }

    /// 请求 supervisor 优雅退出。
    pub fn request_shutdown(&self) {
        self.shutdown_notify.notify_one();
    }

    /// 供 IPC server 调用，通知 supervisor 收到首个握手请求。
    pub fn notify_handshake(&self) {
        self.handshake_notify.notify_one();
    }

    /// Supervisor 主循环。
    pub async fn run(mut self) {
        log::info!("helper supervisor 启动");
        self.helper_state
            .set_ipc_status(IpcServerStatus::Ready, None)
            .await;

        loop {
            match self.state {
                SupervisorState::Idle => {
                    self.transition_to(SupervisorState::Starting).await;
                }
                SupervisorState::Starting => {
                    if self.try_spawn().await {
                        // 进程已启动，等待握手
                        self.transition_to(SupervisorState::WaitingHandshake).await;
                    } else {
                        // 启动失败，进入重启流程
                        self.handle_crash("helper 启动失败").await;
                    }
                }
                SupervisorState::WaitingHandshake => {
                    if self.wait_handshake().await {
                        self.transition_to(SupervisorState::Ready).await;
                    } else {
                        self.handle_crash("handshake 超时").await;
                    }
                }
                SupervisorState::Ready => {
                    self.health_check_loop().await;
                }
                SupervisorState::Restarting => {
                    let delay = Duration::from_millis(HELPER_RESTART_BACKOFF_MS);
                    tokio::select! {
                        _ = tokio::time::sleep(delay) => {
                            self.transition_to(SupervisorState::Starting).await;
                        }
                        _ = self.shutdown_notify.notified() => {
                            self.transition_to(SupervisorState::Stopped).await;
                        }
                    }
                }
                SupervisorState::CircuitOpen => {
                    log::error!("helper 重启次数达到上限，进入熔断状态，需手动恢复");
                    self.helper_state
                        .mark_helper_crashed("重启次数达到上限，已熔断")
                        .await;
                    // 等待手动重置或关闭
                    self.shutdown_notify.notified().await;
                    self.transition_to(SupervisorState::Stopped).await;
                }
                SupervisorState::Stopped => {
                    log::info!("helper supervisor 已停止");
                    self.stopped.store(true, Ordering::SeqCst);
                    break;
                }
            }
        }
    }

    async fn transition_to(&mut self, new_state: SupervisorState) {
        log::debug!("supervisor: {:?} → {:?}", self.state, new_state);
        if new_state == SupervisorState::Stopped {
            self.helper_state.mark_shutting_down().await;
            self.helper_state.set_shutdown_requested(true).await;
            self.shutdown_helper_process("supervisor 停止").await;
        }
        self.state = new_state;
    }

    /// 启动 helper 进程。返回 true 表示进程已启动（需要后续握手），false 表示启动失败。
    async fn try_spawn(&mut self) -> bool {
        let helper_path = match resolve_or_build_helper().await {
            Ok(path) => path,
            Err(error) => {
                log::error!("找不到 helper 二进制: {error}");
                self.helper_state
                    .mark_helper_disconnected(error.to_string())
                    .await;
                return false;
            }
        };

        self.helper_state
            .mark_helper_starting(Some(helper_path.clone()))
            .await;

        let child = match spawn_helper(&helper_path) {
            Ok(child) => child,
            Err(error) => {
                log::error!("spawn helper 失败: {error}");
                self.helper_state
                    .mark_helper_disconnected(error.to_string())
                    .await;
                return false;
            }
        };

        let pid = child.id().unwrap_or(0);
        self.helper_state.mark_helper_spawned(pid).await;
        log::info!("helper 已启动, pid={pid}");
        self.current_child = Some(child);

        true
    }

    /// 等待 helper 握手（首个 IPC 请求）。返回 true 表示握手成功。
    async fn wait_handshake(&mut self) -> bool {
        let started_at = std::time::Instant::now();

        loop {
            if timeout(Duration::from_millis(1), self.handshake_notify.notified())
                .await
                .is_ok()
            {
                log::info!("helper 握手成功");
                self.helper_state
                    .mark_helper_ready(
                        stoneflow_ipc_protocol::PROTOCOL_VERSION,
                        chrono::Utc::now().to_rfc3339(),
                    )
                    .await;
                self.policy.record_stable();
                return true;
            }

            if started_at.elapsed() >= HANDSHAKE_TIMEOUT {
                log::warn!("helper 握手超时 ({HANDSHAKE_TIMEOUT:?})");
                return false;
            }

            if self.check_child_exit("等待握手").await {
                return false;
            }

            if timeout(Duration::from_millis(1), self.shutdown_notify.notified())
                .await
                .is_ok()
            {
                log::info!("helper 等待握手时收到关闭请求");
                self.transition_to(SupervisorState::Stopped).await;
                return false;
            }

            sleep(Duration::from_millis(200)).await;
        }
    }

    /// 在主 App 退出时显式关闭 helper，避免残留旧进程继续服务。
    async fn shutdown_helper_process(&mut self, reason: &str) {
        let Some(mut child) = self.current_child.take() else {
            return;
        };

        let pid = child.id().unwrap_or(0);
        log::info!("准备关闭 helper 进程, pid={pid}, reason={reason}");

        if let Err(error) = request_helper_shutdown(pid).await {
            log::warn!("请求 helper 优雅退出失败, pid={pid}: {error}");
        }

        match timeout(HELPER_SHUTDOWN_TIMEOUT, child.wait()).await {
            Ok(Ok(status)) => {
                log::info!("helper 进程已关闭, pid={pid}, status={status}");
            }
            Ok(Err(error)) => {
                log::warn!("等待 helper 进程退出失败, pid={pid}: {error}");
            }
            Err(_) => {
                log::warn!(
                    "helper 未在 {:?} 内退出，回退到强制结束, pid={pid}",
                    HELPER_SHUTDOWN_TIMEOUT
                );
                if let Err(error) = child.kill().await {
                    log::warn!("强制关闭 helper 进程失败, pid={pid}: {error}");
                }
                match child.wait().await {
                    Ok(status) => {
                        log::info!("helper 进程已强制关闭, pid={pid}, status={status}");
                    }
                    Err(error) => {
                        log::warn!("等待 helper 强制退出失败, pid={pid}: {error}");
                    }
                }
            }
        }

        self.helper_state
            .mark_helper_disconnected(format!("helper 已关闭: {reason}"))
            .await;
    }

    /// 健康检查循环，直到进程退出或关闭请求。
    async fn health_check_loop(&mut self) {
        loop {
            tokio::select! {
                _ = tokio::time::sleep(HEALTH_CHECK_INTERVAL) => {
                    if self.check_child_exit("运行中").await {
                        log::info!("helper 进程已退出，准备重启");
                        self.transition_to(SupervisorState::Restarting).await;
                        return;
                    }
                }
                _ = self.shutdown_notify.notified() => {
                    self.transition_to(SupervisorState::Stopped).await;
                    return;
                }
            }
        }
    }

    async fn check_child_exit(&mut self, phase: &str) -> bool {
        let Some(child) = self.current_child.as_mut() else {
            self.helper_state
                .mark_helper_disconnected(format!("helper 进程句柄缺失: {phase}"))
                .await;
            return true;
        };

        match child.try_wait() {
            Ok(Some(status)) => {
                let code = status.code().unwrap_or(-1);
                log::warn!("helper 进程已退出, phase={phase}, code={code}");
                self.current_child.take();
                self.helper_state
                    .mark_helper_disconnected(format!("helper 进程已退出，phase={phase}, code={code}"))
                    .await;
                true
            }
            Ok(None) => false,
            Err(error) => {
                log::error!("检查 helper 进程状态失败, phase={phase}: {error}");
                self.current_child.take();
                self.helper_state
                    .mark_helper_disconnected(format!("检查 helper 状态失败: {error}"))
                    .await;
                true
            }
        }
    }

    /// 处理崩溃：记录崩溃，决定重启或熔断。
    async fn handle_crash(&mut self, reason: &str) {
        log::warn!("helper 崩溃: {reason}");
        self.helper_state.mark_helper_crashed(reason).await;

        match self.policy.record_crash() {
            RestartDecision::Restart(delay) => {
                log::info!(
                    "helper 将在 {delay:?} 后重启 (attempt {}/{})",
                    self.policy.attempt(),
                    5
                );
                self.transition_to(SupervisorState::Restarting).await;
            }
            RestartDecision::CircuitOpen => {
                log::error!("helper 重启次数达到上限，进入熔断");
                self.transition_to(SupervisorState::CircuitOpen).await;
            }
        }
    }
}

#[cfg(target_os = "windows")]
async fn request_helper_shutdown(pid: u32) -> Result<(), AppError> {
    let output = tokio::process::Command::new("taskkill")
        .args(["/PID", &pid.to_string()])
        .output()
        .await
        .map_err(|error| AppError::initialization(format!("taskkill 执行失败: {error}")))?;

    if output.status.success() {
        return Ok(());
    }

    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_owned();
    Err(AppError::initialization(format!(
        "taskkill 请求 helper 退出失败: {}",
        if stderr.is_empty() {
            output.status.to_string()
        } else {
            stderr
        }
    )))
}

#[cfg(target_os = "macos")]
async fn request_helper_shutdown(pid: u32) -> Result<(), AppError> {
    let output = tokio::process::Command::new("kill")
        .args(["-TERM", &pid.to_string()])
        .output()
        .await
        .map_err(|error| AppError::initialization(format!("kill -TERM 执行失败: {error}")))?;

    if output.status.success() {
        return Ok(());
    }

    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_owned();
    Err(AppError::initialization(format!(
        "kill -TERM 请求 helper 退出失败: {}",
        if stderr.is_empty() {
            output.status.to_string()
        } else {
            stderr
        }
    )))
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
async fn request_helper_shutdown(_pid: u32) -> Result<(), AppError> {
    Ok(())
}

fn spawn_helper(path: &PathBuf) -> Result<Child, AppError> {
    let mut command = Command::new(path);
    if let Some(parent_dir) = path.parent() {
        command.current_dir(parent_dir);
    }
    command
        .env("STONEFLOW_MAIN_APP", "1")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);

    command
        .spawn()
        .map_err(|error| AppError::initialization(format!("spawn helper 失败: {error}")))
}

/// 查找 helper 二进制，找不到则尝试自动编译（dev 模式）。
async fn resolve_or_build_helper() -> Result<PathBuf, AppError> {
    if cfg!(debug_assertions) {
        log::info!("dev 模式：启动前强制重新编译 helper");
        build_helper_binary().await?;
        return find_helper_binary();
    }

    if let Ok(path) = find_helper_binary() {
        return Ok(path);
    }

    log::info!("helper 二进制不存在，尝试自动编译...");
    build_helper_binary().await?;

    find_helper_binary()
}

fn find_helper_binary() -> Result<PathBuf, AppError> {
    let current_exe =
        std::env::current_exe().map_err(|error| AppError::initialization(error.to_string()))?;
    let exe_dir = current_exe
        .parent()
        .ok_or_else(|| AppError::initialization("无法解析主程序目录"))?;
    let helper_binary_name = if cfg!(windows) {
        "stoneflow-helper.exe"
    } else {
        "stoneflow-helper"
    };

    #[cfg(not(target_os = "macos"))]
    let candidates = vec![exe_dir.join(helper_binary_name)];

    #[cfg(target_os = "macos")]
    let mut candidates = vec![exe_dir.join(helper_binary_name)];

    #[cfg(target_os = "macos")]
    {
        let login_item = exe_dir
            .parent()
            .and_then(|path| path.parent())
            .map(|contents_dir| {
                contents_dir
                    .join("Library")
                    .join("LoginItems")
                    .join("StoneFlow Helper.app")
                    .join("Contents")
                    .join("MacOS")
                    .join("stoneflow-helper")
            });
        if let Some(path) = login_item {
            candidates.insert(0, path);
        }
    }

    for path in &candidates {
        if path.exists() {
            return Ok(path.clone());
        }
    }

    Err(AppError::initialization(format!(
        "找不到 Helper 二进制，已检查: {}",
        candidates
            .iter()
            .map(|path: &PathBuf| path.display().to_string())
            .collect::<Vec<_>>()
            .join(", ")
    )))
}

async fn build_helper_binary() -> Result<(), AppError> {
    let manifest_path = find_cargo_manifest_path()?;

    log::info!("编译 helper: cargo build -p stoneflow-helper");
    let output = tokio::process::Command::new("cargo")
        .args(["build", "-p", "stoneflow-helper"])
        .arg("--manifest-path")
        .arg(&manifest_path)
        .output()
        .await
        .map_err(|error| AppError::initialization(format!("cargo build 执行失败: {error}")))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::initialization(format!(
            "helper 编译失败:\n{stderr}"
        )));
    }

    log::info!("helper 编译完成");
    Ok(())
}

fn find_cargo_manifest_path() -> Result<PathBuf, AppError> {
    // 从当前 exe 往上找 src-tauri/Cargo.toml
    // dev 模式下 exe 在 target/debug/，Cargo.toml 在 src-tauri/
    let current_exe =
        std::env::current_exe().map_err(|error| AppError::initialization(error.to_string()))?;

    // 尝试从 exe 位置推导：target/debug/stoneflow.exe → ../Cargo.toml (workspace) 或 ../../src-tauri/Cargo.toml
    let mut dir = current_exe
        .parent()
        .ok_or_else(|| AppError::initialization("无法解析主程序目录"))?;

    // 向上搜索，最多 5 层
    for _ in 0..5 {
        let candidate = dir.join("Cargo.toml");
        if candidate.exists() {
            return Ok(candidate);
        }
        if let Some(parent) = dir.parent() {
            dir = parent;
        } else {
            break;
        }
    }

    Err(AppError::initialization(
        "找不到 Cargo.toml，无法自动编译 helper".to_owned(),
    ))
}

//! 主应用运行时状态。

use std::path::PathBuf;
use std::sync::Arc;

use serde::Serialize;
use tokio::sync::RwLock;
use uuid::Uuid;

/// 当前被主应用选中的 Scope 类型。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ActiveScopeKind {
    All,
    Space,
}

/// 当前 Scope 的轻量运行时快照。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ActiveScopeSnapshot {
    pub id: Uuid,
    pub kind: ActiveScopeKind,
    pub space_id: Option<Uuid>,
}

/// 当前 Scope 的轻量运行时状态。
#[derive(Debug, Clone, Default)]
pub struct ActiveScopeState {
    inner: Arc<RwLock<Option<ActiveScopeSnapshot>>>,
}

impl ActiveScopeState {
    /// 覆盖当前 Scope。
    pub async fn set(&self, snapshot: ActiveScopeSnapshot) {
        let mut guard = self.inner.write().await;
        *guard = Some(snapshot);
    }

    /// 读取当前 Scope。
    pub async fn get(&self) -> Option<ActiveScopeSnapshot> {
        self.inner.read().await.clone()
    }
}

/// Helper 进程状态。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum HelperLifecycleStage {
    Idle,
    Starting,
    WaitingForHello,
    WaitingForWindow,
    Ready,
    Disconnected,
    Crashed,
    Restarting,
    ShuttingDown,
}

/// IPC Server 状态。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum IpcServerStatus {
    Stopped,
    Starting,
    Ready,
    Error,
}

/// Helper 最近一次退出分类。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum HelperExitKind {
    ExpectedShutdown,
    Crash,
    TerminateFallback,
    KillFallback,
    ProtocolError,
}

/// Helper 运行态快照。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandHelperSnapshot {
    pub initialized: bool,
    pub lifecycle_stage: HelperLifecycleStage,
    pub ipc_status: IpcServerStatus,
    pub helper_pid: Option<u32>,
    pub helper_binary_path: Option<String>,
    pub protocol_version: Option<u16>,
    pub helper_version: Option<String>,
    pub platform: Option<String>,
    pub last_hello_at: Option<String>,
    pub last_window_ready_at: Option<String>,
    pub last_window_unready_at: Option<String>,
    pub shutdown_acknowledged: bool,
    pub last_shutdown_requested_at: Option<String>,
    pub last_shutdown_ack_at: Option<String>,
    pub last_shutdown_reason: Option<String>,
    pub last_helper_error: Option<String>,
    pub restart_count: u32,
    pub shutdown_requested: bool,
    pub last_exit_kind: Option<HelperExitKind>,
    pub last_exit_code: Option<i32>,
    pub last_exit_reason: Option<String>,
    pub last_exit_at: Option<String>,
}

impl Default for CommandHelperSnapshot {
    fn default() -> Self {
        Self {
            initialized: false,
            lifecycle_stage: HelperLifecycleStage::Idle,
            ipc_status: IpcServerStatus::Stopped,
            helper_pid: None,
            helper_binary_path: None,
            protocol_version: None,
            helper_version: None,
            platform: None,
            last_hello_at: None,
            last_window_ready_at: None,
            last_window_unready_at: None,
            shutdown_acknowledged: false,
            last_shutdown_requested_at: None,
            last_shutdown_ack_at: None,
            last_shutdown_reason: None,
            last_helper_error: None,
            restart_count: 0,
            shutdown_requested: false,
            last_exit_kind: None,
            last_exit_code: None,
            last_exit_reason: None,
            last_exit_at: None,
        }
    }
}

/// 主 App 持有的 Helper runtime 状态。
#[derive(Debug, Clone, Default)]
pub struct CommandHelperState {
    snapshot: Arc<RwLock<CommandHelperSnapshot>>,
    pending_command_open: Arc<RwLock<Option<PendingCommandOpenIntent>>>,
}

/// 主窗口尚未 ready 时暂存的打开意图。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PendingCommandOpenIntent {
    pub kind: String,
    pub id: String,
    pub space_id: String,
    pub project_id: Option<String>,
    pub placement: String,
}

impl CommandHelperState {
    /// 读取运行态快照。
    pub async fn snapshot(&self) -> CommandHelperSnapshot {
        self.snapshot.read().await.clone()
    }

    /// 更新 IPC server 状态。
    pub async fn set_ipc_status(&self, status: IpcServerStatus, error: Option<String>) {
        let mut snapshot = self.snapshot.write().await;
        snapshot.initialized = true;
        snapshot.ipc_status = status;
        if let Some(error) = error {
            snapshot.last_helper_error = Some(error);
        }
    }

    /// 记录 helper 即将启动。
    pub async fn mark_helper_starting(&self, helper_binary_path: Option<PathBuf>) {
        let mut snapshot = self.snapshot.write().await;
        snapshot.initialized = true;
        snapshot.lifecycle_stage = HelperLifecycleStage::Starting;
        snapshot.helper_binary_path = helper_binary_path.map(|path| path.display().to_string());
        snapshot.helper_pid = None;
        snapshot.last_helper_error = None;
    }

    /// 记录 helper 已成功 spawn。
    pub async fn mark_helper_spawned(&self, pid: u32) {
        let mut snapshot = self.snapshot.write().await;
        snapshot.initialized = true;
        snapshot.lifecycle_stage = HelperLifecycleStage::WaitingForHello;
        snapshot.helper_pid = Some(pid);
        snapshot.shutdown_acknowledged = false;
        snapshot.last_shutdown_requested_at = None;
        snapshot.last_shutdown_ack_at = None;
        snapshot.last_shutdown_reason = None;
        snapshot.shutdown_requested = false;
    }

    /// 记录 helper hello 完成。
    pub async fn mark_helper_hello(
        &self,
        protocol_version: u16,
        helper_version: String,
        platform: String,
        hello_at: String,
    ) {
        let mut snapshot = self.snapshot.write().await;
        snapshot.initialized = true;
        snapshot.lifecycle_stage = HelperLifecycleStage::WaitingForWindow;
        snapshot.protocol_version = Some(protocol_version);
        snapshot.helper_version = Some(helper_version);
        snapshot.platform = Some(platform);
        snapshot.last_hello_at = Some(hello_at);
        snapshot.last_helper_error = None;
    }

    /// 记录 helper 窗口监听已就绪。
    pub async fn mark_window_ready(&self, ready_at: String) {
        let mut snapshot = self.snapshot.write().await;
        snapshot.initialized = true;
        snapshot.lifecycle_stage = HelperLifecycleStage::Ready;
        snapshot.last_window_ready_at = Some(ready_at);
        snapshot.last_helper_error = None;
    }

    /// 记录 helper 窗口监听已卸载。
    pub async fn mark_window_unready(&self, unready_at: String) {
        let mut snapshot = self.snapshot.write().await;
        snapshot.initialized = true;
        if snapshot.lifecycle_stage == HelperLifecycleStage::Ready {
            snapshot.lifecycle_stage = HelperLifecycleStage::WaitingForWindow;
        }
        snapshot.last_window_unready_at = Some(unready_at);
    }

    /// 记录 helper 断开。
    pub async fn mark_helper_disconnected(&self, error: impl Into<String>) {
        let mut snapshot = self.snapshot.write().await;
        snapshot.initialized = true;
        snapshot.lifecycle_stage = HelperLifecycleStage::Disconnected;
        snapshot.helper_pid = None;
        snapshot.last_helper_error = Some(error.into());
    }

    /// 记录 helper 已按预期关闭。
    pub async fn mark_expected_shutdown_completed(
        &self,
        reason: impl Into<String>,
        exit_code: Option<i32>,
        exited_at: String,
    ) {
        let mut snapshot = self.snapshot.write().await;
        snapshot.initialized = true;
        snapshot.lifecycle_stage = HelperLifecycleStage::Disconnected;
        snapshot.helper_pid = None;
        snapshot.last_helper_error = None;
        snapshot.shutdown_requested = false;
        snapshot.last_exit_kind = Some(HelperExitKind::ExpectedShutdown);
        snapshot.last_exit_code = exit_code;
        snapshot.last_exit_reason = Some(reason.into());
        snapshot.last_exit_at = Some(exited_at);
    }

    /// 记录 helper 崩溃。
    pub async fn mark_helper_crashed(
        &self,
        error: impl Into<String>,
        exit_code: Option<i32>,
        exit_reason: impl Into<String>,
        exited_at: String,
    ) {
        let mut snapshot = self.snapshot.write().await;
        snapshot.initialized = true;
        snapshot.lifecycle_stage = HelperLifecycleStage::Crashed;
        snapshot.helper_pid = None;
        snapshot.last_helper_error = Some(error.into());
        snapshot.last_exit_kind = Some(HelperExitKind::Crash);
        snapshot.last_exit_code = exit_code;
        snapshot.last_exit_reason = Some(exit_reason.into());
        snapshot.last_exit_at = Some(exited_at);
    }

    /// 记录 helper 进入重启流程。
    pub async fn mark_helper_restarting(&self, error: impl Into<String>) {
        let mut snapshot = self.snapshot.write().await;
        snapshot.initialized = true;
        snapshot.lifecycle_stage = HelperLifecycleStage::Restarting;
        snapshot.helper_pid = None;
        snapshot.restart_count += 1;
        snapshot.last_helper_error = Some(error.into());
    }

    /// 记录主进程正在退出。
    pub async fn mark_shutting_down(&self) {
        let mut snapshot = self.snapshot.write().await;
        snapshot.initialized = true;
        snapshot.lifecycle_stage = HelperLifecycleStage::ShuttingDown;
    }

    /// 记录主 App 已发起 helper shutdown。
    pub async fn mark_shutdown_requested(&self, reason: impl Into<String>, requested_at: String) {
        let mut snapshot = self.snapshot.write().await;
        snapshot.initialized = true;
        snapshot.lifecycle_stage = HelperLifecycleStage::ShuttingDown;
        snapshot.shutdown_requested = true;
        snapshot.shutdown_acknowledged = false;
        snapshot.last_shutdown_requested_at = Some(requested_at);
        snapshot.last_shutdown_reason = Some(reason.into());
    }

    /// 记录 helper 已确认 shutdown。
    pub async fn mark_shutdown_acknowledged(&self, ack_at: String) {
        let mut snapshot = self.snapshot.write().await;
        snapshot.initialized = true;
        snapshot.shutdown_acknowledged = true;
        snapshot.last_shutdown_ack_at = Some(ack_at);
        snapshot.last_helper_error = None;
    }

    /// 记录 helper 因协议错误进入终止路径。
    pub async fn mark_protocol_error(&self, error: impl Into<String>, at: String) {
        let mut snapshot = self.snapshot.write().await;
        snapshot.initialized = true;
        snapshot.lifecycle_stage = HelperLifecycleStage::Crashed;
        snapshot.helper_pid = None;
        snapshot.last_helper_error = Some(error.into());
        snapshot.last_exit_kind = Some(HelperExitKind::ProtocolError);
        snapshot.last_exit_code = None;
        snapshot.last_exit_reason = Some("protocol_error".to_owned());
        snapshot.last_exit_at = Some(at);
    }

    /// 记录回退到 OS terminate。
    pub async fn mark_terminate_fallback(
        &self,
        reason: impl Into<String>,
        exit_code: Option<i32>,
        at: String,
    ) {
        let mut snapshot = self.snapshot.write().await;
        snapshot.initialized = true;
        snapshot.lifecycle_stage = HelperLifecycleStage::Disconnected;
        snapshot.helper_pid = None;
        snapshot.last_helper_error = Some(reason.into());
        snapshot.shutdown_requested = false;
        snapshot.last_exit_kind = Some(HelperExitKind::TerminateFallback);
        snapshot.last_exit_code = exit_code;
        snapshot.last_exit_reason = snapshot.last_helper_error.clone();
        snapshot.last_exit_at = Some(at);
    }

    /// 记录回退到 kill。
    pub async fn mark_kill_fallback(
        &self,
        reason: impl Into<String>,
        exit_code: Option<i32>,
        at: String,
    ) {
        let mut snapshot = self.snapshot.write().await;
        snapshot.initialized = true;
        snapshot.lifecycle_stage = HelperLifecycleStage::Disconnected;
        snapshot.helper_pid = None;
        snapshot.last_helper_error = Some(reason.into());
        snapshot.shutdown_requested = false;
        snapshot.last_exit_kind = Some(HelperExitKind::KillFallback);
        snapshot.last_exit_code = exit_code;
        snapshot.last_exit_reason = snapshot.last_helper_error.clone();
        snapshot.last_exit_at = Some(at);
    }

    pub async fn set_pending_command_open(&self, intent: PendingCommandOpenIntent) {
        let mut guard = self.pending_command_open.write().await;
        *guard = Some(intent);
    }

    pub async fn take_pending_command_open(&self) -> Option<PendingCommandOpenIntent> {
        self.pending_command_open.write().await.take()
    }
}

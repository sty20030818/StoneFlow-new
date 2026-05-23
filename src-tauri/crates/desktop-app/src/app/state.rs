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
    pub last_helper_error: Option<String>,
    pub restart_count: u32,
    pub shutdown_requested: bool,
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
            last_helper_error: None,
            restart_count: 0,
            shutdown_requested: false,
        }
    }
}

/// 主 App 持有的 Helper runtime 状态。
#[derive(Debug, Clone, Default)]
pub struct CommandHelperState {
    snapshot: Arc<RwLock<CommandHelperSnapshot>>,
    shutdown_requested: Arc<RwLock<bool>>,
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
        let snapshot = self.snapshot.read().await.clone();
        let shutdown_requested = *self.shutdown_requested.read().await;
        CommandHelperSnapshot {
            shutdown_requested,
            ..snapshot
        }
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
        snapshot.helper_binary_path =
            helper_binary_path.map(|path| path.display().to_string());
        snapshot.helper_pid = None;
        snapshot.last_helper_error = None;
    }

    /// 记录 helper 已成功 spawn。
    pub async fn mark_helper_spawned(&self, pid: u32) {
        let mut snapshot = self.snapshot.write().await;
        snapshot.initialized = true;
        snapshot.lifecycle_stage = HelperLifecycleStage::WaitingForHello;
        snapshot.helper_pid = Some(pid);
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

    /// 记录 helper 崩溃。
    pub async fn mark_helper_crashed(&self, error: impl Into<String>) {
        let mut snapshot = self.snapshot.write().await;
        snapshot.initialized = true;
        snapshot.lifecycle_stage = HelperLifecycleStage::Crashed;
        snapshot.helper_pid = None;
        snapshot.last_helper_error = Some(error.into());
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

    pub async fn set_shutdown_requested(&self, value: bool) {
        let mut guard = self.shutdown_requested.write().await;
        *guard = value;
        let mut snapshot = self.snapshot.write().await;
        snapshot.shutdown_requested = value;
    }

    pub async fn is_shutdown_requested(&self) -> bool {
        *self.shutdown_requested.read().await
    }

    pub async fn set_pending_command_open(&self, intent: PendingCommandOpenIntent) {
        let mut guard = self.pending_command_open.write().await;
        *guard = Some(intent);
    }

    pub async fn take_pending_command_open(&self) -> Option<PendingCommandOpenIntent> {
        self.pending_command_open.write().await.take()
    }
}

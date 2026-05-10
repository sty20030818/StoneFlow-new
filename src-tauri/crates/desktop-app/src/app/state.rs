//! 主应用运行时状态。

use std::path::PathBuf;
use std::process::Child;
use std::sync::Arc;

use serde::Serialize;
use tokio::sync::{Mutex, RwLock};
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
pub enum HelperRuntimeStatus {
    Idle,
    Starting,
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
    pub helper_status: HelperRuntimeStatus,
    pub ipc_status: IpcServerStatus,
    pub helper_pid: Option<u32>,
    pub helper_binary_path: Option<String>,
    pub last_protocol_version: Option<u16>,
    pub last_handshake_at: Option<String>,
    pub last_helper_error: Option<String>,
    pub restart_count: u32,
}

impl Default for CommandHelperSnapshot {
    fn default() -> Self {
        Self {
            initialized: false,
            helper_status: HelperRuntimeStatus::Idle,
            ipc_status: IpcServerStatus::Stopped,
            helper_pid: None,
            helper_binary_path: None,
            last_protocol_version: None,
            last_handshake_at: None,
            last_helper_error: None,
            restart_count: 0,
        }
    }
}

/// 主 App 持有的 Helper runtime 状态。
#[derive(Debug, Clone, Default)]
pub struct CommandHelperState {
    snapshot: Arc<RwLock<CommandHelperSnapshot>>,
    child: Arc<Mutex<Option<Child>>>,
    shutdown_requested: Arc<RwLock<bool>>,
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
        snapshot.helper_status = HelperRuntimeStatus::Starting;
        snapshot.helper_binary_path =
            helper_binary_path.map(|path| path.display().to_string());
        snapshot.helper_pid = None;
        snapshot.last_helper_error = None;
    }

    /// 记录 helper 已成功 spawn。
    pub async fn mark_helper_spawned(&self, pid: u32) {
        let mut snapshot = self.snapshot.write().await;
        snapshot.initialized = true;
        snapshot.helper_pid = Some(pid);
    }

    /// 记录 helper 完成握手。
    pub async fn mark_helper_ready(&self, protocol_version: u16, handshake_at: String) {
        let mut snapshot = self.snapshot.write().await;
        snapshot.initialized = true;
        snapshot.helper_status = HelperRuntimeStatus::Ready;
        snapshot.last_protocol_version = Some(protocol_version);
        snapshot.last_handshake_at = Some(handshake_at);
        snapshot.last_helper_error = None;
    }

    /// 记录 helper 断开。
    pub async fn mark_helper_disconnected(&self, error: impl Into<String>) {
        let mut snapshot = self.snapshot.write().await;
        snapshot.initialized = true;
        snapshot.helper_status = HelperRuntimeStatus::Disconnected;
        snapshot.helper_pid = None;
        snapshot.last_helper_error = Some(error.into());
    }

    /// 记录 helper 崩溃。
    pub async fn mark_helper_crashed(&self, error: impl Into<String>) {
        let mut snapshot = self.snapshot.write().await;
        snapshot.initialized = true;
        snapshot.helper_status = HelperRuntimeStatus::Crashed;
        snapshot.helper_pid = None;
        snapshot.last_helper_error = Some(error.into());
    }

    /// 记录 helper 进入重启流程。
    pub async fn mark_helper_restarting(&self, error: impl Into<String>) {
        let mut snapshot = self.snapshot.write().await;
        snapshot.initialized = true;
        snapshot.helper_status = HelperRuntimeStatus::Restarting;
        snapshot.helper_pid = None;
        snapshot.restart_count += 1;
        snapshot.last_helper_error = Some(error.into());
    }

    /// 记录主进程正在退出。
    pub async fn mark_shutting_down(&self) {
        let mut snapshot = self.snapshot.write().await;
        snapshot.initialized = true;
        snapshot.helper_status = HelperRuntimeStatus::ShuttingDown;
    }

    pub async fn store_child(&self, child: Child) {
        let mut guard = self.child.lock().await;
        *guard = Some(child);
    }

    pub async fn take_child(&self) -> Option<Child> {
        self.child.lock().await.take()
    }

    pub async fn with_child_mut<T>(&self, f: impl FnOnce(&mut Child) -> T) -> Option<T> {
        let mut guard = self.child.lock().await;
        guard.as_mut().map(f)
    }

    pub async fn set_shutdown_requested(&self, value: bool) {
        let mut guard = self.shutdown_requested.write().await;
        *guard = value;
    }

    pub async fn is_shutdown_requested(&self) -> bool {
        *self.shutdown_requested.read().await
    }
}

//! 主应用运行时状态。

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

/// 主 App 持有的 command/open 待消费意图状态。
#[derive(Debug, Clone, Default)]
pub struct CommandHelperState {
    pending_command_open: Arc<RwLock<Option<PendingCommandOpenIntent>>>,
}

impl CommandHelperState {
    pub async fn set_pending_command_open(&self, intent: PendingCommandOpenIntent) {
        let mut guard = self.pending_command_open.write().await;
        *guard = Some(intent);
    }

    pub async fn take_pending_command_open(&self) -> Option<PendingCommandOpenIntent> {
        self.pending_command_open.write().await.take()
    }
}

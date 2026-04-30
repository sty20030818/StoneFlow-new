//! 主应用运行时状态。

use std::sync::Mutex;

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
#[derive(Debug, Default)]
pub struct ActiveScopeState {
    inner: RwLock<Option<ActiveScopeSnapshot>>,
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

/// Helper 运行态快照。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandHelperSnapshot {
    pub initialized: bool,
    pub helper_enabled: bool,
    pub last_invoke_success: Option<bool>,
    pub last_invoke_error: Option<String>,
}

#[derive(Debug, Clone, Default)]
struct CommandHelperRuntime {
    initialized: bool,
    helper_enabled: bool,
    last_invoke_success: Option<bool>,
    last_invoke_error: Option<String>,
}

/// Helper 最小占位状态。
#[derive(Debug, Default)]
pub struct CommandHelperState {
    runtime: Mutex<CommandHelperRuntime>,
}

impl CommandHelperState {
    /// 读取运行态快照。
    pub fn snapshot(&self) -> anyhow::Result<CommandHelperSnapshot> {
        let runtime = self
            .runtime
            .lock()
            .map_err(|_| anyhow::anyhow!("command helper state lock is poisoned"))?;

        Ok(CommandHelperSnapshot {
            initialized: runtime.initialized,
            helper_enabled: runtime.helper_enabled,
            last_invoke_success: runtime.last_invoke_success,
            last_invoke_error: runtime.last_invoke_error.clone(),
        })
    }

    /// 记录最近一次 helper 相关动作。
    pub fn record(&self, success: bool, error: Option<String>) -> anyhow::Result<()> {
        let mut runtime = self
            .runtime
            .lock()
            .map_err(|_| anyhow::anyhow!("command helper state lock is poisoned"))?;
        runtime.initialized = true;
        runtime.helper_enabled = false;
        runtime.last_invoke_success = Some(success);
        runtime.last_invoke_error = error;
        Ok(())
    }
}

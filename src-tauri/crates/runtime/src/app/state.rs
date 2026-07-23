//! 主应用运行时状态。

use std::sync::Arc;

use serde::Serialize;
use tokio::sync::RwLock;
use uuid::Uuid;

use crate::sync::SyncRuntimeState;
use stoneflow_application::launcher::{
    ActiveScopeInput, ActiveScopeKind as AppActiveScopeKind,
};
use stoneflow_storage::database::DatabaseRuntimeState;
use stoneflow_storage::{
    ActivityAppService, LauncherAppService, LauncherContextAppService, LifecycleAppService,
    ProjectAppService, SearchAppService, SettingsAppService, SpaceAppService, TaskAppService,
    TaskLinkAppService, ViewAppService,
};

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

impl ActiveScopeSnapshot {
    /// 映射为 application Launcher 的 Scope 输入。
    pub fn to_launcher_input(&self) -> ActiveScopeInput {
        ActiveScopeInput {
            kind: match self.kind {
                ActiveScopeKind::All => AppActiveScopeKind::All,
                ActiveScopeKind::Space => AppActiveScopeKind::Space,
            },
            space_id: self.space_id.map(|id| id.to_string()),
        }
    }
}

/// runtime 快照 → application ActiveScopeInput（Launcher 共用）。
pub fn map_active_scope(snapshot: Option<ActiveScopeSnapshot>) -> Option<ActiveScopeInput> {
    snapshot.map(|scope| scope.to_launcher_input())
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
pub struct CommandOpenState {
    pending_command_open: Arc<RwLock<Option<PendingCommandOpenIntent>>>,
}

impl CommandOpenState {
    pub async fn set_pending_command_open(&self, intent: PendingCommandOpenIntent) {
        let mut guard = self.pending_command_open.write().await;
        *guard = Some(intent);
    }

    pub async fn take_pending_command_open(&self) -> Option<PendingCommandOpenIntent> {
        self.pending_command_open.write().await.take()
    }
}

/// Runtime composition root：一次性装配的业务服务与同步句柄。
///
/// command 只从这里取 application service；不在此暴露 Repository / SeaORM。
/// 更新服务依赖 `AppHandle`，在 bootstrap 中单独 `manage`，不放进本结构。
#[derive(Clone)]
pub struct AppState {
    pub database: DatabaseRuntimeState,
    pub spaces: Arc<SpaceAppService>,
    pub projects: Arc<ProjectAppService>,
    pub tasks: Arc<TaskAppService>,
    pub task_links: Arc<TaskLinkAppService>,
    pub views: Arc<ViewAppService>,
    pub activities: Arc<ActivityAppService>,
    pub launcher: Arc<LauncherAppService>,
    pub launcher_context: Arc<LauncherContextAppService>,
    pub settings: Arc<SettingsAppService>,
    pub search: Arc<SearchAppService>,
    pub lifecycle: Arc<LifecycleAppService>,
    pub sync: SyncRuntimeState,
}

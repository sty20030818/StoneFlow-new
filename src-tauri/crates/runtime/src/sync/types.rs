//! 云同步公开类型与 IPC 载荷。

use serde::{Deserialize, Serialize};

/// 同步状态机对前端暴露的稳定状态。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncStatusKind {
    Disabled,
    Synced,
    Syncing,
    OfflinePending,
    Error,
    NeedsAttention,
}

impl Default for SyncStatusKind {
    fn default() -> Self {
        Self::Disabled
    }
}

/// 当前设备本地副本是否适合继续做普通同步。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncReplicaState {
    Uninitialized,
    Ready,
    RestoreRequired,
    Diverged,
}

impl Default for SyncReplicaState {
    fn default() -> Self {
        Self::Uninitialized
    }
}

/// 设置页读取的最小同步状态载荷。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatusPayload {
    pub enabled: bool,
    pub status: SyncStatusKind,
    pub last_push_at: Option<String>,
    pub last_pull_at: Option<String>,
    pub last_error: Option<String>,
    pub last_error_mode: Option<SyncRunMode>,
    pub dirty_since: Option<String>,
    pub pending_resync: bool,
    pub has_remote_config: bool,
    pub remote_url: Option<String>,
    pub replica_state: SyncReplicaState,
    pub replica_reason: Option<String>,
    pub last_restore_at: Option<String>,
}

/// 诊断面板展示的同步计数摘要。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncDiagnosticsCountsPayload {
    pub spaces: i64,
    pub projects: i64,
    pub tasks: i64,
    pub task_links: i64,
    pub views: i64,
    pub settings: i64,
    pub total_items: i64,
}

/// 当前设备本地副本的诊断摘要。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncLocalDiagnosticsPayload {
    pub device_id: Option<String>,
    pub last_pulled_remote_cursor: Option<i64>,
    pub last_restore_at: Option<String>,
    pub pending_outbox_count: i64,
    pub counts: SyncDiagnosticsCountsPayload,
}

/// 远端 Turso 工作集的诊断摘要。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncRemoteDiagnosticsPayload {
    pub latest_remote_cursor: Option<i64>,
    pub counts: SyncDiagnosticsCountsPayload,
}

/// 设置页读取的同步诊断载荷。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncDiagnosticsPayload {
    #[serde(default)]
    pub remote_host: Option<String>,
    pub local: SyncLocalDiagnosticsPayload,
    pub remote: SyncRemoteDiagnosticsPayload,
}

/// 前端提交的远端配置输入。
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfigureSyncInput {
    pub url: String,
    pub token: String,
}

/// Settings 表中持久化的同步配置。
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncRemoteConfigSetting {
    pub url: Option<String>,
    pub token: Option<String>,
}

/// 运行态可用的远端配置。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SyncRemoteConfig {
    pub url: String,
    pub token: String,
}

/// 最近一次失败发生在哪个同步入口。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncRunMode {
    Push,
    Pull,
    Sync,
}

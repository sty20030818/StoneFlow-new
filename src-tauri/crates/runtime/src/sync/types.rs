//! 云同步公开类型与 IPC 载荷。

use serde::{Deserialize, Serialize};

use super::policy::{SyncPolicy, SyncPolicyMode};

/// 同步状态机对前端暴露的稳定状态。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncStatusKind {
    #[default]
    Disabled,
    Synced,
    Syncing,
    OfflinePending,
    Error,
    NeedsAttention,
}

/// 同步凭据的当前可用性。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncCredentialState {
    #[default]
    Missing,
    Available,
    Unavailable,
}

/// 当前构建读取同步凭据的唯一来源。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncConfigSource {
    Environment,
    SystemKeychain,
}

/// 当前设备本地副本是否适合继续做普通同步。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncReplicaState {
    #[default]
    Uninitialized,
    Ready,
    BaselineRequired,
    Diverged,
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
    pub credential_state: SyncCredentialState,
    pub config_source: SyncConfigSource,
    /// 脱敏后的同步库地址（无密码），供 UI 展示。
    pub remote_url: Option<String>,
    pub replica_state: SyncReplicaState,
    pub replica_reason: Option<String>,
    pub last_restore_at: Option<String>,
    pub policy_mode: SyncPolicyMode,
    pub policy_interval_minutes: u16,
    pub next_sync_at: Option<String>,
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
    pub last_pulled_server_seq: Option<i64>,
    pub pending_mutation_count: i64,
    pub counts: SyncDiagnosticsCountsPayload,
}

/// 云端副本的诊断摘要。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncRemoteDiagnosticsPayload {
    pub latest_server_seq: Option<i64>,
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

/// 前端提交的云端副本配置（单字段连接串）。
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfigureSyncInput {
    pub database_url: String,
}

/// 前端提交的同步策略输入。
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSyncPolicyInput {
    pub mode: SyncPolicyMode,
    pub interval_minutes: u16,
}

impl From<UpdateSyncPolicyInput> for SyncPolicy {
    fn from(input: UpdateSyncPolicyInput) -> Self {
        Self {
            mode: input.mode,
            interval_minutes: input.interval_minutes,
        }
    }
}

/// Settings 表中持久化的同步策略配置。
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncPolicySetting {
    pub mode: Option<SyncPolicyMode>,
    pub interval_minutes: Option<u16>,
    pub next_sync_at: Option<String>,
}

/// 运行态可用的云端副本配置。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SyncRemoteConfig {
    pub database_url: String,
}

/// 最近一次失败发生在哪个同步入口。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncRunMode {
    Push,
    Pull,
    Sync,
}

//! 云同步公开类型与 IPC 载荷。

use serde::{Deserialize, Serialize};

/// 同步状态机对前端暴露的稳定状态。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncStatusKind {
    Disabled,
    Idle,
    Dirty,
    Pushing,
    Pulling,
    Error,
}

impl Default for SyncStatusKind {
    fn default() -> Self {
        Self::Disabled
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
    pub remote_token: Option<String>,
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

/// 最近一次失败发生在 push 还是 pull。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncRunMode {
    Push,
    Pull,
    Force,
}

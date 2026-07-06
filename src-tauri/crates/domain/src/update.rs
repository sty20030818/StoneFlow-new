//! 应用内更新的纯领域模型。
//!
//! 本模块不依赖 Tauri、网络或任何 I/O，只承载更新相关的值对象、枚举和领域规则。

use serde::{Deserialize, Serialize};

/// 更新检查模式（用户设置）。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum UpdateCheckMode {
    /// 不自动检查，仅用户手动触发。
    Manual,
    /// 启动 + 定时检查，发现更新弹窗提示，用户决定是否下载。
    NotifyOnly,
    /// 自动后台下载，下载完成后提示用户重启。
    AutoDownload,
    /// 自动后台下载，下载完成后更显著地提示重启。
    AutoInstall,
}

impl Default for UpdateCheckMode {
    fn default() -> Self {
        Self::NotifyOnly
    }
}

/// 更新渠道。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum UpdateChannel {
    /// 正式版。
    Stable,
    /// 测试版（包含实验性功能）。
    Beta,
}

impl Default for UpdateChannel {
    fn default() -> Self {
        Self::Stable
    }
}

impl UpdateChannel {
    /// 返回渠道在远端 endpoint 中的路径段。
    pub fn path_segment(self) -> &'static str {
        match self {
            Self::Stable => "stable",
            Self::Beta => "beta",
        }
    }
}

/// 更新状态（传输到前端）。
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "status", rename_all = "camelCase")]
pub enum UpdateStatus {
    /// 空闲 / 未检查。
    Idle,
    /// 正在检查。
    Checking,
    /// 有可用更新。
    UpdateAvailable {
        version: String,
        body: Option<String>,
        pub_date: Option<String>,
    },
    /// 当前已是最新。
    UpToDate,
    /// 正在下载。
    Downloading {
        downloaded: u64,
        total: Option<u64>,
    },
    /// 下载完成，等待重启。
    Downloaded {
        version: String,
    },
    /// 更新出错。
    Error {
        message: String,
    },
}

/// 更新相关用户设置（持久化存储）。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSettings {
    /// 更新检查模式。
    pub check_mode: UpdateCheckMode,
    /// 更新渠道。
    pub channel: UpdateChannel,
    /// 用户已选择跳过的版本号集合。
    pub skipped_versions: Vec<String>,
    /// 上次自动检查时间（unix timestamp 秒），用于 6 小时节流。
    pub last_checked_at: Option<i64>,
}

impl Default for UpdateSettings {
    fn default() -> Self {
        Self {
            check_mode: UpdateCheckMode::default(),
            channel: UpdateChannel::default(),
            skipped_versions: Vec::new(),
            last_checked_at: None,
        }
    }
}

/// 自动检查节流间隔：6 小时。
pub const AUTO_CHECK_INTERVAL_SECS: i64 = 6 * 60 * 60;

/// 启动后首次自动检查的延迟（避免影响启动速度）。
pub const STARTUP_CHECK_DELAY_SECS: u64 = 3;

/// 判断给定时间戳是否需要执行自动检查（距上次检查超过节流间隔）。
pub fn should_auto_check(now_ts: i64, last_checked_at: Option<i64>) -> bool {
    match last_checked_at {
        None => true,
        Some(last) => now_ts - last >= AUTO_CHECK_INTERVAL_SECS,
    }
}

/// 判断给定版本号是否在用户跳过列表中。
pub fn is_version_skipped(skipped_versions: &[String], version: &str) -> bool {
    skipped_versions.iter().any(|v| v == version)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_settings_should_be_notify_only_stable() {
        let settings = UpdateSettings::default();
        assert_eq!(settings.check_mode, UpdateCheckMode::NotifyOnly);
        assert_eq!(settings.channel, UpdateChannel::Stable);
        assert!(settings.skipped_versions.is_empty());
        assert!(settings.last_checked_at.is_none());
    }

    #[test]
    fn should_auto_check_when_never_checked() {
        assert!(should_auto_check(1000, None));
    }

    #[test]
    fn should_auto_check_after_interval() {
        assert!(should_auto_check(1000 + AUTO_CHECK_INTERVAL_SECS, Some(1000)));
        assert!(!should_auto_check(1000 + AUTO_CHECK_INTERVAL_SECS - 1, Some(1000)));
    }

    #[test]
    fn is_version_skipped_should_match_exact_version() {
        let skipped = vec!["0.2.0".to_string(), "0.3.0-beta.1".to_string()];
        assert!(is_version_skipped(&skipped, "0.2.0"));
        assert!(is_version_skipped(&skipped, "0.3.0-beta.1"));
        assert!(!is_version_skipped(&skipped, "0.2.1"));
    }

    #[test]
    fn channel_path_segment_should_match_endpoint_layout() {
        assert_eq!(UpdateChannel::Stable.path_segment(), "stable");
        assert_eq!(UpdateChannel::Beta.path_segment(), "beta");
    }
}

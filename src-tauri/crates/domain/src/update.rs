//! 应用内更新的纯领域模型。
//!
//! 本模块不依赖 Tauri、网络或任何 I/O，只承载更新相关的值对象、枚举和领域规则。

use serde::{Deserialize, Serialize};

/// 更新检查模式（用户设置）。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum UpdateCheckMode {
    /// 不自动检查，仅用户手动触发。
    Manual,
    /// 启动 + 定时检查，发现更新弹窗提示，用户决定是否下载。
    #[default]
    NotifyOnly,
    /// 静默后台下载，下载完成后提示用户重启（不自动重启）。
    AutoDownload,
}

/// 更新渠道。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum UpdateChannel {
    /// 正式版。
    #[default]
    Stable,
    /// 测试版（包含实验性功能）。
    Beta,
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

/// 更新相关用户设置（持久化存储）。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSettings {
    /// 更新检查模式。
    pub check_mode: UpdateCheckMode,
    /// 更新渠道。
    pub channel: UpdateChannel,
    /// 用户跳过的「当前忽略」版本号（只记一个：远端仍是该版本时自动检查不再提醒）。
    pub skipped_version: Option<String>,
    /// 上次自动检查时间（unix timestamp 秒），用于节流。
    pub last_checked_at: Option<i64>,
    /// 自动检查间隔（秒）。缺省 / 非法值由 [`normalize_check_interval_secs`] 收敛。
    #[serde(default = "default_check_interval_secs")]
    pub check_interval_secs: i64,
    /// 应用内更新重启前记录的目标版本；新进程匹配后一次性消费。
    #[serde(default)]
    pub pending_restart_version: Option<String>,
}

fn default_check_interval_secs() -> i64 {
    AUTO_CHECK_INTERVAL_SECS
}

impl Default for UpdateSettings {
    fn default() -> Self {
        Self {
            check_mode: UpdateCheckMode::default(),
            channel: UpdateChannel::default(),
            skipped_version: None,
            last_checked_at: None,
            check_interval_secs: AUTO_CHECK_INTERVAL_SECS,
            pending_restart_version: None,
        }
    }
}

/// 默认自动检查节流间隔：6 小时。
pub const AUTO_CHECK_INTERVAL_SECS: i64 = 6 * 60 * 60;

/// 允许的检查间隔（秒）：1h / 3h / 6h / 12h / 24h。
pub const ALLOWED_CHECK_INTERVAL_SECS: &[i64] = &[
    60 * 60,
    3 * 60 * 60,
    6 * 60 * 60,
    12 * 60 * 60,
    24 * 60 * 60,
];

/// 启动后首次自动检查的延迟（避免影响启动速度）。
pub const STARTUP_CHECK_DELAY_SECS: u64 = 3;

/// 将间隔收敛到允许列表（非法 / 缺失 → 默认 6h）。
pub fn normalize_check_interval_secs(raw: i64) -> i64 {
    if ALLOWED_CHECK_INTERVAL_SECS.contains(&raw) {
        raw
    } else {
        AUTO_CHECK_INTERVAL_SECS
    }
}

/// 判断给定时间戳是否需要执行自动检查（距上次检查超过节流间隔）。
pub fn should_auto_check(now_ts: i64, last_checked_at: Option<i64>) -> bool {
    should_auto_check_with_interval(now_ts, last_checked_at, AUTO_CHECK_INTERVAL_SECS)
}

/// 使用自定义间隔判断是否应自动检查。
pub fn should_auto_check_with_interval(
    now_ts: i64,
    last_checked_at: Option<i64>,
    interval_secs: i64,
) -> bool {
    let interval = normalize_check_interval_secs(interval_secs);
    match last_checked_at {
        None => true,
        Some(last) => now_ts - last >= interval,
    }
}

/// 判断远端版本是否正是用户选择跳过的那个版本。
pub fn is_version_skipped(skipped_version: Option<&str>, version: &str) -> bool {
    skipped_version.is_some_and(|s| s == version)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_settings_should_be_notify_only_stable() {
        let settings = UpdateSettings::default();
        assert_eq!(settings.check_mode, UpdateCheckMode::NotifyOnly);
        assert_eq!(settings.channel, UpdateChannel::Stable);
        assert!(settings.skipped_version.is_none());
        assert!(settings.last_checked_at.is_none());
        assert!(settings.pending_restart_version.is_none());
    }

    #[test]
    fn default_check_mode_is_notify_only() {
        assert_eq!(UpdateCheckMode::default(), UpdateCheckMode::NotifyOnly);
    }

    #[test]
    fn should_auto_check_when_never_checked() {
        assert!(should_auto_check(1000, None));
    }

    #[test]
    fn should_auto_check_after_interval() {
        assert!(should_auto_check(
            1000 + AUTO_CHECK_INTERVAL_SECS,
            Some(1000)
        ));
        assert!(!should_auto_check(
            1000 + AUTO_CHECK_INTERVAL_SECS - 1,
            Some(1000)
        ));
    }

    #[test]
    fn normalize_check_interval_secs_clamps_unknown() {
        assert_eq!(normalize_check_interval_secs(3600), 3600);
        assert_eq!(normalize_check_interval_secs(999), AUTO_CHECK_INTERVAL_SECS);
        assert_eq!(normalize_check_interval_secs(-1), AUTO_CHECK_INTERVAL_SECS);
    }

    #[test]
    fn should_auto_check_with_custom_interval() {
        let one_hour = 3600;
        assert!(should_auto_check_with_interval(
            1000 + one_hour,
            Some(1000),
            one_hour
        ));
        assert!(!should_auto_check_with_interval(
            1000 + one_hour - 1,
            Some(1000),
            one_hour
        ));
    }

    #[test]
    fn default_settings_include_default_interval() {
        assert_eq!(
            UpdateSettings::default().check_interval_secs,
            AUTO_CHECK_INTERVAL_SECS
        );
    }

    #[test]
    fn is_version_skipped_should_match_exact_version() {
        assert!(is_version_skipped(Some("0.2.0"), "0.2.0"));
        assert!(is_version_skipped(Some("0.3.0-beta.1"), "0.3.0-beta.1"));
        assert!(!is_version_skipped(Some("0.2.0"), "0.2.1"));
        assert!(!is_version_skipped(None, "0.2.0"));
    }

    #[test]
    fn channel_path_segment_should_match_endpoint_layout() {
        assert_eq!(UpdateChannel::Stable.path_segment(), "stable");
        assert_eq!(UpdateChannel::Beta.path_segment(), "beta");
    }
}

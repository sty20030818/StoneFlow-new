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
    /// 静默后台下载，下载完成后提示用户重启（不自动重启）。
    AutoDownload,
}

impl Default for UpdateCheckMode {
    fn default() -> Self {
        Self::NotifyOnly
    }
}

/// 从持久化字符串解析检查模式，并迁移历史值。
///
/// - `"autoInstall"` → [`UpdateCheckMode::AutoDownload`]（历史模式迁移）
/// - `"manual"` / `"notifyOnly"` / `"autoDownload"` → 对应变体
/// - 未知或空 → 默认 [`UpdateCheckMode::NotifyOnly`]
///
/// 返回 `(mode, migrated)`：`migrated == true` 表示存储值被改写（历史 `autoInstall`），
/// 调用方应回写设置以清理持久化数据。
pub fn migrate_check_mode_from_stored(raw: &str) -> (UpdateCheckMode, bool) {
    match raw {
        "manual" => (UpdateCheckMode::Manual, false),
        "notifyOnly" => (UpdateCheckMode::NotifyOnly, false),
        "autoDownload" => (UpdateCheckMode::AutoDownload, false),
        "autoInstall" => (UpdateCheckMode::AutoDownload, true),
        _ => (UpdateCheckMode::NotifyOnly, false),
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
    /// 上次自动检查时间（unix timestamp 秒），用于节流。
    pub last_checked_at: Option<i64>,
    /// 自动检查间隔（秒）。缺省 / 非法值由 [`normalize_check_interval_secs`] 收敛。
    #[serde(default = "default_check_interval_secs")]
    pub check_interval_secs: i64,
}

fn default_check_interval_secs() -> i64 {
    AUTO_CHECK_INTERVAL_SECS
}

impl Default for UpdateSettings {
    fn default() -> Self {
        Self {
            check_mode: UpdateCheckMode::default(),
            channel: UpdateChannel::default(),
            skipped_versions: Vec::new(),
            last_checked_at: None,
            check_interval_secs: AUTO_CHECK_INTERVAL_SECS,
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
    fn default_check_mode_is_notify_only() {
        assert_eq!(UpdateCheckMode::default(), UpdateCheckMode::NotifyOnly);
    }

    #[test]
    fn migrate_check_mode_known_values() {
        assert_eq!(
            migrate_check_mode_from_stored("manual"),
            (UpdateCheckMode::Manual, false)
        );
        assert_eq!(
            migrate_check_mode_from_stored("notifyOnly"),
            (UpdateCheckMode::NotifyOnly, false)
        );
        assert_eq!(
            migrate_check_mode_from_stored("autoDownload"),
            (UpdateCheckMode::AutoDownload, false)
        );
    }

    #[test]
    fn migrate_auto_install_to_auto_download() {
        assert_eq!(
            migrate_check_mode_from_stored("autoInstall"),
            (UpdateCheckMode::AutoDownload, true)
        );
    }

    #[test]
    fn migrate_unknown_check_mode_to_notify_only() {
        assert_eq!(
            migrate_check_mode_from_stored("somethingElse"),
            (UpdateCheckMode::NotifyOnly, false)
        );
        assert_eq!(
            migrate_check_mode_from_stored(""),
            (UpdateCheckMode::NotifyOnly, false)
        );
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
    fn normalize_check_interval_secs_clamps_unknown() {
        assert_eq!(normalize_check_interval_secs(3600), 3600);
        assert_eq!(normalize_check_interval_secs(999), AUTO_CHECK_INTERVAL_SECS);
        assert_eq!(normalize_check_interval_secs(-1), AUTO_CHECK_INTERVAL_SECS);
    }

    #[test]
    fn should_auto_check_with_custom_interval() {
        let one_hour = 3600;
        assert!(should_auto_check_with_interval(1000 + one_hour, Some(1000), one_hour));
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

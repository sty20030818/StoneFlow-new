//! 云同步策略：用户选择的自动同步节奏。
//!
//! - `Interval`：按固定分钟周期同步（含空闲时 pull，便于多设备收敛）
//! - `OnWrite`：本地有写入后，空闲 debounce 秒再同步
//! - `Manual`：仅手动 / 显式触发

use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};

use crate::app::error::AppError;

pub const DEFAULT_SYNC_INTERVAL_MINUTES: u16 = 15;
pub const MIN_SYNC_INTERVAL_MINUTES: u16 = 1;
pub const MAX_SYNC_INTERVAL_MINUTES: u16 = 1440; // 24 小时
pub const ON_WRITE_IDLE_SECONDS: i64 = 3;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncPolicyMode {
    /// 每 N 分钟自动同步一次。
    Interval,
    /// 有本地更新后，空闲若干秒再同步。
    OnWrite,
    /// 仅手动同步。
    Manual,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncPolicy {
    pub mode: SyncPolicyMode,
    pub interval_minutes: u16,
}

impl Default for SyncPolicy {
    fn default() -> Self {
        Self {
            mode: SyncPolicyMode::Interval,
            interval_minutes: DEFAULT_SYNC_INTERVAL_MINUTES,
        }
    }
}

impl SyncPolicy {
    pub fn validated(self) -> Result<Self, AppError> {
        match self.mode {
            // 非定时模式不使用间隔，但仍保留上次有效值，方便用户切回定时时恢复偏好。
            SyncPolicyMode::Manual | SyncPolicyMode::OnWrite
                if (MIN_SYNC_INTERVAL_MINUTES..=MAX_SYNC_INTERVAL_MINUTES)
                    .contains(&self.interval_minutes) =>
            {
                Ok(self)
            }
            SyncPolicyMode::Manual | SyncPolicyMode::OnWrite => Err(AppError::validation(format!(
                "同步间隔须在 {MIN_SYNC_INTERVAL_MINUTES}–{MAX_SYNC_INTERVAL_MINUTES} 分钟之间"
            ))),
            SyncPolicyMode::Interval
                if (MIN_SYNC_INTERVAL_MINUTES..=MAX_SYNC_INTERVAL_MINUTES)
                    .contains(&self.interval_minutes) =>
            {
                Ok(self)
            }
            SyncPolicyMode::Interval => Err(AppError::validation(format!(
                "同步间隔须在 {MIN_SYNC_INTERVAL_MINUTES}–{MAX_SYNC_INTERVAL_MINUTES} 分钟之间"
            ))),
        }
    }

    /// 周期模式：下一次定时同步时刻。
    pub fn next_interval_at(&self, now: DateTime<Utc>) -> Option<DateTime<Utc>> {
        match self.mode {
            SyncPolicyMode::Interval => {
                Some(now + Duration::minutes(i64::from(self.interval_minutes)))
            }
            SyncPolicyMode::OnWrite | SyncPolicyMode::Manual => None,
        }
    }

    /// 写后模式：空闲 debounce 后的同步时刻（每次写入应重置）。
    pub fn next_on_write_at(&self, now: DateTime<Utc>) -> Option<DateTime<Utc>> {
        match self.mode {
            SyncPolicyMode::OnWrite => Some(now + Duration::seconds(ON_WRITE_IDLE_SECONDS)),
            SyncPolicyMode::Interval | SyncPolicyMode::Manual => None,
        }
    }

    /// 兼容旧调用名。
    pub fn next_sync_at(&self, now: DateTime<Utc>) -> Option<DateTime<Utc>> {
        self.next_interval_at(now)
    }
}

#[cfg(test)]
mod tests {
    use super::{
        SyncPolicy, SyncPolicyMode, DEFAULT_SYNC_INTERVAL_MINUTES, MAX_SYNC_INTERVAL_MINUTES,
        MIN_SYNC_INTERVAL_MINUTES, ON_WRITE_IDLE_SECONDS,
    };

    #[test]
    fn default_policy_should_use_fifteen_minute_interval() {
        let policy = SyncPolicy::default();
        assert_eq!(policy.mode, SyncPolicyMode::Interval);
        assert_eq!(policy.interval_minutes, DEFAULT_SYNC_INTERVAL_MINUTES);
    }

    #[test]
    fn manual_and_on_write_should_preserve_interval_preference() {
        for mode in [SyncPolicyMode::Manual, SyncPolicyMode::OnWrite] {
            let policy = SyncPolicy {
                mode,
                interval_minutes: 30,
            }
            .validated()
            .expect("should validate");
            assert_eq!(policy.interval_minutes, 30);
        }
    }

    #[test]
    fn interval_policy_should_accept_any_minute_in_range() {
        for minutes in [1_u16, 7, 15, 90, 1440] {
            let policy = SyncPolicy {
                mode: SyncPolicyMode::Interval,
                interval_minutes: minutes,
            }
            .validated()
            .expect("should accept");
            assert_eq!(policy.interval_minutes, minutes);
        }
    }

    #[test]
    fn interval_policy_should_reject_out_of_range() {
        for minutes in [0_u16, MAX_SYNC_INTERVAL_MINUTES + 1] {
            let err = SyncPolicy {
                mode: SyncPolicyMode::Interval,
                interval_minutes: minutes,
            }
            .validated()
            .expect_err("should reject");
            assert!(err.to_string().contains("同步间隔"));
        }
        let _ = MIN_SYNC_INTERVAL_MINUTES;
    }

    #[test]
    fn interval_policy_should_calculate_next_sync_at() {
        let now = chrono::DateTime::parse_from_rfc3339("2026-07-01T10:00:00Z")
            .expect("time should parse")
            .with_timezone(&chrono::Utc);
        let policy = SyncPolicy {
            mode: SyncPolicyMode::Interval,
            interval_minutes: 15,
        };
        assert_eq!(
            policy.next_interval_at(now),
            Some(now + chrono::Duration::minutes(15))
        );
    }

    #[test]
    fn on_write_policy_should_use_idle_debounce() {
        let now = chrono::DateTime::parse_from_rfc3339("2026-07-01T10:00:00Z")
            .expect("time should parse")
            .with_timezone(&chrono::Utc);
        let policy = SyncPolicy {
            mode: SyncPolicyMode::OnWrite,
            interval_minutes: 15,
        };
        assert_eq!(
            policy.next_on_write_at(now),
            Some(now + chrono::Duration::seconds(ON_WRITE_IDLE_SECONDS))
        );
        assert_eq!(policy.next_interval_at(now), None);
    }
}

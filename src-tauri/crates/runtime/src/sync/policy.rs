//! 云同步策略：只描述用户选择的自动同步节奏。

use serde::{Deserialize, Serialize};

use crate::app::error::AppError;

pub const DEFAULT_SYNC_INTERVAL_MINUTES: u16 = 15;
const ALLOWED_INTERVAL_MINUTES: [u16; 3] = [5, 15, 30];

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncPolicyMode {
    Interval,
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
            SyncPolicyMode::Manual => Ok(Self {
                mode: SyncPolicyMode::Manual,
                interval_minutes: DEFAULT_SYNC_INTERVAL_MINUTES,
            }),
            SyncPolicyMode::Interval if ALLOWED_INTERVAL_MINUTES.contains(&self.interval_minutes) => {
                Ok(self)
            }
            SyncPolicyMode::Interval => Err(AppError::validation(
                "同步频率只支持 5、15 或 30 分钟",
            )),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{SyncPolicy, SyncPolicyMode, DEFAULT_SYNC_INTERVAL_MINUTES};

    #[test]
    fn default_policy_should_use_fifteen_minute_interval() {
        let policy = SyncPolicy::default();

        assert_eq!(policy.mode, SyncPolicyMode::Interval);
        assert_eq!(policy.interval_minutes, DEFAULT_SYNC_INTERVAL_MINUTES);
    }

    #[test]
    fn manual_policy_should_ignore_input_interval() {
        let policy = SyncPolicy {
            mode: SyncPolicyMode::Manual,
            interval_minutes: 30,
        }
        .validated()
        .expect("manual policy should normalize");

        assert_eq!(policy.interval_minutes, DEFAULT_SYNC_INTERVAL_MINUTES);
    }
}

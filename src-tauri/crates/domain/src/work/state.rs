//! Task / Project 嵌入的共享 WorkState。

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use crate::{now_utc, parse_utc_rfc3339, DomainError};

use super::{WorkPriority, WorkStatus};

/// Task / Project 嵌入的共享工作状态。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkState {
    pub status: WorkStatus,
    pub priority: WorkPriority,
    pub planned_at: Option<DateTime<Utc>>,
    pub due_at: Option<DateTime<Utc>>,
    pub remind_at: Option<DateTime<Utc>>,
    pub status_changed_at: DateTime<Utc>,
    pub completed_at: Option<DateTime<Utc>>,
}

impl WorkState {
    /// 创建初始待执行状态。
    pub fn new_todo(now: DateTime<Utc>) -> Self {
        Self {
            status: WorkStatus::Todo,
            priority: WorkPriority::None,
            planned_at: None,
            due_at: None,
            remind_at: None,
            status_changed_at: now,
            completed_at: None,
        }
    }

    /// 任意状态可手动切换；离开 done 清空 completed_at，进入 done 写入 completed_at。
    pub fn with_status(mut self, next: WorkStatus, now: DateTime<Utc>) -> Self {
        if self.status != next {
            self.status = next;
            self.status_changed_at = now;
        }
        self.completed_at = if next.is_done() {
            Some(self.completed_at.unwrap_or(now))
        } else {
            None
        };
        self
    }

    pub fn with_priority(mut self, priority: WorkPriority) -> Self {
        self.priority = priority;
        self
    }

    pub fn with_planned_at(mut self, value: Option<DateTime<Utc>>) -> Result<Self, DomainError> {
        validate_optional_utc(value, "planned_at")?;
        self.planned_at = value;
        Ok(self)
    }

    pub fn with_due_at(mut self, value: Option<DateTime<Utc>>) -> Result<Self, DomainError> {
        validate_optional_utc(value, "due_at")?;
        self.due_at = value;
        Ok(self)
    }

    pub fn with_remind_at(mut self, value: Option<DateTime<Utc>>) -> Result<Self, DomainError> {
        validate_optional_utc(value, "remind_at")?;
        self.remind_at = value;
        Ok(self)
    }

    /// 校验当前字段自洽（UTC 精确时间、done 与 completed_at 一致）。
    pub fn validate(&self) -> Result<(), DomainError> {
        validate_optional_utc(self.planned_at, "planned_at")?;
        validate_optional_utc(self.due_at, "due_at")?;
        validate_optional_utc(self.remind_at, "remind_at")?;
        if self.status.is_done() && self.completed_at.is_none() {
            return Err(DomainError::validation("状态为 done 时必须有 completed_at"));
        }
        if !self.status.is_done() && self.completed_at.is_some() {
            return Err(DomainError::validation("非 done 状态不得保留 completed_at"));
        }
        Ok(())
    }
}

fn validate_optional_utc(value: Option<DateTime<Utc>>, field: &str) -> Result<(), DomainError> {
    // DateTime<Utc> 本身已保证时区；此处保留扩展点（如禁止未来 remind 等）。
    let _ = (value, field);
    Ok(())
}

/// 从 RFC3339 字符串构造可选 UTC 时间。
pub fn parse_optional_utc_rfc3339(
    value: Option<&str>,
    field: &str,
) -> Result<Option<DateTime<Utc>>, DomainError> {
    match value {
        None => Ok(None),
        Some(raw) if raw.trim().is_empty() => Ok(None),
        Some(raw) => Ok(Some(parse_utc_rfc3339(raw, field)?)),
    }
}

/// 便捷：以当前时间切换状态。
pub fn transition_status(state: WorkState, next: WorkStatus) -> WorkState {
    state.with_status(next, now_utc())
}

#[cfg(test)]
mod tests {
    use chrono::{TimeZone, Utc};

    use super::*;

    fn fixed_now() -> DateTime<Utc> {
        Utc.with_ymd_and_hms(2026, 7, 22, 10, 0, 0)
            .single()
            .expect("timestamp")
    }

    #[test]
    fn leaving_done_should_clear_completed_at() {
        let now = fixed_now();
        let state = WorkState::new_todo(now)
            .with_status(WorkStatus::Done, now)
            .with_status(WorkStatus::Todo, now);

        assert_eq!(state.status, WorkStatus::Todo);
        assert!(state.completed_at.is_none());
        assert_eq!(state.status_changed_at, now);
    }

    #[test]
    fn entering_done_should_set_completed_at() {
        let now = fixed_now();
        let state = WorkState::new_todo(now).with_status(WorkStatus::Done, now);

        assert_eq!(state.status, WorkStatus::Done);
        assert_eq!(state.completed_at, Some(now));
    }

    #[test]
    fn any_status_can_transition_manually() {
        let now = fixed_now();
        let mut state = WorkState::new_todo(now);
        for next in [
            WorkStatus::Doing,
            WorkStatus::Waiting,
            WorkStatus::Canceled,
            WorkStatus::Done,
            WorkStatus::Todo,
        ] {
            state = state.with_status(next, now);
            assert_eq!(state.status, next);
        }
    }

    #[test]
    fn priority_roundtrip_i32() {
        for value in 0..=4 {
            let priority = WorkPriority::from_i32(value).expect("valid");
            assert_eq!(priority.as_i32(), value);
        }
        assert!(WorkPriority::from_i32(5).is_err());
    }

    #[test]
    fn validate_should_reject_done_without_completed_at() {
        let now = fixed_now();
        let mut state = WorkState::new_todo(now);
        state.status = WorkStatus::Done;
        state.completed_at = None;
        assert!(state.validate().is_err());
    }

    #[test]
    fn status_persists_as_text_tokens() {
        assert_eq!(WorkStatus::Todo.as_str(), "todo");
        assert_eq!(
            WorkStatus::parse("canceled").expect("ok"),
            WorkStatus::Canceled
        );
    }
}

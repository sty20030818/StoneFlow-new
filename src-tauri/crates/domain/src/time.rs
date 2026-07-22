//! 统一时间工具。

use chrono::{DateTime, Local, NaiveDate, Utc};

use crate::DomainError;

/// 返回当前 UTC 时间。
pub fn now_utc() -> DateTime<Utc> {
    Utc::now()
}

/// 将 UTC 时间截断为日期。
pub fn to_date_only(value: DateTime<Utc>) -> NaiveDate {
    value.date_naive()
}

/// 判断两个时间是否处于同一天（UTC）。
pub fn is_same_utc_day(left: DateTime<Utc>, right: DateTime<Utc>) -> bool {
    to_date_only(left) == to_date_only(right)
}

/// 返回当前本地日历日。
pub fn today_local_date() -> NaiveDate {
    Local::now().date_naive()
}

/// 解析并校验 UTC RFC3339 精确时间戳。
pub fn parse_utc_rfc3339(value: &str, field: &str) -> Result<DateTime<Utc>, DomainError> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(DomainError::validation(format!("{field} 不能为空")));
    }

    DateTime::parse_from_rfc3339(trimmed)
        .map(|dt| dt.with_timezone(&Utc))
        .map_err(|_| DomainError::validation(format!("{field} 必须是 UTC RFC3339 时间戳")))
}

/// 序列化为 UTC RFC3339。
pub fn format_utc_rfc3339(value: DateTime<Utc>) -> String {
    value.to_rfc3339()
}

/// 解析日历日字符串（展示层辅助；持久化仍只用 RFC3339）。
pub fn parse_calendar_date(value: &str) -> Option<NaiveDate> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }

    NaiveDate::parse_from_str(trimmed, "%Y-%m-%d")
        .ok()
        .or_else(|| {
            DateTime::parse_from_rfc3339(trimmed)
                .ok()
                .map(|date_time| date_time.with_timezone(&Utc).date_naive())
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_utc_rfc3339_should_accept_z_suffix() {
        let value = parse_utc_rfc3339("2026-07-22T10:00:00Z", "due_at").expect("parse");
        assert_eq!(format_utc_rfc3339(value), "2026-07-22T10:00:00+00:00");
    }

    #[test]
    fn parse_utc_rfc3339_should_reject_date_only() {
        assert!(parse_utc_rfc3339("2026-07-22", "due_at").is_err());
    }
}

//! 统一时间工具。

use chrono::{DateTime, Local, NaiveDate, Utc};

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

/// 解析阶段 8 使用的日期字符串。
/// 优先按 `yyyy-MM-dd` 处理，兼容旧值时回退到 RFC3339 时间戳。
pub fn parse_calendar_date(value: &str) -> Option<NaiveDate> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }

    NaiveDate::parse_from_str(trimmed, "%Y-%m-%d")
        .ok()
        .or_else(|| {
            chrono::DateTime::parse_from_rfc3339(trimmed)
                .ok()
                .map(|date_time| date_time.with_timezone(&Local).date_naive())
        })
}

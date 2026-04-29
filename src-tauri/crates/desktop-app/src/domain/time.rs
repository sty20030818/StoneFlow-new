//! 统一时间工具。

use chrono::{DateTime, Duration, NaiveDate, Utc};

/// 返回当前 UTC 时间。
pub fn now_utc() -> DateTime<Utc> {
    stoneflow_core::now_utc()
}

/// 兼容当前模块既有命名。
pub fn now() -> DateTime<Utc> {
    now_utc()
}

/// 返回给定时间所在 UTC 日的闭开区间 `[start, end)`。
pub fn today_range_at(reference: DateTime<Utc>) -> (DateTime<Utc>, DateTime<Utc>) {
    let start = reference
        .date_naive()
        .and_hms_opt(0, 0, 0)
        .expect("midnight should be valid");
    let start = DateTime::<Utc>::from_naive_utc_and_offset(start, Utc);
    (start, start + Duration::days(1))
}

/// 返回当前 UTC 日的闭开区间 `[start, end)`。
pub fn today_range() -> (DateTime<Utc>, DateTime<Utc>) {
    today_range_at(now_utc())
}

/// 提取 UTC 日期部分。
pub fn date_only(value: DateTime<Utc>) -> NaiveDate {
    stoneflow_core::to_date_only(value)
}

/// 判断给定时间是否属于当前 UTC 日期。
pub fn is_today(value: DateTime<Utc>) -> bool {
    stoneflow_core::is_same_utc_day(value, now_utc())
}

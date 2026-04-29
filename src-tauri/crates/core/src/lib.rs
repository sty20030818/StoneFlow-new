//! StoneFlow Rust workspace 的技术基础层。
//!
//! 这里禁止承载任何产品语义，只保留跨 crate 仍然成立的通用技术能力。

use chrono::{DateTime, NaiveDate, Utc};
use uuid::Uuid;

/// 生成新的 UUID v7。
pub fn new_uuid_v7() -> Uuid {
    Uuid::now_v7()
}

/// 返回当前 UTC 时间。
pub fn now_utc() -> DateTime<Utc> {
    Utc::now()
}

/// 将时间截断为日期。
pub fn to_date_only(value: DateTime<Utc>) -> NaiveDate {
    value.date_naive()
}

/// 判断两个时间是否处于同一天（UTC）。
pub fn is_same_utc_day(left: DateTime<Utc>, right: DateTime<Utc>) -> bool {
    to_date_only(left) == to_date_only(right)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generates_v7_uuid() {
        let first = new_uuid_v7();
        let second = new_uuid_v7();

        assert_eq!(first.get_version_num(), 7);
        assert_eq!(second.get_version_num(), 7);
        assert_ne!(first, second);
    }

    #[test]
    fn compares_utc_day() {
        let value = DateTime::parse_from_rfc3339("2026-05-01T08:00:00Z")
            .expect("timestamp should parse")
            .with_timezone(&Utc);
        let same_day = DateTime::parse_from_rfc3339("2026-05-01T23:59:00Z")
            .expect("timestamp should parse")
            .with_timezone(&Utc);
        let other_day = DateTime::parse_from_rfc3339("2026-05-02T00:00:00Z")
            .expect("timestamp should parse")
            .with_timezone(&Utc);

        assert!(is_same_utc_day(value, same_day));
        assert!(!is_same_utc_day(value, other_day));
    }
}

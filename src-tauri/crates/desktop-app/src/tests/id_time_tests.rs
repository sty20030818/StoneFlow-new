//! 统一 ID / 时间工具测试。

use chrono::{TimeZone, Utc};

use crate::domain::{create_id, date_only, is_today, today_range_at};

#[test]
fn create_id_should_generate_uuid_v7() {
    let first = create_id();
    let second = create_id();

    assert_eq!(first.get_version_num(), 7);
    assert_eq!(second.get_version_num(), 7);
    assert_ne!(first, second);
}

#[test]
fn today_range_at_should_return_same_utc_day_bounds() {
    let reference = Utc
        .with_ymd_and_hms(2026, 4, 29, 13, 45, 10)
        .single()
        .expect("timestamp should be valid");

    let (start, end) = today_range_at(reference);
    assert_eq!(date_only(start), date_only(reference));
    assert_eq!(
        date_only(end - chrono::Duration::seconds(1)),
        date_only(reference)
    );
}

#[test]
fn is_today_should_match_current_utc_day() {
    assert!(is_today(Utc::now()));
}

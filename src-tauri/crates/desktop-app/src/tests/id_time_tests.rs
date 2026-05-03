//! 统一 ID / 时间工具测试。

use chrono::{TimeZone, Utc};

use crate::domain::create_id;

#[test]
fn create_id_should_generate_uuid_v7() {
    let first = create_id();
    let second = create_id();

    assert_eq!(first.get_version_num(), 7);
    assert_eq!(second.get_version_num(), 7);
    assert_ne!(first, second);
}

#[test]
fn to_date_only_should_extract_utc_date() {
    let ts = Utc
        .with_ymd_and_hms(2026, 4, 29, 13, 45, 10)
        .single()
        .expect("timestamp should be valid");
    let date = stoneflow_core::to_date_only(ts);
    assert_eq!(date, chrono::NaiveDate::from_ymd_opt(2026, 4, 29).unwrap());
}

#[test]
fn is_same_utc_day_should_match_current_day() {
    assert!(stoneflow_core::is_same_utc_day(Utc::now(), Utc::now()));
}

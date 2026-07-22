//! 统一 ID / 时间工具测试。

use chrono::{TimeZone, Utc};

use stoneflow_domain::{create_id, is_same_utc_day, to_date_only};

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
    let date = to_date_only(ts);
    assert_eq!(
        date,
        chrono::NaiveDate::from_ymd_opt(2026, 4, 29).expect("date should be valid")
    );
}

#[test]
fn is_same_utc_day_should_match_current_day() {
    assert!(is_same_utc_day(Utc::now(), Utc::now()));
}

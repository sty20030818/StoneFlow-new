//! StoneFlow 的纯业务领域层。
//!
//! 这里承载：
//! - 与 I/O 无关的纯规则；
//! - 统一 ID / 时间 / WorkState 值对象；
//! - 文本归一化与 slug 规则；
//! - 仅表达规则失败的领域错误。

mod activity;
mod error;
mod ids;
mod launcher;
mod lifecycle;
mod project;
mod settings;
mod space;
mod task;
mod task_link;
mod time;
mod update;
mod view;
mod work;

pub use activity::{ActivityActorKind, ActivityEntityKind, ActivitySourceKind};
pub use error::DomainError;
pub use ids::{
    create_id, ensure_position_in_container, ensure_task_belongs_to_space, next_runtime_id,
    validate_entity_id, Generation, Position, POSITION_STEP,
};
pub use launcher::{resolve_default_space_id, LauncherSpaceCandidate};
pub use lifecycle::{
    ensure_active_mutable, ensure_in_trash, ensure_not_in_trash, ensure_not_only_active_default,
    restore_hint, LifecycleEntityType, LifecycleMode,
};
pub use project::{ensure_project_belongs_to_space, validate_project_id};
pub use settings::validate_sidebar_main_visible_count;
pub use space::{ensure_can_retire_default_space, validate_space_id};
pub use task::validate_task_id;
pub use task_link::{validate_http_https_url, validate_link_id, validate_task_id_for_link};
pub use time::{
    format_utc_rfc3339, is_same_utc_day, now_utc, parse_calendar_date, parse_utc_rfc3339,
    to_date_only, today_local_date,
};
pub use update::{
    is_version_skipped, normalize_check_interval_secs, should_auto_check,
    should_auto_check_with_interval, UpdateChannel, UpdateCheckMode, UpdateSettings,
    ALLOWED_CHECK_INTERVAL_SECS, AUTO_CHECK_INTERVAL_SECS, STARTUP_CHECK_DELAY_SECS,
};
pub use view::ViewEntityKind;
pub use work::{
    parse_optional_utc_rfc3339, transition_status, WorkPriority, WorkState, WorkStatus,
};

/// 归一化必填文本。
pub fn normalize_required_text(value: &str, field: &str) -> Result<String, DomainError> {
    let normalized = value.trim();
    if normalized.is_empty() {
        return Err(DomainError::validation(format!("{field} 不能为空")));
    }
    Ok(normalized.to_owned())
}

/// 归一化 slug。
pub fn normalize_slug(value: &str) -> String {
    value
        .trim()
        .chars()
        .flat_map(char::to_lowercase)
        .map(|ch| match ch {
            'a'..='z' | '0'..='9' => ch,
            _ => '-',
        })
        .collect::<String>()
        .split('-')
        .filter(|segment| !segment.is_empty())
        .collect::<Vec<_>>()
        .join("-")
}

#[cfg(test)]
mod tests {
    use chrono::{TimeZone, Utc};

    use super::{
        create_id, is_same_utc_day, normalize_required_text, normalize_slug, parse_calendar_date,
        to_date_only,
    };

    #[test]
    fn create_id_should_generate_uuid_v7() {
        let first = create_id();
        let second = create_id();

        assert_eq!(first.get_version_num(), 7);
        assert_eq!(second.get_version_num(), 7);
        assert_ne!(first, second);
    }

    #[test]
    fn normalize_required_text_should_trim_and_reject_empty() {
        assert_eq!(
            normalize_required_text("  StoneFlow  ", "name").expect("value should be valid"),
            "StoneFlow"
        );
        assert!(normalize_required_text("   ", "name").is_err());
    }

    #[test]
    fn normalize_slug_should_collapse_non_alnum_segments() {
        assert_eq!(normalize_slug("  Stone Flow / Alpha  "), "stone-flow-alpha");
    }

    #[test]
    fn parse_calendar_date_should_support_date_and_rfc3339() {
        assert_eq!(
            parse_calendar_date("2026-06-14").expect("date should parse"),
            chrono::NaiveDate::from_ymd_opt(2026, 6, 14).expect("date should be valid")
        );
        assert!(parse_calendar_date("2026-06-14T01:02:03Z").is_some());
    }

    #[test]
    fn time_helpers_should_compare_utc_day() {
        let left = Utc
            .with_ymd_and_hms(2026, 6, 14, 1, 0, 0)
            .single()
            .expect("timestamp should be valid");
        let right = Utc
            .with_ymd_and_hms(2026, 6, 14, 23, 59, 59)
            .single()
            .expect("timestamp should be valid");
        let other = Utc
            .with_ymd_and_hms(2026, 6, 15, 0, 0, 0)
            .single()
            .expect("timestamp should be valid");

        assert_eq!(
            to_date_only(left),
            chrono::NaiveDate::from_ymd_opt(2026, 6, 14).expect("date should be valid")
        );
        assert!(is_same_utc_day(left, right));
        assert!(!is_same_utc_day(left, other));
    }
}

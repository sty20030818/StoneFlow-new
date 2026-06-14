//! StoneFlow 的纯业务领域层。
//!
//! 这里承载：
//! - 与 I/O 无关的纯规则；
//! - 统一 ID / 时间值对象；
//! - 文本归一化与 slug 规则；
//! - 仅表达规则失败的领域错误。

mod activity;
mod error;
mod ids;
mod lifecycle;
mod project;
mod quick_create;
mod settings;
mod space;
mod task;
mod task_link;
mod time;
mod view;

pub use activity::{ActivityActorKind, ActivityEntityKind, ActivitySourceKind};
pub use error::DomainError;
pub use project::{ensure_project_mutable, validate_project_id};
pub use quick_create::{resolve_default_space_id, QuickCreateSpaceCandidate};
pub use settings::validate_sidebar_main_visible_count;
pub use space::{ensure_space_mutable, validate_space_id};
pub use task::{validate_task_id, validate_task_priority, TaskStatus};
pub use view::{ViewEntityKind, ViewKind};
pub use task_link::{
    validate_http_https_url, validate_link_id, validate_task_id_for_link,
};
pub use ids::{create_id, next_runtime_id};
pub use lifecycle::{
    ensure_deleted, ensure_not_only_active_default, restore_hint, LifecycleEntityType,
    LifecycleMode,
};
pub use time::{
    is_same_utc_day, now_utc, parse_calendar_date, to_date_only, today_local_date,
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

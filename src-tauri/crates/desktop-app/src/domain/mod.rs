//! 纯领域辅助：只保留与具体数据模型无关的基础归一化规则。

use crate::app::error::AppError;

mod ids;
mod time;

pub const DEFAULT_SPACE_NAME: &str = "个人";
pub const DEFAULT_SPACE_SLUG: &str = "personal";

pub use ids::{create_id, next_runtime_id};
pub use time::{
    date_only, is_today, now, now_utc, parse_calendar_date, today_local_date, today_range,
    today_range_at,
};

/// 归一化必填文本。
pub fn normalize_required_text(value: &str, field: &str) -> Result<String, AppError> {
    let normalized = value.trim();
    if normalized.is_empty() {
        return Err(AppError::validation(format!("{field} 不能为空")));
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

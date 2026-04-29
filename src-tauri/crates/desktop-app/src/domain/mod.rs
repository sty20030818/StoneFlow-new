//! 纯领域辅助：只保留与具体数据模型无关的基础归一化规则。

use chrono::{DateTime, Utc};
use stoneflow_core::{new_uuid_v7, now_utc};
use uuid::Uuid;

use crate::app::error::AppError;

pub const DEFAULT_SPACE_NAME: &str = "个人";
pub const DEFAULT_SPACE_SLUG: &str = "personal";

/// 生成新的运行时 ID。
pub fn next_runtime_id() -> Uuid {
    new_uuid_v7()
}

/// 返回当前 UTC 时间。
pub fn now() -> DateTime<Utc> {
    now_utc()
}

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
    value.trim()
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

/// 旧 Focus key 的静态展示文案。
pub fn focus_view_name(key: &str) -> &'static str {
    match key {
        "focus" => "Focus",
        "upcoming" => "近期安排",
        "recent" => "最近更新",
        "high_priority" => "高优先级",
        _ => "系统视图",
    }
}

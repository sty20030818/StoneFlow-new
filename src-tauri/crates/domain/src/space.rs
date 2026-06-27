//! Space 领域规则。

use uuid::Uuid;

use crate::{normalize_required_text, DomainError};

/// 归一化并校验 Space ID（UUID v7）。
pub fn validate_space_id(value: &str) -> Result<String, DomainError> {
    let normalized = normalize_required_text(value, "Space id")?;
    Uuid::parse_str(&normalized).map_err(|_| DomainError::validation("spaceId 必须是合法 UUID"))?;
    Ok(normalized)
}

/// 已删除的 Space 不允许直接编辑或切换默认。
pub fn ensure_space_mutable(deleted_at: Option<&str>) -> Result<(), DomainError> {
    if deleted_at.is_some() {
        return Err(DomainError::validation("已删除的 Space 不能直接编辑或归档"));
    }

    Ok(())
}

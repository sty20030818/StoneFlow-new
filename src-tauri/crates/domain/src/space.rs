//! Space 领域规则。

use crate::{validate_entity_id, DomainError};

/// 归一化并校验 Space ID（UUID）。
pub fn validate_space_id(value: &str) -> Result<String, DomainError> {
    validate_entity_id(value, "Space id")
}

/// 阻止归档/删除唯一活跃默认 Space。
pub fn ensure_can_retire_default_space(
    is_default: bool,
    has_other_active_space: bool,
) -> Result<(), DomainError> {
    if is_default && !has_other_active_space {
        return Err(DomainError::validation("不能归档或删除唯一活跃默认 Space"));
    }
    Ok(())
}

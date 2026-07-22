//! Project 领域规则。

use crate::{validate_entity_id, DomainError};

/// 归一化并校验 Project ID（UUID）。
pub fn validate_project_id(value: &str) -> Result<String, DomainError> {
    validate_entity_id(value, "Project id")
}

/// Project 必须归属 Space。
pub fn ensure_project_belongs_to_space(space_id: &str) -> Result<(), DomainError> {
    validate_entity_id(space_id, "Project space_id")?;
    Ok(())
}

//! Project 领域规则。

use uuid::Uuid;

use crate::{normalize_required_text, DomainError};

/// 归一化并校验 Project ID（UUID）。
pub fn validate_project_id(value: &str) -> Result<String, DomainError> {
    let normalized = normalize_required_text(value, "Project id")?;
    Uuid::parse_str(&normalized)
        .map_err(|_| DomainError::validation("projectId 必须是合法 UUID"))?;
    Ok(normalized)
}

/// 已归档或已删除的 Project 不允许继续编辑。
pub fn ensure_project_mutable(
    archived_at: Option<&str>,
    deleted_at: Option<&str>,
) -> Result<(), DomainError> {
    if deleted_at.is_some() {
        return Err(DomainError::validation("已删除 Project 不能继续编辑"));
    }
    if archived_at.is_some() {
        return Err(DomainError::validation("已归档 Project 不能继续编辑"));
    }
    Ok(())
}

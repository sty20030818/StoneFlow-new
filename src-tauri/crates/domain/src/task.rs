//! Task 领域规则。

use crate::{ensure_task_belongs_to_space, validate_entity_id, DomainError};

/// 归一化并校验 Task ID。
pub fn validate_task_id(value: &str) -> Result<String, DomainError> {
    validate_entity_id(value, "Task id")
}

/// 校验 Task 对 Space / Project 的归属。
pub fn ensure_task_placement(
    space_id: &str,
    project_id: Option<&str>,
    project_space_id: Option<&str>,
) -> Result<(), DomainError> {
    validate_entity_id(space_id, "Task space_id")?;
    if project_id.is_some() && project_space_id.is_none() {
        return Err(DomainError::validation(
            "指定 project_id 时必须提供 Project 的 space_id",
        ));
    }
    if let Some(project_id) = project_id {
        validate_entity_id(project_id, "Task project_id")?;
    }
    ensure_task_belongs_to_space(space_id, project_space_id)
}

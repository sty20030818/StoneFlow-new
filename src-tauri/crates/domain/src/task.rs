//! Task 领域规则。

use crate::{validate_entity_id, DomainError};

/// 归一化并校验 Task ID。
pub fn validate_task_id(value: &str) -> Result<String, DomainError> {
    validate_entity_id(value, "Task id")
}

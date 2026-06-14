//! Task 领域枚举与值对象。

use serde::{Deserialize, Serialize};

use crate::{normalize_required_text, DomainError};

/// 任务状态。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TaskStatus {
    Todo,
    Doing,
    Waiting,
    Done,
    Canceled,
}

/// 归一化并校验 Task ID。
pub fn validate_task_id(value: &str) -> Result<String, DomainError> {
    normalize_required_text(value, "Task id")
}

/// 校验 Task 优先级（0..=4）。
pub fn validate_task_priority(priority: i32) -> Result<i32, DomainError> {
    if (0..=4).contains(&priority) {
        Ok(priority)
    } else {
        Err(DomainError::validation("Task priority 必须在 0 到 4 之间"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_task_priority_should_accept_valid_range() {
        assert_eq!(validate_task_priority(0).expect("0 should pass"), 0);
        assert_eq!(validate_task_priority(4).expect("4 should pass"), 4);
    }

    #[test]
    fn validate_task_priority_should_reject_out_of_range() {
        assert!(validate_task_priority(-1).is_err());
        assert!(validate_task_priority(5).is_err());
    }
}

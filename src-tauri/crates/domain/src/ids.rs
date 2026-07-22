//! 统一 ID、代际与排序位置值对象。

use uuid::Uuid;

use crate::{normalize_required_text, DomainError};

/// 默认排序步进，便于插入重排。
pub const POSITION_STEP: i64 = 1000;

/// 实体代际：删除后恢复或重建 identity 时递增，用于拒绝 stale patch。
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Generation(i64);

impl Generation {
    pub const INITIAL: Self = Self(1);

    pub fn new(value: i64) -> Result<Self, DomainError> {
        if value < 1 {
            return Err(DomainError::validation("generation 必须 >= 1"));
        }
        Ok(Self(value))
    }

    pub fn get(self) -> i64 {
        self.0
    }

    pub fn next(self) -> Self {
        Self(self.0 + 1)
    }
}

/// 容器内手动排序位置。
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Position(i64);

impl Position {
    pub fn new(value: i64) -> Result<Self, DomainError> {
        if value < 0 {
            return Err(DomainError::validation("position 不能为负数"));
        }
        Ok(Self(value))
    }

    pub fn get(self) -> i64 {
        self.0
    }

    pub fn first() -> Self {
        Self(POSITION_STEP)
    }

    pub fn after(self) -> Self {
        Self(self.0 + POSITION_STEP)
    }
}

/// 生成新的业务 ID（UUID v7）。
pub fn create_id() -> Uuid {
    Uuid::now_v7()
}

/// 兼容当前运行时状态命名。
pub fn next_runtime_id() -> Uuid {
    create_id()
}

pub fn validate_entity_id(value: &str, field: &str) -> Result<String, DomainError> {
    let normalized = normalize_required_text(value, field)?;
    Uuid::parse_str(&normalized)
        .map_err(|_| DomainError::validation(format!("{field} 必须是合法 UUID")))?;
    Ok(normalized)
}

/// Task 归属：必属 Space；若指定 Project，则必须同 Space。
pub fn ensure_task_belongs_to_space(
    task_space_id: &str,
    project_space_id: Option<&str>,
) -> Result<(), DomainError> {
    match project_space_id {
        None => Ok(()),
        Some(project_space) if project_space == task_space_id => Ok(()),
        Some(_) => Err(DomainError::validation(
            "Task 与 Project 必须属于同一 Space",
        )),
    }
}

/// 排序位置只在给定容器内有意义。
pub fn ensure_position_in_container(
    container_id: &str,
    expected_container_id: &str,
) -> Result<(), DomainError> {
    if container_id != expected_container_id {
        return Err(DomainError::validation("position 只能在所属容器内解释"));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generation_should_reject_zero() {
        assert!(Generation::new(0).is_err());
        assert_eq!(Generation::INITIAL.next().get(), 2);
    }

    #[test]
    fn ensure_task_belongs_to_space_should_require_same_space() {
        ensure_task_belongs_to_space("s1", None).expect("no project");
        ensure_task_belongs_to_space("s1", Some("s1")).expect("same space");
        assert!(ensure_task_belongs_to_space("s1", Some("s2")).is_err());
    }

    #[test]
    fn position_step_should_leave_gaps() {
        let first = Position::first();
        assert_eq!(first.get(), 1000);
        assert_eq!(first.after().get(), 2000);
    }
}

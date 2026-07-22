//! Lifecycle 领域规则与枚举。
//!
//! 两阶段删除：
//! - Delete：软删进入回收站（仍是实体，可同步、可恢复）
//! - Restore：从回收站撤回
//! - PermanentlyDelete：物理删除并写 tombstone

use serde::{Deserialize, Serialize};

use crate::DomainError;

/// 生命周期实体类型。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum LifecycleEntityType {
    Space,
    Project,
    Task,
}

impl LifecycleEntityType {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Space => "space",
            Self::Project => "project",
            Self::Task => "task",
        }
    }
}

/// 生命周期操作模式。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum LifecycleMode {
    /// 归档（Space / Project / Task）。
    Archive,
    /// 软删进入回收站。
    Delete,
    /// 从归档或回收站恢复。
    Restore,
    /// 回收站内永久删除（物理删 + tombstone）。
    PermanentlyDelete,
}

/// 阻止对唯一活跃默认 Space 执行归档/软删。
pub fn ensure_not_only_active_default(
    is_default: bool,
    has_other_active_space: bool,
    message: &str,
) -> Result<(), DomainError> {
    if is_default && !has_other_active_space {
        return Err(DomainError::validation(message));
    }
    Ok(())
}

/// 实体不在回收站（可编辑 / 可软删）。
pub fn ensure_not_in_trash(deleted_at: Option<&str>, entity: &str) -> Result<(), DomainError> {
    if deleted_at.is_some() {
        return Err(DomainError::validation(format!(
            "{entity} 已在回收站，请先恢复或永久删除"
        )));
    }
    Ok(())
}

/// 实体已在回收站（可恢复 / 可永久删除）。
pub fn ensure_in_trash(deleted_at: Option<&str>, entity: &str) -> Result<(), DomainError> {
    if deleted_at.is_none() {
        return Err(DomainError::validation(format!("{entity} 不在回收站")));
    }
    Ok(())
}

/// 活跃实体可变（未归档且未进回收站）。
pub fn ensure_active_mutable(
    archived_at: Option<&str>,
    deleted_at: Option<&str>,
    entity: &str,
) -> Result<(), DomainError> {
    ensure_not_in_trash(deleted_at, entity)?;
    if archived_at.is_some() {
        return Err(DomainError::validation(format!(
            "{entity} 已归档，无法直接编辑"
        )));
    }
    Ok(())
}

/// 恢复操作提示。
pub fn restore_hint(entity_type: LifecycleEntityType) -> String {
    match entity_type {
        LifecycleEntityType::Space => "恢复本次操作影响的 Space 及其原层级与排序位置".to_owned(),
        LifecycleEntityType::Project => {
            "恢复本次操作影响的 Project；所属 Space 必须仍可用".to_owned()
        }
        LifecycleEntityType::Task => {
            "恢复到原 Space；若原 Project 不可用则进入 Space 独立待办容器".to_owned()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ensure_not_only_active_default_should_reject_sole_default() {
        let err = ensure_not_only_active_default(true, false, "不能删除唯一默认 Space")
            .expect_err("sole default");
        assert!(err.to_string().contains("不能删除唯一默认 Space"));
    }

    #[test]
    fn ensure_not_only_active_default_should_allow_when_other_active_exists() {
        ensure_not_only_active_default(true, true, "msg").expect("other active exists");
    }

    #[test]
    fn trash_guards_should_distinguish_soft_delete_state() {
        ensure_not_in_trash(None, "Task").expect("active");
        assert!(ensure_not_in_trash(Some("t"), "Task").is_err());
        ensure_in_trash(Some("t"), "Task").expect("trashed");
        assert!(ensure_in_trash(None, "Task").is_err());
    }

    #[test]
    fn active_mutable_rejects_archived_or_trashed() {
        ensure_active_mutable(None, None, "Project").expect("ok");
        assert!(ensure_active_mutable(Some("a"), None, "Project").is_err());
        assert!(ensure_active_mutable(None, Some("d"), "Project").is_err());
    }
}

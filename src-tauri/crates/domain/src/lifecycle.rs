//! Lifecycle 领域规则与枚举。

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
    /// 返回实体类型的字符串标识。
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Space => "space",
            Self::Project => "project",
            Self::Task => "task",
        }
    }
}

/// 生命周期列表模式。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum LifecycleMode {
    Archive,
    Trash,
}

/// 阻止归档/删除唯一活跃默认 Space。
pub fn ensure_not_only_active_default(
    is_default: bool,
    archived_at: Option<&str>,
    deleted_at: Option<&str>,
    message: &str,
) -> Result<(), DomainError> {
    if is_default && archived_at.is_none() && deleted_at.is_none() {
        return Err(DomainError::validation(message));
    }

    Ok(())
}

/// 永久删除前必须处于删除态。
pub fn ensure_deleted(deleted_at: Option<&str>, entity_name: &str) -> Result<(), DomainError> {
    if deleted_at.is_none() {
        return Err(DomainError::validation(format!(
            "{entity_name} 只有处于删除态时才能永久删除"
        )));
    }

    Ok(())
}

/// 恢复提示文案。
pub fn restore_hint(entity_type: LifecycleEntityType) -> String {
    match entity_type {
        LifecycleEntityType::Space => "只恢复 Space 本身，不恢复子 Project / Task".to_owned(),
        LifecycleEntityType::Project => "只恢复 Project 本身，前提是所属 Space 仍可用".to_owned(),
        LifecycleEntityType::Task => {
            "优先回原 Space；原 Project 不可用则回 Inbox；原 Space 不可用则落默认 Space".to_owned()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ensure_not_only_active_default_should_reject_active_default_space() {
        let err = ensure_not_only_active_default(true, None, None, "不能删除唯一默认 Space")
            .expect_err("active default should be rejected");
        assert!(err.to_string().contains("不能删除唯一默认 Space"));
    }

    #[test]
    fn ensure_not_only_active_default_should_allow_archived_default_space() {
        ensure_not_only_active_default(true, Some("2026-01-01T00:00:00Z"), None, "msg")
            .expect("archived default should pass");
    }

    #[test]
    fn ensure_deleted_should_require_deleted_state() {
        ensure_deleted(Some("2026-01-01T00:00:00Z"), "Task").expect("deleted should pass");
        let err = ensure_deleted(None, "Task").expect_err("active should fail");
        assert!(err.to_string().contains("永久删除"));
    }
}

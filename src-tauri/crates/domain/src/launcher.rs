//! Launcher 领域规则。

use crate::DomainError;

/// 解析默认 Space 时使用的轻量候选。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LauncherSpaceCandidate {
    pub id: String,
    pub is_default: bool,
}

/// 根据当前 Scope 与可见 Space 列表解析默认 Space ID。
pub fn resolve_default_space_id(
    active_scope_space_id: Option<&str>,
    spaces: &[LauncherSpaceCandidate],
) -> Result<String, DomainError> {
    if spaces.is_empty() {
        return Err(DomainError::validation("当前没有可用 Space"));
    }

    if let Some(space_id) = active_scope_space_id {
        if let Some(space) = spaces.iter().find(|space| space.id == space_id) {
            return Ok(space.id.clone());
        }
    }

    spaces
        .iter()
        .find(|space| space.is_default)
        .or_else(|| spaces.first())
        .map(|space| space.id.clone())
        .ok_or_else(|| DomainError::validation("默认 Space 不可用"))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn candidate(id: &str, is_default: bool) -> LauncherSpaceCandidate {
        LauncherSpaceCandidate {
            id: id.to_owned(),
            is_default,
        }
    }

    #[test]
    fn resolve_default_space_id_should_prefer_active_scope() {
        let spaces = vec![candidate("space-a", true), candidate("space-b", false)];
        let resolved = resolve_default_space_id(Some("space-b"), &spaces).expect("should resolve");
        assert_eq!(resolved, "space-b");
    }

    #[test]
    fn resolve_default_space_id_should_fallback_to_default_flag() {
        let spaces = vec![candidate("space-a", false), candidate("space-b", true)];
        let resolved = resolve_default_space_id(None, &spaces).expect("should resolve");
        assert_eq!(resolved, "space-b");
    }

    #[test]
    fn resolve_default_space_id_should_reject_empty_list() {
        assert!(resolve_default_space_id(None, &[]).is_err());
    }
}

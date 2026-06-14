//! Settings 领域规则。

use crate::DomainError;

/// 校验 Sidebar 主导航至少保留一个可见入口。
pub fn validate_sidebar_main_visible_count(visible_count: usize) -> Result<(), DomainError> {
    if visible_count == 0 {
        return Err(DomainError::validation(
            "Sidebar 主导航至少保留一个可见入口",
        ));
    }

    Ok(())
}

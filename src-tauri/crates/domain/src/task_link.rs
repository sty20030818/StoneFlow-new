//! Task Link 领域规则。

use url::Url;

use crate::{normalize_required_text, DomainError};

/// 归一化并校验 Link ID。
pub fn validate_link_id(value: &str) -> Result<String, DomainError> {
    normalize_required_text(value, "Link id")
}

/// 归一化并校验 Task ID（Link 操作边界）。
pub fn validate_task_id_for_link(value: &str) -> Result<String, DomainError> {
    normalize_required_text(value, "Task id")
}

/// 校验 http/https URL，并返回规范化字符串。
pub fn validate_http_https_url(value: &str) -> Result<String, DomainError> {
    let normalized = normalize_required_text(value, "Link URL")?;
    let parsed =
        Url::parse(&normalized).map_err(|_| DomainError::validation("Link URL 必须是合法 URL"))?;
    match parsed.scheme() {
        "http" | "https" => Ok(parsed.to_string()),
        _ => Err(DomainError::validation("Link URL 仅支持 http 或 https")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_http_https_url_should_reject_custom_scheme() {
        let error = validate_http_https_url("obsidian://vault/spec").expect_err("should fail");
        assert_eq!(error.to_string(), "验证失败: Link URL 仅支持 http 或 https");
    }

    #[test]
    fn validate_http_https_url_should_accept_https() {
        assert_eq!(
            validate_http_https_url("https://example.com/spec").expect("should pass"),
            "https://example.com/spec"
        );
    }
}

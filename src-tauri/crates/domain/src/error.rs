//! 领域层错误：仅表达纯规则失败，不承载 I/O 或框架上下文。

use thiserror::Error;

/// 纯领域规则错误。
#[derive(Debug, Clone, Error, PartialEq, Eq)]
pub enum DomainError {
    /// 输入值不满足领域约束。
    #[error("验证失败: {0}")]
    Validation(String),
}

impl DomainError {
    /// 构造校验失败。
    pub fn validation(message: impl Into<String>) -> Self {
        Self::Validation(message.into())
    }
}

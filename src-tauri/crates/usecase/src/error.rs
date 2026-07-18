//! 用例层错误：表达业务编排、边界校验和持久化失败。

use thiserror::Error;

/// 用例层统一错误。
#[derive(Debug, Clone, Error, PartialEq, Eq)]
pub enum UsecaseError {
    /// 输入或业务约束不满足。
    #[error("验证失败: {0}")]
    Validation(String),

    /// 请求实体不存在。
    #[error("实体不存在: {0}")]
    NotFound(String),

    /// 当前操作与现有数据状态冲突。
    #[error("数据冲突: {0}")]
    Conflict(String),

    /// 底层存储失败。
    #[error("存储失败: {0}")]
    Storage(String),

    /// 初始化或环境异常。
    #[error("初始化失败: {0}")]
    Initialization(String),

    /// 运行时内部失败。
    #[error("内部错误: {0}")]
    Internal(String),

    /// 默认 Space 不可用（Launcher 边界）。
    #[error("默认 Space 不可用: {0}")]
    DefaultSpaceUnavailable(String),

    /// 应用更新相关错误。
    #[error("更新失败: {0}")]
    Update(String),
}

impl UsecaseError {
    /// 构造校验失败。
    pub fn validation(message: impl Into<String>) -> Self {
        Self::Validation(message.into())
    }

    /// 构造不存在错误。
    pub fn not_found(message: impl Into<String>) -> Self {
        Self::NotFound(message.into())
    }

    /// 构造冲突错误。
    pub fn conflict(message: impl Into<String>) -> Self {
        Self::Conflict(message.into())
    }

    /// 构造存储错误。
    pub fn storage(message: impl Into<String>) -> Self {
        Self::Storage(message.into())
    }

    /// 构造初始化错误。
    pub fn initialization(message: impl Into<String>) -> Self {
        Self::Initialization(message.into())
    }

    /// 构造内部错误。
    pub fn internal(message: impl Into<String>) -> Self {
        Self::Internal(message.into())
    }

    /// 构造默认 Space 不可用错误。
    pub fn default_space_unavailable(message: impl Into<String>) -> Self {
        Self::DefaultSpaceUnavailable(message.into())
    }

    /// 构造更新错误。
    pub fn update(message: impl Into<String>) -> Self {
        Self::Update(message.into())
    }
}

impl From<stoneflow_domain::DomainError> for UsecaseError {
    fn from(error: stoneflow_domain::DomainError) -> Self {
        match error {
            stoneflow_domain::DomainError::Validation(message) => Self::Validation(message),
        }
    }
}

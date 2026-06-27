//! 主应用统一错误类型。

use serde::Serialize;
use thiserror::Error;

/// 统一的命令错误载荷。
#[derive(Debug, Clone, Error, Serialize)]
#[serde(tag = "type", content = "message")]
pub enum AppError {
    /// 输入校验失败。
    #[error("验证失败: {0}")]
    Validation(String),

    /// 请求实体不存在。
    #[error("实体不存在: {0}")]
    NotFound(String),

    /// 当前操作不被允许。
    #[error("权限不足: {0}")]
    Forbidden(String),

    /// 数据冲突。
    #[error("数据冲突: {0}")]
    Conflict(String),

    /// 数据库错误。
    #[error("数据库错误: {0}")]
    Database(String),

    /// 初始化错误。
    #[error("初始化失败: {0}")]
    Initialization(String),

    /// 内部错误。
    #[error("内部错误: {0}")]
    Internal(String),

    /// 捕获入口无法解析当前 Space。
    #[error("捕获 Space 解析失败: {0}")]
    CaptureSpaceUnavailable(String),

    /// 默认 Space 不可用。
    #[error("默认 Space 不可用: {0}")]
    DefaultSpaceUnavailable(String),

    /// 捕获任务持久化失败。
    #[error("捕获任务持久化失败: {0}")]
    CapturePersistence(String),
}

impl AppError {
    /// 构造内部错误。
    pub fn internal(message: impl Into<String>) -> Self {
        Self::Internal(message.into())
    }

    /// 构造校验错误。
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

    /// 构造数据库错误。
    pub fn database(message: impl Into<String>) -> Self {
        Self::Database(message.into())
    }

    /// 构造初始化错误。
    pub fn initialization(message: impl Into<String>) -> Self {
        Self::Initialization(message.into())
    }
}

impl From<std::io::Error> for AppError {
    fn from(error: std::io::Error) -> Self {
        Self::Initialization(error.to_string())
    }
}

impl From<anyhow::Error> for AppError {
    fn from(error: anyhow::Error) -> Self {
        Self::Internal(error.to_string())
    }
}

impl From<sea_orm::DbErr> for AppError {
    fn from(error: sea_orm::DbErr) -> Self {
        Self::Database(error.to_string())
    }
}

impl From<stoneflow_domain::DomainError> for AppError {
    fn from(error: stoneflow_domain::DomainError) -> Self {
        match error {
            stoneflow_domain::DomainError::Validation(message) => Self::Validation(message),
        }
    }
}

impl From<stoneflow_usecase::UsecaseError> for AppError {
    fn from(error: stoneflow_usecase::UsecaseError) -> Self {
        match error {
            stoneflow_usecase::UsecaseError::Validation(message) => Self::Validation(message),
            stoneflow_usecase::UsecaseError::NotFound(message) => Self::NotFound(message),
            stoneflow_usecase::UsecaseError::Conflict(message) => Self::Conflict(message),
            stoneflow_usecase::UsecaseError::Storage(message) => Self::Database(message),
            stoneflow_usecase::UsecaseError::Initialization(message) => {
                Self::Initialization(message)
            }
            stoneflow_usecase::UsecaseError::Internal(message) => Self::Internal(message),
            stoneflow_usecase::UsecaseError::DefaultSpaceUnavailable(message) => {
                Self::DefaultSpaceUnavailable(message)
            }
        }
    }
}

impl From<stoneflow_storage::StorageError> for AppError {
    fn from(error: stoneflow_storage::StorageError) -> Self {
        match error {
            stoneflow_storage::StorageError::Validation(message) => Self::Validation(message),
            stoneflow_storage::StorageError::NotFound(message) => Self::NotFound(message),
            stoneflow_storage::StorageError::Database(message) => Self::Database(message),
            stoneflow_storage::StorageError::Initialization(message) => {
                Self::Initialization(message)
            }
        }
    }
}

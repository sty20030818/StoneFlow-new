//! Storage 层统一错误类型。

use thiserror::Error;

/// 持久化与数据库初始化错误。
#[derive(Debug, Clone, Error)]
pub enum StorageError {
    /// 输入校验失败。
    #[error("验证失败: {0}")]
    Validation(String),

    /// 请求实体不存在。
    #[error("实体不存在: {0}")]
    NotFound(String),

    /// 数据库错误。
    #[error("数据库错误: {0}")]
    Database(String),

    /// 初始化错误。
    #[error("初始化失败: {0}")]
    Initialization(String),
}

impl StorageError {
    pub fn validation(message: impl Into<String>) -> Self {
        Self::Validation(message.into())
    }

    pub fn not_found(message: impl Into<String>) -> Self {
        Self::NotFound(message.into())
    }

    pub fn database(message: impl Into<String>) -> Self {
        Self::Database(message.into())
    }

    pub fn initialization(message: impl Into<String>) -> Self {
        Self::Initialization(message.into())
    }
}

impl From<sea_orm::DbErr> for StorageError {
    fn from(error: sea_orm::DbErr) -> Self {
        Self::Database(error.to_string())
    }
}

impl From<std::io::Error> for StorageError {
    fn from(error: std::io::Error) -> Self {
        Self::Initialization(error.to_string())
    }
}

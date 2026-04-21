//! StoneFlow 桌面应用统一错误类型。

use serde::Serialize;
use thiserror::Error;

/// 应用层统一错误类型。
///
/// 用于标准化 Tauri Command 的错误响应，支持序列化为结构化 JSON。
#[derive(Error, Debug, Serialize, Clone)]
#[serde(tag = "type", content = "message")]
pub enum AppError {
    /// 输入验证失败
    #[error("验证失败: {0}")]
    Validation(String),

    /// 请求的实体不存在
    #[error("实体不存在: {0}")]
    NotFound(String),

    /// 权限不足
    #[error("权限不足: {0}")]
    Forbidden(String),

    /// 数据冲突（如重复键）
    #[error("数据冲突: {0}")]
    Conflict(String),

    /// 内部服务器错误
    #[error("内部错误: {0}")]
    Internal(String),
}

impl From<anyhow::Error> for AppError {
    fn from(error: anyhow::Error) -> Self {
        let msg = error.to_string();

        // 基于错误消息模式自动分类
        if msg.contains("does not exist") || msg.contains("does not belong to") {
            AppError::NotFound(msg)
        } else if msg.contains("already exists") {
            AppError::Conflict(msg)
        } else if msg.contains("cannot be empty")
            || msg.contains("invalid")
            || msg.contains("failed to parse")
        {
            AppError::Validation(msg)
        } else if msg.contains("permission") || msg.contains("forbidden") {
            AppError::Forbidden(msg)
        } else {
            AppError::Internal(msg)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn error_serializes_to_expected_format() {
        let error = AppError::NotFound("space `default` does not exist".to_owned());
        let json = serde_json::to_value(&error).unwrap();

        assert_eq!(json["type"], "NotFound");
        assert_eq!(json["message"], "space `default` does not exist");
    }

    #[test]
    fn validation_error_from_anyhow() {
        let anyhow_err = anyhow::anyhow!("name cannot be empty");
        let app_err: AppError = anyhow_err.into();

        assert!(matches!(app_err, AppError::Validation(_)));
    }

    #[test]
    fn not_found_error_from_anyhow() {
        let anyhow_err = anyhow::anyhow!("project `123` does not exist");
        let app_err: AppError = anyhow_err.into();

        assert!(matches!(app_err, AppError::NotFound(_)));
    }

    #[test]
    fn conflict_error_from_anyhow() {
        let anyhow_err = anyhow::anyhow!("space slug `default` already exists");
        let app_err: AppError = anyhow_err.into();

        assert!(matches!(app_err, AppError::Conflict(_)));
    }

    #[test]
    fn internal_error_for_unknown_patterns() {
        let anyhow_err = anyhow::anyhow!("database connection failed");
        let app_err: AppError = anyhow_err.into();

        assert!(matches!(app_err, AppError::Internal(_)));
    }
}

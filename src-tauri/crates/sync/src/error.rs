use thiserror::Error;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SyncErrorKind {
    Validation,
    Authentication,
    LocalDatabase,
    RemoteDatabase,
    Schema,
    Serialization,
    Protocol,
    Internal,
}

#[derive(Debug, Error)]
pub enum SyncError {
    #[error("参数错误: {message}")]
    Validation { message: String },
    #[error("Turso 鉴权失败: {message}")]
    Authentication { message: String },
    #[error("本地数据库错误: {message}")]
    LocalDatabase { message: String },
    #[error("远端数据库错误: {message}")]
    RemoteDatabase { message: String },
    #[error("远端同步 schema 错误: {message}")]
    Schema { message: String },
    #[error("序列化错误: {message}")]
    Serialization { message: String },
    #[error("同步协议错误: {message}")]
    Protocol { message: String },
    #[error("同步 cursor 已过期，需要下载当前基线")]
    CursorExpired,
    #[error("内部错误: {message}")]
    Internal { message: String },
}

impl SyncError {
    pub fn validation(message: impl Into<String>) -> Self {
        Self::Validation {
            message: message.into(),
        }
    }

    pub fn authentication(message: impl Into<String>) -> Self {
        Self::Authentication {
            message: message.into(),
        }
    }

    pub fn local_database(message: impl Into<String>) -> Self {
        Self::LocalDatabase {
            message: message.into(),
        }
    }

    pub fn remote_database(message: impl Into<String>) -> Self {
        Self::RemoteDatabase {
            message: message.into(),
        }
    }

    pub fn schema(message: impl Into<String>) -> Self {
        Self::Schema {
            message: message.into(),
        }
    }

    pub fn serialization(message: impl Into<String>) -> Self {
        Self::Serialization {
            message: message.into(),
        }
    }

    pub fn protocol(message: impl Into<String>) -> Self {
        Self::Protocol {
            message: message.into(),
        }
    }

    pub fn cursor_expired() -> Self {
        Self::CursorExpired
    }

    pub fn internal(message: impl Into<String>) -> Self {
        Self::Internal {
            message: message.into(),
        }
    }

    pub fn kind(&self) -> SyncErrorKind {
        match self {
            Self::Validation { .. } => SyncErrorKind::Validation,
            Self::Authentication { .. } => SyncErrorKind::Authentication,
            Self::LocalDatabase { .. } => SyncErrorKind::LocalDatabase,
            Self::RemoteDatabase { .. } => SyncErrorKind::RemoteDatabase,
            Self::Schema { .. } => SyncErrorKind::Schema,
            Self::Serialization { .. } => SyncErrorKind::Serialization,
            Self::Protocol { .. } | Self::CursorExpired => SyncErrorKind::Protocol,
            Self::Internal { .. } => SyncErrorKind::Internal,
        }
    }

    pub fn message(&self) -> &str {
        match self {
            Self::Validation { message }
            | Self::Authentication { message }
            | Self::LocalDatabase { message }
            | Self::RemoteDatabase { message }
            | Self::Schema { message }
            | Self::Serialization { message }
            | Self::Protocol { message }
            | Self::Internal { message } => message,
            Self::CursorExpired => "同步 cursor 已过期，需要下载当前基线",
        }
    }
}

impl From<std::io::Error> for SyncError {
    fn from(error: std::io::Error) -> Self {
        Self::Internal {
            message: error.to_string(),
        }
    }
}

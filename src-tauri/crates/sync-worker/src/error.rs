use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncWorkerErrorKind {
    Validation,
    Authentication,
    LocalDatabase,
    RemoteDatabase,
    Serialization,
    Protocol,
    Internal,
}

#[derive(Debug, Error)]
pub enum SyncWorkerError {
    #[error("参数错误: {message}")]
    Validation { message: String },
    #[error("Turso 鉴权失败: {message}")]
    Authentication { message: String },
    #[error("本地数据库错误: {message}")]
    LocalDatabase { message: String },
    #[error("远端数据库错误: {message}")]
    RemoteDatabase { message: String },
    #[error("序列化错误: {message}")]
    Serialization { message: String },
    #[error("同步协议错误: {message}")]
    Protocol { message: String },
    #[error("内部错误: {message}")]
    Internal { message: String },
}

impl SyncWorkerError {
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

    pub fn internal(message: impl Into<String>) -> Self {
        Self::Internal {
            message: message.into(),
        }
    }

    pub fn to_wire_json(&self) -> String {
        let wire = SyncWorkerWireError {
            kind: self.kind(),
            message: self.message(),
        };
        match serde_json::to_string(&wire) {
            Ok(value) => value,
            Err(error) => format!(
                "{{\"kind\":\"internal\",\"message\":\"同步 worker 错误序列化失败: {error}\"}}"
            ),
        }
    }

    fn kind(&self) -> SyncWorkerErrorKind {
        match self {
            Self::Validation { .. } => SyncWorkerErrorKind::Validation,
            Self::Authentication { .. } => SyncWorkerErrorKind::Authentication,
            Self::LocalDatabase { .. } => SyncWorkerErrorKind::LocalDatabase,
            Self::RemoteDatabase { .. } => SyncWorkerErrorKind::RemoteDatabase,
            Self::Serialization { .. } => SyncWorkerErrorKind::Serialization,
            Self::Protocol { .. } => SyncWorkerErrorKind::Protocol,
            Self::Internal { .. } => SyncWorkerErrorKind::Internal,
        }
    }

    fn message(&self) -> &str {
        match self {
            Self::Validation { message }
            | Self::Authentication { message }
            | Self::LocalDatabase { message }
            | Self::RemoteDatabase { message }
            | Self::Serialization { message }
            | Self::Protocol { message }
            | Self::Internal { message } => message,
        }
    }
}

impl From<std::io::Error> for SyncWorkerError {
    fn from(error: std::io::Error) -> Self {
        Self::Internal {
            message: error.to_string(),
        }
    }
}

#[derive(Debug, Serialize)]
struct SyncWorkerWireError<'a> {
    kind: SyncWorkerErrorKind,
    message: &'a str,
}

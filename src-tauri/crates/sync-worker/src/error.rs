use thiserror::Error;

#[derive(Debug, Error)]
pub enum SyncWorkerError {
    #[error("参数错误: {0}")]
    Validation(String),
    #[error("内部错误: {0}")]
    Internal(String),
}

impl SyncWorkerError {
    pub fn validation(message: impl Into<String>) -> Self {
        Self::Validation(message.into())
    }

    pub fn internal(message: impl Into<String>) -> Self {
        Self::Internal(message.into())
    }
}

impl From<std::io::Error> for SyncWorkerError {
    fn from(error: std::io::Error) -> Self {
        Self::Internal(error.to_string())
    }
}

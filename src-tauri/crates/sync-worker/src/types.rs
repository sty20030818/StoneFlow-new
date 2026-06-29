use crate::error::SyncWorkerError;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SyncRunMode {
    Push,
    Pull,
    PullV2,
    Restore,
    Diagnose,
}

impl SyncRunMode {
    pub fn parse(raw: &str) -> Result<Self, SyncWorkerError> {
        match raw {
            "push" => Ok(Self::Push),
            "pull" => Ok(Self::Pull),
            "pull_v2" => Ok(Self::PullV2),
            "restore" => Ok(Self::Restore),
            "diagnose" => Ok(Self::Diagnose),
            other => Err(SyncWorkerError::validation(format!(
                "不支持的同步模式: {other}"
            ))),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SyncRemoteConfig {
    pub url: String,
    pub token: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WorkerArgs {
    pub database_path: String,
    pub remote: SyncRemoteConfig,
    pub mode: SyncRunMode,
}

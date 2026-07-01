use crate::error::SyncWorkerError;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SyncRunMode {
    Push,
    Pull,
    Migrate,
    Diagnose,
    Probe,
}

impl SyncRunMode {
    pub fn parse(raw: &str) -> Result<Self, SyncWorkerError> {
        match raw {
            "push" => Ok(Self::Push),
            "pull" => Ok(Self::Pull),
            "migrate" => Ok(Self::Migrate),
            "diagnose" => Ok(Self::Diagnose),
            "probe" => Ok(Self::Probe),
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

#[cfg(test)]
mod tests {
    use super::SyncRunMode;

    #[test]
    fn parse_should_accept_probe_mode() {
        let mode = SyncRunMode::parse("probe").expect("probe mode should parse");

        assert_eq!(mode, SyncRunMode::Probe);
    }
}

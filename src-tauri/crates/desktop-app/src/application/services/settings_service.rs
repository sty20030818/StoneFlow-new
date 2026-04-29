//! Settings Service：后续承载 Settings 业务规则，不在阶段 0 提前接 UI 配置。

use crate::infrastructure::repositories::SettingsRepository;

#[derive(Debug, Clone)]
pub struct SettingsService {
    repository: SettingsRepository,
}

impl SettingsService {
    pub fn new(repository: SettingsRepository) -> Self {
        Self { repository }
    }

    pub fn repository(&self) -> &SettingsRepository {
        &self.repository
    }
}

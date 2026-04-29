//! Activity Service：后续承载 Activity 编排，不在阶段 0 提前写业务记录逻辑。

use crate::infrastructure::repositories::ActivityRepository;

#[derive(Debug, Clone)]
pub struct ActivityService {
    repository: ActivityRepository,
}

impl ActivityService {
    pub fn new(repository: ActivityRepository) -> Self {
        Self { repository }
    }

    pub fn repository(&self) -> &ActivityRepository {
        &self.repository
    }
}

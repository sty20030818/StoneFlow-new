//! Space Service：后续承载 Space 业务规则，不在阶段 0 提前实现 CRUD。

use crate::infrastructure::repositories::SpaceRepository;

#[derive(Debug, Clone)]
pub struct SpaceService {
    repository: SpaceRepository,
}

impl SpaceService {
    pub fn new(repository: SpaceRepository) -> Self {
        Self { repository }
    }

    pub fn repository(&self) -> &SpaceRepository {
        &self.repository
    }
}

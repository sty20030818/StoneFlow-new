//! Project Service：后续承载 Project 业务规则，不在阶段 0 提前实现 CRUD。

use crate::infrastructure::repositories::ProjectRepository;

#[derive(Debug, Clone)]
pub struct ProjectService {
    repository: ProjectRepository,
}

impl ProjectService {
    pub fn new(repository: ProjectRepository) -> Self {
        Self { repository }
    }

    pub fn repository(&self) -> &ProjectRepository {
        &self.repository
    }
}

//! Task Service：后续承载 Task 业务规则，不在阶段 0 提前实现 CRUD。

use crate::infrastructure::repositories::TaskRepository;

#[derive(Debug, Clone)]
pub struct TaskService {
    repository: TaskRepository,
}

impl TaskService {
    pub fn new(repository: TaskRepository) -> Self {
        Self { repository }
    }

    pub fn repository(&self) -> &TaskRepository {
        &self.repository
    }
}

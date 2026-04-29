//! View Service：后续承载 View 业务规则，不在阶段 0 提前实现查询执行器。

use crate::infrastructure::repositories::ViewRepository;

#[derive(Debug, Clone)]
pub struct ViewService {
    repository: ViewRepository,
}

impl ViewService {
    pub fn new(repository: ViewRepository) -> Self {
        Self { repository }
    }

    pub fn repository(&self) -> &ViewRepository {
        &self.repository
    }
}

//! Task Repository：只负责后续 Task 数据持久化入口。

use sea_orm::DatabaseConnection;

#[derive(Debug, Clone)]
pub struct TaskRepository {
    db: DatabaseConnection,
}

impl TaskRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub fn connection(&self) -> &DatabaseConnection {
        &self.db
    }
}

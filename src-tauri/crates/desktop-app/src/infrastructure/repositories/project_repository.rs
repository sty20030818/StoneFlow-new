//! Project Repository：只负责后续 Project 数据持久化入口。

use sea_orm::DatabaseConnection;

#[derive(Debug, Clone)]
pub struct ProjectRepository {
    db: DatabaseConnection,
}

impl ProjectRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub fn connection(&self) -> &DatabaseConnection {
        &self.db
    }
}

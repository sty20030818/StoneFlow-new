//! Space Repository：只负责后续 Space 数据持久化入口。

use sea_orm::DatabaseConnection;

#[derive(Debug, Clone)]
pub struct SpaceRepository {
    db: DatabaseConnection,
}

impl SpaceRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub fn connection(&self) -> &DatabaseConnection {
        &self.db
    }
}

//! Activity Repository：只负责后续 Activity 数据持久化入口。

use sea_orm::DatabaseConnection;

#[derive(Debug, Clone)]
pub struct ActivityRepository {
    db: DatabaseConnection,
}

impl ActivityRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub fn connection(&self) -> &DatabaseConnection {
        &self.db
    }
}

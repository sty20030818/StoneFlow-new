//! Settings Repository：只负责后续 Settings 数据持久化入口。

use sea_orm::DatabaseConnection;

#[derive(Debug, Clone)]
pub struct SettingsRepository {
    db: DatabaseConnection,
}

impl SettingsRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub fn connection(&self) -> &DatabaseConnection {
        &self.db
    }
}

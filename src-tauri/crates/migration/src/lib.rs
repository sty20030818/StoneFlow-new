//! 数据库迁移历史。
//!
//! 开发期已 squash 为单一当前 schema baseline；旧本地库需要备份后重建。

pub use sea_orm_migration::prelude::*;

mod m20260429_000001_current_schema;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20260429_000001_current_schema::Migration) as Box<dyn MigrationTrait>,
        ]
    }
}

/// 运行当前已声明的全部迁移。
pub async fn run_migrations(connection: &sea_orm::DatabaseConnection) -> Result<usize, DbErr> {
    Migrator::up(connection, None).await?;
    Ok(Migrator::migrations().len())
}

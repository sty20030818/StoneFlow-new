//! 数据库迁移层 crate。
//!
//! V1 阶段仅一个 migration：一次性建表并中文化系统视图名称。

pub use sea_orm_migration::prelude::*;

mod m20260429_000001_v1_schema;
mod m20260523_000001_task_links;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20260429_000001_v1_schema::Migration),
            Box::new(m20260523_000001_task_links::Migration),
        ]
    }
}

/// 运行当前已声明的全部迁移。
pub async fn run_migrations(connection: &sea_orm::DatabaseConnection) -> Result<usize, DbErr> {
    Migrator::up(connection, None).await?;
    Ok(Migrator::migrations().len())
}

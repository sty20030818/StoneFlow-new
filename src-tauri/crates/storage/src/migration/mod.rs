//! 数据库迁移：单一当前 schema 基线。
//!
//! 空库初始化；旧库需备份后删除重建，不提供在线升级路径。

pub use sea_orm_migration::prelude::*;

mod m20260723_000001_baseline;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![Box::new(m20260723_000001_baseline::Migration) as Box<dyn MigrationTrait>]
    }
}

/// 运行当前已声明的全部迁移。
pub async fn run_migrations(connection: &sea_orm::DatabaseConnection) -> Result<usize, DbErr> {
    Migrator::up(connection, None).await?;
    Ok(Migrator::migrations().len())
}

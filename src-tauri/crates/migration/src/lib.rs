//! 数据库迁移层占位 crate。
//!
//! 前置阶段 A 不提前定义 schema；阶段 0 再在这里落地 baseline migration。

pub use sea_orm_migration::prelude::*;

mod m20260429_000001_bootstrap_smoke;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![Box::new(m20260429_000001_bootstrap_smoke::Migration)]
    }
}

/// 运行当前已声明的全部迁移。
pub async fn run_migrations(connection: &sea_orm::DatabaseConnection) -> Result<usize, DbErr> {
    Migrator::up(connection, None).await?;
    Ok(Migrator::migrations().len())
}

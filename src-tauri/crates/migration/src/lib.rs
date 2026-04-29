//! 数据库迁移层占位 crate。
//!
//! 前置阶段 A 不提前定义 schema；阶段 0 再在这里落地 baseline migration。

pub use sea_orm_migration::prelude::*;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        Vec::new()
    }
}

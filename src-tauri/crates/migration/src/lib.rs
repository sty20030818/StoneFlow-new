//! StoneFlow 的数据库迁移入口。

pub use sea_orm_migration::prelude::*;

mod m20260419_000001_init;
mod m20260419_000002_core_entity_bootstrap;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20260419_000001_init::Migration),
            Box::new(m20260419_000002_core_entity_bootstrap::Migration),
        ]
    }
}

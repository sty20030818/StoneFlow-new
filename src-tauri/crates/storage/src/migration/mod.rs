//! 数据库迁移历史。
//!
//! R2 硬切为单一当前 schema baseline；旧本地库需备份后删除重建。

pub use sea_orm_migration::prelude::*;

mod m20260722_000001_r2_baseline;
mod m20260722_000002_r3_space_lifecycle;
mod m20260722_000003_r4_project_activity;
mod m20260723_000004_r5_outbox_operation_group;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20260722_000001_r2_baseline::Migration) as Box<dyn MigrationTrait>,
            Box::new(m20260722_000002_r3_space_lifecycle::Migration),
            Box::new(m20260722_000003_r4_project_activity::Migration),
            Box::new(m20260723_000004_r5_outbox_operation_group::Migration),
        ]
    }
}

/// 运行当前已声明的全部迁移。
pub async fn run_migrations(connection: &sea_orm::DatabaseConnection) -> Result<usize, DbErr> {
    Migrator::up(connection, None).await?;
    Ok(Migrator::migrations().len())
}

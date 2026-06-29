//! 数据库迁移历史。
//!
//! 当前基线只保留一条 V1 schema migration，后续 schema 变化从这里继续追加。

pub use sea_orm_migration::prelude::*;

mod m20260429_000001_v1_schema;
mod m20260626_000002_sync_metadata;
mod m20260629_000003_sync_v2_protocol;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20260429_000001_v1_schema::Migration) as Box<dyn MigrationTrait>,
            Box::new(m20260626_000002_sync_metadata::Migration) as Box<dyn MigrationTrait>,
            Box::new(m20260629_000003_sync_v2_protocol::Migration) as Box<dyn MigrationTrait>,
        ]
    }
}

/// 运行当前已声明的全部迁移。
pub async fn run_migrations(connection: &sea_orm::DatabaseConnection) -> Result<usize, DbErr> {
    Migrator::up(connection, None).await?;
    Ok(Migrator::migrations().len())
}

//! R3 Space 生命周期来源：精确恢复同一管理操作级联的实体。

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const UP_SQL: &str = r#"
ALTER TABLE spaces ADD COLUMN archived_by_operation_id TEXT NULL;
ALTER TABLE spaces ADD COLUMN deleted_by_operation_id TEXT NULL;
ALTER TABLE projects ADD COLUMN archived_by_operation_id TEXT NULL;
ALTER TABLE projects ADD COLUMN deleted_by_operation_id TEXT NULL;
ALTER TABLE tasks ADD COLUMN archived_by_operation_id TEXT NULL;
ALTER TABLE tasks ADD COLUMN deleted_by_operation_id TEXT NULL;

CREATE INDEX IF NOT EXISTS ix_projects_archived_operation
ON projects(archived_by_operation_id)
WHERE archived_by_operation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_projects_deleted_operation
ON projects(deleted_by_operation_id)
WHERE deleted_by_operation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_tasks_archived_operation
ON tasks(archived_by_operation_id)
WHERE archived_by_operation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_tasks_deleted_operation
ON tasks(deleted_by_operation_id)
WHERE deleted_by_operation_id IS NOT NULL;
"#;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.get_connection().execute_unprepared(UP_SQL).await?;
        Ok(())
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        Err(DbErr::Migration("R3 生命周期来源列不支持降级".to_owned()))
    }
}

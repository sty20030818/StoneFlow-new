//! R6：Task View 的高频 scope/status/due 查询索引。

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const UP_SQL: &str = r#"
CREATE INDEX ix_tasks_view_space_status_due
ON tasks(space_id, status, due_at, position)
WHERE archived_at IS NULL AND deleted_at IS NULL;

CREATE INDEX ix_tasks_view_status_due
ON tasks(status, due_at, position)
WHERE archived_at IS NULL AND deleted_at IS NULL;
"#;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(UP_SQL)
            .await
            .map(|_| ())
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        Err(DbErr::Migration("R6 View 查询索引不支持降级".to_owned()))
    }
}

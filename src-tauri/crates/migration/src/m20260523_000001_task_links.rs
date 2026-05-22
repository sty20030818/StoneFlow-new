//! 阶段 5：补充 Task Links URL 子资源表。

use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const CREATE_TASK_LINKS_SQL: &str = r#"
CREATE TABLE IF NOT EXISTS task_links (
    id TEXT PRIMARY KEY NOT NULL,
    task_id TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE INDEX IF NOT EXISTS idx_task_links_task_sort_order
ON task_links(task_id, sort_order, created_at);
"#;

const DROP_TASK_LINKS_SQL: &str = r#"
DROP INDEX IF EXISTS idx_task_links_task_sort_order;
DROP TABLE IF EXISTS task_links;
"#;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(CREATE_TASK_LINKS_SQL)
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(DROP_TASK_LINKS_SQL)
            .await?;
        Ok(())
    }
}

//! 将系统视图名称从英文改为中文。

use sea_orm::ConnectionTrait;
use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

const UPDATE_VIEW_NAMES_SQL: &str = r#"
UPDATE views SET name = '今天', updated_at = updated_at WHERE key = 'today' AND type = 'system';
UPDATE views SET name = '聚焦', updated_at = updated_at WHERE key = 'focus' AND type = 'system';
UPDATE views SET name = '即将到来', updated_at = updated_at WHERE key = 'upcoming' AND type = 'system';
UPDATE views SET name = '最近添加', updated_at = updated_at WHERE key = 'recently_added' AND type = 'system';
UPDATE views SET name = '等待中', updated_at = updated_at WHERE key = 'waiting' AND type = 'system';
UPDATE views SET name = '已逾期', updated_at = updated_at WHERE key = 'overdue' AND type = 'system';
UPDATE views SET name = '进行中', updated_at = updated_at WHERE key = 'active_projects' AND type = 'system';
UPDATE views SET name = '已完成', updated_at = updated_at WHERE key = 'completed_projects' AND type = 'system';
UPDATE views SET name = '已归档', updated_at = updated_at WHERE key = 'archived_projects' AND type = 'system';
UPDATE views SET name = '全部', updated_at = updated_at WHERE key = 'all_projects' AND type = 'system';
"#;

const REVERT_VIEW_NAMES_SQL: &str = r#"
UPDATE views SET name = 'Today', updated_at = updated_at WHERE key = 'today' AND type = 'system';
UPDATE views SET name = 'Focus', updated_at = updated_at WHERE key = 'focus' AND type = 'system';
UPDATE views SET name = 'Upcoming', updated_at = updated_at WHERE key = 'upcoming' AND type = 'system';
UPDATE views SET name = 'Recently Added', updated_at = updated_at WHERE key = 'recently_added' AND type = 'system';
UPDATE views SET name = 'Waiting', updated_at = updated_at WHERE key = 'waiting' AND type = 'system';
UPDATE views SET name = 'Overdue', updated_at = updated_at WHERE key = 'overdue' AND type = 'system';
UPDATE views SET name = 'Active', updated_at = updated_at WHERE key = 'active_projects' AND type = 'system';
UPDATE views SET name = 'Completed', updated_at = updated_at WHERE key = 'completed_projects' AND type = 'system';
UPDATE views SET name = 'Archived', updated_at = updated_at WHERE key = 'archived_projects' AND type = 'system';
UPDATE views SET name = 'All', updated_at = updated_at WHERE key = 'all_projects' AND type = 'system';
"#;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(UPDATE_VIEW_NAMES_SQL)
            .await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .get_connection()
            .execute_unprepared(REVERT_VIEW_NAMES_SQL)
            .await?;
        Ok(())
    }
}

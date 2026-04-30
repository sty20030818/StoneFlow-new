//! Task Repository：只负责后续 Task 数据持久化入口。

use sea_orm::{
    sea_query::Expr, ColumnTrait, ConnectionTrait, DatabaseConnection, EntityTrait, QueryFilter,
};
use stoneflow_entity::{prelude::Task, task};

use crate::app::error::AppError;

#[derive(Debug, Clone)]
pub struct TaskRepository {
    db: DatabaseConnection,
}

impl TaskRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub fn connection(&self) -> &DatabaseConnection {
        &self.db
    }

    /// 按 Space 级联归档其下所有未归档任务。
    pub async fn archive_by_space_raw<C>(
        &self,
        connection: &C,
        space_id: &str,
        archived_at: &str,
        archived_by_id: &str,
        updated_at: &str,
    ) -> Result<u64, AppError>
    where
        C: ConnectionTrait,
    {
        let result = Task::update_many()
            .col_expr(task::Column::ArchivedAt, Expr::value(archived_at.to_owned()))
            .col_expr(task::Column::ArchivedByType, Expr::value("space".to_owned()))
            .col_expr(task::Column::ArchivedById, Expr::value(archived_by_id.to_owned()))
            .col_expr(task::Column::UpdatedAt, Expr::value(updated_at.to_owned()))
            .filter(task::Column::SpaceId.eq(space_id))
            .filter(task::Column::ArchivedAt.is_null())
            .filter(task::Column::DeletedAt.is_null())
            .exec(connection)
            .await?;
        Ok(result.rows_affected)
    }

    /// 按 Space 级联删除其下所有未删除任务。
    pub async fn delete_by_space_raw<C>(
        &self,
        connection: &C,
        space_id: &str,
        deleted_at: &str,
        deleted_by_id: &str,
        updated_at: &str,
    ) -> Result<u64, AppError>
    where
        C: ConnectionTrait,
    {
        let result = Task::update_many()
            .col_expr(task::Column::DeletedAt, Expr::value(deleted_at.to_owned()))
            .col_expr(task::Column::DeletedByType, Expr::value("space".to_owned()))
            .col_expr(task::Column::DeletedById, Expr::value(deleted_by_id.to_owned()))
            .col_expr(task::Column::UpdatedAt, Expr::value(updated_at.to_owned()))
            .filter(task::Column::SpaceId.eq(space_id))
            .filter(task::Column::DeletedAt.is_null())
            .exec(connection)
            .await?;
        Ok(result.rows_affected)
    }

    /// 测试辅助：插入一条最小任务记录。
    #[cfg(test)]
    pub async fn insert_for_test<C>(
        &self,
        connection: &C,
        model: task::ActiveModel,
    ) -> Result<task::Model, AppError>
    where
        C: ConnectionTrait,
    {
        use sea_orm::ActiveModelTrait;

        model.insert(connection).await.map_err(AppError::from)
    }
}

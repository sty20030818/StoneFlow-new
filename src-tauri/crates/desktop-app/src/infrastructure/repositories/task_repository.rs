//! Task Repository：只负责后续 Task 数据持久化入口。

use std::collections::HashMap;

use sea_orm::{
    sea_query::Expr, ColumnTrait, ConnectionTrait, DatabaseConnection, EntityTrait, QueryFilter,
    QuerySelect,
};
use stoneflow_entity::{prelude::Task, task};

use crate::app::error::AppError;

#[derive(Debug, Clone)]
pub struct TaskRepository {
    db: DatabaseConnection,
}

/// 单个 Project 下的任务统计。
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct ProjectTaskCount {
    pub total_count: u64,
    pub active_count: u64,
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
            .col_expr(
                task::Column::ArchivedAt,
                Expr::value(archived_at.to_owned()),
            )
            .col_expr(
                task::Column::ArchivedByType,
                Expr::value("space".to_owned()),
            )
            .col_expr(
                task::Column::ArchivedById,
                Expr::value(archived_by_id.to_owned()),
            )
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
            .col_expr(
                task::Column::DeletedById,
                Expr::value(deleted_by_id.to_owned()),
            )
            .col_expr(task::Column::UpdatedAt, Expr::value(updated_at.to_owned()))
            .filter(task::Column::SpaceId.eq(space_id))
            .filter(task::Column::DeletedAt.is_null())
            .exec(connection)
            .await?;
        Ok(result.rows_affected)
    }

    /// 按 Project 级联归档其下所有未归档任务。
    pub async fn archive_by_project_raw<C>(
        &self,
        connection: &C,
        project_id: &str,
        archived_at: &str,
        archived_by_id: &str,
        updated_at: &str,
    ) -> Result<u64, AppError>
    where
        C: ConnectionTrait,
    {
        let result = Task::update_many()
            .col_expr(
                task::Column::ArchivedAt,
                Expr::value(archived_at.to_owned()),
            )
            .col_expr(
                task::Column::ArchivedByType,
                Expr::value("project".to_owned()),
            )
            .col_expr(
                task::Column::ArchivedById,
                Expr::value(archived_by_id.to_owned()),
            )
            .col_expr(task::Column::UpdatedAt, Expr::value(updated_at.to_owned()))
            .filter(task::Column::ProjectId.eq(project_id))
            .filter(task::Column::ArchivedAt.is_null())
            .filter(task::Column::DeletedAt.is_null())
            .exec(connection)
            .await?;
        Ok(result.rows_affected)
    }

    /// 按 Project 级联删除其下所有未删除任务。
    pub async fn delete_by_project_raw<C>(
        &self,
        connection: &C,
        project_id: &str,
        deleted_at: &str,
        deleted_by_id: &str,
        updated_at: &str,
    ) -> Result<u64, AppError>
    where
        C: ConnectionTrait,
    {
        let result = Task::update_many()
            .col_expr(task::Column::DeletedAt, Expr::value(deleted_at.to_owned()))
            .col_expr(
                task::Column::DeletedByType,
                Expr::value("project".to_owned()),
            )
            .col_expr(
                task::Column::DeletedById,
                Expr::value(deleted_by_id.to_owned()),
            )
            .col_expr(task::Column::UpdatedAt, Expr::value(updated_at.to_owned()))
            .filter(task::Column::ProjectId.eq(project_id))
            .filter(task::Column::DeletedAt.is_null())
            .exec(connection)
            .await?;
        Ok(result.rows_affected)
    }

    /// 统计一批 Project 下的总任务数与活跃任务数。
    pub async fn count_by_project_ids(
        &self,
        project_ids: &[String],
    ) -> Result<HashMap<String, ProjectTaskCount>, AppError> {
        if project_ids.is_empty() {
            return Ok(HashMap::new());
        }

        let total_rows = Task::find()
            .select_only()
            .column(task::Column::ProjectId)
            .column_as(task::Column::Id.count(), "count")
            .filter(task::Column::ProjectId.is_in(project_ids.iter().cloned()))
            .filter(task::Column::DeletedAt.is_null())
            .filter(task::Column::ArchivedAt.is_null())
            .group_by(task::Column::ProjectId)
            .into_tuple::<(Option<String>, i64)>()
            .all(self.connection())
            .await?;

        let active_rows = Task::find()
            .select_only()
            .column(task::Column::ProjectId)
            .column_as(task::Column::Id.count(), "count")
            .filter(task::Column::ProjectId.is_in(project_ids.iter().cloned()))
            .filter(task::Column::DeletedAt.is_null())
            .filter(task::Column::ArchivedAt.is_null())
            .filter(task::Column::CompletedAt.is_null())
            .group_by(task::Column::ProjectId)
            .into_tuple::<(Option<String>, i64)>()
            .all(self.connection())
            .await?;

        let mut counts = HashMap::new();
        for (project_id, count) in total_rows {
            let Some(project_id) = project_id else {
                continue;
            };
            counts.insert(
                project_id,
                ProjectTaskCount {
                    total_count: count.max(0) as u64,
                    active_count: 0,
                },
            );
        }
        for (project_id, count) in active_rows {
            let Some(project_id) = project_id else {
                continue;
            };
            counts.entry(project_id).or_default().active_count = count.max(0) as u64;
        }

        Ok(counts)
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

//! Task Link Repository：只负责 Task Link 子资源的持久化与基础查询。

use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DatabaseConnection, EntityTrait, QueryFilter,
    QueryOrder, QuerySelect, Set,
};
use stoneflow_schema::{prelude::TaskLink, task_link};

use crate::app::error::AppError;

/// 创建 Task Link 所需的持久化字段。
#[derive(Debug, Clone)]
pub struct CreateTaskLinkRecord {
    pub id: String,
    pub task_id: String,
    pub title: String,
    pub url: String,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

/// 更新 Task Link 基础字段的 patch。
#[derive(Debug, Clone, Default)]
pub struct UpdateTaskLinkPatch {
    pub title: Option<String>,
    pub url: Option<String>,
}

#[derive(Debug, Clone)]
pub struct TaskLinkRepository {
    db: DatabaseConnection,
}

impl TaskLinkRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub fn connection(&self) -> &DatabaseConnection {
        &self.db
    }

    /// 根据 ID 查询单个 Task Link。
    pub async fn get(&self, link_id: &str) -> Result<Option<task_link::Model>, AppError> {
        TaskLink::find_by_id(link_id.to_owned())
            .one(self.connection())
            .await
            .map_err(AppError::from)
    }

    /// 按 Task 读取全部 Links。
    pub async fn list_by_task(&self, task_id: &str) -> Result<Vec<task_link::Model>, AppError> {
        TaskLink::find()
            .filter(task_link::Column::TaskId.eq(task_id))
            .order_by_asc(task_link::Column::SortOrder)
            .order_by_asc(task_link::Column::CreatedAt)
            .all(self.connection())
            .await
            .map_err(AppError::from)
    }

    /// 计算某个 Task 下下一条 Link 的排序值。
    pub async fn next_sort_order<C>(&self, connection: &C, task_id: &str) -> Result<i32, AppError>
    where
        C: ConnectionTrait,
    {
        let max_sort_order = TaskLink::find()
            .select_only()
            .column_as(task_link::Column::SortOrder.max(), "max_sort_order")
            .filter(task_link::Column::TaskId.eq(task_id))
            .into_tuple::<Option<i32>>()
            .one(connection)
            .await?
            .flatten();
        Ok(max_sort_order.unwrap_or(0) + 1000)
    }

    /// 原始创建，不承载业务规则。
    pub async fn create<C>(
        &self,
        connection: &C,
        record: CreateTaskLinkRecord,
    ) -> Result<task_link::Model, AppError>
    where
        C: ConnectionTrait,
    {
        task_link::ActiveModel {
            id: Set(record.id),
            task_id: Set(record.task_id),
            title: Set(record.title),
            url: Set(record.url),
            sort_order: Set(record.sort_order),
            created_at: Set(record.created_at),
            updated_at: Set(record.updated_at),
        }
        .insert(connection)
        .await
        .map_err(AppError::from)
    }

    /// 更新基础字段，不做额外规则判断。
    pub async fn update<C>(
        &self,
        connection: &C,
        link_id: &str,
        patch: UpdateTaskLinkPatch,
        updated_at: &str,
    ) -> Result<Option<task_link::Model>, AppError>
    where
        C: ConnectionTrait,
    {
        let Some(model) = TaskLink::find_by_id(link_id.to_owned())
            .one(connection)
            .await?
        else {
            return Ok(None);
        };

        let mut active_model: task_link::ActiveModel = model.into();
        if let Some(title) = patch.title {
            active_model.title = Set(title);
        }
        if let Some(url) = patch.url {
            active_model.url = Set(url);
        }
        active_model.updated_at = Set(updated_at.to_owned());
        active_model
            .update(connection)
            .await
            .map(Some)
            .map_err(AppError::from)
    }

    /// 物理删除一条 Task Link。
    pub async fn delete<C>(&self, connection: &C, link_id: &str) -> Result<bool, AppError>
    where
        C: ConnectionTrait,
    {
        let result = TaskLink::delete_by_id(link_id.to_owned())
            .exec(connection)
            .await?;
        Ok(result.rows_affected > 0)
    }
}

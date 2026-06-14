//! Task Repository：只负责 Task 数据持久化、查询与原始状态变更。

use std::collections::HashMap;

use sea_orm::{
    sea_query::Expr, ActiveModelTrait, ActiveValue::Set, ColumnTrait, Condition, ConnectionTrait,
    DatabaseConnection, EntityTrait, QueryFilter, QueryOrder, QuerySelect,
};
use stoneflow_schema::{common::TaskStatus, prelude::Task, task};

use crate::app::error::AppError;

/// 创建 Task 所需的持久化字段。
#[derive(Debug, Clone)]
pub struct CreateTaskRecord {
    pub id: String,
    pub space_id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub note: Option<String>,
    pub status: TaskStatus,
    pub status_changed_at: String,
    pub priority: i32,
    pub inbox_at: Option<String>,
    pub due_at: Option<String>,
    pub scheduled_at: Option<String>,
    pub reminder_at: Option<String>,
    pub sort_order: i32,
    pub completed_at: Option<String>,
    pub canceled_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// 更新 Task 基础字段的 patch。
#[derive(Debug, Clone, Default)]
pub struct UpdateTaskPatch {
    pub title: Option<String>,
    pub note: Option<Option<String>>,
    pub status: Option<TaskStatus>,
    pub status_changed_at: Option<String>,
    pub priority: Option<i32>,
    pub space_id: Option<String>,
    pub project_id: Option<Option<String>>,
    pub inbox_at: Option<Option<String>>,
    pub due_at: Option<Option<String>>,
    pub scheduled_at: Option<Option<String>>,
    pub reminder_at: Option<Option<String>>,
    pub sort_order: Option<i32>,
    pub completed_at: Option<Option<String>>,
    pub canceled_at: Option<Option<String>>,
}

/// Task 列表的生命周期过滤。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum TaskLifecycleView {
    #[default]
    Active,
    Completed,
    Canceled,
    Archived,
    All,
}

/// 搜索结果的生命周期过滤。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TaskSearchLifecycle {
    Active,
    Closed,
}

/// Task 列表查询条件。
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub enum TaskPlacementQuery {
    #[default]
    All,
    Project(String),
    Inbox,
    NoProject,
}

#[derive(Debug, Clone, Default)]
pub struct TaskListQuery {
    pub space_id: Option<String>,
    pub placement: TaskPlacementQuery,
    pub lifecycle: TaskLifecycleView,
}

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

    /// 根据 ID 查询单个 Task。
    pub async fn get(&self, task_id: &str) -> Result<Option<task::Model>, AppError> {
        Task::find_by_id(task_id.to_owned())
            .one(self.connection())
            .await
            .map_err(AppError::from)
    }

    /// 列出某个 Space 下的全部 Task。
    pub async fn list_by_space(&self, space_id: &str) -> Result<Vec<task::Model>, AppError> {
        Task::find()
            .filter(task::Column::SpaceId.eq(space_id))
            .all(self.connection())
            .await
            .map_err(AppError::from)
    }

    /// 列出某个 Project 下的全部 Task。
    pub async fn list_by_project(&self, project_id: &str) -> Result<Vec<task::Model>, AppError> {
        Task::find()
            .filter(task::Column::ProjectId.eq(project_id))
            .all(self.connection())
            .await
            .map_err(AppError::from)
    }

    /// 搜索符合查询文本的可见 Task。
    pub async fn search_by_query(
        &self,
        query: &str,
        lifecycle: TaskSearchLifecycle,
    ) -> Result<Vec<task::Model>, AppError> {
        let pattern = format!("%{query}%");
        let mut task_query = Task::find()
            .filter(task::Column::DeletedAt.is_null())
            .filter(task::Column::ArchivedAt.is_null())
            .filter(
                Condition::any()
                    .add(task::Column::Title.like(pattern.clone()))
                    .add(task::Column::Note.like(pattern)),
            )
            .order_by_desc(task::Column::UpdatedAt);

        task_query = match lifecycle {
            TaskSearchLifecycle::Active => task_query.filter(task::Column::Status.is_in([
                TaskStatus::Doing,
                TaskStatus::Todo,
                TaskStatus::Waiting,
            ])),
            TaskSearchLifecycle::Closed => task_query.filter(task::Column::Status.is_in([
                TaskStatus::Done,
                TaskStatus::Canceled,
            ])),
        };

        task_query
            .all(self.connection())
            .await
            .map_err(AppError::from)
    }

    /// 列出归档中的 Task。
    pub async fn list_archived(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<task::Model>, AppError> {
        let mut query = Task::find()
            .filter(task::Column::ArchivedAt.is_not_null())
            .filter(task::Column::DeletedAt.is_null())
            .order_by_desc(task::Column::ArchivedAt)
            .order_by_desc(task::Column::UpdatedAt);

        if let Some(space_id) = scope_space_id {
            query = query.filter(task::Column::SpaceId.eq(space_id));
        }

        query.all(self.connection()).await.map_err(AppError::from)
    }

    /// 列出已删除的 Task。
    pub async fn list_deleted(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<task::Model>, AppError> {
        let mut query = Task::find()
            .filter(task::Column::DeletedAt.is_not_null())
            .order_by_desc(task::Column::DeletedAt)
            .order_by_desc(task::Column::UpdatedAt);

        if let Some(space_id) = scope_space_id {
            query = query.filter(task::Column::SpaceId.eq(space_id));
        }

        query.all(self.connection()).await.map_err(AppError::from)
    }

    /// 计算下一条 Task 的排序值。
    pub async fn next_sort_order<C>(
        &self,
        connection: &C,
        space_id: &str,
        project_id: Option<&str>,
    ) -> Result<i32, AppError>
    where
        C: ConnectionTrait,
    {
        let mut query = Task::find()
            .select_only()
            .column_as(task::Column::SortOrder.max(), "max_sort_order")
            .filter(task::Column::SpaceId.eq(space_id));

        query = match project_id {
            Some(project_id) => query.filter(task::Column::ProjectId.eq(project_id)),
            None => query.filter(task::Column::ProjectId.is_null()),
        };

        let max_sort_order = query
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
        record: CreateTaskRecord,
    ) -> Result<task::Model, AppError>
    where
        C: ConnectionTrait,
    {
        task::ActiveModel {
            id: Set(record.id),
            space_id: Set(record.space_id),
            project_id: Set(record.project_id),
            title: Set(record.title),
            note: Set(record.note),
            status: Set(record.status),
            status_changed_at: Set(record.status_changed_at),
            priority: Set(record.priority),
            inbox_at: Set(record.inbox_at),
            due_at: Set(record.due_at),
            scheduled_at: Set(record.scheduled_at),
            reminder_at: Set(record.reminder_at),
            sort_order: Set(record.sort_order),
            completed_at: Set(record.completed_at),
            canceled_at: Set(record.canceled_at),
            archived_at: Set(None),
            archived_by_type: Set(None),
            archived_by_id: Set(None),
            deleted_at: Set(None),
            deleted_by_type: Set(None),
            deleted_by_id: Set(None),
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
        task_id: &str,
        patch: UpdateTaskPatch,
        updated_at: &str,
    ) -> Result<Option<task::Model>, AppError>
    where
        C: ConnectionTrait,
    {
        let Some(model) = Task::find_by_id(task_id.to_owned()).one(connection).await? else {
            return Ok(None);
        };

        let mut active_model: task::ActiveModel = model.into();
        if let Some(title) = patch.title {
            active_model.title = Set(title);
        }
        if let Some(note) = patch.note {
            active_model.note = Set(note);
        }
        if let Some(status) = patch.status {
            active_model.status = Set(status);
        }
        if let Some(status_changed_at) = patch.status_changed_at {
            active_model.status_changed_at = Set(status_changed_at);
        }
        if let Some(priority) = patch.priority {
            active_model.priority = Set(priority);
        }
        if let Some(space_id) = patch.space_id {
            active_model.space_id = Set(space_id);
        }
        if let Some(project_id) = patch.project_id {
            active_model.project_id = Set(project_id);
        }
        if let Some(inbox_at) = patch.inbox_at {
            active_model.inbox_at = Set(inbox_at);
        }
        if let Some(due_at) = patch.due_at {
            active_model.due_at = Set(due_at);
        }
        if let Some(scheduled_at) = patch.scheduled_at {
            active_model.scheduled_at = Set(scheduled_at);
        }
        if let Some(reminder_at) = patch.reminder_at {
            active_model.reminder_at = Set(reminder_at);
        }
        if let Some(sort_order) = patch.sort_order {
            active_model.sort_order = Set(sort_order);
        }
        if let Some(completed_at) = patch.completed_at {
            active_model.completed_at = Set(completed_at);
        }
        if let Some(canceled_at) = patch.canceled_at {
            active_model.canceled_at = Set(canceled_at);
        }
        active_model.updated_at = Set(updated_at.to_owned());

        active_model
            .update(connection)
            .await
            .map(Some)
            .map_err(AppError::from)
    }

    /// 按 scope / project / 生命周期读取 Task 列表。
    pub async fn list(&self, query: TaskListQuery) -> Result<Vec<task::Model>, AppError> {
        let mut task_query = Task::find();

        if let Some(space_id) = query.space_id.as_deref() {
            task_query = task_query.filter(task::Column::SpaceId.eq(space_id));
        }
        task_query = match &query.placement {
            TaskPlacementQuery::All => task_query,
            TaskPlacementQuery::Project(project_id) => {
                task_query.filter(task::Column::ProjectId.eq(project_id.as_str()))
            }
            TaskPlacementQuery::Inbox => task_query
                .filter(task::Column::ProjectId.is_null())
                .filter(task::Column::InboxAt.is_not_null()),
            TaskPlacementQuery::NoProject => task_query
                .filter(task::Column::ProjectId.is_null())
                .filter(task::Column::InboxAt.is_null()),
        };

        task_query = task_query.filter(task::Column::DeletedAt.is_null());
        task_query = match query.lifecycle {
            TaskLifecycleView::Active => task_query
                .filter(task::Column::ArchivedAt.is_null())
                .filter(task::Column::Status.is_in([
                    TaskStatus::Todo,
                    TaskStatus::Doing,
                    TaskStatus::Waiting,
                ])),
            TaskLifecycleView::Completed => task_query
                .filter(task::Column::ArchivedAt.is_null())
                .filter(task::Column::Status.eq(TaskStatus::Done)),
            TaskLifecycleView::Canceled => task_query
                .filter(task::Column::ArchivedAt.is_null())
                .filter(task::Column::Status.eq(TaskStatus::Canceled)),
            TaskLifecycleView::Archived => {
                task_query.filter(task::Column::ArchivedAt.is_not_null())
            }
            TaskLifecycleView::All => task_query,
        };

        task_query
            .order_by_asc(task::Column::SortOrder)
            .order_by_desc(task::Column::UpdatedAt)
            .all(self.connection())
            .await
            .map_err(AppError::from)
    }

    /// 按 scope / placement 读取 View 执行器所需候选集。
    pub async fn list_candidates(
        &self,
        space_id: Option<String>,
        placement: TaskPlacementQuery,
        include_deleted: bool,
    ) -> Result<Vec<task::Model>, AppError> {
        let mut task_query = Task::find();

        if let Some(space_id) = space_id.as_deref() {
            task_query = task_query.filter(task::Column::SpaceId.eq(space_id));
        }

        task_query = match placement {
            TaskPlacementQuery::All => task_query,
            TaskPlacementQuery::Project(project_id) => {
                task_query.filter(task::Column::ProjectId.eq(project_id))
            }
            TaskPlacementQuery::Inbox => task_query
                .filter(task::Column::ProjectId.is_null())
                .filter(task::Column::InboxAt.is_not_null()),
            TaskPlacementQuery::NoProject => task_query
                .filter(task::Column::ProjectId.is_null())
                .filter(task::Column::InboxAt.is_null()),
        };

        if !include_deleted {
            task_query = task_query.filter(task::Column::DeletedAt.is_null());
        }

        task_query
            .order_by_asc(task::Column::SortOrder)
            .order_by_desc(task::Column::UpdatedAt)
            .all(self.connection())
            .await
            .map_err(AppError::from)
    }

    /// 原始归档：只更新 Task 自身。
    pub async fn archive_raw<C>(
        &self,
        connection: &C,
        task_id: &str,
        archived_at: &str,
        archived_by_id: &str,
        updated_at: &str,
    ) -> Result<Option<task::Model>, AppError>
    where
        C: ConnectionTrait,
    {
        let Some(model) = Task::find_by_id(task_id.to_owned()).one(connection).await? else {
            return Ok(None);
        };

        let mut active_model: task::ActiveModel = model.into();
        active_model.archived_at = Set(Some(archived_at.to_owned()));
        active_model.archived_by_type = Set(Some("self".to_owned()));
        active_model.archived_by_id = Set(Some(archived_by_id.to_owned()));
        active_model.inbox_at = Set(None);
        active_model.updated_at = Set(updated_at.to_owned());
        active_model
            .update(connection)
            .await
            .map(Some)
            .map_err(AppError::from)
    }

    /// 原始恢复：只恢复 Task 自身。
    pub async fn restore_raw<C>(
        &self,
        connection: &C,
        task_id: &str,
        updated_at: &str,
    ) -> Result<Option<task::Model>, AppError>
    where
        C: ConnectionTrait,
    {
        let Some(model) = Task::find_by_id(task_id.to_owned()).one(connection).await? else {
            return Ok(None);
        };

        let mut active_model: task::ActiveModel = model.into();
        active_model.archived_at = Set(None);
        active_model.archived_by_type = Set(None);
        active_model.archived_by_id = Set(None);
        active_model.deleted_at = Set(None);
        active_model.deleted_by_type = Set(None);
        active_model.deleted_by_id = Set(None);
        active_model.updated_at = Set(updated_at.to_owned());
        active_model
            .update(connection)
            .await
            .map(Some)
            .map_err(AppError::from)
    }

    /// 原始删除：只更新 Task 自身。
    pub async fn delete_raw<C>(
        &self,
        connection: &C,
        task_id: &str,
        deleted_at: &str,
        deleted_by_id: &str,
        updated_at: &str,
    ) -> Result<Option<task::Model>, AppError>
    where
        C: ConnectionTrait,
    {
        let Some(model) = Task::find_by_id(task_id.to_owned()).one(connection).await? else {
            return Ok(None);
        };

        let mut active_model: task::ActiveModel = model.into();
        active_model.deleted_at = Set(Some(deleted_at.to_owned()));
        active_model.deleted_by_type = Set(Some("self".to_owned()));
        active_model.deleted_by_id = Set(Some(deleted_by_id.to_owned()));
        active_model.inbox_at = Set(None);
        active_model.updated_at = Set(updated_at.to_owned());
        active_model
            .update(connection)
            .await
            .map(Some)
            .map_err(AppError::from)
    }

    /// 永久删除 Task 记录。
    pub async fn permanently_delete<C>(
        &self,
        connection: &C,
        task_id: &str,
    ) -> Result<u64, AppError>
    where
        C: ConnectionTrait,
    {
        let result = Task::delete_by_id(task_id.to_owned())
            .exec(connection)
            .await?;
        Ok(result.rows_affected)
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
        model.insert(connection).await.map_err(AppError::from)
    }
}

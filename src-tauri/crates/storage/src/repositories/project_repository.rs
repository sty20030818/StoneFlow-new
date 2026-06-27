//! Project Repository：只负责 Project 数据持久化与原始状态变更。

use sea_orm::{
    sea_query::Expr, ActiveModelTrait, ColumnTrait, Condition, ConnectionTrait, DatabaseConnection,
    EntityTrait, QueryFilter, QueryOrder, QuerySelect, Set,
};
use stoneflow_schema::{prelude::Project, project};

use crate::error::StorageError;

/// 创建 Project 所需的持久化字段。
#[derive(Debug, Clone)]
pub struct CreateProjectRecord {
    pub id: String,
    pub space_id: String,
    pub name: String,
    pub description: Option<String>,
    pub due_at: Option<String>,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

/// 更新 Project 基础字段的 patch。
#[derive(Debug, Clone, Default)]
pub struct UpdateProjectPatch {
    pub name: Option<String>,
    pub description: Option<Option<String>>,
    pub due_at: Option<Option<String>>,
    pub sort_order: Option<i32>,
}

/// Project Overview 的分页视图。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProjectOverviewView {
    Active,
    Completed,
    Archived,
    All,
}

/// 搜索结果的生命周期过滤。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProjectSearchLifecycle {
    Active,
    Completed,
}

#[derive(Debug, Clone)]
pub struct ProjectRepository {
    db: DatabaseConnection,
}

impl ProjectRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub fn connection(&self) -> &DatabaseConnection {
        &self.db
    }

    /// 根据 ID 查询单个 Project。
    pub async fn get(&self, project_id: &str) -> Result<Option<project::Model>, StorageError> {
        Project::find_by_id(project_id.to_owned())
            .one(self.connection())
            .await
            .map_err(StorageError::from)
    }

    /// 查询某个 Space 下同名且未删除的 Project。
    pub async fn get_visible_by_name(
        &self,
        space_id: &str,
        name: &str,
    ) -> Result<Option<project::Model>, StorageError> {
        Project::find()
            .filter(project::Column::SpaceId.eq(space_id))
            .filter(project::Column::Name.eq(name))
            .filter(project::Column::DeletedAt.is_null())
            .one(self.connection())
            .await
            .map_err(StorageError::from)
    }

    /// 根据一组 ID 查询 Project。
    pub async fn list_by_ids(
        &self,
        project_ids: &[String],
    ) -> Result<Vec<project::Model>, StorageError> {
        if project_ids.is_empty() {
            return Ok(Vec::new());
        }

        Project::find()
            .filter(project::Column::Id.is_in(project_ids.iter().cloned()))
            .all(self.connection())
            .await
            .map_err(StorageError::from)
    }

    /// 列出某个 Space 下的全部 Project。
    pub async fn list_by_space(&self, space_id: &str) -> Result<Vec<project::Model>, StorageError> {
        Project::find()
            .filter(project::Column::SpaceId.eq(space_id))
            .all(self.connection())
            .await
            .map_err(StorageError::from)
    }

    /// 搜索符合查询文本的可见 Project。
    pub async fn search_by_query(
        &self,
        query: &str,
        lifecycle: ProjectSearchLifecycle,
    ) -> Result<Vec<project::Model>, StorageError> {
        let pattern = format!("%{query}%");
        let mut project_query = Project::find()
            .filter(project::Column::DeletedAt.is_null())
            .filter(project::Column::ArchivedAt.is_null())
            .filter(
                Condition::any()
                    .add(project::Column::Name.like(pattern.clone()))
                    .add(project::Column::Description.like(pattern)),
            )
            .order_by_desc(project::Column::UpdatedAt);

        project_query = match lifecycle {
            ProjectSearchLifecycle::Active => {
                project_query.filter(project::Column::CompletedAt.is_null())
            }
            ProjectSearchLifecycle::Completed => {
                project_query.filter(project::Column::CompletedAt.is_not_null())
            }
        };

        project_query
            .all(self.connection())
            .await
            .map_err(StorageError::from)
    }

    /// 列出归档中的 Project。
    pub async fn list_archived(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<project::Model>, StorageError> {
        let mut query = Project::find()
            .filter(project::Column::ArchivedAt.is_not_null())
            .filter(project::Column::DeletedAt.is_null())
            .order_by_desc(project::Column::ArchivedAt)
            .order_by_desc(project::Column::UpdatedAt);

        if let Some(space_id) = scope_space_id {
            query = query.filter(project::Column::SpaceId.eq(space_id));
        }

        query
            .all(self.connection())
            .await
            .map_err(StorageError::from)
    }

    /// 列出已删除的 Project。
    pub async fn list_deleted(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<project::Model>, StorageError> {
        let mut query = Project::find()
            .filter(project::Column::DeletedAt.is_not_null())
            .order_by_desc(project::Column::DeletedAt)
            .order_by_desc(project::Column::UpdatedAt);

        if let Some(space_id) = scope_space_id {
            query = query.filter(project::Column::SpaceId.eq(space_id));
        }

        query
            .all(self.connection())
            .await
            .map_err(StorageError::from)
    }

    /// 计算某个 Space 下下一条 Project 的排序值。
    pub async fn next_sort_order<C>(
        &self,
        connection: &C,
        space_id: &str,
    ) -> Result<i32, StorageError>
    where
        C: ConnectionTrait,
    {
        let max_sort_order = Project::find()
            .select_only()
            .column_as(project::Column::SortOrder.max(), "max_sort_order")
            .filter(project::Column::SpaceId.eq(space_id))
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
        record: CreateProjectRecord,
    ) -> Result<project::Model, StorageError>
    where
        C: ConnectionTrait,
    {
        project::ActiveModel {
            id: Set(record.id),
            space_id: Set(record.space_id),
            name: Set(record.name),
            description: Set(record.description),
            due_at: Set(record.due_at),
            sort_order: Set(record.sort_order),
            completed_at: Set(None),
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
        .map_err(StorageError::from)
    }

    /// 更新基础字段，不做额外规则判断。
    pub async fn update<C>(
        &self,
        connection: &C,
        project_id: &str,
        patch: UpdateProjectPatch,
        updated_at: &str,
    ) -> Result<Option<project::Model>, StorageError>
    where
        C: ConnectionTrait,
    {
        let Some(model) = Project::find_by_id(project_id.to_owned())
            .one(connection)
            .await?
        else {
            return Ok(None);
        };

        let mut active_model: project::ActiveModel = model.into();
        if let Some(name) = patch.name {
            active_model.name = Set(name);
        }
        if let Some(description) = patch.description {
            active_model.description = Set(description);
        }
        if let Some(due_at) = patch.due_at {
            active_model.due_at = Set(due_at);
        }
        if let Some(sort_order) = patch.sort_order {
            active_model.sort_order = Set(sort_order);
        }
        active_model.updated_at = Set(updated_at.to_owned());
        active_model
            .update(connection)
            .await
            .map(Some)
            .map_err(StorageError::from)
    }

    /// 按 scope 与 tab 读取 Project Overview 列表。
    pub async fn list_overview_by_scope(
        &self,
        space_id: Option<&str>,
        view: ProjectOverviewView,
    ) -> Result<Vec<project::Model>, StorageError> {
        let mut query = Project::find();

        if let Some(space_id) = space_id {
            query = query.filter(project::Column::SpaceId.eq(space_id));
        }

        query = query.filter(project::Column::DeletedAt.is_null());
        query = match view {
            ProjectOverviewView::Active => query
                .filter(project::Column::CompletedAt.is_null())
                .filter(project::Column::ArchivedAt.is_null()),
            ProjectOverviewView::Completed => query
                .filter(project::Column::CompletedAt.is_not_null())
                .filter(project::Column::ArchivedAt.is_null()),
            ProjectOverviewView::Archived => {
                query.filter(project::Column::ArchivedAt.is_not_null())
            }
            ProjectOverviewView::All => query,
        };

        query
            .order_by_asc(project::Column::SortOrder)
            .order_by_desc(project::Column::UpdatedAt)
            .all(self.connection())
            .await
            .map_err(StorageError::from)
    }

    /// 按 scope 读取 Sidebar Projects 快捷区。
    pub async fn list_sidebar_by_scope(
        &self,
        space_id: Option<&str>,
        show_completed: bool,
        max_visible: Option<u64>,
    ) -> Result<Vec<project::Model>, StorageError> {
        let mut query = Project::find()
            .filter(project::Column::ArchivedAt.is_null())
            .filter(project::Column::DeletedAt.is_null());

        if let Some(space_id) = space_id {
            query = query.filter(project::Column::SpaceId.eq(space_id));
        }
        if !show_completed {
            query = query.filter(project::Column::CompletedAt.is_null());
        }
        if let Some(max_visible) = max_visible {
            query = query.limit(max_visible);
        }

        query
            .order_by_asc(project::Column::SortOrder)
            .order_by_asc(project::Column::CreatedAt)
            .all(self.connection())
            .await
            .map_err(StorageError::from)
    }

    /// 原始完成：只更新 completed_at。
    pub async fn complete_raw<C>(
        &self,
        connection: &C,
        project_id: &str,
        completed_at: &str,
        updated_at: &str,
    ) -> Result<Option<project::Model>, StorageError>
    where
        C: ConnectionTrait,
    {
        let Some(model) = Project::find_by_id(project_id.to_owned())
            .one(connection)
            .await?
        else {
            return Ok(None);
        };

        let mut active_model: project::ActiveModel = model.into();
        active_model.completed_at = Set(Some(completed_at.to_owned()));
        active_model.updated_at = Set(updated_at.to_owned());
        active_model
            .update(connection)
            .await
            .map(Some)
            .map_err(StorageError::from)
    }

    /// 原始重开：只清空 completed_at。
    pub async fn reopen_raw<C>(
        &self,
        connection: &C,
        project_id: &str,
        updated_at: &str,
    ) -> Result<Option<project::Model>, StorageError>
    where
        C: ConnectionTrait,
    {
        let Some(model) = Project::find_by_id(project_id.to_owned())
            .one(connection)
            .await?
        else {
            return Ok(None);
        };

        let mut active_model: project::ActiveModel = model.into();
        active_model.completed_at = Set(None);
        active_model.updated_at = Set(updated_at.to_owned());
        active_model
            .update(connection)
            .await
            .map(Some)
            .map_err(StorageError::from)
    }

    /// 原始归档：只更新 Project 自身。
    pub async fn archive_raw<C>(
        &self,
        connection: &C,
        project_id: &str,
        archived_at: &str,
        archived_by_id: &str,
        updated_at: &str,
    ) -> Result<Option<project::Model>, StorageError>
    where
        C: ConnectionTrait,
    {
        let Some(model) = Project::find_by_id(project_id.to_owned())
            .one(connection)
            .await?
        else {
            return Ok(None);
        };

        let mut active_model: project::ActiveModel = model.into();
        active_model.archived_at = Set(Some(archived_at.to_owned()));
        active_model.archived_by_type = Set(Some("self".to_owned()));
        active_model.archived_by_id = Set(Some(archived_by_id.to_owned()));
        active_model.updated_at = Set(updated_at.to_owned());
        active_model
            .update(connection)
            .await
            .map(Some)
            .map_err(StorageError::from)
    }

    /// 原始恢复：只恢复 Project 自身。
    pub async fn restore_raw<C>(
        &self,
        connection: &C,
        project_id: &str,
        updated_at: &str,
    ) -> Result<Option<project::Model>, StorageError>
    where
        C: ConnectionTrait,
    {
        let Some(model) = Project::find_by_id(project_id.to_owned())
            .one(connection)
            .await?
        else {
            return Ok(None);
        };

        let mut active_model: project::ActiveModel = model.into();
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
            .map_err(StorageError::from)
    }

    /// 原始删除：只更新 Project 自身。
    pub async fn delete_raw<C>(
        &self,
        connection: &C,
        project_id: &str,
        deleted_at: &str,
        deleted_by_id: &str,
        updated_at: &str,
    ) -> Result<Option<project::Model>, StorageError>
    where
        C: ConnectionTrait,
    {
        let Some(model) = Project::find_by_id(project_id.to_owned())
            .one(connection)
            .await?
        else {
            return Ok(None);
        };

        let mut active_model: project::ActiveModel = model.into();
        active_model.deleted_at = Set(Some(deleted_at.to_owned()));
        active_model.deleted_by_type = Set(Some("self".to_owned()));
        active_model.deleted_by_id = Set(Some(deleted_by_id.to_owned()));
        active_model.updated_at = Set(updated_at.to_owned());
        active_model
            .update(connection)
            .await
            .map(Some)
            .map_err(StorageError::from)
    }

    /// 按 Space 级联归档其下所有未归档项目。
    pub async fn archive_by_space_raw<C>(
        &self,
        connection: &C,
        space_id: &str,
        archived_at: &str,
        archived_by_id: &str,
        updated_at: &str,
    ) -> Result<u64, StorageError>
    where
        C: ConnectionTrait,
    {
        let result = Project::update_many()
            .col_expr(
                project::Column::ArchivedAt,
                Expr::value(archived_at.to_owned()),
            )
            .col_expr(
                project::Column::ArchivedByType,
                Expr::value("space".to_owned()),
            )
            .col_expr(
                project::Column::ArchivedById,
                Expr::value(archived_by_id.to_owned()),
            )
            .col_expr(
                project::Column::UpdatedAt,
                Expr::value(updated_at.to_owned()),
            )
            .filter(project::Column::SpaceId.eq(space_id))
            .filter(project::Column::ArchivedAt.is_null())
            .filter(project::Column::DeletedAt.is_null())
            .exec(connection)
            .await?;
        Ok(result.rows_affected)
    }

    /// 按 Space 级联删除其下所有未删除项目。
    pub async fn delete_by_space_raw<C>(
        &self,
        connection: &C,
        space_id: &str,
        deleted_at: &str,
        deleted_by_id: &str,
        updated_at: &str,
    ) -> Result<u64, StorageError>
    where
        C: ConnectionTrait,
    {
        let result = Project::update_many()
            .col_expr(
                project::Column::DeletedAt,
                Expr::value(deleted_at.to_owned()),
            )
            .col_expr(
                project::Column::DeletedByType,
                Expr::value("space".to_owned()),
            )
            .col_expr(
                project::Column::DeletedById,
                Expr::value(deleted_by_id.to_owned()),
            )
            .col_expr(
                project::Column::UpdatedAt,
                Expr::value(updated_at.to_owned()),
            )
            .filter(project::Column::SpaceId.eq(space_id))
            .filter(project::Column::DeletedAt.is_null())
            .exec(connection)
            .await?;
        Ok(result.rows_affected)
    }

    /// 永久删除 Project。
    pub async fn permanently_delete<C>(
        &self,
        connection: &C,
        project_id: &str,
    ) -> Result<u64, StorageError>
    where
        C: ConnectionTrait,
    {
        let result = Project::delete_by_id(project_id.to_owned())
            .exec(connection)
            .await?;
        Ok(result.rows_affected)
    }

    /// 测试辅助：插入一个最小项目记录。
    #[cfg(any(test, feature = "test-helpers"))]
    pub async fn insert_for_test<C>(
        &self,
        connection: &C,
        model: project::ActiveModel,
    ) -> Result<project::Model, StorageError>
    where
        C: ConnectionTrait,
    {
        model.insert(connection).await.map_err(StorageError::from)
    }
}

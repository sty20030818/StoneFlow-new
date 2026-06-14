//! Space Repository：只负责 Space 数据持久化与原始状态变更。

use sea_orm::{
    sea_query::Expr, ActiveModelTrait, ColumnTrait, ConnectionTrait, DatabaseConnection,
    EntityTrait, QueryFilter, QueryOrder, QuerySelect, Set,
};
use stoneflow_schema::{prelude::Space, space};

use crate::app::error::AppError;

/// 创建 Space 所需的持久化字段。
#[derive(Debug, Clone)]
pub struct CreateSpaceRecord {
    pub id: String,
    pub name: String,
    pub icon_key: String,
    pub color_key: String,
    pub is_default: bool,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

/// 更新 Space 基础字段的 patch。
#[derive(Debug, Clone, Default)]
pub struct UpdateSpacePatch {
    pub name: Option<String>,
    pub icon_key: Option<String>,
    pub color_key: Option<String>,
}

#[derive(Debug, Clone)]
pub struct SpaceRepository {
    db: DatabaseConnection,
}

impl SpaceRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub fn connection(&self) -> &DatabaseConnection {
        &self.db
    }

    /// 返回所有活跃可见的 Space。
    pub async fn list_visible(&self) -> Result<Vec<space::Model>, AppError> {
        Space::find()
            .filter(space::Column::ArchivedAt.is_null())
            .filter(space::Column::DeletedAt.is_null())
            .order_by_asc(space::Column::SortOrder)
            .order_by_asc(space::Column::CreatedAt)
            .all(self.connection())
            .await
            .map_err(AppError::from)
    }

    /// 根据 ID 查询单个 Space。
    pub async fn get(&self, space_id: &str) -> Result<Option<space::Model>, AppError> {
        Space::find_by_id(space_id.to_owned())
            .one(self.connection())
            .await
            .map_err(AppError::from)
    }

    /// 查询当前默认且活跃的 Space。
    pub async fn get_default(&self) -> Result<Option<space::Model>, AppError> {
        Space::find()
            .filter(space::Column::IsDefault.eq(true))
            .filter(space::Column::ArchivedAt.is_null())
            .filter(space::Column::DeletedAt.is_null())
            .one(self.connection())
            .await
            .map_err(AppError::from)
    }

    /// 根据一组 ID 查询 Space。
    pub async fn list_by_ids(&self, space_ids: &[String]) -> Result<Vec<space::Model>, AppError> {
        if space_ids.is_empty() {
            return Ok(Vec::new());
        }

        Space::find()
            .filter(space::Column::Id.is_in(space_ids.iter().cloned()))
            .all(self.connection())
            .await
            .map_err(AppError::from)
    }

    /// 列出归档中的 Space。
    pub async fn list_archived(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<space::Model>, AppError> {
        let mut query = Space::find()
            .filter(space::Column::ArchivedAt.is_not_null())
            .filter(space::Column::DeletedAt.is_null())
            .order_by_desc(space::Column::ArchivedAt)
            .order_by_desc(space::Column::UpdatedAt);

        if let Some(space_id) = scope_space_id {
            query = query.filter(space::Column::Id.eq(space_id));
        }

        query.all(self.connection()).await.map_err(AppError::from)
    }

    /// 列出已删除的 Space。
    pub async fn list_deleted(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<space::Model>, AppError> {
        let mut query = Space::find()
            .filter(space::Column::DeletedAt.is_not_null())
            .order_by_desc(space::Column::DeletedAt)
            .order_by_desc(space::Column::UpdatedAt);

        if let Some(space_id) = scope_space_id {
            query = query.filter(space::Column::Id.eq(space_id));
        }

        query.all(self.connection()).await.map_err(AppError::from)
    }

    /// 计算下一条 Space 的排序值。
    pub async fn next_sort_order<C>(&self, connection: &C) -> Result<i32, AppError>
    where
        C: ConnectionTrait,
    {
        let max_sort_order = Space::find()
            .select_only()
            .column_as(space::Column::SortOrder.max(), "max_sort_order")
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
        record: CreateSpaceRecord,
    ) -> Result<space::Model, AppError>
    where
        C: ConnectionTrait,
    {
        space::ActiveModel {
            id: Set(record.id),
            name: Set(record.name),
            icon_key: Set(record.icon_key),
            color_key: Set(record.color_key),
            is_default: Set(record.is_default),
            sort_order: Set(record.sort_order),
            archived_at: Set(None),
            deleted_at: Set(None),
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
        space_id: &str,
        patch: UpdateSpacePatch,
        updated_at: &str,
    ) -> Result<Option<space::Model>, AppError>
    where
        C: ConnectionTrait,
    {
        let Some(model) = Space::find_by_id(space_id.to_owned())
            .one(connection)
            .await?
        else {
            return Ok(None);
        };

        let mut active_model: space::ActiveModel = model.into();
        if let Some(name) = patch.name {
            active_model.name = Set(name);
        }
        if let Some(icon_key) = patch.icon_key {
            active_model.icon_key = Set(icon_key);
        }
        if let Some(color_key) = patch.color_key {
            active_model.color_key = Set(color_key);
        }
        active_model.updated_at = Set(updated_at.to_owned());
        active_model
            .update(connection)
            .await
            .map(Some)
            .map_err(AppError::from)
    }

    /// 清除所有活跃 Space 的默认标记。
    pub async fn clear_default<C>(&self, connection: &C, updated_at: &str) -> Result<u64, AppError>
    where
        C: ConnectionTrait,
    {
        let result = Space::update_many()
            .col_expr(space::Column::IsDefault, Expr::value(false))
            .col_expr(space::Column::UpdatedAt, Expr::value(updated_at.to_owned()))
            .filter(space::Column::IsDefault.eq(true))
            .filter(space::Column::ArchivedAt.is_null())
            .filter(space::Column::DeletedAt.is_null())
            .exec(connection)
            .await?;
        Ok(result.rows_affected)
    }

    /// 将某个 Space 设置为默认。
    pub async fn set_default<C>(
        &self,
        connection: &C,
        space_id: &str,
        updated_at: &str,
    ) -> Result<Option<space::Model>, AppError>
    where
        C: ConnectionTrait,
    {
        let Some(model) = Space::find_by_id(space_id.to_owned())
            .one(connection)
            .await?
        else {
            return Ok(None);
        };

        let mut active_model: space::ActiveModel = model.into();
        active_model.is_default = Set(true);
        active_model.updated_at = Set(updated_at.to_owned());
        active_model
            .update(connection)
            .await
            .map(Some)
            .map_err(AppError::from)
    }

    /// 原始归档：只更新 Space 自身。
    pub async fn archive_raw<C>(
        &self,
        connection: &C,
        space_id: &str,
        archived_at: &str,
        updated_at: &str,
    ) -> Result<Option<space::Model>, AppError>
    where
        C: ConnectionTrait,
    {
        let Some(model) = Space::find_by_id(space_id.to_owned())
            .one(connection)
            .await?
        else {
            return Ok(None);
        };

        let mut active_model: space::ActiveModel = model.into();
        active_model.archived_at = Set(Some(archived_at.to_owned()));
        active_model.updated_at = Set(updated_at.to_owned());
        active_model
            .update(connection)
            .await
            .map(Some)
            .map_err(AppError::from)
    }

    /// 原始恢复：只恢复 Space 自身。
    pub async fn restore_raw<C>(
        &self,
        connection: &C,
        space_id: &str,
        updated_at: &str,
    ) -> Result<Option<space::Model>, AppError>
    where
        C: ConnectionTrait,
    {
        let Some(model) = Space::find_by_id(space_id.to_owned())
            .one(connection)
            .await?
        else {
            return Ok(None);
        };

        let mut active_model: space::ActiveModel = model.into();
        active_model.archived_at = Set(None);
        active_model.deleted_at = Set(None);
        active_model.updated_at = Set(updated_at.to_owned());
        active_model
            .update(connection)
            .await
            .map(Some)
            .map_err(AppError::from)
    }

    /// 原始删除：只更新 Space 自身。
    pub async fn delete_raw<C>(
        &self,
        connection: &C,
        space_id: &str,
        deleted_at: &str,
        updated_at: &str,
    ) -> Result<Option<space::Model>, AppError>
    where
        C: ConnectionTrait,
    {
        let Some(model) = Space::find_by_id(space_id.to_owned())
            .one(connection)
            .await?
        else {
            return Ok(None);
        };

        let mut active_model: space::ActiveModel = model.into();
        active_model.deleted_at = Set(Some(deleted_at.to_owned()));
        active_model.updated_at = Set(updated_at.to_owned());
        active_model
            .update(connection)
            .await
            .map(Some)
            .map_err(AppError::from)
    }

    /// 永久删除 Space。
    pub async fn permanently_delete<C>(
        &self,
        connection: &C,
        space_id: &str,
    ) -> Result<u64, AppError>
    where
        C: ConnectionTrait,
    {
        let result = Space::delete_by_id(space_id.to_owned())
            .exec(connection)
            .await?;
        Ok(result.rows_affected)
    }
}

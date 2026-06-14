//! View Repository：只负责 View 数据持久化与原始状态变更。

use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, ConnectionTrait, DatabaseConnection,
    EntityTrait, QueryFilter, QueryOrder, QuerySelect,
};
use stoneflow_schema::{
    common::{ViewEntityKind, ViewKind},
    prelude::View,
    view,
};

use crate::app::error::AppError;

/// 创建 View 所需的持久化字段。
#[derive(Debug, Clone)]
pub struct CreateViewRecord {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub kind: ViewKind,
    pub entity_type: ViewEntityKind,
    pub key: Option<String>,
    pub filters: String,
    pub sort: String,
    pub group_by: Option<String>,
    pub is_visible: bool,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

/// 更新 View 的 patch。
#[derive(Debug, Clone, Default)]
pub struct UpdateViewPatch {
    pub name: Option<String>,
    pub description: Option<Option<String>>,
    pub filters: Option<String>,
    pub sort: Option<String>,
    pub group_by: Option<Option<String>>,
    pub is_visible: Option<bool>,
    pub sort_order: Option<i32>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Copy)]
pub struct ViewListQuery {
    pub entity_type: ViewEntityKind,
    pub visible_only: bool,
}

#[derive(Debug, Clone)]
pub struct ViewRepository {
    db: DatabaseConnection,
}

impl ViewRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub fn connection(&self) -> &DatabaseConnection {
        &self.db
    }

    /// 根据 ID 查询单个 View。
    pub async fn get(&self, view_id: &str) -> Result<Option<view::Model>, AppError> {
        View::find_by_id(view_id.to_owned())
            .one(self.connection())
            .await
            .map_err(AppError::from)
    }

    /// 根据实体类型与 key 查询系统 View。
    pub async fn get_by_key(
        &self,
        entity_type: ViewEntityKind,
        key: &str,
    ) -> Result<Option<view::Model>, AppError> {
        View::find()
            .filter(view::Column::EntityType.eq(entity_type))
            .filter(view::Column::Key.eq(key))
            .one(self.connection())
            .await
            .map_err(AppError::from)
    }

    /// 列出一组 View。
    pub async fn list(&self, query: ViewListQuery) -> Result<Vec<view::Model>, AppError> {
        let mut builder = View::find().filter(view::Column::EntityType.eq(query.entity_type));

        if query.visible_only {
            builder = builder.filter(view::Column::IsVisible.eq(true));
        }

        builder
            .order_by_asc(view::Column::SortOrder)
            .order_by_asc(view::Column::CreatedAt)
            .all(self.connection())
            .await
            .map_err(AppError::from)
    }

    /// 读取同实体类型下的下一个排序值。
    pub async fn next_sort_order<C>(
        &self,
        connection: &C,
        entity_type: ViewEntityKind,
    ) -> Result<i32, AppError>
    where
        C: ConnectionTrait,
    {
        let max_sort_order = View::find()
            .select_only()
            .column_as(view::Column::SortOrder.max(), "max_sort_order")
            .filter(view::Column::EntityType.eq(entity_type))
            .into_tuple::<Option<i32>>()
            .one(connection)
            .await?
            .flatten();

        Ok(max_sort_order.unwrap_or(0) + 100)
    }

    /// 原始创建，不承载业务规则。
    pub async fn create<C>(
        &self,
        connection: &C,
        record: CreateViewRecord,
    ) -> Result<view::Model, AppError>
    where
        C: ConnectionTrait,
    {
        view::ActiveModel {
            id: Set(record.id),
            name: Set(record.name),
            description: Set(record.description),
            r#type: Set(record.kind),
            entity_type: Set(record.entity_type),
            key: Set(record.key),
            filters: Set(record.filters),
            sort: Set(record.sort),
            group_by: Set(record.group_by),
            is_visible: Set(record.is_visible),
            sort_order: Set(record.sort_order),
            created_at: Set(record.created_at),
            updated_at: Set(record.updated_at),
        }
        .insert(connection)
        .await
        .map_err(AppError::from)
    }

    /// 更新 View 基础字段。
    pub async fn update<C>(
        &self,
        connection: &C,
        view_id: &str,
        patch: UpdateViewPatch,
    ) -> Result<Option<view::Model>, AppError>
    where
        C: ConnectionTrait,
    {
        let Some(model) = View::find_by_id(view_id.to_owned()).one(connection).await? else {
            return Ok(None);
        };

        let mut active_model: view::ActiveModel = model.into();
        if let Some(name) = patch.name {
            active_model.name = Set(name);
        }
        if let Some(description) = patch.description {
            active_model.description = Set(description);
        }
        if let Some(filters) = patch.filters {
            active_model.filters = Set(filters);
        }
        if let Some(sort) = patch.sort {
            active_model.sort = Set(sort);
        }
        if let Some(group_by) = patch.group_by {
            active_model.group_by = Set(group_by);
        }
        if let Some(is_visible) = patch.is_visible {
            active_model.is_visible = Set(is_visible);
        }
        if let Some(sort_order) = patch.sort_order {
            active_model.sort_order = Set(sort_order);
        }
        if let Some(updated_at) = patch.updated_at {
            active_model.updated_at = Set(updated_at);
        }

        active_model
            .update(connection)
            .await
            .map(Some)
            .map_err(AppError::from)
    }

    /// 原始删除，直接物理删除一条 View。
    pub async fn delete<C>(&self, connection: &C, view_id: &str) -> Result<u64, AppError>
    where
        C: ConnectionTrait,
    {
        let result = View::delete_by_id(view_id.to_owned())
            .exec(connection)
            .await?;

        Ok(result.rows_affected)
    }
}

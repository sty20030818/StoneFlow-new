//! Space Repository（R2：无软删）。

use crate::entities::{prelude::Space, space};
use sea_orm::{
    sea_query::Expr, ActiveModelTrait, ColumnTrait, ConnectionTrait, DatabaseConnection,
    EntityTrait, QueryFilter, QueryOrder, QuerySelect, Set,
};

use crate::error::StorageError;
use stoneflow_domain::POSITION_STEP;

/// 创建 Space 所需的持久化字段。
#[derive(Debug, Clone)]
pub struct CreateSpaceRecord {
    pub id: String,
    pub name: String,
    pub icon_key: String,
    pub color_key: String,
    pub is_default: bool,
    pub position: i64,
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

    pub async fn list_visible(&self) -> Result<Vec<space::Model>, StorageError> {
        Space::find()
            .filter(space::Column::ArchivedAt.is_null())
            .filter(space::Column::DeletedAt.is_null())
            .order_by_asc(space::Column::Position)
            .order_by_asc(space::Column::CreatedAt)
            .all(self.connection())
            .await
            .map_err(StorageError::from)
    }

    pub async fn get(&self, space_id: &str) -> Result<Option<space::Model>, StorageError> {
        Space::find_by_id(space_id.to_owned())
            .one(self.connection())
            .await
            .map_err(StorageError::from)
    }

    pub async fn get_default(&self) -> Result<Option<space::Model>, StorageError> {
        Space::find()
            .filter(space::Column::IsDefault.eq(true))
            .filter(space::Column::ArchivedAt.is_null())
            .filter(space::Column::DeletedAt.is_null())
            .one(self.connection())
            .await
            .map_err(StorageError::from)
    }

    pub async fn next_position<C>(&self, connection: &C) -> Result<i64, StorageError>
    where
        C: ConnectionTrait,
    {
        let max = Space::find()
            .select_only()
            .column_as(space::Column::Position.max(), "max_position")
            .into_tuple::<Option<i64>>()
            .one(connection)
            .await
            .map_err(StorageError::from)?
            .flatten()
            .unwrap_or(0);
        Ok(max + POSITION_STEP)
    }

    pub async fn create<C>(
        &self,
        connection: &C,
        record: CreateSpaceRecord,
    ) -> Result<space::Model, StorageError>
    where
        C: ConnectionTrait,
    {
        space::ActiveModel {
            id: Set(record.id),
            name: Set(record.name),
            icon_key: Set(record.icon_key),
            color_key: Set(record.color_key),
            is_default: Set(record.is_default),
            position: Set(record.position),
            generation: Set(1),
            archived_at: Set(None),
            deleted_at: Set(None),
            created_at: Set(record.created_at),
            updated_at: Set(record.updated_at),
        }
        .insert(connection)
        .await
        .map_err(StorageError::from)
    }

    pub async fn update<C>(
        &self,
        connection: &C,
        space_id: &str,
        patch: UpdateSpacePatch,
        updated_at: &str,
    ) -> Result<Option<space::Model>, StorageError>
    where
        C: ConnectionTrait,
    {
        let Some(current) = self.get(space_id).await? else {
            return Ok(None);
        };
        let mut model: space::ActiveModel = current.into();
        if let Some(name) = patch.name {
            model.name = Set(name);
        }
        if let Some(icon_key) = patch.icon_key {
            model.icon_key = Set(icon_key);
        }
        if let Some(color_key) = patch.color_key {
            model.color_key = Set(color_key);
        }
        let next_generation = match &model.generation {
            sea_orm::ActiveValue::Set(value) | sea_orm::ActiveValue::Unchanged(value) => value + 1,
            sea_orm::ActiveValue::NotSet => 1,
        };
        model.updated_at = Set(updated_at.to_owned());
        model.generation = Set(next_generation);
        model
            .update(connection)
            .await
            .map(Some)
            .map_err(StorageError::from)
    }

    pub async fn clear_default<C>(
        &self,
        connection: &C,
        updated_at: &str,
    ) -> Result<u64, StorageError>
    where
        C: ConnectionTrait,
    {
        Space::update_many()
            .col_expr(space::Column::IsDefault, Expr::value(false))
            .col_expr(space::Column::UpdatedAt, Expr::value(updated_at))
            .filter(space::Column::IsDefault.eq(true))
            .exec(connection)
            .await
            .map(|result| result.rows_affected)
            .map_err(StorageError::from)
    }

    pub async fn set_default<C>(
        &self,
        connection: &C,
        space_id: &str,
        updated_at: &str,
    ) -> Result<Option<space::Model>, StorageError>
    where
        C: ConnectionTrait,
    {
        let Some(current) = Space::find_by_id(space_id.to_owned())
            .one(connection)
            .await
            .map_err(StorageError::from)?
        else {
            return Ok(None);
        };
        let mut model: space::ActiveModel = current.into();
        model.is_default = Set(true);
        let next_generation = match &model.generation {
            sea_orm::ActiveValue::Set(value) | sea_orm::ActiveValue::Unchanged(value) => value + 1,
            sea_orm::ActiveValue::NotSet => 1,
        };
        model.updated_at = Set(updated_at.to_owned());
        model.generation = Set(next_generation);
        model
            .update(connection)
            .await
            .map(Some)
            .map_err(StorageError::from)
    }

    /// 物理删除 Space。
    pub async fn delete_physical<C>(
        &self,
        connection: &C,
        space_id: &str,
    ) -> Result<u64, StorageError>
    where
        C: ConnectionTrait,
    {
        Space::delete_by_id(space_id.to_owned())
            .exec(connection)
            .await
            .map(|result| result.rows_affected)
            .map_err(StorageError::from)
    }
}

//! 自定义 Task View 的 SQLite 持久化。

use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, ConnectionTrait, DatabaseConnection,
    EntityTrait, QueryFilter, QueryOrder,
};
use stoneflow_domain::{ViewEntityKind, POSITION_STEP};

use crate::{
    entities::{common::ViewEntityKind as StorageViewEntityKind, prelude::View, view},
    error::StorageError,
    mappers::{view_entity_kind_to_domain, view_entity_kind_to_schema},
};

#[derive(Debug, Clone)]
pub struct CreateViewRecord {
    pub id: String,
    pub name: String,
    pub entity_kind: ViewEntityKind,
    pub scope_json: String,
    pub filters_json: String,
    pub sort_json: String,
    pub group_by_json: Option<String>,
    pub position: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Default)]
pub struct UpdateViewPatch {
    pub name: Option<String>,
    pub scope_json: Option<String>,
    pub filters_json: Option<String>,
    pub sort_json: Option<String>,
    pub group_by_json: Option<Option<String>>,
    pub position: Option<i64>,
    pub updated_at: String,
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

    pub async fn get(&self, view_id: &str) -> Result<Option<view::Model>, StorageError> {
        View::find_by_id(view_id)
            .one(&self.db)
            .await
            .map_err(Into::into)
    }

    pub async fn list(&self) -> Result<Vec<view::Model>, StorageError> {
        View::find()
            .filter(view::Column::EntityKind.eq(StorageViewEntityKind::Task))
            .order_by_asc(view::Column::Position)
            .order_by_asc(view::Column::CreatedAt)
            .all(&self.db)
            .await
            .map_err(Into::into)
    }

    pub async fn next_position<C>(&self, connection: &C) -> Result<i64, StorageError>
    where
        C: ConnectionTrait,
    {
        let last = View::find()
            .filter(view::Column::EntityKind.eq(StorageViewEntityKind::Task))
            .order_by_desc(view::Column::Position)
            .one(connection)
            .await?;
        Ok(last.map_or(POSITION_STEP, |view| view.position + POSITION_STEP))
    }

    pub async fn create<C>(
        &self,
        connection: &C,
        record: CreateViewRecord,
    ) -> Result<view::Model, StorageError>
    where
        C: ConnectionTrait,
    {
        view::ActiveModel {
            id: Set(record.id),
            name: Set(record.name),
            entity_kind: Set(view_entity_kind_to_schema(record.entity_kind)),
            scope_json: Set(record.scope_json),
            filters_json: Set(record.filters_json),
            sort_json: Set(record.sort_json),
            group_by_json: Set(record.group_by_json),
            position: Set(record.position),
            generation: Set(1),
            created_at: Set(record.created_at),
            updated_at: Set(record.updated_at),
        }
        .insert(connection)
        .await
        .map_err(Into::into)
    }

    pub async fn update<C>(
        &self,
        connection: &C,
        view_id: &str,
        patch: UpdateViewPatch,
    ) -> Result<Option<view::Model>, StorageError>
    where
        C: ConnectionTrait,
    {
        let Some(current) = View::find_by_id(view_id).one(connection).await? else {
            return Ok(None);
        };
        let mut model: view::ActiveModel = current.into();
        if let Some(value) = patch.name {
            model.name = Set(value);
        }
        if let Some(value) = patch.scope_json {
            model.scope_json = Set(value);
        }
        if let Some(value) = patch.filters_json {
            model.filters_json = Set(value);
        }
        if let Some(value) = patch.sort_json {
            model.sort_json = Set(value);
        }
        if let Some(value) = patch.group_by_json {
            model.group_by_json = Set(value);
        }
        if let Some(value) = patch.position {
            model.position = Set(value);
        }
        model.updated_at = Set(patch.updated_at);
        let generation = match model.generation {
            sea_orm::ActiveValue::Set(value) | sea_orm::ActiveValue::Unchanged(value) => value + 1,
            sea_orm::ActiveValue::NotSet => 1,
        };
        model.generation = Set(generation);
        model.update(connection).await.map(Some).map_err(Into::into)
    }

    pub async fn delete<C>(&self, connection: &C, view_id: &str) -> Result<u64, StorageError>
    where
        C: ConnectionTrait,
    {
        Ok(View::delete_by_id(view_id)
            .exec(connection)
            .await?
            .rows_affected)
    }
}

pub fn map_view(model: view::Model) -> stoneflow_application::view::ViewRecord {
    stoneflow_application::view::ViewRecord {
        id: model.id,
        name: model.name,
        entity_kind: view_entity_kind_to_domain(model.entity_kind),
        scope_json: model.scope_json,
        filters_json: model.filters_json,
        sort_json: model.sort_json,
        group_by_json: model.group_by_json,
        position: model.position,
        generation: model.generation,
        created_at: model.created_at,
        updated_at: model.updated_at,
    }
}

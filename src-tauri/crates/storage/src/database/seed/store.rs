//! Seed 最小存取。

use crate::entities::space;
use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, EntityTrait, PaginatorTrait, QueryFilter,
};

pub async fn count_active_default_spaces<C>(connection: &C) -> Result<u64, sea_orm::DbErr>
where
    C: ConnectionTrait,
{
    space::Entity::find()
        .filter(space::Column::IsDefault.eq(true))
        .filter(space::Column::ArchivedAt.is_null())
        .filter(space::Column::DeletedAt.is_null())
        .count(connection)
        .await
}

pub async fn insert_default_space<C>(
    connection: &C,
    model: space::ActiveModel,
) -> Result<(), sea_orm::DbErr>
where
    C: ConnectionTrait,
{
    model.insert(connection).await?;
    Ok(())
}

//! Seed 最小存取：避免把阶段 1 初始化逻辑扩散到 repository/service。

use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, ConnectionTrait, EntityTrait, PaginatorTrait,
    QueryFilter,
};
use stoneflow_schema::{
    common::{ViewEntityKind, ViewKind},
    setting, space, view,
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

pub async fn system_view_exists<C>(
    connection: &C,
    entity_type: ViewEntityKind,
    key: &str,
) -> Result<bool, sea_orm::DbErr>
where
    C: ConnectionTrait,
{
    view::Entity::find()
        .filter(view::Column::EntityType.eq(entity_type))
        .filter(view::Column::Key.eq(key))
        .one(connection)
        .await
        .map(|model| model.is_some())
}

pub async fn insert_system_view<C>(
    connection: &C,
    model: view::ActiveModel,
) -> Result<(), sea_orm::DbErr>
where
    C: ConnectionTrait,
{
    let mut model = model;
    model.r#type = Set(ViewKind::System);
    model.insert(connection).await?;
    Ok(())
}

pub async fn setting_exists<C>(connection: &C, key: &str) -> Result<bool, sea_orm::DbErr>
where
    C: ConnectionTrait,
{
    setting::Entity::find_by_id(key.to_owned())
        .one(connection)
        .await
        .map(|model| model.is_some())
}

pub async fn insert_setting<C>(
    connection: &C,
    model: setting::ActiveModel,
) -> Result<(), sea_orm::DbErr>
where
    C: ConnectionTrait,
{
    model.insert(connection).await?;
    Ok(())
}

pub async fn get_setting_value<C>(
    connection: &C,
    key: &str,
) -> Result<Option<String>, sea_orm::DbErr>
where
    C: ConnectionTrait,
{
    setting::Entity::find_by_id(key.to_owned())
        .one(connection)
        .await
        .map(|model| model.map(|item| item.value))
}

pub async fn delete_setting<C>(connection: &C, key: &str) -> Result<(), sea_orm::DbErr>
where
    C: ConnectionTrait,
{
    setting::Entity::delete_by_id(key.to_owned())
        .exec(connection)
        .await?;
    Ok(())
}

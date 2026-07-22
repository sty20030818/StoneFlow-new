//! Space entity。

use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "spaces")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,
    pub name: String,
    pub icon_key: String,
    pub color_key: String,
    pub is_default: bool,
    pub position: i64,
    pub generation: i64,
    pub archived_at: Option<String>,
    pub deleted_at: Option<String>,
    pub archived_by_operation_id: Option<String>,
    pub deleted_by_operation_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

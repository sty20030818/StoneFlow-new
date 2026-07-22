//! View entity（仅自定义 View）。

use sea_orm::entity::prelude::*;

use super::common::ViewEntityKind;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "views")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,
    pub name: String,
    pub entity_kind: ViewEntityKind,
    pub scope_json: String,
    pub filters_json: String,
    pub sort_json: String,
    pub group_by_json: Option<String>,
    pub position: i64,
    pub generation: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

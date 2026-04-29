//! Project 实体。

use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "projects")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,
    pub space_id: String,
    pub name: String,
    pub description: Option<String>,
    pub due_at: Option<String>,
    pub sort_order: i32,
    pub completed_at: Option<String>,
    pub archived_at: Option<String>,
    pub archived_by_type: Option<String>,
    pub archived_by_id: Option<String>,
    pub deleted_at: Option<String>,
    pub deleted_by_type: Option<String>,
    pub deleted_by_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

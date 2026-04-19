//! Space 实体定义。

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "spaces")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub name: String,
    pub slug: String,
    pub sort_order: i32,
    pub is_archived: bool,
    pub created_at: DateTimeUtc,
    pub updated_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::project::Entity")]
    Project,
    #[sea_orm(has_many = "super::task::Entity")]
    Task,
    #[sea_orm(has_many = "super::focus_view::Entity")]
    FocusView,
    #[sea_orm(has_many = "super::trash_entry::Entity")]
    TrashEntry,
}

impl Related<super::project::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Project.def()
    }
}

impl Related<super::task::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Task.def()
    }
}

impl Related<super::focus_view::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::FocusView.def()
    }
}

impl Related<super::trash_entry::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::TrashEntry.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}

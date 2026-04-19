//! Project 实体定义。

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "projects")]
pub struct Model {
  #[sea_orm(primary_key, auto_increment = false)]
  pub id: Uuid,
  pub space_id: Uuid,
  pub parent_project_id: Option<Uuid>,
  pub name: String,
  pub status: String,
  pub note: Option<String>,
  pub due_at: Option<DateTimeUtc>,
  pub sort_order: i32,
  pub is_deleted: bool,
  pub created_at: DateTimeUtc,
  pub updated_at: DateTimeUtc,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
  #[sea_orm(
    belongs_to = "super::space::Entity",
    from = "Column::SpaceId",
    to = "super::space::Column::Id",
    on_update = "Cascade",
    on_delete = "Restrict"
  )]
  Space,
  #[sea_orm(
    belongs_to = "Entity",
    from = "Column::ParentProjectId",
    to = "Column::Id",
    on_update = "Cascade",
    on_delete = "SetNull"
  )]
  ParentProject,
  #[sea_orm(has_many = "Entity")]
  ChildProject,
  #[sea_orm(has_many = "super::task::Entity")]
  Task,
}

impl Related<super::space::Entity> for Entity {
  fn to() -> RelationDef {
    Relation::Space.def()
  }
}

impl Related<Entity> for Entity {
  fn to() -> RelationDef {
    Relation::ParentProject.def()
  }
}

impl Related<super::task::Entity> for Entity {
  fn to() -> RelationDef {
    Relation::Task.def()
  }
}

impl ActiveModelBehavior for ActiveModel {}

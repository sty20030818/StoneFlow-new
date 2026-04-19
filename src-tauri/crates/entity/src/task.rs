//! Task 实体定义。

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "tasks")]
pub struct Model {
  #[sea_orm(primary_key, auto_increment = false)]
  pub id: Uuid,
  pub space_id: Uuid,
  pub project_id: Option<Uuid>,
  pub title: String,
  pub status: String,
  pub priority: Option<String>,
  pub note: Option<String>,
  pub tags: Json,
  pub due_at: Option<DateTimeUtc>,
  pub pinned: bool,
  pub source: String,
  pub deleted_at: Option<DateTimeUtc>,
  pub completed_at: Option<DateTimeUtc>,
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
    belongs_to = "super::project::Entity",
    from = "Column::ProjectId",
    to = "super::project::Column::Id",
    on_update = "Cascade",
    on_delete = "SetNull"
  )]
  Project,
}

impl Related<super::space::Entity> for Entity {
  fn to() -> RelationDef {
    Relation::Space.def()
  }
}

impl Related<super::project::Entity> for Entity {
  fn to() -> RelationDef {
    Relation::Project.def()
  }
}

impl ActiveModelBehavior for ActiveModel {}

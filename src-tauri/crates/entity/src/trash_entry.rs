//! TrashEntry 实体定义。

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "trash_entries")]
pub struct Model {
  #[sea_orm(primary_key, auto_increment = false)]
  pub id: Uuid,
  pub space_id: Uuid,
  pub entity_type: String,
  pub entity_id: Uuid,
  pub entity_snapshot: Json,
  pub deleted_at: DateTimeUtc,
  pub deleted_from: Option<String>,
  pub created_at: DateTimeUtc,
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
}

impl Related<super::space::Entity> for Entity {
  fn to() -> RelationDef {
    Relation::Space.def()
  }
}

impl ActiveModelBehavior for ActiveModel {}

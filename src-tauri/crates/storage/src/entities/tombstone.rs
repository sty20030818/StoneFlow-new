//! Tombstone entity。

use sea_orm::entity::prelude::*;

use super::common::SyncEntityType;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "tombstones")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub entity_type: SyncEntityType,
    #[sea_orm(primary_key, auto_increment = false)]
    pub entity_id: String,
    pub generation: i64,
    pub deletion_seq: i64,
    pub deleted_at: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

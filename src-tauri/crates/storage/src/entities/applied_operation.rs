//! Applied operation entity（远端幂等）。

use sea_orm::entity::prelude::*;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "applied_operations")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub operation_id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub applied_at: String,
    pub server_seq: Option<i64>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

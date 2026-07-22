//! Outbox entity。

use sea_orm::entity::prelude::*;

use super::common::{OutboxOperationType, SyncEntityType};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Eq)]
#[sea_orm(table_name = "outbox")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,
    pub operation_id: String,
    pub entity_type: SyncEntityType,
    pub entity_id: String,
    pub generation: i64,
    pub operation_type: OutboxOperationType,
    pub payload_json: String,
    pub created_at: String,
    pub available_at: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

//! Activity event 实体。

use sea_orm::entity::prelude::*;

use super::common::{ActivityActorKind, ActivityEntityKind, ActivitySourceKind};

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel)]
#[sea_orm(table_name = "activity_events")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: String,
    pub entity_type: ActivityEntityKind,
    pub entity_id: String,
    pub action: String,
    pub actor_type: ActivityActorKind,
    pub source: ActivitySourceKind,
    pub summary: Option<String>,
    pub metadata: Option<String>,
    pub created_at: String,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {}

impl ActiveModelBehavior for ActiveModel {}

//! Tombstone repository。

use crate::entities::{common::SyncEntityType, tombstone};
use sea_orm::{ActiveModelTrait, ActiveValue::Set, ConnectionTrait, DatabaseConnection};
use stoneflow_application::operation::{SyncEntityKind, TombstoneRecord};

use crate::error::StorageError;

#[derive(Debug, Clone)]
pub struct TombstoneRepository {
    db: DatabaseConnection,
}

impl TombstoneRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub fn connection(&self) -> &DatabaseConnection {
        &self.db
    }

    /// 在既有连接/事务中写入 tombstone。
    pub async fn insert_in_connection<C>(
        &self,
        connection: &C,
        record: &TombstoneRecord,
    ) -> Result<(), StorageError>
    where
        C: ConnectionTrait,
    {
        tombstone::ActiveModel {
            entity_type: Set(map_entity_kind(record.entity_type)),
            entity_id: Set(record.entity_id.clone()),
            generation: Set(record.generation),
            deletion_seq: Set(record.deletion_seq),
            deleted_at: Set(record.deleted_at.clone()),
        }
        .insert(connection)
        .await?;
        Ok(())
    }
}

fn map_entity_kind(kind: SyncEntityKind) -> SyncEntityType {
    match kind {
        SyncEntityKind::Space => SyncEntityType::Space,
        SyncEntityKind::Project => SyncEntityType::Project,
        SyncEntityKind::Task => SyncEntityType::Task,
        SyncEntityKind::TaskLink => SyncEntityType::TaskLink,
        SyncEntityKind::View => SyncEntityType::View,
        SyncEntityKind::Setting => SyncEntityType::Setting,
        SyncEntityKind::Activity => SyncEntityType::Activity,
    }
}

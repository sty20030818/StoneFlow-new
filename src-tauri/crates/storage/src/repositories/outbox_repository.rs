//! Outbox repository。

use crate::entities::{
    common::{OutboxOperationType, SyncEntityType},
    outbox,
    prelude::Outbox,
};
use sea_orm::{ActiveModelTrait, ActiveValue::Set, ConnectionTrait, DatabaseConnection};
use stoneflow_application::operation::{OutboxEnqueueRecord, OutboxOpKind, SyncEntityKind};

use crate::error::StorageError;

#[derive(Debug, Clone)]
pub struct OutboxRepository {
    db: DatabaseConnection,
}

impl OutboxRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub fn connection(&self) -> &DatabaseConnection {
        &self.db
    }

    /// 在既有连接/事务中写入 Outbox。
    pub async fn enqueue_in_connection<C>(
        &self,
        connection: &C,
        record: &OutboxEnqueueRecord,
    ) -> Result<(), StorageError>
    where
        C: ConnectionTrait,
    {
        outbox::ActiveModel {
            id: Set(record.id.clone()),
            operation_id: Set(record.operation_id.clone()),
            entity_type: Set(map_entity_kind(record.entity_type)),
            entity_id: Set(record.entity_id.clone()),
            generation: Set(record.generation),
            operation_type: Set(map_op_kind(record.operation_type)),
            payload_json: Set(record.payload_json.clone()),
            created_at: Set(record.created_at.clone()),
            available_at: Set(record.available_at.clone()),
        }
        .insert(connection)
        .await?;
        Ok(())
    }

    /// 统计待发送条目（测试/诊断）。
    pub async fn count_all(&self) -> Result<u64, StorageError> {
        use sea_orm::{EntityTrait, PaginatorTrait};
        Ok(Outbox::find().count(self.connection()).await?)
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

fn map_op_kind(kind: OutboxOpKind) -> OutboxOperationType {
    match kind {
        OutboxOpKind::Upsert => OutboxOperationType::Upsert,
        OutboxOpKind::Delete => OutboxOperationType::Delete,
        OutboxOpKind::Restore => OutboxOperationType::Restore,
        OutboxOpKind::Patch => OutboxOperationType::Patch,
    }
}

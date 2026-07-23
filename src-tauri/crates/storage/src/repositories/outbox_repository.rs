//! Outbox repository。

use crate::entities::{
    common::{OutboxOperationType, SyncEntityType},
    outbox,
    prelude::Outbox,
};
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, ConnectionTrait, DatabaseConnection,
    EntityTrait, QueryFilter, QueryOrder,
};
use stoneflow_application::operation::{OutboxEnqueueRecord, OutboxOpKind, SyncEntityKind};

use crate::error::StorageError;

#[derive(Debug, Clone)]
pub struct OutboxRepository {
    db: DatabaseConnection,
}

/// 同一用户 operation 的待发送 Outbox 条目。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PendingOutboxOperation {
    pub operation_id: String,
    pub entries: Vec<outbox::Model>,
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

    /// 按创建顺序读取完整 operation，绝不在 batch 边界拆开一个 operation。
    pub async fn list_pending_operations(
        &self,
        operation_limit: u64,
    ) -> Result<Vec<PendingOutboxOperation>, StorageError> {
        let entries = Outbox::find()
            .order_by_asc(outbox::Column::AvailableAt)
            .order_by_asc(outbox::Column::CreatedAt)
            .order_by_asc(outbox::Column::Id)
            .all(self.connection())
            .await?;
        let mut operations: Vec<PendingOutboxOperation> = Vec::new();
        for entry in entries {
            if let Some(current) = operations.last_mut() {
                if current.operation_id == entry.operation_id {
                    current.entries.push(entry);
                    continue;
                }
            }
            if operations.len() as u64 == operation_limit {
                break;
            }
            operations.push(PendingOutboxOperation {
                operation_id: entry.operation_id.clone(),
                entries: vec![entry],
            });
        }
        Ok(operations)
    }

    /// 仅在远端已原子提交后确认本地 operation。
    pub async fn acknowledge_operation(&self, operation_id: &str) -> Result<(), StorageError> {
        Outbox::delete_many()
            .filter(outbox::Column::OperationId.eq(operation_id))
            .exec(self.connection())
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

fn map_op_kind(kind: OutboxOpKind) -> OutboxOperationType {
    match kind {
        OutboxOpKind::Upsert => OutboxOperationType::Upsert,
        OutboxOpKind::Delete => OutboxOperationType::Delete,
        OutboxOpKind::Restore => OutboxOperationType::Restore,
        OutboxOpKind::Patch => OutboxOperationType::Patch,
    }
}

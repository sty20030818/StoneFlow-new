//! Applied operation repository（远端幂等）。

use crate::entities::applied_operation;
use sea_orm::{ActiveModelTrait, ActiveValue::Set, ConnectionTrait, DatabaseConnection};
use stoneflow_application::operation::AppliedOperationRecord;

use crate::error::StorageError;

#[derive(Debug, Clone)]
pub struct AppliedOperationRepository {
    db: DatabaseConnection,
}

impl AppliedOperationRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub fn connection(&self) -> &DatabaseConnection {
        &self.db
    }

    /// 在既有连接/事务中记录已应用 operation。
    pub async fn record_in_connection<C>(
        &self,
        connection: &C,
        record: &AppliedOperationRecord,
    ) -> Result<(), StorageError>
    where
        C: ConnectionTrait,
    {
        applied_operation::ActiveModel {
            operation_id: Set(record.operation_id.clone()),
            entity_type: Set(record.entity_type.as_str().to_owned()),
            entity_id: Set(record.entity_id.clone()),
            applied_at: Set(record.applied_at.clone()),
            server_seq: Set(record.server_seq),
        }
        .insert(connection)
        .await?;
        Ok(())
    }
}

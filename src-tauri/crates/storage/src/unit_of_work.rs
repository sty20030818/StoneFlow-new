//! SQLite UnitOfWork：统一写事务边界。

use sea_orm::{DatabaseConnection, DatabaseTransaction, TransactionTrait};
use stoneflow_application::{
    operation::{
        AppliedOperationRecord, AppliedOperationWriter, OutboxEnqueueRecord, OutboxWriter,
        TombstoneRecord, TombstoneWriter, UnitOfWork,
    },
    ApplicationError,
};

use crate::repositories::{AppliedOperationRepository, OutboxRepository, TombstoneRepository};

/// 基于 SeaORM 事务的 UnitOfWork 实现。
#[derive(Debug, Clone)]
pub struct SqliteUnitOfWork {
    db: DatabaseConnection,
    outbox: OutboxRepository,
    tombstones: TombstoneRepository,
    applied_ops: AppliedOperationRepository,
}

impl SqliteUnitOfWork {
    pub fn new(db: DatabaseConnection) -> Self {
        Self {
            outbox: OutboxRepository::new(db.clone()),
            tombstones: TombstoneRepository::new(db.clone()),
            applied_ops: AppliedOperationRepository::new(db.clone()),
            db,
        }
    }

    pub fn connection(&self) -> &DatabaseConnection {
        &self.db
    }

    pub fn outbox(&self) -> &OutboxRepository {
        &self.outbox
    }

    pub fn tombstones(&self) -> &TombstoneRepository {
        &self.tombstones
    }

    pub fn applied_ops(&self) -> &AppliedOperationRepository {
        &self.applied_ops
    }
}

impl UnitOfWork for SqliteUnitOfWork {
    type Connection = DatabaseTransaction;

    async fn begin(&self) -> Result<Self::Connection, ApplicationError> {
        self.db.begin().await.map_err(map_db_error)
    }

    async fn commit(&self, connection: Self::Connection) -> Result<(), ApplicationError> {
        connection.commit().await.map_err(map_db_error)
    }

    async fn rollback(&self, connection: Self::Connection) -> Result<(), ApplicationError> {
        connection.rollback().await.map_err(map_db_error)
    }
}

impl OutboxWriter for SqliteUnitOfWork {
    type Connection = DatabaseTransaction;

    async fn enqueue(
        &self,
        connection: &Self::Connection,
        record: &OutboxEnqueueRecord,
    ) -> Result<(), ApplicationError> {
        self.outbox
            .enqueue_in_connection(connection, record)
            .await
            .map_err(map_storage_error)
    }
}

impl TombstoneWriter for SqliteUnitOfWork {
    type Connection = DatabaseTransaction;

    async fn insert_tombstone(
        &self,
        connection: &Self::Connection,
        record: &TombstoneRecord,
    ) -> Result<(), ApplicationError> {
        self.tombstones
            .insert_in_connection(connection, record)
            .await
            .map_err(map_storage_error)
    }
}

impl AppliedOperationWriter for SqliteUnitOfWork {
    type Connection = DatabaseTransaction;

    async fn record_applied(
        &self,
        connection: &Self::Connection,
        record: &AppliedOperationRecord,
    ) -> Result<(), ApplicationError> {
        self.applied_ops
            .record_in_connection(connection, record)
            .await
            .map_err(map_storage_error)
    }
}

fn map_db_error(error: sea_orm::DbErr) -> ApplicationError {
    ApplicationError::storage(error.to_string())
}

fn map_storage_error(error: crate::StorageError) -> ApplicationError {
    ApplicationError::storage(error.to_string())
}

//! Space port 实现与 application service 工厂。

use sea_orm::{
    ColumnTrait, DatabaseConnection, DatabaseTransaction, EntityTrait, PaginatorTrait, QueryFilter,
    TransactionTrait,
};
use stoneflow_application::{
    operation::OutboxEnqueueRecord,
    space::{
        CreateSpacePersistenceRecord, SpaceCascadeRecord, SpacePersistence, SpaceRecord,
        SpaceService, UpdateSpacePatch as AppUpdateSpacePatch,
    },
    ApplicationError,
};

use crate::adapters::error::{from_db, from_storage};
use crate::entities::space;
use crate::repositories::{
    CreateSpaceRecord, OutboxRepository, SpaceCascadeResult, SpaceRepository, UpdateSpacePatch,
};

/// 已装配的 Space application service。
pub type SpaceAppService = SpaceService<SpacePersistenceAdapter>;

/// 从数据库连接构造 Space 用例。
pub fn build_space_service(connection: DatabaseConnection) -> SpaceAppService {
    SpaceService::new(SpacePersistenceAdapter::new(SpaceRepository::new(
        connection,
    )))
}

/// Space 持久化 adapter。
#[derive(Debug, Clone)]
pub struct SpacePersistenceAdapter {
    repository: SpaceRepository,
    outbox: OutboxRepository,
}

impl SpacePersistenceAdapter {
    pub fn new(repository: SpaceRepository) -> Self {
        Self {
            outbox: OutboxRepository::new(repository.connection().clone()),
            repository,
        }
    }
}

impl SpacePersistence for SpacePersistenceAdapter {
    type Connection = DatabaseTransaction;

    async fn begin(&self) -> Result<Self::Connection, ApplicationError> {
        self.repository.connection().begin().await.map_err(from_db)
    }

    async fn commit(&self, connection: Self::Connection) -> Result<(), ApplicationError> {
        connection.commit().await.map_err(from_db)
    }

    async fn list_visible(&self) -> Result<Vec<SpaceRecord>, ApplicationError> {
        self.repository
            .list_visible()
            .await
            .map(|rows| rows.into_iter().map(map_space).collect())
            .map_err(from_storage)
    }

    async fn get_in_connection(
        &self,
        connection: &Self::Connection,
        space_id: &str,
    ) -> Result<Option<SpaceRecord>, ApplicationError> {
        self.repository
            .get_in_connection(connection, space_id)
            .await
            .map(|row| row.map(map_space))
            .map_err(from_storage)
    }

    async fn has_active(&self, connection: &Self::Connection) -> Result<bool, ApplicationError> {
        crate::entities::prelude::Space::find()
            .filter(space::Column::ArchivedAt.is_null())
            .filter(space::Column::DeletedAt.is_null())
            .count(connection)
            .await
            .map(|count| count > 0)
            .map_err(from_db)
    }

    async fn get(&self, space_id: &str) -> Result<Option<SpaceRecord>, ApplicationError> {
        self.repository
            .get(space_id)
            .await
            .map(|row| row.map(map_space))
            .map_err(from_storage)
    }

    async fn next_position(&self, connection: &Self::Connection) -> Result<i64, ApplicationError> {
        self.repository
            .next_position(connection)
            .await
            .map_err(from_storage)
    }

    async fn create(
        &self,
        connection: &Self::Connection,
        record: CreateSpacePersistenceRecord,
    ) -> Result<SpaceRecord, ApplicationError> {
        self.repository
            .create(
                connection,
                CreateSpaceRecord {
                    id: record.id,
                    name: record.name,
                    icon_key: record.icon_key,
                    color_key: record.color_key,
                    is_default: record.is_default,
                    position: record.position,
                    created_at: record.created_at,
                    updated_at: record.updated_at,
                },
            )
            .await
            .map(map_space)
            .map_err(from_storage)
    }

    async fn update(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        patch: AppUpdateSpacePatch,
        updated_at: &str,
    ) -> Result<Option<SpaceRecord>, ApplicationError> {
        self.repository
            .update(
                connection,
                space_id,
                UpdateSpacePatch {
                    name: patch.name,
                    icon_key: patch.icon_key,
                    color_key: patch.color_key,
                },
                updated_at,
            )
            .await
            .map(|row| row.map(map_space))
            .map_err(from_storage)
    }

    async fn clear_default(
        &self,
        connection: &Self::Connection,
        updated_at: &str,
    ) -> Result<(), ApplicationError> {
        self.repository
            .clear_default(connection, updated_at)
            .await
            .map(|_| ())
            .map_err(from_storage)
    }

    async fn set_default(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        updated_at: &str,
    ) -> Result<Option<SpaceRecord>, ApplicationError> {
        self.repository
            .set_default(connection, space_id, updated_at)
            .await
            .map(|row| row.map(map_space))
            .map_err(from_storage)
    }

    async fn list_active_except(
        &self,
        connection: &Self::Connection,
        excluded_space_id: &str,
    ) -> Result<Vec<SpaceRecord>, ApplicationError> {
        self.repository
            .list_active_except(connection, excluded_space_id)
            .await
            .map(|rows| rows.into_iter().map(map_space).collect())
            .map_err(from_storage)
    }

    async fn archive_cascade(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        operation_id: &str,
        archived_at: &str,
    ) -> Result<Option<SpaceCascadeRecord>, ApplicationError> {
        self.repository
            .archive_cascade(connection, space_id, operation_id, archived_at)
            .await
            .map(|record| record.map(map_cascade))
            .map_err(from_storage)
    }

    async fn soft_delete_cascade(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        operation_id: &str,
        deleted_at: &str,
    ) -> Result<Option<SpaceCascadeRecord>, ApplicationError> {
        self.repository
            .soft_delete_cascade(connection, space_id, operation_id, deleted_at)
            .await
            .map(|record| record.map(map_cascade))
            .map_err(from_storage)
    }

    async fn restore_archive_cascade(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        operation_id: &str,
        updated_at: &str,
    ) -> Result<Option<SpaceCascadeRecord>, ApplicationError> {
        self.repository
            .restore_archive_cascade(connection, space_id, operation_id, updated_at)
            .await
            .map(|record| record.map(map_cascade))
            .map_err(from_storage)
    }

    async fn restore_deleted_cascade(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        operation_id: &str,
        updated_at: &str,
    ) -> Result<Option<SpaceCascadeRecord>, ApplicationError> {
        self.repository
            .restore_deleted_cascade(connection, space_id, operation_id, updated_at)
            .await
            .map(|record| record.map(map_cascade))
            .map_err(from_storage)
    }

    async fn permanently_delete_cascade(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        deleted_at: &str,
    ) -> Result<Option<SpaceCascadeRecord>, ApplicationError> {
        self.repository
            .permanently_delete_cascade(connection, space_id, deleted_at)
            .await
            .map(|record| record.map(map_cascade))
            .map_err(from_storage)
    }

    async fn enqueue(
        &self,
        connection: &Self::Connection,
        record: &OutboxEnqueueRecord,
    ) -> Result<(), ApplicationError> {
        self.outbox
            .enqueue_in_connection(connection, record)
            .await
            .map_err(from_storage)
    }
}

fn map_cascade(record: SpaceCascadeResult) -> SpaceCascadeRecord {
    SpaceCascadeRecord {
        space: map_space(record.space),
        affected_project_count: record.affected_project_count,
        affected_task_count: record.affected_task_count,
    }
}

fn map_space(model: space::Model) -> SpaceRecord {
    SpaceRecord {
        id: model.id,
        name: model.name,
        icon_key: model.icon_key,
        color_key: model.color_key,
        is_default: model.is_default,
        position: model.position,
        generation: model.generation,
        archived_at: model.archived_at,
        deleted_at: model.deleted_at,
        archived_by_operation_id: model.archived_by_operation_id,
        deleted_by_operation_id: model.deleted_by_operation_id,
        created_at: model.created_at,
        updated_at: model.updated_at,
    }
}

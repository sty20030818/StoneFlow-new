//! Space Service：CRUD 真源在 `stoneflow-application`；无 mutation 双写。

use sea_orm::{
    ColumnTrait, DatabaseConnection, DatabaseTransaction, EntityTrait, PaginatorTrait, QueryFilter,
    TransactionTrait,
};
use stoneflow_application::{
    operation::OutboxEnqueueRecord,
    space::{
        CreateSpacePersistenceRecord, SpaceCascadeRecord, SpacePersistence, SpaceRecord,
        SpaceService as SpaceUsecase, UpdateSpacePatch as AppUpdateSpacePatch,
    },
};
use stoneflow_storage::{
    entities::space,
    repositories::{
        CreateSpaceRecord, OutboxRepository, SpaceCascadeResult, SpaceRepository, UpdateSpacePatch,
    },
};

use crate::app::error::AppError;

pub use stoneflow_application::space::{
    CreateSpaceInput, SetDefaultSpaceInput, SpaceDto, SpaceIdInput, SpaceLifecycleResult,
    UpdateSpaceInput,
};

type InnerSpaceService = SpaceUsecase<SpacePersistenceAdapter>;

pub struct SpaceService {
    inner: InnerSpaceService,
    repository: SpaceRepository,
}

impl SpaceService {
    pub fn new(repository: SpaceRepository) -> Self {
        Self {
            inner: SpaceUsecase::new(SpacePersistenceAdapter::new(repository.clone())),
            repository,
        }
    }

    pub async fn list_visible_spaces(&self) -> Result<Vec<SpaceDto>, AppError> {
        self.inner
            .list_visible_spaces()
            .await
            .map_err(AppError::from)
    }

    pub async fn get_space(&self, input: SpaceIdInput) -> Result<SpaceDto, AppError> {
        self.inner.get_space(input).await.map_err(AppError::from)
    }

    pub async fn create_space(&self, input: CreateSpaceInput) -> Result<SpaceDto, AppError> {
        self.inner.create_space(input).await.map_err(AppError::from)
    }

    pub async fn update_space(&self, input: UpdateSpaceInput) -> Result<SpaceDto, AppError> {
        self.inner.update_space(input).await.map_err(AppError::from)
    }

    pub async fn set_default_space(
        &self,
        input: SetDefaultSpaceInput,
    ) -> Result<SpaceDto, AppError> {
        self.inner
            .set_default_space(input)
            .await
            .map_err(AppError::from)
    }

    pub async fn archive_space(
        &self,
        input: SpaceIdInput,
    ) -> Result<SpaceLifecycleResult, AppError> {
        self.inner
            .archive_space(input)
            .await
            .map_err(AppError::from)
    }

    pub async fn restore_space(
        &self,
        input: SpaceIdInput,
    ) -> Result<SpaceLifecycleResult, AppError> {
        self.inner
            .restore_space(input)
            .await
            .map_err(AppError::from)
    }

    pub async fn delete_space(
        &self,
        input: SpaceIdInput,
    ) -> Result<SpaceLifecycleResult, AppError> {
        self.inner.delete_space(input).await.map_err(AppError::from)
    }

    pub async fn permanently_delete_space(
        &self,
        input: SpaceIdInput,
    ) -> Result<SpaceLifecycleResult, AppError> {
        self.inner
            .permanently_delete_space(input)
            .await
            .map_err(AppError::from)
    }

    #[allow(dead_code)]
    pub fn repository(&self) -> &SpaceRepository {
        &self.repository
    }
}

#[derive(Debug, Clone)]
struct SpacePersistenceAdapter {
    repository: SpaceRepository,
    outbox: OutboxRepository,
}

impl SpacePersistenceAdapter {
    fn new(repository: SpaceRepository) -> Self {
        Self {
            outbox: OutboxRepository::new(repository.connection().clone()),
            repository,
        }
    }
}

impl SpacePersistence for SpacePersistenceAdapter {
    type Connection = DatabaseTransaction;

    async fn begin(&self) -> Result<Self::Connection, stoneflow_application::ApplicationError> {
        self.repository
            .connection()
            .begin()
            .await
            .map_err(|error| stoneflow_application::ApplicationError::storage(error.to_string()))
    }

    async fn commit(
        &self,
        connection: Self::Connection,
    ) -> Result<(), stoneflow_application::ApplicationError> {
        connection
            .commit()
            .await
            .map_err(|error| stoneflow_application::ApplicationError::storage(error.to_string()))
    }

    async fn list_visible(
        &self,
    ) -> Result<Vec<SpaceRecord>, stoneflow_application::ApplicationError> {
        self.repository
            .list_visible()
            .await
            .map(|rows| rows.into_iter().map(map_space).collect())
            .map_err(|error| stoneflow_application::ApplicationError::storage(error.to_string()))
    }

    async fn get_in_connection(
        &self,
        connection: &Self::Connection,
        space_id: &str,
    ) -> Result<Option<SpaceRecord>, stoneflow_application::ApplicationError> {
        self.repository
            .get_in_connection(connection, space_id)
            .await
            .map(|row| row.map(map_space))
            .map_err(|error| stoneflow_application::ApplicationError::storage(error.to_string()))
    }

    async fn has_active(
        &self,
        connection: &Self::Connection,
    ) -> Result<bool, stoneflow_application::ApplicationError> {
        stoneflow_storage::entities::prelude::Space::find()
            .filter(space::Column::ArchivedAt.is_null())
            .filter(space::Column::DeletedAt.is_null())
            .count(connection)
            .await
            .map(|count| count > 0)
            .map_err(|error| stoneflow_application::ApplicationError::storage(error.to_string()))
    }

    async fn get(
        &self,
        space_id: &str,
    ) -> Result<Option<SpaceRecord>, stoneflow_application::ApplicationError> {
        self.repository
            .get(space_id)
            .await
            .map(|row| row.map(map_space))
            .map_err(|error| stoneflow_application::ApplicationError::storage(error.to_string()))
    }

    async fn next_position(
        &self,
        connection: &Self::Connection,
    ) -> Result<i64, stoneflow_application::ApplicationError> {
        self.repository
            .next_position(connection)
            .await
            .map_err(|error| stoneflow_application::ApplicationError::storage(error.to_string()))
    }

    async fn create(
        &self,
        connection: &Self::Connection,
        record: CreateSpacePersistenceRecord,
    ) -> Result<SpaceRecord, stoneflow_application::ApplicationError> {
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
            .map_err(|error| stoneflow_application::ApplicationError::storage(error.to_string()))
    }

    async fn update(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        patch: AppUpdateSpacePatch,
        updated_at: &str,
    ) -> Result<Option<SpaceRecord>, stoneflow_application::ApplicationError> {
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
            .map_err(|error| stoneflow_application::ApplicationError::storage(error.to_string()))
    }

    async fn clear_default(
        &self,
        connection: &Self::Connection,
        updated_at: &str,
    ) -> Result<(), stoneflow_application::ApplicationError> {
        self.repository
            .clear_default(connection, updated_at)
            .await
            .map(|_| ())
            .map_err(|error| stoneflow_application::ApplicationError::storage(error.to_string()))
    }

    async fn set_default(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        updated_at: &str,
    ) -> Result<Option<SpaceRecord>, stoneflow_application::ApplicationError> {
        self.repository
            .set_default(connection, space_id, updated_at)
            .await
            .map(|row| row.map(map_space))
            .map_err(|error| stoneflow_application::ApplicationError::storage(error.to_string()))
    }

    async fn list_active_except(
        &self,
        connection: &Self::Connection,
        excluded_space_id: &str,
    ) -> Result<Vec<SpaceRecord>, stoneflow_application::ApplicationError> {
        self.repository
            .list_active_except(connection, excluded_space_id)
            .await
            .map(|rows| rows.into_iter().map(map_space).collect())
            .map_err(|error| stoneflow_application::ApplicationError::storage(error.to_string()))
    }

    async fn archive_cascade(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        operation_id: &str,
        archived_at: &str,
    ) -> Result<Option<SpaceCascadeRecord>, stoneflow_application::ApplicationError> {
        self.repository
            .archive_cascade(connection, space_id, operation_id, archived_at)
            .await
            .map(|record| record.map(map_cascade))
            .map_err(|error| stoneflow_application::ApplicationError::storage(error.to_string()))
    }

    async fn soft_delete_cascade(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        operation_id: &str,
        deleted_at: &str,
    ) -> Result<Option<SpaceCascadeRecord>, stoneflow_application::ApplicationError> {
        self.repository
            .soft_delete_cascade(connection, space_id, operation_id, deleted_at)
            .await
            .map(|record| record.map(map_cascade))
            .map_err(|error| stoneflow_application::ApplicationError::storage(error.to_string()))
    }

    async fn restore_archive_cascade(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        operation_id: &str,
        updated_at: &str,
    ) -> Result<Option<SpaceCascadeRecord>, stoneflow_application::ApplicationError> {
        self.repository
            .restore_archive_cascade(connection, space_id, operation_id, updated_at)
            .await
            .map(|record| record.map(map_cascade))
            .map_err(|error| stoneflow_application::ApplicationError::storage(error.to_string()))
    }

    async fn restore_deleted_cascade(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        operation_id: &str,
        updated_at: &str,
    ) -> Result<Option<SpaceCascadeRecord>, stoneflow_application::ApplicationError> {
        self.repository
            .restore_deleted_cascade(connection, space_id, operation_id, updated_at)
            .await
            .map(|record| record.map(map_cascade))
            .map_err(|error| stoneflow_application::ApplicationError::storage(error.to_string()))
    }

    async fn permanently_delete_cascade(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        deleted_at: &str,
    ) -> Result<Option<SpaceCascadeRecord>, stoneflow_application::ApplicationError> {
        self.repository
            .permanently_delete_cascade(connection, space_id, deleted_at)
            .await
            .map(|record| record.map(map_cascade))
            .map_err(|error| stoneflow_application::ApplicationError::storage(error.to_string()))
    }

    async fn enqueue(
        &self,
        connection: &Self::Connection,
        record: &OutboxEnqueueRecord,
    ) -> Result<(), stoneflow_application::ApplicationError> {
        self.outbox
            .enqueue_in_connection(connection, record)
            .await
            .map_err(|error| stoneflow_application::ApplicationError::storage(error.to_string()))
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

// 抑制未使用 DatabaseConnection 告警路径
#[allow(dead_code)]
fn _keep_connection_type(_: &DatabaseConnection) {}

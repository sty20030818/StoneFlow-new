//! Space Service：CRUD 真源在 `stoneflow-application`；无 mutation 双写。

use sea_orm::{DatabaseConnection, DatabaseTransaction, TransactionTrait};
use stoneflow_application::{
    activity::ActivityService as ActivityUsecase,
    space::{
        CreateSpacePersistenceRecord, SpacePersistence, SpaceRecord, SpaceService as SpaceUsecase,
        UpdateSpacePatch as AppUpdateSpacePatch,
    },
};
use stoneflow_storage::{
    entities::space,
    repositories::{CreateSpaceRecord, SpaceRepository, UpdateSpacePatch},
};

use crate::{app::error::AppError, services::activity::ActivityPersistenceAdapter};

pub use stoneflow_application::space::{
    CreateSpaceInput, SetDefaultSpaceInput, SpaceDto, SpaceIdInput, UpdateSpaceInput,
};

type InnerSpaceService = SpaceUsecase<SpacePersistenceAdapter, ActivityPersistenceAdapter>;

pub struct SpaceService {
    inner: InnerSpaceService,
    repository: SpaceRepository,
}

impl SpaceService {
    pub fn new(repository: SpaceRepository) -> Self {
        let activity = ActivityUsecase::new(ActivityPersistenceAdapter::new(
            repository.connection().clone(),
        ));
        Self {
            inner: SpaceUsecase::new(SpacePersistenceAdapter::new(repository.clone()), activity),
            repository,
        }
    }

    pub async fn list_visible_spaces(&self) -> Result<Vec<SpaceDto>, AppError> {
        self.inner
            .list_visible_spaces()
            .await
            .map_err(AppError::from)
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

    pub async fn archive_space(&self, _input: SpaceIdInput) -> Result<SpaceDto, AppError> {
        Err(AppError::internal(
            "R2：Space archive 尚未接入 lifecycle 写路径",
        ))
    }

    pub async fn restore_space(&self, _input: SpaceIdInput) -> Result<SpaceDto, AppError> {
        Err(AppError::internal(
            "R2：Space restore 尚未接入 lifecycle 写路径",
        ))
    }

    pub async fn delete_space(&self, _input: SpaceIdInput) -> Result<SpaceDto, AppError> {
        Err(AppError::internal(
            "R2：Space delete 尚未接入 outbox/tombstone 写路径",
        ))
    }

    #[allow(dead_code)]
    pub fn repository(&self) -> &SpaceRepository {
        &self.repository
    }
}

#[derive(Debug, Clone)]
struct SpacePersistenceAdapter {
    repository: SpaceRepository,
}

impl SpacePersistenceAdapter {
    fn new(repository: SpaceRepository) -> Self {
        Self { repository }
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
        created_at: model.created_at,
        updated_at: model.updated_at,
    }
}

// 抑制未使用 DatabaseConnection 告警路径
#[allow(dead_code)]
fn _keep_connection_type(_: &DatabaseConnection) {}

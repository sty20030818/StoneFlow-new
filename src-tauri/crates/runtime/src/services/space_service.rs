//! Space Service 兼容壳：CRUD 真源在 `stoneflow-usecase`；生命周期仍委托 `LifecycleService`。

use serde::Serialize;
use sea_orm::TransactionTrait;
use stoneflow_usecase::{
    activity::ActivityService as ActivityUsecase,
    space::{SpacePersistence, SpaceRecord, SpaceService as SpaceUsecase},
};

use crate::{
    app::error::AppError,
    services::{
        activity::ActivityPersistenceAdapter,
        sync_outbox::build_upsert_record,
        LifecycleService,
    },
};
use stoneflow_storage::{
    mappers::map_space_model_to_record,
    repositories::{
        CreateSpaceRecord, ProjectRepository, SpaceRepository, SyncRepository, TaskRepository,
        UpdateSpacePatch,
    },
};

pub use stoneflow_usecase::space::{
    CreateSpaceInput, SetDefaultSpaceInput, SpaceDto, SpaceIdInput, UpdateSpaceInput,
};

/// Space 编排兼容壳。
#[derive(Debug, Clone)]
pub struct SpaceService {
    inner: SpaceUsecase<SpacePersistenceAdapter, ActivityPersistenceAdapter>,
    repository: SpaceRepository,
    sync_repository: SyncRepository,
    project_repository: ProjectRepository,
    task_repository: TaskRepository,
    activity_service: crate::services::activity::ActivityService,
}

impl SpaceService {
    pub fn new(
        repository: SpaceRepository,
        sync_repository: SyncRepository,
        project_repository: ProjectRepository,
        task_repository: TaskRepository,
        activity_service: crate::services::activity::ActivityService,
    ) -> Self {
        let activity_repo = activity_service.repository().clone();
        Self {
            inner: SpaceUsecase::new(
                SpacePersistenceAdapter::new(repository.clone(), sync_repository.clone()),
                ActivityUsecase::new(ActivityPersistenceAdapter::new(activity_repo)),
            ),
            repository,
            sync_repository,
            project_repository,
            task_repository,
            activity_service,
        }
    }

    pub fn repository(&self) -> &SpaceRepository {
        &self.repository
    }

    fn lifecycle_service(&self) -> LifecycleService {
        LifecycleService::new(
            self.repository.clone(),
            self.sync_repository.clone(),
            self.project_repository.clone(),
            self.task_repository.clone(),
            self.activity_service.clone(),
        )
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

    pub async fn archive_space(&self, input: SpaceIdInput) -> Result<SpaceDto, AppError> {
        let space_id =
            stoneflow_domain::validate_space_id(&input.space_id).map_err(AppError::from)?;
        let updated = self.lifecycle_service().archive_space(&space_id).await?;
        Ok(SpaceDto::from(updated))
    }

    pub async fn restore_space(&self, input: SpaceIdInput) -> Result<SpaceDto, AppError> {
        let space_id =
            stoneflow_domain::validate_space_id(&input.space_id).map_err(AppError::from)?;
        let restored = self.lifecycle_service().restore_space(&space_id).await?;
        Ok(SpaceDto::from(restored))
    }

    pub async fn delete_space(&self, input: SpaceIdInput) -> Result<SpaceDto, AppError> {
        let space_id =
            stoneflow_domain::validate_space_id(&input.space_id).map_err(AppError::from)?;
        let updated = self.lifecycle_service().delete_space(&space_id).await?;
        Ok(SpaceDto::from(updated))
    }
}

#[derive(Debug, Clone)]
struct SpacePersistenceAdapter {
    repository: SpaceRepository,
    sync_repository: SyncRepository,
}

impl SpacePersistenceAdapter {
    fn new(repository: SpaceRepository, sync_repository: SyncRepository) -> Self {
        Self {
            repository,
            sync_repository,
        }
    }
}

impl SpacePersistence for SpacePersistenceAdapter {
    type Connection = sea_orm::DatabaseTransaction;

    async fn begin(&self) -> Result<Self::Connection, stoneflow_usecase::UsecaseError> {
        self.repository
            .connection()
            .begin()
            .await
            .map_err(map_db_error)
    }

    async fn commit(
        &self,
        connection: Self::Connection,
    ) -> Result<(), stoneflow_usecase::UsecaseError> {
        connection.commit().await.map_err(map_db_error)
    }

    async fn list_visible(
        &self,
    ) -> Result<Vec<stoneflow_usecase::space::SpaceRecord>, stoneflow_usecase::UsecaseError> {
        self.repository
            .list_visible()
            .await
            .map(|spaces| spaces.into_iter().map(map_space_model_to_record).collect())
            .map_err(|error| map_app_error(error.into()))
    }

    async fn get(
        &self,
        space_id: &str,
    ) -> Result<Option<stoneflow_usecase::space::SpaceRecord>, stoneflow_usecase::UsecaseError>
    {
        self.repository
            .get(space_id)
            .await
            .map(|space| space.map(map_space_model_to_record))
            .map_err(|error| map_app_error(error.into()))
    }

    async fn next_sort_order(
        &self,
        connection: &Self::Connection,
    ) -> Result<i32, stoneflow_usecase::UsecaseError> {
        self.repository
            .next_sort_order(connection)
            .await
            .map_err(|error| map_app_error(error.into()))
    }

    async fn create(
        &self,
        connection: &Self::Connection,
        record: stoneflow_usecase::space::CreateSpacePersistenceRecord,
    ) -> Result<stoneflow_usecase::space::SpaceRecord, stoneflow_usecase::UsecaseError> {
        let space = self
            .repository
            .create(
                connection,
                CreateSpaceRecord {
                    id: record.id,
                    name: record.name,
                    icon_key: record.icon_key,
                    color_key: record.color_key,
                    is_default: record.is_default,
                    sort_order: record.sort_order,
                    created_at: record.created_at,
                    updated_at: record.updated_at,
                },
            )
            .await
            .map(map_space_model_to_record)
            .map_err(|error| map_app_error(error.into()))?;
        let outbox_record = build_space_outbox_record(&space).map_err(map_app_error)?;
        self.sync_repository
            .insert_outbox_record(connection, &outbox_record)
            .await
            .map_err(|error| map_app_error(error.into()))?;

        Ok(space)
    }

    async fn update(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        patch: stoneflow_usecase::space::UpdateSpacePatch,
        updated_at: &str,
    ) -> Result<Option<stoneflow_usecase::space::SpaceRecord>, stoneflow_usecase::UsecaseError>
    {
        let space = self
            .repository
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
            .map(|space| space.map(map_space_model_to_record))
            .map_err(|error| map_app_error(error.into()))?;

        if let Some(space) = space.as_ref() {
            let outbox_record = build_space_outbox_record(space).map_err(map_app_error)?;
            self.sync_repository
                .insert_outbox_record(connection, &outbox_record)
                .await
                .map_err(|error| map_app_error(error.into()))?;
        }

        Ok(space)
    }

    async fn clear_default(
        &self,
        connection: &Self::Connection,
        updated_at: &str,
    ) -> Result<(), stoneflow_usecase::UsecaseError> {
        self.repository
            .clear_default(connection, updated_at)
            .await
            .map(|_| ())
            .map_err(|error| map_app_error(error.into()))
    }

    async fn set_default(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        updated_at: &str,
    ) -> Result<Option<stoneflow_usecase::space::SpaceRecord>, stoneflow_usecase::UsecaseError>
    {
        let space = self
            .repository
            .set_default(connection, space_id, updated_at)
            .await
            .map(|space| space.map(map_space_model_to_record))
            .map_err(|error| map_app_error(error.into()))?;

        if let Some(space) = space.as_ref() {
            let outbox_record = build_space_outbox_record(space).map_err(map_app_error)?;
            self.sync_repository
                .insert_outbox_record(connection, &outbox_record)
                .await
                .map_err(|error| map_app_error(error.into()))?;
        }

        Ok(space)
    }
}

#[derive(Debug, Serialize)]
struct SpaceSyncPayload<'a> {
    id: &'a str,
    name: &'a str,
    icon_key: &'a str,
    color_key: &'a str,
    is_default: bool,
    sort_order: i32,
    archived_at: Option<&'a str>,
    deleted_at: Option<&'a str>,
    created_at: &'a str,
    updated_at: &'a str,
}

impl<'a> From<&'a SpaceRecord> for SpaceSyncPayload<'a> {
    fn from(space: &'a SpaceRecord) -> Self {
        Self {
            id: &space.id,
            name: &space.name,
            icon_key: &space.icon_key,
            color_key: &space.color_key,
            is_default: space.is_default,
            sort_order: space.sort_order,
            archived_at: space.archived_at.as_deref(),
            deleted_at: space.deleted_at.as_deref(),
            created_at: &space.created_at,
            updated_at: &space.updated_at,
        }
    }
}

fn build_space_outbox_record(
    space: &SpaceRecord,
) -> Result<stoneflow_storage::repositories::SyncOutboxRecord, AppError> {
    build_upsert_record("space", &space.id, &SpaceSyncPayload::from(space), &space.updated_at)
}

fn map_db_error(error: sea_orm::DbErr) -> stoneflow_usecase::UsecaseError {
    map_app_error(AppError::from(error))
}

fn map_app_error(error: AppError) -> stoneflow_usecase::UsecaseError {
    match error {
        AppError::Validation(message) => stoneflow_usecase::UsecaseError::validation(message),
        AppError::NotFound(message) => stoneflow_usecase::UsecaseError::not_found(message),
        AppError::Conflict(message) => stoneflow_usecase::UsecaseError::conflict(message),
        AppError::Database(message) => stoneflow_usecase::UsecaseError::storage(message),
        AppError::Initialization(message) => {
            stoneflow_usecase::UsecaseError::initialization(message)
        }
        AppError::Internal(message)
        | AppError::Forbidden(message)
        | AppError::CaptureSpaceUnavailable(message)
        | AppError::DefaultSpaceUnavailable(message)
        | AppError::CapturePersistence(message) => {
            stoneflow_usecase::UsecaseError::internal(message)
        }
    }
}

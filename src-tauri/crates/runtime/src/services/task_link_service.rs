//! Task Link Service 兼容壳：真源在 `stoneflow-application`。

use sea_orm::TransactionTrait;
use serde::Serialize;
use stoneflow_application::{
    activity::ActivityService as ActivityUsecase,
    task_link::{
        TaskLinkPersistence, TaskLinkRecord, TaskLinkService as TaskLinkUsecase, TaskLinkTaskReader,
    },
};

use crate::{
    app::error::AppError,
    services::{
        activity::ActivityPersistenceAdapter,
        sync_mutation::{build_hard_delete_record, build_upsert_record},
    },
};
use stoneflow_storage::{
    mappers::{map_task_link_model_to_record, map_task_model_to_link_task_record},
    repositories::{
        CreateTaskLinkRecord, SyncRepository, TaskLinkRepository, TaskRepository,
        UpdateTaskLinkPatch,
    },
};

pub use stoneflow_application::task_link::{
    CreateTaskLinkInput, DeleteTaskLinkInput, ListTaskLinksInput, TaskLinkDto, UpdateTaskLinkInput,
};

/// Task Link 编排兼容壳。
#[derive(Debug, Clone)]
pub struct TaskLinkService {
    inner: TaskLinkUsecase<
        TaskLinkPersistenceAdapter,
        ActivityPersistenceAdapter,
        TaskLinkTaskReaderAdapter,
    >,
}

impl TaskLinkService {
    pub fn new(
        task_repository: TaskRepository,
        repository: TaskLinkRepository,
        sync_repository: SyncRepository,
        activity_service: crate::services::activity::ActivityService,
    ) -> Self {
        let activity_repo = activity_service.repository().clone();
        Self {
            inner: TaskLinkUsecase::new(
                TaskLinkPersistenceAdapter::new(repository, sync_repository),
                ActivityUsecase::new(ActivityPersistenceAdapter::new(activity_repo)),
                TaskLinkTaskReaderAdapter::new(task_repository),
            ),
        }
    }

    pub async fn list_task_links(
        &self,
        input: ListTaskLinksInput,
    ) -> Result<Vec<TaskLinkDto>, AppError> {
        self.inner
            .list_task_links(input)
            .await
            .map_err(AppError::from)
    }

    pub async fn create_task_link(
        &self,
        input: CreateTaskLinkInput,
    ) -> Result<TaskLinkDto, AppError> {
        self.inner
            .create_task_link(input)
            .await
            .map_err(AppError::from)
    }

    pub async fn update_task_link(
        &self,
        input: UpdateTaskLinkInput,
    ) -> Result<TaskLinkDto, AppError> {
        self.inner
            .update_task_link(input)
            .await
            .map_err(AppError::from)
    }

    pub async fn delete_task_link(
        &self,
        input: DeleteTaskLinkInput,
    ) -> Result<TaskLinkDto, AppError> {
        self.inner
            .delete_task_link(input)
            .await
            .map_err(AppError::from)
    }
}

#[derive(Debug, Clone)]
struct TaskLinkPersistenceAdapter {
    repository: TaskLinkRepository,
    sync_repository: SyncRepository,
}

impl TaskLinkPersistenceAdapter {
    fn new(repository: TaskLinkRepository, sync_repository: SyncRepository) -> Self {
        Self {
            repository,
            sync_repository,
        }
    }
}

impl TaskLinkPersistence for TaskLinkPersistenceAdapter {
    type Connection = sea_orm::DatabaseTransaction;

    async fn begin(&self) -> Result<Self::Connection, stoneflow_application::ApplicationError> {
        self.repository
            .connection()
            .begin()
            .await
            .map_err(map_db_error)
    }

    async fn commit(
        &self,
        connection: Self::Connection,
    ) -> Result<(), stoneflow_application::ApplicationError> {
        connection.commit().await.map_err(map_db_error)
    }

    async fn get(
        &self,
        link_id: &str,
    ) -> Result<
        Option<stoneflow_application::task_link::TaskLinkRecord>,
        stoneflow_application::ApplicationError,
    > {
        self.repository
            .get(link_id)
            .await
            .map(|link| link.map(map_task_link_model_to_record))
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list_by_task(
        &self,
        task_id: &str,
    ) -> Result<
        Vec<stoneflow_application::task_link::TaskLinkRecord>,
        stoneflow_application::ApplicationError,
    > {
        self.repository
            .list_by_task(task_id)
            .await
            .map(|links| {
                links
                    .into_iter()
                    .map(map_task_link_model_to_record)
                    .collect()
            })
            .map_err(|error| map_app_error(error.into()))
    }

    async fn next_sort_order(
        &self,
        connection: &Self::Connection,
        task_id: &str,
    ) -> Result<i32, stoneflow_application::ApplicationError> {
        self.repository
            .next_sort_order(connection, task_id)
            .await
            .map_err(|error| map_app_error(error.into()))
    }

    async fn create(
        &self,
        connection: &Self::Connection,
        record: stoneflow_application::task_link::CreateTaskLinkPersistenceRecord,
    ) -> Result<
        stoneflow_application::task_link::TaskLinkRecord,
        stoneflow_application::ApplicationError,
    > {
        let link = self
            .repository
            .create(
                connection,
                CreateTaskLinkRecord {
                    id: record.id,
                    task_id: record.task_id,
                    title: record.title,
                    url: record.url,
                    sort_order: record.sort_order,
                    created_at: record.created_at,
                    updated_at: record.updated_at,
                },
            )
            .await
            .map(map_task_link_model_to_record)
            .map_err(|error| map_app_error(error.into()))?;
        let mutation_record =
            build_task_link_upsert_mutation_record(&link).map_err(map_app_error)?;
        self.sync_repository
            .insert_pending_mutation(connection, &mutation_record)
            .await
            .map_err(|error| map_app_error(error.into()))?;

        Ok(link)
    }

    async fn update(
        &self,
        connection: &Self::Connection,
        link_id: &str,
        patch: stoneflow_application::task_link::UpdateTaskLinkPatch,
        updated_at: &str,
    ) -> Result<
        Option<stoneflow_application::task_link::TaskLinkRecord>,
        stoneflow_application::ApplicationError,
    > {
        let link = self
            .repository
            .update(
                connection,
                link_id,
                UpdateTaskLinkPatch {
                    title: patch.title,
                    url: patch.url,
                },
                updated_at,
            )
            .await
            .map(|link| link.map(map_task_link_model_to_record))
            .map_err(|error| map_app_error(error.into()))?;

        if let Some(link) = link.as_ref() {
            let mutation_record =
                build_task_link_upsert_mutation_record(link).map_err(map_app_error)?;
            self.sync_repository
                .insert_pending_mutation(connection, &mutation_record)
                .await
                .map_err(|error| map_app_error(error.into()))?;
        }

        Ok(link)
    }

    async fn delete(
        &self,
        connection: &Self::Connection,
        link_id: &str,
    ) -> Result<bool, stoneflow_application::ApplicationError> {
        let current = self.get(link_id).await?;
        let deleted = self
            .repository
            .delete(connection, link_id)
            .await
            .map_err(|error| map_app_error(error.into()))?;

        if deleted {
            if let Some(current) = current.as_ref() {
                let mutation_record =
                    build_task_link_delete_mutation_record(current).map_err(map_app_error)?;
                self.sync_repository
                    .insert_pending_mutation(connection, &mutation_record)
                    .await
                    .map_err(|error| map_app_error(error.into()))?;
            }
        }

        Ok(deleted)
    }
}

#[derive(Debug, Serialize)]
struct TaskLinkSyncPayload<'a> {
    id: &'a str,
    task_id: &'a str,
    title: &'a str,
    url: &'a str,
    sort_order: i32,
    created_at: &'a str,
    updated_at: &'a str,
}

impl<'a> From<&'a TaskLinkRecord> for TaskLinkSyncPayload<'a> {
    fn from(link: &'a TaskLinkRecord) -> Self {
        Self {
            id: &link.id,
            task_id: &link.task_id,
            title: &link.title,
            url: &link.url,
            sort_order: link.sort_order,
            created_at: &link.created_at,
            updated_at: &link.updated_at,
        }
    }
}

fn build_task_link_upsert_mutation_record(
    link: &TaskLinkRecord,
) -> Result<stoneflow_storage::repositories::SyncMutationRecord, AppError> {
    build_upsert_record(
        "task_link",
        &link.id,
        &TaskLinkSyncPayload::from(link),
        &link.updated_at,
    )
}

fn build_task_link_delete_mutation_record(
    link: &TaskLinkRecord,
) -> Result<stoneflow_storage::repositories::SyncMutationRecord, AppError> {
    build_hard_delete_record(
        "task_link",
        &link.id,
        &TaskLinkSyncPayload::from(link),
        &link.updated_at,
    )
}

#[derive(Debug, Clone)]
struct TaskLinkTaskReaderAdapter {
    repository: TaskRepository,
}

impl TaskLinkTaskReaderAdapter {
    fn new(repository: TaskRepository) -> Self {
        Self { repository }
    }
}

impl TaskLinkTaskReader for TaskLinkTaskReaderAdapter {
    async fn get(
        &self,
        task_id: &str,
    ) -> Result<
        Option<stoneflow_application::task_link::TaskLinkTaskRecord>,
        stoneflow_application::ApplicationError,
    > {
        self.repository
            .get(task_id)
            .await
            .map(|task| task.map(map_task_model_to_link_task_record))
            .map_err(|error| map_app_error(error.into()))
    }
}

fn map_db_error(error: sea_orm::DbErr) -> stoneflow_application::ApplicationError {
    map_app_error(AppError::from(error))
}

fn map_app_error(error: AppError) -> stoneflow_application::ApplicationError {
    match error {
        AppError::Validation(message) => {
            stoneflow_application::ApplicationError::validation(message)
        }
        AppError::NotFound(message) => stoneflow_application::ApplicationError::not_found(message),
        AppError::Conflict(message) => stoneflow_application::ApplicationError::conflict(message),
        AppError::Database(message) => stoneflow_application::ApplicationError::storage(message),
        AppError::Initialization(message) => {
            stoneflow_application::ApplicationError::initialization(message)
        }
        AppError::DefaultSpaceUnavailable(message) => {
            stoneflow_application::ApplicationError::default_space_unavailable(message)
        }
        AppError::Internal(message)
        | AppError::Forbidden(message)
        | AppError::CaptureSpaceUnavailable(message)
        | AppError::CapturePersistence(message) => {
            stoneflow_application::ApplicationError::internal(message)
        }
    }
}

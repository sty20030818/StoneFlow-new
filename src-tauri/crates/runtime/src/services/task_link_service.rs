//! Task Link Service 兼容壳：真源在 `stoneflow-usecase`。

use sea_orm::TransactionTrait;
use stoneflow_usecase::{
    activity::ActivityService as ActivityUsecase,
    task_link::{TaskLinkPersistence, TaskLinkService as TaskLinkUsecase, TaskLinkTaskReader},
};

use crate::{app::error::AppError, services::activity::ActivityPersistenceAdapter};
use stoneflow_storage::{
    mappers::{map_task_link_model_to_record, map_task_model_to_link_task_record},
    repositories::{CreateTaskLinkRecord, TaskLinkRepository, TaskRepository, UpdateTaskLinkPatch},
};

pub use stoneflow_usecase::task_link::{
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
        activity_service: crate::services::activity::ActivityService,
    ) -> Self {
        let activity_repo = activity_service.repository().clone();
        Self {
            inner: TaskLinkUsecase::new(
                TaskLinkPersistenceAdapter::new(repository),
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
}

impl TaskLinkPersistenceAdapter {
    fn new(repository: TaskLinkRepository) -> Self {
        Self { repository }
    }
}

impl TaskLinkPersistence for TaskLinkPersistenceAdapter {
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

    async fn get(
        &self,
        link_id: &str,
    ) -> Result<Option<stoneflow_usecase::task_link::TaskLinkRecord>, stoneflow_usecase::UsecaseError>
    {
        self.repository
            .get(link_id)
            .await
            .map(|link| link.map(map_task_link_model_to_record))
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list_by_task(
        &self,
        task_id: &str,
    ) -> Result<Vec<stoneflow_usecase::task_link::TaskLinkRecord>, stoneflow_usecase::UsecaseError>
    {
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
    ) -> Result<i32, stoneflow_usecase::UsecaseError> {
        self.repository
            .next_sort_order(connection, task_id)
            .await
            .map_err(|error| map_app_error(error.into()))
    }

    async fn create(
        &self,
        connection: &Self::Connection,
        record: stoneflow_usecase::task_link::CreateTaskLinkPersistenceRecord,
    ) -> Result<stoneflow_usecase::task_link::TaskLinkRecord, stoneflow_usecase::UsecaseError> {
        self.repository
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
            .map_err(|error| map_app_error(error.into()))
    }

    async fn update(
        &self,
        connection: &Self::Connection,
        link_id: &str,
        patch: stoneflow_usecase::task_link::UpdateTaskLinkPatch,
        updated_at: &str,
    ) -> Result<Option<stoneflow_usecase::task_link::TaskLinkRecord>, stoneflow_usecase::UsecaseError>
    {
        self.repository
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
            .map_err(|error| map_app_error(error.into()))
    }

    async fn delete(
        &self,
        connection: &Self::Connection,
        link_id: &str,
    ) -> Result<bool, stoneflow_usecase::UsecaseError> {
        self.repository
            .delete(connection, link_id)
            .await
            .map_err(|error| map_app_error(error.into()))
    }
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
        Option<stoneflow_usecase::task_link::TaskLinkTaskRecord>,
        stoneflow_usecase::UsecaseError,
    > {
        self.repository
            .get(task_id)
            .await
            .map(|task| task.map(map_task_model_to_link_task_record))
            .map_err(|error| map_app_error(error.into()))
    }
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
        AppError::DefaultSpaceUnavailable(message) => {
            stoneflow_usecase::UsecaseError::default_space_unavailable(message)
        }
        AppError::Internal(message)
        | AppError::Forbidden(message)
        | AppError::CaptureSpaceUnavailable(message)
        | AppError::CapturePersistence(message) => {
            stoneflow_usecase::UsecaseError::internal(message)
        }
    }
}

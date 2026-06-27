//! Task Service 兼容壳：CRUD 真源在 `stoneflow-usecase`；生命周期仍委托 `LifecycleService`。

use sea_orm::TransactionTrait;
use stoneflow_domain::validate_task_id;
use stoneflow_usecase::{
    activity::ActivityService as ActivityUsecase,
    task::{
        TaskPersistence, TaskProjectReader, TaskRecord, TaskService as TaskUsecase,
        TaskSpaceReader,
    },
};

use crate::{
    app::error::AppError,
    services::{
        activity::ActivityPersistenceAdapter, sync_outbox::build_upsert_record,
        LifecycleService,
    },
};
use stoneflow_storage::{
    mappers::{
        map_project_model_to_task_project_record, map_space_model_to_task_space_record,
        map_task_model_to_record, task_status_to_schema,
    },
    repositories::{
        CreateTaskRecord, ProjectRepository, SpaceRepository, SyncRepository, TaskLifecycleView,
        TaskListQuery, TaskPlacementQuery, TaskRepository, UpdateTaskPatch,
    },
};

pub use stoneflow_usecase::task::{
    CreateTaskInput, CreateTaskPlacementInput, CreateTaskPlacementKind, ListTasksInput,
    ListTasksPlacementInput, ListTasksPlacementKind, TaskDetailDto, TaskIdInput, TaskListItemDto,
    TaskScopeInput, TaskScopeKind, UpdateTaskInput, UpdateTaskPlacementInput,
    UpdateTaskPlacementKind,
};

/// Task 编排兼容壳。
#[derive(Debug, Clone)]
pub struct TaskService {
    inner: TaskUsecase<
        TaskPersistenceAdapter,
        ActivityPersistenceAdapter,
        TaskSpaceReaderAdapter,
        TaskProjectReaderAdapter,
    >,
    space_repository: SpaceRepository,
    project_repository: ProjectRepository,
    repository: TaskRepository,
    activity_service: crate::services::activity::ActivityService,
}

impl TaskService {
    pub fn new(
        space_repository: SpaceRepository,
        project_repository: ProjectRepository,
        repository: TaskRepository,
        sync_repository: SyncRepository,
        activity_service: crate::services::activity::ActivityService,
    ) -> Self {
        let activity_repo = activity_service.repository().clone();
        Self {
            inner: TaskUsecase::new(
                TaskPersistenceAdapter::new(repository.clone(), sync_repository),
                ActivityUsecase::new(ActivityPersistenceAdapter::new(activity_repo)),
                TaskSpaceReaderAdapter::new(space_repository.clone()),
                TaskProjectReaderAdapter::new(project_repository.clone()),
            ),
            space_repository,
            project_repository,
            repository,
            activity_service,
        }
    }

    pub fn repository(&self) -> &TaskRepository {
        &self.repository
    }

    fn lifecycle_service(&self) -> LifecycleService {
        LifecycleService::new(
            self.space_repository.clone(),
            SyncRepository::new(self.repository.connection().clone()),
            self.project_repository.clone(),
            self.repository.clone(),
            self.activity_service.clone(),
        )
    }

    pub async fn list_tasks(
        &self,
        input: ListTasksInput,
    ) -> Result<Vec<TaskListItemDto>, AppError> {
        self.inner.list_tasks(input).await.map_err(AppError::from)
    }

    pub async fn get_task_detail(&self, input: TaskIdInput) -> Result<TaskDetailDto, AppError> {
        self.inner
            .get_task_detail(input)
            .await
            .map_err(AppError::from)
    }

    pub async fn create_task(&self, input: CreateTaskInput) -> Result<TaskDetailDto, AppError> {
        self.inner.create_task(input).await.map_err(AppError::from)
    }

    pub async fn update_task(&self, input: UpdateTaskInput) -> Result<TaskDetailDto, AppError> {
        self.inner.update_task(input).await.map_err(AppError::from)
    }

    pub async fn archive_task(&self, input: TaskIdInput) -> Result<TaskDetailDto, AppError> {
        let task_id = validate_task_id(&input.task_id).map_err(AppError::from)?;
        let updated = self.lifecycle_service().archive_task(&task_id).await?;
        self.inner
            .build_task_detail_from_record(updated)
            .await
            .map_err(AppError::from)
    }

    pub async fn restore_task(&self, input: TaskIdInput) -> Result<TaskDetailDto, AppError> {
        let task_id = validate_task_id(&input.task_id).map_err(AppError::from)?;
        let updated = self.lifecycle_service().restore_task(&task_id).await?;
        self.inner
            .build_task_detail_from_record(updated)
            .await
            .map_err(AppError::from)
    }

    pub async fn delete_task(&self, input: TaskIdInput) -> Result<TaskDetailDto, AppError> {
        let task_id = validate_task_id(&input.task_id).map_err(AppError::from)?;
        let updated = self.lifecycle_service().delete_task(&task_id).await?;
        self.inner
            .build_task_detail_from_record(updated)
            .await
            .map_err(AppError::from)
    }
}

#[derive(Debug, Clone)]
struct TaskPersistenceAdapter {
    repository: TaskRepository,
    sync_repository: SyncRepository,
}

impl TaskPersistenceAdapter {
    fn new(repository: TaskRepository, sync_repository: SyncRepository) -> Self {
        Self {
            repository,
            sync_repository,
        }
    }
}

impl TaskPersistence for TaskPersistenceAdapter {
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
        task_id: &str,
    ) -> Result<Option<stoneflow_usecase::task::TaskRecord>, stoneflow_usecase::UsecaseError> {
        self.repository
            .get(task_id)
            .await
            .map(|task| task.map(map_task_model_to_record))
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list(
        &self,
        query: stoneflow_usecase::task::TaskListQuery,
    ) -> Result<Vec<stoneflow_usecase::task::TaskRecord>, stoneflow_usecase::UsecaseError> {
        self.repository
            .list(TaskListQuery {
                space_id: query.space_id,
                placement: map_task_placement_to_repo(query.placement),
                lifecycle: map_task_lifecycle_to_repo(query.lifecycle),
            })
            .await
            .map(|tasks| tasks.into_iter().map(map_task_model_to_record).collect())
            .map_err(|error| map_app_error(error.into()))
    }

    async fn next_sort_order(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        project_id: Option<&str>,
    ) -> Result<i32, stoneflow_usecase::UsecaseError> {
        self.repository
            .next_sort_order(connection, space_id, project_id)
            .await
            .map_err(|error| map_app_error(error.into()))
    }

    async fn create(
        &self,
        connection: &Self::Connection,
        record: stoneflow_usecase::task::CreateTaskPersistenceRecord,
    ) -> Result<stoneflow_usecase::task::TaskRecord, stoneflow_usecase::UsecaseError> {
        let task = self
            .repository
            .create(
                connection,
                CreateTaskRecord {
                    id: record.id,
                    space_id: record.space_id,
                    project_id: record.project_id,
                    title: record.title,
                    note: record.note,
                    status: task_status_to_schema(record.status),
                    status_changed_at: record.status_changed_at,
                    priority: record.priority,
                    inbox_at: record.inbox_at,
                    due_at: record.due_at,
                    scheduled_at: record.scheduled_at,
                    reminder_at: record.reminder_at,
                    sort_order: record.sort_order,
                    completed_at: record.completed_at,
                    canceled_at: record.canceled_at,
                    created_at: record.created_at,
                    updated_at: record.updated_at,
                },
            )
            .await
            .map(map_task_model_to_record)
            .map_err(|error| map_app_error(error.into()))?;
        let outbox_record = build_task_outbox_record(&task).map_err(map_app_error)?;
        self.sync_repository
            .insert_outbox_record(connection, &outbox_record)
            .await
            .map_err(|error| map_app_error(error.into()))?;

        Ok(task)
    }

    async fn update(
        &self,
        connection: &Self::Connection,
        task_id: &str,
        patch: stoneflow_usecase::task::UpdateTaskPatch,
        updated_at: &str,
    ) -> Result<Option<stoneflow_usecase::task::TaskRecord>, stoneflow_usecase::UsecaseError> {
        let task = self
            .repository
            .update(
                connection,
                task_id,
                UpdateTaskPatch {
                    title: patch.title,
                    note: patch.note,
                    status: patch.status.map(task_status_to_schema),
                    status_changed_at: patch.status_changed_at,
                    priority: patch.priority,
                    space_id: patch.space_id,
                    project_id: patch.project_id,
                    inbox_at: patch.inbox_at,
                    due_at: patch.due_at,
                    scheduled_at: patch.scheduled_at,
                    reminder_at: patch.reminder_at,
                    sort_order: patch.sort_order,
                    completed_at: patch.completed_at,
                    canceled_at: patch.canceled_at,
                },
                updated_at,
            )
            .await
            .map(|task| task.map(map_task_model_to_record))
            .map_err(|error| map_app_error(error.into()))?;

        if let Some(task) = task.as_ref() {
            let outbox_record = build_task_outbox_record(task).map_err(map_app_error)?;
            self.sync_repository
                .insert_outbox_record(connection, &outbox_record)
                .await
                .map_err(|error| map_app_error(error.into()))?;
        }

        Ok(task)
    }
}

#[derive(Debug, Clone)]
struct TaskSpaceReaderAdapter {
    repository: SpaceRepository,
}

impl TaskSpaceReaderAdapter {
    fn new(repository: SpaceRepository) -> Self {
        Self { repository }
    }
}

impl TaskSpaceReader for TaskSpaceReaderAdapter {
    async fn get(
        &self,
        space_id: &str,
    ) -> Result<Option<stoneflow_usecase::task::TaskSpaceRecord>, stoneflow_usecase::UsecaseError>
    {
        self.repository
            .get(space_id)
            .await
            .map(|space| space.map(map_space_model_to_task_space_record))
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list_by_ids(
        &self,
        space_ids: &[String],
    ) -> Result<Vec<stoneflow_usecase::task::TaskSpaceRecord>, stoneflow_usecase::UsecaseError>
    {
        self.repository
            .list_by_ids(space_ids)
            .await
            .map(|spaces| {
                spaces
                    .into_iter()
                    .map(map_space_model_to_task_space_record)
                    .collect()
            })
            .map_err(|error| map_app_error(error.into()))
    }
}

#[derive(Debug, Clone)]
struct TaskProjectReaderAdapter {
    repository: ProjectRepository,
}

impl TaskProjectReaderAdapter {
    fn new(repository: ProjectRepository) -> Self {
        Self { repository }
    }
}

impl TaskProjectReader for TaskProjectReaderAdapter {
    async fn get(
        &self,
        project_id: &str,
    ) -> Result<Option<stoneflow_usecase::task::TaskProjectRecord>, stoneflow_usecase::UsecaseError>
    {
        self.repository
            .get(project_id)
            .await
            .map(|project| project.map(map_project_model_to_task_project_record))
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list_by_ids(
        &self,
        project_ids: &[String],
    ) -> Result<Vec<stoneflow_usecase::task::TaskProjectRecord>, stoneflow_usecase::UsecaseError>
    {
        self.repository
            .list_by_ids(project_ids)
            .await
            .map(|projects| {
                projects
                    .into_iter()
                    .map(map_project_model_to_task_project_record)
                    .collect()
            })
            .map_err(|error| map_app_error(error.into()))
    }
}

fn map_task_placement_to_repo(
    placement: stoneflow_usecase::task::TaskPlacementQuery,
) -> TaskPlacementQuery {
    match placement {
        stoneflow_usecase::task::TaskPlacementQuery::All => TaskPlacementQuery::All,
        stoneflow_usecase::task::TaskPlacementQuery::Project(project_id) => {
            TaskPlacementQuery::Project(project_id)
        }
        stoneflow_usecase::task::TaskPlacementQuery::Inbox => TaskPlacementQuery::Inbox,
        stoneflow_usecase::task::TaskPlacementQuery::NoProject => TaskPlacementQuery::NoProject,
    }
}

fn map_task_lifecycle_to_repo(
    lifecycle: stoneflow_usecase::task::TaskLifecycleView,
) -> TaskLifecycleView {
    match lifecycle {
        stoneflow_usecase::task::TaskLifecycleView::Active => TaskLifecycleView::Active,
        stoneflow_usecase::task::TaskLifecycleView::Completed => TaskLifecycleView::Completed,
        stoneflow_usecase::task::TaskLifecycleView::Canceled => TaskLifecycleView::Canceled,
        stoneflow_usecase::task::TaskLifecycleView::Archived => TaskLifecycleView::Archived,
        stoneflow_usecase::task::TaskLifecycleView::All => TaskLifecycleView::All,
    }
}

fn map_db_error(error: sea_orm::DbErr) -> stoneflow_usecase::UsecaseError {
    map_app_error(AppError::from(error))
}

#[derive(Debug, serde::Serialize)]
struct TaskSyncPayload<'a> {
    id: &'a str,
    space_id: &'a str,
    project_id: Option<&'a str>,
    title: &'a str,
    note: Option<&'a str>,
    status: stoneflow_domain::TaskStatus,
    status_changed_at: &'a str,
    priority: i32,
    inbox_at: Option<&'a str>,
    due_at: Option<&'a str>,
    scheduled_at: Option<&'a str>,
    reminder_at: Option<&'a str>,
    sort_order: i32,
    completed_at: Option<&'a str>,
    canceled_at: Option<&'a str>,
    archived_at: Option<&'a str>,
    deleted_at: Option<&'a str>,
    created_at: &'a str,
    updated_at: &'a str,
}

impl<'a> From<&'a TaskRecord> for TaskSyncPayload<'a> {
    fn from(task: &'a TaskRecord) -> Self {
        Self {
            id: &task.id,
            space_id: &task.space_id,
            project_id: task.project_id.as_deref(),
            title: &task.title,
            note: task.note.as_deref(),
            status: task.status,
            status_changed_at: &task.status_changed_at,
            priority: task.priority,
            inbox_at: task.inbox_at.as_deref(),
            due_at: task.due_at.as_deref(),
            scheduled_at: task.scheduled_at.as_deref(),
            reminder_at: task.reminder_at.as_deref(),
            sort_order: task.sort_order,
            completed_at: task.completed_at.as_deref(),
            canceled_at: task.canceled_at.as_deref(),
            archived_at: task.archived_at.as_deref(),
            deleted_at: task.deleted_at.as_deref(),
            created_at: &task.created_at,
            updated_at: &task.updated_at,
        }
    }
}

fn build_task_outbox_record(task: &TaskRecord) -> Result<stoneflow_storage::repositories::SyncOutboxRecord, AppError> {
    build_upsert_record("task", &task.id, &TaskSyncPayload::from(task), &task.updated_at)
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

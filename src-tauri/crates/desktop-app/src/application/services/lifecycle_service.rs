//! Lifecycle Service 兼容壳：Archive / Trash 真源在 `stoneflow-usecase`。

use sea_orm::TransactionTrait;
use stoneflow_usecase::{
    activity::ActivityService as ActivityUsecase,
    lifecycle::{
        LifecycleProjectPersistence, LifecycleService as LifecycleUsecase,
        LifecycleSpacePersistence, LifecycleTaskPersistence,
    },
    project::ProjectRecord,
    space::SpaceRecord,
    task::{TaskRecord, UpdateTaskPatch},
};

use crate::{
    app::error::AppError,
    application::activity::ActivityPersistenceAdapter,
    infrastructure::{
        mappers::{
            map_project_model_to_lifecycle_list_record, map_project_model_to_record,
            map_space_model_to_record, map_task_model_to_lifecycle_list_record,
            map_task_model_to_record, task_status_to_schema,
        },
        repositories::{
            ProjectRepository, SpaceRepository, TaskRepository, UpdateTaskPatch as RepoUpdateTaskPatch,
        },
    },
};

pub use stoneflow_usecase::lifecycle::{
    LifecycleEntityType, LifecycleEntry, LifecycleMode, LifecycleScopeInput, LifecycleScopeKind,
    ListLifecycleEntriesInput,
};

type InnerLifecycleService = LifecycleUsecase<
    LifecycleSpacePersistenceAdapter,
    LifecycleProjectPersistenceAdapter,
    LifecycleTaskPersistenceAdapter,
    ActivityPersistenceAdapter,
>;

/// Lifecycle 编排兼容壳。
#[derive(Debug, Clone)]
pub struct LifecycleService {
    inner: InnerLifecycleService,
}

impl LifecycleService {
    pub fn new(
        space_repository: SpaceRepository,
        project_repository: ProjectRepository,
        task_repository: TaskRepository,
        activity_service: crate::application::activity::ActivityService,
    ) -> Self {
        let activity_repo = activity_service.repository().clone();
        Self {
            inner: LifecycleUsecase::new(
                LifecycleSpacePersistenceAdapter::new(space_repository),
                LifecycleProjectPersistenceAdapter::new(project_repository),
                LifecycleTaskPersistenceAdapter::new(task_repository),
                ActivityUsecase::new(ActivityPersistenceAdapter::new(activity_repo)),
            ),
        }
    }

    pub async fn archive_space(&self, space_id: &str) -> Result<SpaceRecord, AppError> {
        self.inner
            .archive_space(space_id)
            .await
            .map_err(AppError::from)
    }

    pub async fn restore_space(&self, space_id: &str) -> Result<SpaceRecord, AppError> {
        self.inner
            .restore_space(space_id)
            .await
            .map_err(AppError::from)
    }

    pub async fn delete_space(&self, space_id: &str) -> Result<SpaceRecord, AppError> {
        self.inner
            .delete_space(space_id)
            .await
            .map_err(AppError::from)
    }

    pub async fn permanently_delete_space(&self, space_id: &str) -> Result<(), AppError> {
        self.inner
            .permanently_delete_space(space_id)
            .await
            .map_err(AppError::from)
    }

    pub async fn archive_project(&self, project_id: &str) -> Result<ProjectRecord, AppError> {
        self.inner
            .archive_project(project_id)
            .await
            .map_err(AppError::from)
    }

    pub async fn restore_project(&self, project_id: &str) -> Result<ProjectRecord, AppError> {
        self.inner
            .restore_project(project_id)
            .await
            .map_err(AppError::from)
    }

    pub async fn delete_project(&self, project_id: &str) -> Result<ProjectRecord, AppError> {
        self.inner
            .delete_project(project_id)
            .await
            .map_err(AppError::from)
    }

    pub async fn permanently_delete_project(&self, project_id: &str) -> Result<(), AppError> {
        self.inner
            .permanently_delete_project(project_id)
            .await
            .map_err(AppError::from)
    }

    pub async fn archive_task(&self, task_id: &str) -> Result<TaskRecord, AppError> {
        self.inner
            .archive_task(task_id)
            .await
            .map_err(AppError::from)
    }

    pub async fn restore_task(&self, task_id: &str) -> Result<TaskRecord, AppError> {
        self.inner
            .restore_task(task_id)
            .await
            .map_err(AppError::from)
    }

    pub async fn delete_task(&self, task_id: &str) -> Result<TaskRecord, AppError> {
        self.inner
            .delete_task(task_id)
            .await
            .map_err(AppError::from)
    }

    pub async fn permanently_delete_task(&self, task_id: &str) -> Result<(), AppError> {
        self.inner
            .permanently_delete_task(task_id)
            .await
            .map_err(AppError::from)
    }

    pub async fn list_archive_entries(
        &self,
        input: ListLifecycleEntriesInput,
    ) -> Result<Vec<LifecycleEntry>, AppError> {
        self.inner
            .list_archive_entries(input)
            .await
            .map_err(AppError::from)
    }

    pub async fn list_trash_entries(
        &self,
        input: ListLifecycleEntriesInput,
    ) -> Result<Vec<LifecycleEntry>, AppError> {
        self.inner
            .list_trash_entries(input)
            .await
            .map_err(AppError::from)
    }
}

#[derive(Debug, Clone)]
struct LifecycleSpacePersistenceAdapter {
    repository: SpaceRepository,
}

impl LifecycleSpacePersistenceAdapter {
    fn new(repository: SpaceRepository) -> Self {
        Self { repository }
    }
}

impl LifecycleSpacePersistence for LifecycleSpacePersistenceAdapter {
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
        space_id: &str,
    ) -> Result<Option<SpaceRecord>, stoneflow_usecase::UsecaseError> {
        self.repository
            .get(space_id)
            .await
            .map(|space| space.map(map_space_model_to_record))
            .map_err(|error| map_app_error(error.into()))
    }

    async fn get_default(&self) -> Result<Option<SpaceRecord>, stoneflow_usecase::UsecaseError> {
        self.repository
            .get_default()
            .await
            .map(|space| space.map(map_space_model_to_record))
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list_by_ids(
        &self,
        space_ids: &[String],
    ) -> Result<Vec<SpaceRecord>, stoneflow_usecase::UsecaseError> {
        self.repository
            .list_by_ids(space_ids)
            .await
            .map(|spaces| spaces.into_iter().map(map_space_model_to_record).collect())
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list_archived(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<SpaceRecord>, stoneflow_usecase::UsecaseError> {
        self.repository
            .list_archived(scope_space_id)
            .await
            .map(|spaces| spaces.into_iter().map(map_space_model_to_record).collect())
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list_deleted(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<SpaceRecord>, stoneflow_usecase::UsecaseError> {
        self.repository
            .list_deleted(scope_space_id)
            .await
            .map(|spaces| spaces.into_iter().map(map_space_model_to_record).collect())
            .map_err(|error| map_app_error(error.into()))
    }

    async fn archive_raw(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        archived_at: &str,
        updated_at: &str,
    ) -> Result<Option<SpaceRecord>, stoneflow_usecase::UsecaseError> {
        self.repository
            .archive_raw(connection, space_id, archived_at, updated_at)
            .await
            .map(|space| space.map(map_space_model_to_record))
            .map_err(|error| map_app_error(error.into()))
    }

    async fn restore_raw(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        updated_at: &str,
    ) -> Result<Option<SpaceRecord>, stoneflow_usecase::UsecaseError> {
        self.repository
            .restore_raw(connection, space_id, updated_at)
            .await
            .map(|space| space.map(map_space_model_to_record))
            .map_err(|error| map_app_error(error.into()))
    }

    async fn delete_raw(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        deleted_at: &str,
        updated_at: &str,
    ) -> Result<Option<SpaceRecord>, stoneflow_usecase::UsecaseError> {
        self.repository
            .delete_raw(connection, space_id, deleted_at, updated_at)
            .await
            .map(|space| space.map(map_space_model_to_record))
            .map_err(|error| map_app_error(error.into()))
    }

    async fn permanently_delete(
        &self,
        connection: &Self::Connection,
        space_id: &str,
    ) -> Result<(), stoneflow_usecase::UsecaseError> {
        self.repository
            .permanently_delete(connection, space_id)
            .await
            .map(|_| ())
            .map_err(|error| map_app_error(error.into()))
    }
}

#[derive(Debug, Clone)]
struct LifecycleProjectPersistenceAdapter {
    repository: ProjectRepository,
}

impl LifecycleProjectPersistenceAdapter {
    fn new(repository: ProjectRepository) -> Self {
        Self { repository }
    }
}

impl LifecycleProjectPersistence for LifecycleProjectPersistenceAdapter {
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
        project_id: &str,
    ) -> Result<Option<ProjectRecord>, stoneflow_usecase::UsecaseError> {
        self.repository
            .get(project_id)
            .await
            .map(|project| project.map(map_project_model_to_record))
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list_by_space(
        &self,
        space_id: &str,
    ) -> Result<Vec<ProjectRecord>, stoneflow_usecase::UsecaseError> {
        self.repository
            .list_by_space(space_id)
            .await
            .map(|projects| projects.into_iter().map(map_project_model_to_record).collect())
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list_by_ids(
        &self,
        project_ids: &[String],
    ) -> Result<Vec<ProjectRecord>, stoneflow_usecase::UsecaseError> {
        self.repository
            .list_by_ids(project_ids)
            .await
            .map(|projects| projects.into_iter().map(map_project_model_to_record).collect())
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list_archived(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<
        Vec<stoneflow_usecase::lifecycle::LifecycleProjectListRecord>,
        stoneflow_usecase::UsecaseError,
    > {
        self.repository
            .list_archived(scope_space_id)
            .await
            .map(|projects| {
                projects
                    .into_iter()
                    .map(map_project_model_to_lifecycle_list_record)
                    .collect()
            })
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list_deleted(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<
        Vec<stoneflow_usecase::lifecycle::LifecycleProjectListRecord>,
        stoneflow_usecase::UsecaseError,
    > {
        self.repository
            .list_deleted(scope_space_id)
            .await
            .map(|projects| {
                projects
                    .into_iter()
                    .map(map_project_model_to_lifecycle_list_record)
                    .collect()
            })
            .map_err(|error| map_app_error(error.into()))
    }

    async fn archive_raw(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        archived_at: &str,
        archived_by_id: &str,
        updated_at: &str,
    ) -> Result<Option<ProjectRecord>, stoneflow_usecase::UsecaseError> {
        self.repository
            .archive_raw(connection, project_id, archived_at, archived_by_id, updated_at)
            .await
            .map(|project| project.map(map_project_model_to_record))
            .map_err(|error| map_app_error(error.into()))
    }

    async fn restore_raw(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        updated_at: &str,
    ) -> Result<Option<ProjectRecord>, stoneflow_usecase::UsecaseError> {
        self.repository
            .restore_raw(connection, project_id, updated_at)
            .await
            .map(|project| project.map(map_project_model_to_record))
            .map_err(|error| map_app_error(error.into()))
    }

    async fn delete_raw(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        deleted_at: &str,
        deleted_by_id: &str,
        updated_at: &str,
    ) -> Result<Option<ProjectRecord>, stoneflow_usecase::UsecaseError> {
        self.repository
            .delete_raw(connection, project_id, deleted_at, deleted_by_id, updated_at)
            .await
            .map(|project| project.map(map_project_model_to_record))
            .map_err(|error| map_app_error(error.into()))
    }

    async fn permanently_delete(
        &self,
        connection: &Self::Connection,
        project_id: &str,
    ) -> Result<(), stoneflow_usecase::UsecaseError> {
        self.repository
            .permanently_delete(connection, project_id)
            .await
            .map(|_| ())
            .map_err(|error| map_app_error(error.into()))
    }

    async fn archive_by_space_raw(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        archived_at: &str,
        archived_by_id: &str,
        updated_at: &str,
    ) -> Result<(), stoneflow_usecase::UsecaseError> {
        self.repository
            .archive_by_space_raw(connection, space_id, archived_at, archived_by_id, updated_at)
            .await
            .map(|_| ())
            .map_err(|error| map_app_error(error.into()))
    }

    async fn delete_by_space_raw(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        deleted_at: &str,
        deleted_by_id: &str,
        updated_at: &str,
    ) -> Result<(), stoneflow_usecase::UsecaseError> {
        self.repository
            .delete_by_space_raw(connection, space_id, deleted_at, deleted_by_id, updated_at)
            .await
            .map(|_| ())
            .map_err(|error| map_app_error(error.into()))
    }
}

#[derive(Debug, Clone)]
struct LifecycleTaskPersistenceAdapter {
    repository: TaskRepository,
}

impl LifecycleTaskPersistenceAdapter {
    fn new(repository: TaskRepository) -> Self {
        Self { repository }
    }
}

impl LifecycleTaskPersistence for LifecycleTaskPersistenceAdapter {
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
    ) -> Result<Option<TaskRecord>, stoneflow_usecase::UsecaseError> {
        self.repository
            .get(task_id)
            .await
            .map(|task| task.map(map_task_model_to_record))
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list_by_space(
        &self,
        space_id: &str,
    ) -> Result<Vec<TaskRecord>, stoneflow_usecase::UsecaseError> {
        self.repository
            .list_by_space(space_id)
            .await
            .map(|tasks| tasks.into_iter().map(map_task_model_to_record).collect())
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list_by_project(
        &self,
        project_id: &str,
    ) -> Result<Vec<TaskRecord>, stoneflow_usecase::UsecaseError> {
        self.repository
            .list_by_project(project_id)
            .await
            .map(|tasks| tasks.into_iter().map(map_task_model_to_record).collect())
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list_archived(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<
        Vec<stoneflow_usecase::lifecycle::LifecycleTaskListRecord>,
        stoneflow_usecase::UsecaseError,
    > {
        self.repository
            .list_archived(scope_space_id)
            .await
            .map(|tasks| {
                tasks
                    .into_iter()
                    .map(map_task_model_to_lifecycle_list_record)
                    .collect()
            })
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list_deleted(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<
        Vec<stoneflow_usecase::lifecycle::LifecycleTaskListRecord>,
        stoneflow_usecase::UsecaseError,
    > {
        self.repository
            .list_deleted(scope_space_id)
            .await
            .map(|tasks| {
                tasks
                    .into_iter()
                    .map(map_task_model_to_lifecycle_list_record)
                    .collect()
            })
            .map_err(|error| map_app_error(error.into()))
    }

    async fn archive_raw(
        &self,
        connection: &Self::Connection,
        task_id: &str,
        archived_at: &str,
        archived_by_id: &str,
        updated_at: &str,
    ) -> Result<Option<TaskRecord>, stoneflow_usecase::UsecaseError> {
        self.repository
            .archive_raw(connection, task_id, archived_at, archived_by_id, updated_at)
            .await
            .map(|task| task.map(map_task_model_to_record))
            .map_err(|error| map_app_error(error.into()))
    }

    async fn restore_raw(
        &self,
        connection: &Self::Connection,
        task_id: &str,
        updated_at: &str,
    ) -> Result<Option<TaskRecord>, stoneflow_usecase::UsecaseError> {
        self.repository
            .restore_raw(connection, task_id, updated_at)
            .await
            .map(|task| task.map(map_task_model_to_record))
            .map_err(|error| map_app_error(error.into()))
    }

    async fn delete_raw(
        &self,
        connection: &Self::Connection,
        task_id: &str,
        deleted_at: &str,
        deleted_by_id: &str,
        updated_at: &str,
    ) -> Result<Option<TaskRecord>, stoneflow_usecase::UsecaseError> {
        self.repository
            .delete_raw(connection, task_id, deleted_at, deleted_by_id, updated_at)
            .await
            .map(|task| task.map(map_task_model_to_record))
            .map_err(|error| map_app_error(error.into()))
    }

    async fn permanently_delete(
        &self,
        connection: &Self::Connection,
        task_id: &str,
    ) -> Result<(), stoneflow_usecase::UsecaseError> {
        self.repository
            .permanently_delete(connection, task_id)
            .await
            .map(|_| ())
            .map_err(|error| map_app_error(error.into()))
    }

    async fn update(
        &self,
        connection: &Self::Connection,
        task_id: &str,
        patch: UpdateTaskPatch,
        updated_at: &str,
    ) -> Result<Option<TaskRecord>, stoneflow_usecase::UsecaseError> {
        self.repository
            .update(
                connection,
                task_id,
                RepoUpdateTaskPatch {
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
            .map_err(|error| map_app_error(error.into()))
    }

    async fn archive_by_space_raw(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        archived_at: &str,
        archived_by_id: &str,
        updated_at: &str,
    ) -> Result<(), stoneflow_usecase::UsecaseError> {
        self.repository
            .archive_by_space_raw(connection, space_id, archived_at, archived_by_id, updated_at)
            .await
            .map(|_| ())
            .map_err(|error| map_app_error(error.into()))
    }

    async fn delete_by_space_raw(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        deleted_at: &str,
        deleted_by_id: &str,
        updated_at: &str,
    ) -> Result<(), stoneflow_usecase::UsecaseError> {
        self.repository
            .delete_by_space_raw(connection, space_id, deleted_at, deleted_by_id, updated_at)
            .await
            .map(|_| ())
            .map_err(|error| map_app_error(error.into()))
    }

    async fn archive_by_project_raw(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        archived_at: &str,
        archived_by_id: &str,
        updated_at: &str,
    ) -> Result<(), stoneflow_usecase::UsecaseError> {
        self.repository
            .archive_by_project_raw(connection, project_id, archived_at, archived_by_id, updated_at)
            .await
            .map(|_| ())
            .map_err(|error| map_app_error(error.into()))
    }

    async fn delete_by_project_raw(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        deleted_at: &str,
        deleted_by_id: &str,
        updated_at: &str,
    ) -> Result<(), stoneflow_usecase::UsecaseError> {
        self.repository
            .delete_by_project_raw(connection, project_id, deleted_at, deleted_by_id, updated_at)
            .await
            .map(|_| ())
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

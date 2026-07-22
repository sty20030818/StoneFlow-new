//! Lifecycle Service 兼容壳：Archive / Trash 真源在 `stoneflow-application`。

use sea_orm::TransactionTrait;
use serde::Serialize;
use stoneflow_application::{
    activity::ActivityService as ActivityUsecase,
    lifecycle::{
        LifecycleProjectPersistence, LifecycleService as LifecycleUsecase,
        LifecycleSpacePersistence, LifecycleSyncHook, LifecycleTaskPersistence,
    },
    project::ProjectRecord,
    space::SpaceRecord,
    task::{TaskRecord, UpdateTaskPatch},
};

use crate::{
    app::error::AppError,
    services::{
        activity::ActivityPersistenceAdapter,
        sync_mutation::{build_delete_record, build_upsert_record},
    },
};
use stoneflow_storage::{
    mappers::{
        map_project_model_to_lifecycle_list_record, map_project_model_to_record,
        map_space_model_to_record, map_task_model_to_lifecycle_list_record,
        map_task_model_to_record, task_status_to_schema,
    },
    repositories::{
        ProjectRepository, SpaceRepository, SyncRepository, TaskRepository,
        UpdateTaskPatch as RepoUpdateTaskPatch,
    },
};

pub use stoneflow_application::lifecycle::{
    LifecycleEntityType, LifecycleEntry, LifecycleMode, LifecycleScopeInput, LifecycleScopeKind,
    ListLifecycleEntriesInput,
};

type InnerLifecycleService = LifecycleUsecase<
    LifecycleSpacePersistenceAdapter,
    LifecycleProjectPersistenceAdapter,
    LifecycleTaskPersistenceAdapter,
    ActivityPersistenceAdapter,
    LifecycleSyncHookAdapter,
>;

/// Lifecycle 编排兼容壳。
#[derive(Debug, Clone)]
pub struct LifecycleService {
    inner: InnerLifecycleService,
}

impl LifecycleService {
    pub fn new(
        space_repository: SpaceRepository,
        sync_repository: SyncRepository,
        project_repository: ProjectRepository,
        task_repository: TaskRepository,
        activity_service: crate::services::activity::ActivityService,
    ) -> Self {
        let activity_repo = activity_service.repository().clone();
        Self {
            inner: LifecycleUsecase::new(
                LifecycleSpacePersistenceAdapter::new(space_repository),
                LifecycleProjectPersistenceAdapter::new(project_repository),
                LifecycleTaskPersistenceAdapter::new(task_repository),
                ActivityUsecase::new(ActivityPersistenceAdapter::new(activity_repo)),
                LifecycleSyncHookAdapter::new(sync_repository),
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
        space_id: &str,
    ) -> Result<Option<SpaceRecord>, stoneflow_application::ApplicationError> {
        self.repository
            .get(space_id)
            .await
            .map(|space| space.map(map_space_model_to_record))
            .map_err(|error| map_app_error(error.into()))
    }

    async fn get_default(
        &self,
    ) -> Result<Option<SpaceRecord>, stoneflow_application::ApplicationError> {
        self.repository
            .get_default()
            .await
            .map(|space| space.map(map_space_model_to_record))
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list_by_ids(
        &self,
        space_ids: &[String],
    ) -> Result<Vec<SpaceRecord>, stoneflow_application::ApplicationError> {
        self.repository
            .list_by_ids(space_ids)
            .await
            .map(|spaces| spaces.into_iter().map(map_space_model_to_record).collect())
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list_archived(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<SpaceRecord>, stoneflow_application::ApplicationError> {
        self.repository
            .list_archived(scope_space_id)
            .await
            .map(|spaces| spaces.into_iter().map(map_space_model_to_record).collect())
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list_deleted(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<SpaceRecord>, stoneflow_application::ApplicationError> {
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
    ) -> Result<Option<SpaceRecord>, stoneflow_application::ApplicationError> {
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
    ) -> Result<Option<SpaceRecord>, stoneflow_application::ApplicationError> {
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
    ) -> Result<Option<SpaceRecord>, stoneflow_application::ApplicationError> {
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
    ) -> Result<(), stoneflow_application::ApplicationError> {
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
        project_id: &str,
    ) -> Result<Option<ProjectRecord>, stoneflow_application::ApplicationError> {
        self.repository
            .get(project_id)
            .await
            .map(|project| project.map(map_project_model_to_record))
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list_by_space(
        &self,
        space_id: &str,
    ) -> Result<Vec<ProjectRecord>, stoneflow_application::ApplicationError> {
        self.repository
            .list_by_space(space_id)
            .await
            .map(|projects| {
                projects
                    .into_iter()
                    .map(map_project_model_to_record)
                    .collect()
            })
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list_by_ids(
        &self,
        project_ids: &[String],
    ) -> Result<Vec<ProjectRecord>, stoneflow_application::ApplicationError> {
        self.repository
            .list_by_ids(project_ids)
            .await
            .map(|projects| {
                projects
                    .into_iter()
                    .map(map_project_model_to_record)
                    .collect()
            })
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list_archived(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<
        Vec<stoneflow_application::lifecycle::LifecycleProjectListRecord>,
        stoneflow_application::ApplicationError,
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
        Vec<stoneflow_application::lifecycle::LifecycleProjectListRecord>,
        stoneflow_application::ApplicationError,
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
    ) -> Result<Option<ProjectRecord>, stoneflow_application::ApplicationError> {
        self.repository
            .archive_raw(
                connection,
                project_id,
                archived_at,
                archived_by_id,
                updated_at,
            )
            .await
            .map(|project| project.map(map_project_model_to_record))
            .map_err(|error| map_app_error(error.into()))
    }

    async fn restore_raw(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        updated_at: &str,
    ) -> Result<Option<ProjectRecord>, stoneflow_application::ApplicationError> {
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
    ) -> Result<Option<ProjectRecord>, stoneflow_application::ApplicationError> {
        self.repository
            .delete_raw(
                connection,
                project_id,
                deleted_at,
                deleted_by_id,
                updated_at,
            )
            .await
            .map(|project| project.map(map_project_model_to_record))
            .map_err(|error| map_app_error(error.into()))
    }

    async fn permanently_delete(
        &self,
        connection: &Self::Connection,
        project_id: &str,
    ) -> Result<(), stoneflow_application::ApplicationError> {
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
    ) -> Result<(), stoneflow_application::ApplicationError> {
        self.repository
            .archive_by_space_raw(
                connection,
                space_id,
                archived_at,
                archived_by_id,
                updated_at,
            )
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
    ) -> Result<(), stoneflow_application::ApplicationError> {
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

#[derive(Debug, Clone)]
struct LifecycleSyncHookAdapter {
    sync_repository: SyncRepository,
}

impl LifecycleSyncHookAdapter {
    fn new(sync_repository: SyncRepository) -> Self {
        Self { sync_repository }
    }
}

impl LifecycleSyncHook for LifecycleSyncHookAdapter {
    type Connection = sea_orm::DatabaseTransaction;

    async fn enqueue_space_upsert(
        &self,
        connection: &Self::Connection,
        space: &SpaceRecord,
    ) -> Result<(), stoneflow_application::ApplicationError> {
        let record = build_space_mutation_record(space).map_err(map_app_error)?;
        self.sync_repository
            .insert_pending_mutation(connection, &record)
            .await
            .map_err(|error| map_app_error(error.into()))
    }

    async fn enqueue_space_delete(
        &self,
        connection: &Self::Connection,
        space: &SpaceRecord,
    ) -> Result<(), stoneflow_application::ApplicationError> {
        let record = build_space_delete_mutation_record(space).map_err(map_app_error)?;
        self.sync_repository
            .insert_pending_mutation(connection, &record)
            .await
            .map_err(|error| map_app_error(error.into()))
    }

    async fn enqueue_project_upsert(
        &self,
        connection: &Self::Connection,
        project: &ProjectRecord,
    ) -> Result<(), stoneflow_application::ApplicationError> {
        let record = build_project_mutation_record(project).map_err(map_app_error)?;
        self.sync_repository
            .insert_pending_mutation(connection, &record)
            .await
            .map_err(|error| map_app_error(error.into()))
    }

    async fn enqueue_project_delete(
        &self,
        connection: &Self::Connection,
        project: &ProjectRecord,
    ) -> Result<(), stoneflow_application::ApplicationError> {
        let record = build_project_delete_mutation_record(project).map_err(map_app_error)?;
        self.sync_repository
            .insert_pending_mutation(connection, &record)
            .await
            .map_err(|error| map_app_error(error.into()))
    }

    async fn enqueue_task_upsert(
        &self,
        connection: &Self::Connection,
        task: &TaskRecord,
    ) -> Result<(), stoneflow_application::ApplicationError> {
        let record = build_task_mutation_record(task).map_err(map_app_error)?;
        self.sync_repository
            .insert_pending_mutation(connection, &record)
            .await
            .map_err(|error| map_app_error(error.into()))
    }

    async fn enqueue_task_delete(
        &self,
        connection: &Self::Connection,
        task: &TaskRecord,
    ) -> Result<(), stoneflow_application::ApplicationError> {
        let record = build_task_delete_mutation_record(task).map_err(map_app_error)?;
        self.sync_repository
            .insert_pending_mutation(connection, &record)
            .await
            .map_err(|error| map_app_error(error.into()))
    }
}

#[derive(Debug, Serialize)]
struct LifecycleSpaceSyncPayload<'a> {
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

impl<'a> From<&'a SpaceRecord> for LifecycleSpaceSyncPayload<'a> {
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

#[derive(Debug, Serialize)]
struct LifecycleProjectSyncPayload<'a> {
    id: &'a str,
    space_id: &'a str,
    name: &'a str,
    description: Option<&'a str>,
    due_at: Option<&'a str>,
    sort_order: i32,
    completed_at: Option<&'a str>,
    archived_at: Option<&'a str>,
    deleted_at: Option<&'a str>,
    created_at: &'a str,
    updated_at: &'a str,
}

impl<'a> From<&'a ProjectRecord> for LifecycleProjectSyncPayload<'a> {
    fn from(project: &'a ProjectRecord) -> Self {
        Self {
            id: &project.id,
            space_id: &project.space_id,
            name: &project.name,
            description: project.description.as_deref(),
            due_at: project.due_at.as_deref(),
            sort_order: project.sort_order,
            completed_at: project.completed_at.as_deref(),
            archived_at: project.archived_at.as_deref(),
            deleted_at: project.deleted_at.as_deref(),
            created_at: &project.created_at,
            updated_at: &project.updated_at,
        }
    }
}

#[derive(Debug, Serialize)]
struct LifecycleTaskSyncPayload<'a> {
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

impl<'a> From<&'a TaskRecord> for LifecycleTaskSyncPayload<'a> {
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

fn build_space_mutation_record(
    space: &SpaceRecord,
) -> Result<stoneflow_storage::repositories::SyncMutationRecord, AppError> {
    build_upsert_record(
        "space",
        &space.id,
        &LifecycleSpaceSyncPayload::from(space),
        &space.updated_at,
    )
}

fn build_space_delete_mutation_record(
    space: &SpaceRecord,
) -> Result<stoneflow_storage::repositories::SyncMutationRecord, AppError> {
    build_delete_record(
        "space",
        &space.id,
        &LifecycleSpaceSyncPayload::from(space),
        &space.updated_at,
    )
}

fn build_project_mutation_record(
    project: &ProjectRecord,
) -> Result<stoneflow_storage::repositories::SyncMutationRecord, AppError> {
    build_upsert_record(
        "project",
        &project.id,
        &LifecycleProjectSyncPayload::from(project),
        &project.updated_at,
    )
}

fn build_project_delete_mutation_record(
    project: &ProjectRecord,
) -> Result<stoneflow_storage::repositories::SyncMutationRecord, AppError> {
    build_delete_record(
        "project",
        &project.id,
        &LifecycleProjectSyncPayload::from(project),
        &project.updated_at,
    )
}

fn build_task_mutation_record(
    task: &TaskRecord,
) -> Result<stoneflow_storage::repositories::SyncMutationRecord, AppError> {
    build_upsert_record(
        "task",
        &task.id,
        &LifecycleTaskSyncPayload::from(task),
        &task.updated_at,
    )
}

fn build_task_delete_mutation_record(
    task: &TaskRecord,
) -> Result<stoneflow_storage::repositories::SyncMutationRecord, AppError> {
    build_delete_record(
        "task",
        &task.id,
        &LifecycleTaskSyncPayload::from(task),
        &task.updated_at,
    )
}

impl LifecycleTaskPersistence for LifecycleTaskPersistenceAdapter {
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
        task_id: &str,
    ) -> Result<Option<TaskRecord>, stoneflow_application::ApplicationError> {
        self.repository
            .get(task_id)
            .await
            .map(|task| task.map(map_task_model_to_record))
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list_by_space(
        &self,
        space_id: &str,
    ) -> Result<Vec<TaskRecord>, stoneflow_application::ApplicationError> {
        self.repository
            .list_by_space(space_id)
            .await
            .map(|tasks| tasks.into_iter().map(map_task_model_to_record).collect())
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list_by_project(
        &self,
        project_id: &str,
    ) -> Result<Vec<TaskRecord>, stoneflow_application::ApplicationError> {
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
        Vec<stoneflow_application::lifecycle::LifecycleTaskListRecord>,
        stoneflow_application::ApplicationError,
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
        Vec<stoneflow_application::lifecycle::LifecycleTaskListRecord>,
        stoneflow_application::ApplicationError,
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
    ) -> Result<Option<TaskRecord>, stoneflow_application::ApplicationError> {
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
    ) -> Result<Option<TaskRecord>, stoneflow_application::ApplicationError> {
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
    ) -> Result<Option<TaskRecord>, stoneflow_application::ApplicationError> {
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
    ) -> Result<(), stoneflow_application::ApplicationError> {
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
    ) -> Result<Option<TaskRecord>, stoneflow_application::ApplicationError> {
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
    ) -> Result<(), stoneflow_application::ApplicationError> {
        self.repository
            .archive_by_space_raw(
                connection,
                space_id,
                archived_at,
                archived_by_id,
                updated_at,
            )
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
    ) -> Result<(), stoneflow_application::ApplicationError> {
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
    ) -> Result<(), stoneflow_application::ApplicationError> {
        self.repository
            .archive_by_project_raw(
                connection,
                project_id,
                archived_at,
                archived_by_id,
                updated_at,
            )
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
    ) -> Result<(), stoneflow_application::ApplicationError> {
        self.repository
            .delete_by_project_raw(
                connection,
                project_id,
                deleted_at,
                deleted_by_id,
                updated_at,
            )
            .await
            .map(|_| ())
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

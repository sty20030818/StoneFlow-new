//! Task runtime adapter：把 application ports 连接到 SQLite repository。

use sea_orm::{DatabaseTransaction, TransactionTrait};
use stoneflow_application::{
    activity::{
        ActivityChangeRecord, ActivityEventRecord, ActivityPersistence, ActivityTimelineEntry,
        GetEntityActivitiesInput,
    },
    operation::{OutboxEnqueueRecord, SyncEntityKind, TombstoneRecord},
    task::{
        CreateTaskPersistenceRecord, TaskLifecycleView, TaskPersistence, TaskProjectReader,
        TaskProjectRecord, TaskRecord, TaskService as TaskUsecase, TaskSpaceReader,
        TaskSpaceRecord, UpdateTaskPatch as AppUpdateTaskPatch,
    },
    ApplicationError,
};
use stoneflow_storage::{
    entities::{common::WorkStatus as StorageWorkStatus, task},
    repositories::{
        ActivityRepository, CreateTaskRecord, OutboxRepository, ProjectRepository, SpaceRepository,
        TaskRepository, TombstoneRepository, UpdateTaskPatch,
    },
};

use crate::app::error::AppError;

pub use stoneflow_application::task::{
    BulkUpdateTasksDto, BulkUpdateTasksInput, CreateTaskInput, CreateTaskPlacementInput,
    CreateTaskPlacementKind, ListTasksInput, ListTasksPlacementInput, ListTasksPlacementKind,
    TaskDetailDto, TaskIdInput, TaskListItemDto, TaskScopeInput, TaskScopeKind, UpdateTaskInput,
    UpdateTaskPlacementInput, UpdateTaskPlacementKind,
};

type InnerTaskService = TaskUsecase<
    TaskPersistenceAdapter,
    TaskPersistenceAdapter,
    TaskPersistenceAdapter,
    TaskPersistenceAdapter,
>;

pub struct TaskService {
    inner: InnerTaskService,
}

impl TaskService {
    pub fn new(
        tasks: TaskRepository,
        spaces: SpaceRepository,
        projects: ProjectRepository,
    ) -> Self {
        let adapter = TaskPersistenceAdapter::new(tasks, spaces, projects);
        Self {
            inner: TaskUsecase::new(
                adapter.clone(),
                stoneflow_application::activity::ActivityService::new(adapter.clone()),
                adapter.clone(),
                adapter,
            ),
        }
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
    pub async fn bulk_update_tasks(
        &self,
        input: BulkUpdateTasksInput,
    ) -> Result<BulkUpdateTasksDto, AppError> {
        self.inner.bulk_update_tasks(input).await.map_err(AppError::from)
    }
    pub async fn archive_task(&self, input: TaskIdInput) -> Result<TaskDetailDto, AppError> {
        self.inner.archive_task(input).await.map_err(AppError::from)
    }
    pub async fn restore_task(&self, input: TaskIdInput) -> Result<TaskDetailDto, AppError> {
        self.inner.restore_task(input).await.map_err(AppError::from)
    }
    pub async fn delete_task(&self, input: TaskIdInput) -> Result<TaskDetailDto, AppError> {
        self.inner.delete_task(input).await.map_err(AppError::from)
    }
    pub async fn permanently_delete_task(&self, input: TaskIdInput) -> Result<(), AppError> {
        self.inner
            .permanently_delete_task(input)
            .await
            .map_err(AppError::from)
    }
}

#[derive(Debug, Clone)]
struct TaskPersistenceAdapter {
    tasks: TaskRepository,
    spaces: SpaceRepository,
    projects: ProjectRepository,
    outbox: OutboxRepository,
    activities: ActivityRepository,
    tombstones: TombstoneRepository,
}
impl TaskPersistenceAdapter {
    fn new(tasks: TaskRepository, spaces: SpaceRepository, projects: ProjectRepository) -> Self {
        let connection = tasks.connection().clone();
        Self {
            tasks,
            spaces,
            projects,
            outbox: OutboxRepository::new(connection.clone()),
            activities: ActivityRepository::new(),
            tombstones: TombstoneRepository::new(connection),
        }
    }
}
impl TaskPersistence for TaskPersistenceAdapter {
    type Connection = DatabaseTransaction;
    async fn begin(&self) -> Result<Self::Connection, ApplicationError> {
        self.tasks
            .connection()
            .begin()
            .await
            .map_err(|e| ApplicationError::storage(e.to_string()))
    }
    async fn commit(&self, connection: Self::Connection) -> Result<(), ApplicationError> {
        connection
            .commit()
            .await
            .map_err(|e| ApplicationError::storage(e.to_string()))
    }
    async fn get(&self, task_id: &str) -> Result<Option<TaskRecord>, ApplicationError> {
        self.tasks
            .get(task_id)
            .await
            .map(|row| row.map(map_task))
            .map_err(storage_error)
    }
    async fn list(
        &self,
        query: stoneflow_application::task::TaskListQuery,
    ) -> Result<Vec<TaskRecord>, ApplicationError> {
        let placement = match query.placement {
            stoneflow_application::task::TaskPlacementQuery::All => None,
            stoneflow_application::task::TaskPlacementQuery::Project(ref id) => {
                Some(Some(id.as_str()))
            }
            stoneflow_application::task::TaskPlacementQuery::NoProject => Some(None),
        };
        let include_archived = matches!(query.lifecycle, TaskLifecycleView::Archived);
        let mut rows = self
            .tasks
            .list_visible(query.space_id.as_deref(), placement, include_archived, None)
            .await
            .map_err(storage_error)?;
        rows.retain(|row| match query.lifecycle {
            TaskLifecycleView::Active => {
                !matches!(
                    row.status,
                    StorageWorkStatus::Done | StorageWorkStatus::Canceled
                ) && row.archived_at.is_none()
            }
            TaskLifecycleView::Completed => {
                matches!(row.status, StorageWorkStatus::Done) && row.archived_at.is_none()
            }
            TaskLifecycleView::Canceled => {
                matches!(row.status, StorageWorkStatus::Canceled) && row.archived_at.is_none()
            }
            TaskLifecycleView::Archived => row.archived_at.is_some(),
            TaskLifecycleView::All => row.archived_at.is_none(),
        });
        Ok(rows.into_iter().map(map_task).collect())
    }
    async fn next_position(
        &self,
        connection: &Self::Connection,
        space_id: &str,
        project_id: Option<&str>,
    ) -> Result<i64, ApplicationError> {
        self.tasks
            .next_position(connection, space_id, project_id)
            .await
            .map_err(storage_error)
    }
    async fn create(
        &self,
        connection: &Self::Connection,
        record: CreateTaskPersistenceRecord,
    ) -> Result<TaskRecord, ApplicationError> {
        self.tasks
            .create(
                connection,
                CreateTaskRecord {
                    id: record.id,
                    space_id: record.space_id,
                    project_id: record.project_id,
                    title: record.title,
                    note: record.note,
                    status: record.status,
                    status_changed_at: record.status_changed_at,
                    priority: record.priority,
                    planned_at: record.planned_at,
                    due_at: record.due_at,
                    remind_at: record.remind_at,
                    position: record.position,
                    completed_at: record.completed_at,
                    created_at: record.created_at,
                    updated_at: record.updated_at,
                },
            )
            .await
            .map(map_task)
            .map_err(storage_error)
    }
    async fn update(
        &self,
        connection: &Self::Connection,
        task_id: &str,
        patch: AppUpdateTaskPatch,
        updated_at: &str,
    ) -> Result<Option<TaskRecord>, ApplicationError> {
        self.tasks
            .update(
                connection,
                task_id,
                UpdateTaskPatch {
                    title: patch.title,
                    note: patch.note,
                    status: patch.status,
                    status_changed_at: patch.status_changed_at,
                    priority: patch.priority,
                    space_id: patch.space_id,
                    project_id: patch.project_id,
                    planned_at: patch.planned_at,
                    due_at: patch.due_at,
                    remind_at: patch.remind_at,
                    position: patch.position,
                    completed_at: patch.completed_at,
                },
                updated_at,
            )
            .await
            .map(|row| row.map(map_task))
            .map_err(storage_error)
    }
    async fn enqueue(
        &self,
        connection: &Self::Connection,
        record: &OutboxEnqueueRecord,
    ) -> Result<(), ApplicationError> {
        self.outbox
            .enqueue_in_connection(connection, record)
            .await
            .map_err(storage_error)
    }
    async fn archive(
        &self,
        connection: &Self::Connection,
        task_id: &str,
        operation_id: &str,
        archived_at: &str,
    ) -> Result<Option<TaskRecord>, ApplicationError> {
        self.tasks
            .archive(connection, task_id, operation_id, archived_at)
            .await
            .map(|row| row.map(map_task))
            .map_err(storage_error)
    }
    async fn soft_delete(
        &self,
        connection: &Self::Connection,
        task_id: &str,
        operation_id: &str,
        deleted_at: &str,
    ) -> Result<Option<TaskRecord>, ApplicationError> {
        self.tasks
            .soft_delete(connection, task_id, operation_id, deleted_at)
            .await
            .map(|row| row.map(map_task))
            .map_err(storage_error)
    }
    async fn restore(
        &self,
        connection: &Self::Connection,
        task_id: &str,
        operation_id: &str,
        updated_at: &str,
    ) -> Result<Option<TaskRecord>, ApplicationError> {
        self.tasks
            .restore(connection, task_id, operation_id, updated_at)
            .await
            .map(|row| row.map(map_task))
            .map_err(storage_error)
    }
    async fn permanently_delete(
        &self,
        connection: &Self::Connection,
        task_id: &str,
        deleted_at: &str,
    ) -> Result<Option<TaskRecord>, ApplicationError> {
        let deleted = self
            .tasks
            .permanently_delete(connection, task_id)
            .await
            .map_err(storage_error)?;
        if let Some(task) = &deleted {
            self.tombstones
                .insert_in_connection(
                    connection,
                    &TombstoneRecord {
                        entity_type: SyncEntityKind::Task,
                        entity_id: task.id.clone(),
                        generation: task.generation + 1,
                        deletion_seq: 0,
                        deleted_at: deleted_at.to_owned(),
                    },
                )
                .await
                .map_err(storage_error)?;
        }
        Ok(deleted.map(map_task))
    }
}
impl TaskSpaceReader for TaskPersistenceAdapter {
    async fn get(&self, space_id: &str) -> Result<Option<TaskSpaceRecord>, ApplicationError> {
        self.spaces
            .get(space_id)
            .await
            .map(|row| {
                row.map(|space| TaskSpaceRecord {
                    id: space.id,
                    name: space.name,
                    archived_at: space.archived_at,
                    deleted_at: space.deleted_at,
                })
            })
            .map_err(storage_error)
    }
    async fn list_by_ids(&self, ids: &[String]) -> Result<Vec<TaskSpaceRecord>, ApplicationError> {
        let mut rows = Vec::new();
        for id in ids {
            if let Some(row) = TaskSpaceReader::get(self, id).await? {
                rows.push(row);
            }
        }
        Ok(rows)
    }
}
impl TaskProjectReader for TaskPersistenceAdapter {
    async fn get(&self, project_id: &str) -> Result<Option<TaskProjectRecord>, ApplicationError> {
        self.projects
            .get(project_id)
            .await
            .map(|row| {
                row.map(|project| TaskProjectRecord {
                    id: project.id,
                    name: project.name,
                    space_id: project.space_id,
                    archived_at: project.archived_at,
                    deleted_at: project.deleted_at,
                })
            })
            .map_err(storage_error)
    }
    async fn list_by_ids(
        &self,
        ids: &[String],
    ) -> Result<Vec<TaskProjectRecord>, ApplicationError> {
        let mut rows = Vec::new();
        for id in ids {
            if let Some(row) = TaskProjectReader::get(self, id).await? {
                rows.push(row);
            }
        }
        Ok(rows)
    }
}
impl ActivityPersistence for TaskPersistenceAdapter {
    type Connection = DatabaseTransaction;
    async fn begin(&self) -> Result<Self::Connection, ApplicationError> {
        TaskPersistence::begin(self).await
    }
    async fn commit(&self, connection: Self::Connection) -> Result<(), ApplicationError> {
        TaskPersistence::commit(self, connection).await
    }
    async fn insert_event_with_changes(
        &self,
        connection: &Self::Connection,
        event: &ActivityEventRecord,
        changes: &[ActivityChangeRecord],
    ) -> Result<(), ApplicationError> {
        self.activities
            .insert_event_with_changes(connection, event, changes)
            .await
            .map_err(storage_error)
    }
    async fn insert_events_with_changes(
        &self,
        connection: &Self::Connection,
        records: &[(ActivityEventRecord, Vec<ActivityChangeRecord>)],
    ) -> Result<(), ApplicationError> {
        for (event, changes) in records {
            self.insert_event_with_changes(connection, event, changes)
                .await?;
        }
        Ok(())
    }
    async fn list_by_entity(
        &self,
        _input: GetEntityActivitiesInput,
    ) -> Result<Vec<ActivityTimelineEntry>, ApplicationError> {
        Ok(Vec::new())
    }
}
fn map_task(row: task::Model) -> TaskRecord {
    TaskRecord {
        id: row.id,
        space_id: row.space_id,
        project_id: row.project_id,
        title: row.title,
        note: row.note,
        status: from_storage_status(row.status),
        status_changed_at: row.status_changed_at,
        priority: row.priority,
        planned_at: row.planned_at,
        due_at: row.due_at,
        remind_at: row.remind_at,
        position: row.position,
        generation: row.generation,
        completed_at: row.completed_at,
        archived_at: row.archived_at,
        deleted_at: row.deleted_at,
        archived_by_operation_id: row.archived_by_operation_id,
        deleted_by_operation_id: row.deleted_by_operation_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
    }
}
fn from_storage_status(status: StorageWorkStatus) -> stoneflow_domain::WorkStatus {
    match status {
        StorageWorkStatus::Todo => stoneflow_domain::WorkStatus::Todo,
        StorageWorkStatus::Doing => stoneflow_domain::WorkStatus::Doing,
        StorageWorkStatus::Waiting => stoneflow_domain::WorkStatus::Waiting,
        StorageWorkStatus::Done => stoneflow_domain::WorkStatus::Done,
        StorageWorkStatus::Canceled => stoneflow_domain::WorkStatus::Canceled,
    }
}
fn storage_error(error: stoneflow_storage::StorageError) -> ApplicationError {
    ApplicationError::storage(error.to_string())
}

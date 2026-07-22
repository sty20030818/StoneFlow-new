//! TaskLink runtime adapter。

use crate::app::error::AppError;
use sea_orm::{DatabaseTransaction, TransactionTrait};
use stoneflow_application::{
    activity::{
        ActivityChangeRecord, ActivityEventRecord, ActivityPersistence, ActivityTimelineEntry,
        GetEntityActivitiesInput,
    },
    task_link::{
        CreateTaskLinkPersistenceRecord, TaskLinkPersistence, TaskLinkRecord,
        TaskLinkService as TaskLinkUsecase, TaskLinkTaskReader, TaskLinkTaskRecord,
        UpdateTaskLinkPatch as AppUpdateTaskLinkPatch,
    },
    ApplicationError,
};
use stoneflow_storage::{
    entities::task_link,
    repositories::{
        ActivityRepository, CreateTaskLinkRecord, OutboxRepository, TaskLinkRepository,
        TaskRepository, UpdateTaskLinkPatch,
    },
};

pub use stoneflow_application::task_link::{
    CreateTaskLinkInput, DeleteTaskLinkInput, ListTaskLinksInput, TaskLinkDto, UpdateTaskLinkInput,
};

type InnerTaskLinkService = TaskLinkUsecase<
    TaskLinkPersistenceAdapter,
    TaskLinkPersistenceAdapter,
    TaskLinkPersistenceAdapter,
>;
pub struct TaskLinkService {
    inner: InnerTaskLinkService,
}
impl TaskLinkService {
    pub fn new(links: TaskLinkRepository, tasks: TaskRepository) -> Self {
        let adapter = TaskLinkPersistenceAdapter {
            outbox: OutboxRepository::new(links.connection().clone()),
            links,
            tasks,
            activities: ActivityRepository::new(),
        };
        Self {
            inner: TaskLinkUsecase::new(
                adapter.clone(),
                stoneflow_application::activity::ActivityService::new(adapter.clone()),
                adapter,
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
    links: TaskLinkRepository,
    tasks: TaskRepository,
    activities: ActivityRepository,
    outbox: OutboxRepository,
}
impl TaskLinkPersistence for TaskLinkPersistenceAdapter {
    type Connection = DatabaseTransaction;
    async fn begin(&self) -> Result<Self::Connection, ApplicationError> {
        self.links
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
    async fn get(&self, id: &str) -> Result<Option<TaskLinkRecord>, ApplicationError> {
        self.links
            .get(id)
            .await
            .map(|row| row.map(map_link))
            .map_err(storage_error)
    }
    async fn list_by_task(&self, task_id: &str) -> Result<Vec<TaskLinkRecord>, ApplicationError> {
        self.links
            .list_by_task(task_id)
            .await
            .map(|rows| rows.into_iter().map(map_link).collect())
            .map_err(storage_error)
    }
    async fn next_position(
        &self,
        connection: &Self::Connection,
        task_id: &str,
    ) -> Result<i64, ApplicationError> {
        self.links
            .next_position(connection, task_id)
            .await
            .map_err(storage_error)
    }
    async fn create(
        &self,
        connection: &Self::Connection,
        record: CreateTaskLinkPersistenceRecord,
    ) -> Result<TaskLinkRecord, ApplicationError> {
        self.links
            .create(
                connection,
                CreateTaskLinkRecord {
                    id: record.id,
                    task_id: record.task_id,
                    title: record.title,
                    url: record.url,
                    position: record.position,
                    created_at: record.created_at,
                    updated_at: record.updated_at,
                },
            )
            .await
            .map(map_link)
            .map_err(storage_error)
    }
    async fn update(
        &self,
        connection: &Self::Connection,
        id: &str,
        patch: AppUpdateTaskLinkPatch,
        updated_at: &str,
    ) -> Result<Option<TaskLinkRecord>, ApplicationError> {
        self.links
            .update(
                connection,
                id,
                UpdateTaskLinkPatch {
                    title: patch.title,
                    url: patch.url,
                },
                updated_at,
            )
            .await
            .map(|row| row.map(map_link))
            .map_err(storage_error)
    }
    async fn delete(
        &self,
        connection: &Self::Connection,
        id: &str,
    ) -> Result<bool, ApplicationError> {
        self.links
            .delete(connection, id)
            .await
            .map_err(storage_error)
    }
    async fn enqueue(
        &self,
        connection: &Self::Connection,
        record: &stoneflow_application::operation::OutboxEnqueueRecord,
    ) -> Result<(), ApplicationError> {
        self.outbox
            .enqueue_in_connection(connection, record)
            .await
            .map_err(storage_error)
    }
}
impl TaskLinkTaskReader for TaskLinkPersistenceAdapter {
    async fn get(&self, task_id: &str) -> Result<Option<TaskLinkTaskRecord>, ApplicationError> {
        self.tasks
            .get(task_id)
            .await
            .map(|row| {
                row.filter(|task| task.archived_at.is_none() && task.deleted_at.is_none())
                    .map(|task| TaskLinkTaskRecord {
                        id: task.id,
                        title: task.title,
                    })
            })
            .map_err(storage_error)
    }
}
impl ActivityPersistence for TaskLinkPersistenceAdapter {
    type Connection = DatabaseTransaction;
    async fn begin(&self) -> Result<Self::Connection, ApplicationError> {
        TaskLinkPersistence::begin(self).await
    }
    async fn commit(&self, connection: Self::Connection) -> Result<(), ApplicationError> {
        TaskLinkPersistence::commit(self, connection).await
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
fn map_link(row: task_link::Model) -> TaskLinkRecord {
    TaskLinkRecord {
        id: row.id,
        task_id: row.task_id,
        title: row.title,
        url: row.url,
        position: row.position,
        created_at: row.created_at,
        updated_at: row.updated_at,
    }
}
fn storage_error(error: stoneflow_storage::StorageError) -> ApplicationError {
    ApplicationError::storage(error.to_string())
}

//! TaskLink port 实现与 application service 工厂。

use sea_orm::{DatabaseConnection, DatabaseTransaction, TransactionTrait};
use stoneflow_application::{
    activity::{
        ActivityChangeRecord, ActivityEventRecord, ActivityPersistence, ActivityService,
        ActivityTimelineEntry, GetEntityActivitiesInput,
    },
    task_link::{
        CreateTaskLinkPersistenceRecord, TaskLinkPersistence, TaskLinkRecord, TaskLinkService,
        TaskLinkTaskReader, TaskLinkTaskRecord, UpdateTaskLinkPatch as AppUpdateTaskLinkPatch,
    },
    ApplicationError,
};

use crate::adapters::error::{from_db, from_storage};
use crate::entities::task_link;
use crate::repositories::{
    ActivityRepository, CreateTaskLinkRecord, OutboxRepository, TaskLinkRepository, TaskRepository,
    UpdateTaskLinkPatch,
};

/// 已装配的 TaskLink application service。
pub type TaskLinkAppService = TaskLinkService<
    TaskLinkPersistenceAdapter,
    TaskLinkPersistenceAdapter,
    TaskLinkPersistenceAdapter,
>;

/// 从数据库连接构造 TaskLink 用例。
pub fn build_task_link_service(connection: DatabaseConnection) -> TaskLinkAppService {
    let links = TaskLinkRepository::new(connection.clone());
    let tasks = TaskRepository::new(connection);
    let adapter = TaskLinkPersistenceAdapter {
        outbox: OutboxRepository::new(links.connection().clone()),
        links,
        tasks,
        activities: ActivityRepository::new(),
    };
    TaskLinkService::new(
        adapter.clone(),
        ActivityService::new(adapter.clone()),
        adapter,
    )
}

#[derive(Debug, Clone)]
pub struct TaskLinkPersistenceAdapter {
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
            .map_err(from_db)
    }
    async fn commit(&self, connection: Self::Connection) -> Result<(), ApplicationError> {
        connection
            .commit()
            .await
            .map_err(from_db)
    }
    async fn get(&self, id: &str) -> Result<Option<TaskLinkRecord>, ApplicationError> {
        self.links
            .get(id)
            .await
            .map(|row| row.map(map_link))
            .map_err(from_storage)
    }
    async fn list_by_task(&self, task_id: &str) -> Result<Vec<TaskLinkRecord>, ApplicationError> {
        self.links
            .list_by_task(task_id)
            .await
            .map(|rows| rows.into_iter().map(map_link).collect())
            .map_err(from_storage)
    }
    async fn next_position(
        &self,
        connection: &Self::Connection,
        task_id: &str,
    ) -> Result<i64, ApplicationError> {
        self.links
            .next_position(connection, task_id)
            .await
            .map_err(from_storage)
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
            .map_err(from_storage)
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
            .map_err(from_storage)
    }
    async fn delete(
        &self,
        connection: &Self::Connection,
        id: &str,
    ) -> Result<bool, ApplicationError> {
        self.links
            .delete(connection, id)
            .await
            .map_err(from_storage)
    }
    async fn enqueue(
        &self,
        connection: &Self::Connection,
        record: &stoneflow_application::operation::OutboxEnqueueRecord,
    ) -> Result<(), ApplicationError> {
        self.outbox
            .enqueue_in_connection(connection, record)
            .await
            .map_err(from_storage)
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
            .map_err(from_storage)
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
            .map_err(from_storage)
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


//! Task port 实现与 application service 工厂。

use sea_orm::{DatabaseConnection, DatabaseTransaction, TransactionTrait};
use stoneflow_application::{
    activity::{
        ActivityChangeRecord, ActivityEventRecord, ActivityPersistence, ActivityService,
        ActivityTimelineEntry, GetEntityActivitiesInput,
    },
    operation::{OutboxEnqueueRecord, SyncEntityKind, TombstoneRecord},
    task::{
        CreateTaskPersistenceRecord, TaskLifecycleView, TaskPersistence, TaskProjectReader,
        TaskProjectRecord, TaskRecord, TaskService, TaskSpaceReader, TaskSpaceRecord,
        UpdateTaskPatch as AppUpdateTaskPatch,
    },
    ApplicationError,
};

use crate::adapters::error::{from_db, from_storage};
use crate::entities::{common::WorkStatus as StorageWorkStatus, task};
use crate::mappers::work_status_to_domain;
use crate::repositories::{
    ActivityRepository, CreateTaskRecord, OutboxRepository, ProjectRepository, SpaceRepository,
    TaskRepository, TombstoneRepository, UpdateTaskPatch,
};

/// 已装配的 Task application service。
pub type TaskAppService = TaskService<
    TaskPersistenceAdapter,
    TaskPersistenceAdapter,
    TaskPersistenceAdapter,
    TaskPersistenceAdapter,
>;

/// 从数据库连接构造 Task 用例。
pub fn build_task_service(connection: DatabaseConnection) -> TaskAppService {
    let tasks = TaskRepository::new(connection.clone());
    let spaces = SpaceRepository::new(connection.clone());
    let projects = ProjectRepository::new(connection);
    let adapter = TaskPersistenceAdapter::new(tasks, spaces, projects);
    TaskService::new(
        adapter.clone(),
        ActivityService::new(adapter.clone()),
        adapter.clone(),
        adapter,
    )
}

#[derive(Debug, Clone)]
pub struct TaskPersistenceAdapter {
    tasks: TaskRepository,
    spaces: SpaceRepository,
    projects: ProjectRepository,
    outbox: OutboxRepository,
    activities: ActivityRepository,
    tombstones: TombstoneRepository,
}
impl TaskPersistenceAdapter {
    pub fn new(
        tasks: TaskRepository,
        spaces: SpaceRepository,
        projects: ProjectRepository,
    ) -> Self {
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
        self.tasks.connection().begin().await.map_err(from_db)
    }
    async fn commit(&self, connection: Self::Connection) -> Result<(), ApplicationError> {
        connection.commit().await.map_err(from_db)
    }
    async fn get(&self, task_id: &str) -> Result<Option<TaskRecord>, ApplicationError> {
        self.tasks
            .get(task_id)
            .await
            .map(|row| row.map(map_task))
            .map_err(from_storage)
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
            stoneflow_application::task::TaskPlacementQuery::Standalone => Some(None),
        };
        let include_archived = matches!(query.lifecycle, TaskLifecycleView::Archived);
        let status_filter = query.statuses.as_ref().filter(|items| !items.is_empty());
        let cursor = query
            .cursor
            .as_ref()
            .map(|c| (c.position, c.id.as_str()));
        let limit = query.limit.map(u64::from);
        let mut rows = self
            .tasks
            .list_visible_page(
                query.space_id.as_deref(),
                placement,
                include_archived,
                status_filter.map(|items| items.as_slice()),
                cursor,
                limit,
            )
            .await
            .map_err(from_storage)?;
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
    async fn count(
        &self,
        query: stoneflow_application::task::TaskListQuery,
    ) -> Result<u64, ApplicationError> {
        let placement = match query.placement {
            stoneflow_application::task::TaskPlacementQuery::All => None,
            stoneflow_application::task::TaskPlacementQuery::Project(ref id) => {
                Some(Some(id.as_str()))
            }
            stoneflow_application::task::TaskPlacementQuery::Standalone => Some(None),
        };
        let include_archived = matches!(query.lifecycle, TaskLifecycleView::Archived);
        // lifecycle 的 status 约束并入 SQL，使 totalCount 与列表语义一致
        let mut statuses = query.statuses.clone().unwrap_or_default();
        match query.lifecycle {
            TaskLifecycleView::Active if statuses.is_empty() => {
                statuses = vec![
                    stoneflow_domain::WorkStatus::Todo,
                    stoneflow_domain::WorkStatus::Doing,
                    stoneflow_domain::WorkStatus::Waiting,
                ];
            }
            TaskLifecycleView::Completed if statuses.is_empty() => {
                statuses = vec![stoneflow_domain::WorkStatus::Done];
            }
            TaskLifecycleView::Canceled if statuses.is_empty() => {
                statuses = vec![stoneflow_domain::WorkStatus::Canceled];
            }
            _ => {}
        }
        let status_filter = if statuses.is_empty() {
            None
        } else {
            Some(statuses.as_slice())
        };
        self.tasks
            .count_visible(
                query.space_id.as_deref(),
                placement,
                include_archived,
                status_filter,
            )
            .await
            .map_err(from_storage)
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
            .map_err(from_storage)
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
            .map_err(from_storage)
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
            .map_err(from_storage)
    }
    async fn enqueue(
        &self,
        connection: &Self::Connection,
        record: &OutboxEnqueueRecord,
    ) -> Result<(), ApplicationError> {
        self.outbox
            .enqueue_in_connection(connection, record)
            .await
            .map_err(from_storage)
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
            .map_err(from_storage)
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
            .map_err(from_storage)
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
            .map_err(from_storage)
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
            .map_err(from_storage)?;
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
                .map_err(from_storage)?;
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
            .map_err(from_storage)
    }
    async fn list_by_ids(&self, ids: &[String]) -> Result<Vec<TaskSpaceRecord>, ApplicationError> {
        self.spaces
            .list_by_ids(ids)
            .await
            .map(|rows| {
                rows.into_iter()
                    .map(|space| TaskSpaceRecord {
                        id: space.id,
                        name: space.name,
                        archived_at: space.archived_at,
                        deleted_at: space.deleted_at,
                    })
                    .collect()
            })
            .map_err(from_storage)
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
            .map_err(from_storage)
    }
    async fn list_by_ids(
        &self,
        ids: &[String],
    ) -> Result<Vec<TaskProjectRecord>, ApplicationError> {
        self.projects
            .list_by_ids(ids)
            .await
            .map(|rows| {
                rows.into_iter()
                    .map(|project| TaskProjectRecord {
                        id: project.id,
                        name: project.name,
                        space_id: project.space_id,
                        archived_at: project.archived_at,
                        deleted_at: project.deleted_at,
                    })
                    .collect()
            })
            .map_err(from_storage)
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
fn map_task(row: task::Model) -> TaskRecord {
    TaskRecord {
        id: row.id,
        space_id: row.space_id,
        project_id: row.project_id,
        title: row.title,
        note: row.note,
        status: work_status_to_domain(row.status),
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

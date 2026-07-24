//! Lifecycle ports 实现与 application service 工厂（列表真源 + 写路径委托 repository）。

use sea_orm::{
    ColumnTrait, DatabaseConnection, DatabaseTransaction, EntityTrait, QueryFilter, QueryOrder,
    TransactionTrait,
};
use stoneflow_application::{
    activity::ActivityService,
    lifecycle::{
        LifecycleProjectListRecord, LifecycleProjectPersistence, LifecycleService,
        LifecycleSpacePersistence, LifecycleSyncHook, LifecycleTaskListRecord,
        LifecycleTaskPersistence,
    },
    project::ProjectRecord,
    space::SpaceRecord,
    task::TaskRecord,
    ApplicationError,
};

use crate::adapters::activity::ActivityPersistenceAdapter;
use crate::adapters::error::{from_db, from_display, from_storage};
use crate::entities::prelude::{Project, Space, Task};
use crate::entities::{project, space, task};
use crate::mappers::work_status_to_domain;
use crate::repositories::{ProjectRepository, TaskRepository};

/// 已装配的 Lifecycle application service。
pub type LifecycleAppService = LifecycleService<
    LifecyclePortsAdapter,
    LifecyclePortsAdapter,
    LifecyclePortsAdapter,
    ActivityPersistenceAdapter,
    LifecyclePortsAdapter,
>;

/// 从数据库连接构造 Lifecycle 用例。
pub fn build_lifecycle_service(connection: DatabaseConnection) -> LifecycleAppService {
    let adapter = LifecyclePortsAdapter::new(connection.clone());
    let activity = ActivityService::new(ActivityPersistenceAdapter::new(connection));
    LifecycleService::new(
        adapter.clone(),
        adapter.clone(),
        adapter.clone(),
        activity,
        adapter,
    )
}

/// Lifecycle 读写 adapter。
#[derive(Debug, Clone)]
pub struct LifecyclePortsAdapter {
    db: DatabaseConnection,
    projects: ProjectRepository,
    tasks: TaskRepository,
}

impl LifecyclePortsAdapter {
    pub fn new(connection: DatabaseConnection) -> Self {
        Self {
            projects: ProjectRepository::new(connection.clone()),
            tasks: TaskRepository::new(connection.clone()),
            db: connection,
        }
    }
}

impl LifecycleSyncHook for LifecyclePortsAdapter {
    type Connection = DatabaseTransaction;
}

impl LifecycleSpacePersistence for LifecyclePortsAdapter {
    type Connection = DatabaseTransaction;

    async fn begin(&self) -> Result<Self::Connection, ApplicationError> {
        self.db.begin().await.map_err(from_db)
    }

    async fn commit(&self, connection: Self::Connection) -> Result<(), ApplicationError> {
        connection.commit().await.map_err(from_db)
    }

    async fn list_archived(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<SpaceRecord>, ApplicationError> {
        let mut query = Space::find()
            .filter(space::Column::ArchivedAt.is_not_null())
            .filter(space::Column::DeletedAt.is_null())
            .order_by_desc(space::Column::ArchivedAt);
        if let Some(space_id) = scope_space_id {
            query = query.filter(space::Column::Id.eq(space_id));
        }
        query
            .all(&self.db)
            .await
            .map(|rows| rows.into_iter().map(map_space).collect())
            .map_err(from_display)
    }

    async fn list_trashed(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<SpaceRecord>, ApplicationError> {
        let mut query = Space::find()
            .filter(space::Column::DeletedAt.is_not_null())
            .order_by_desc(space::Column::DeletedAt);
        if let Some(space_id) = scope_space_id {
            query = query.filter(space::Column::Id.eq(space_id));
        }
        query
            .all(&self.db)
            .await
            .map(|rows| rows.into_iter().map(map_space).collect())
            .map_err(from_display)
    }
}

impl LifecycleProjectPersistence for LifecyclePortsAdapter {
    type Connection = DatabaseTransaction;

    async fn begin(&self) -> Result<Self::Connection, ApplicationError> {
        self.db.begin().await.map_err(from_db)
    }

    async fn commit(&self, connection: Self::Connection) -> Result<(), ApplicationError> {
        connection.commit().await.map_err(from_db)
    }

    async fn get(&self, project_id: &str) -> Result<Option<ProjectRecord>, ApplicationError> {
        self.projects
            .get(project_id)
            .await
            .map(|row| row.map(map_project))
            .map_err(from_storage)
    }

    async fn list_by_space(&self, space_id: &str) -> Result<Vec<ProjectRecord>, ApplicationError> {
        self.projects
            .list_visible(Some(space_id), true)
            .await
            .map(|rows| rows.into_iter().map(map_project).collect())
            .map_err(from_storage)
    }

    async fn list_archived(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<LifecycleProjectListRecord>, ApplicationError> {
        let mut query = Project::find()
            .filter(project::Column::ArchivedAt.is_not_null())
            .filter(project::Column::DeletedAt.is_null())
            .order_by_desc(project::Column::ArchivedAt);
        if let Some(space_id) = scope_space_id {
            query = query.filter(project::Column::SpaceId.eq(space_id));
        }
        query
            .all(&self.db)
            .await
            .map(|rows| {
                rows.into_iter()
                    .map(|row| LifecycleProjectListRecord {
                        id: row.id,
                        space_id: row.space_id,
                        name: row.name,
                        archived_at: row.archived_at,
                        deleted_at: row.deleted_at,
                    })
                    .collect()
            })
            .map_err(from_display)
    }

    async fn list_trashed(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<LifecycleProjectListRecord>, ApplicationError> {
        let mut query = Project::find()
            .filter(project::Column::DeletedAt.is_not_null())
            .order_by_desc(project::Column::DeletedAt);
        if let Some(space_id) = scope_space_id {
            query = query.filter(project::Column::SpaceId.eq(space_id));
        }
        query
            .all(&self.db)
            .await
            .map(|rows| {
                rows.into_iter()
                    .map(|row| LifecycleProjectListRecord {
                        id: row.id,
                        space_id: row.space_id,
                        name: row.name,
                        archived_at: row.archived_at,
                        deleted_at: row.deleted_at,
                    })
                    .collect()
            })
            .map_err(from_display)
    }

    async fn archive_raw(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        archived_at: &str,
        _updated_at: &str,
    ) -> Result<Option<ProjectRecord>, ApplicationError> {
        self.projects
            .archive_cascade(connection, project_id, "lifecycle", archived_at)
            .await
            .map(|row| row.map(|row| map_project(row.project)))
            .map_err(from_storage)
    }

    async fn soft_delete_raw(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        deleted_at: &str,
        _updated_at: &str,
    ) -> Result<Option<ProjectRecord>, ApplicationError> {
        self.projects
            .soft_delete_cascade(connection, project_id, "lifecycle", deleted_at)
            .await
            .map(|row| row.map(|row| map_project(row.project)))
            .map_err(from_storage)
    }

    async fn restore_raw(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        updated_at: &str,
    ) -> Result<Option<ProjectRecord>, ApplicationError> {
        // 优先尝试恢复归档；失败再尝试回收站恢复。
        if let Some(row) = self
            .projects
            .restore_archive_cascade(connection, project_id, "lifecycle", updated_at)
            .await
            .map_err(from_storage)?
        {
            return Ok(Some(map_project(row.project)));
        }
        self.projects
            .restore_deleted_cascade(connection, project_id, "lifecycle", updated_at)
            .await
            .map(|row| row.map(|row| map_project(row.project)))
            .map_err(from_storage)
    }

    async fn hard_delete(
        &self,
        connection: &Self::Connection,
        project_id: &str,
    ) -> Result<(), ApplicationError> {
        self.projects
            .permanently_delete_cascade(
                connection,
                project_id,
                &stoneflow_domain::now_utc().to_rfc3339(),
            )
            .await
            .map(|_| ())
            .map_err(from_storage)
    }
}

impl LifecycleTaskPersistence for LifecyclePortsAdapter {
    type Connection = DatabaseTransaction;

    async fn begin(&self) -> Result<Self::Connection, ApplicationError> {
        self.db.begin().await.map_err(from_db)
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

    async fn list_by_space(&self, space_id: &str) -> Result<Vec<TaskRecord>, ApplicationError> {
        self.tasks
            .list_visible(Some(space_id), None, true, None)
            .await
            .map(|rows| rows.into_iter().map(map_task).collect())
            .map_err(from_storage)
    }

    async fn list_by_project(&self, project_id: &str) -> Result<Vec<TaskRecord>, ApplicationError> {
        self.tasks
            .list_visible(None, Some(Some(project_id)), true, None)
            .await
            .map(|rows| rows.into_iter().map(map_task).collect())
            .map_err(from_storage)
    }

    async fn list_archived(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<LifecycleTaskListRecord>, ApplicationError> {
        let mut query = Task::find()
            .filter(task::Column::ArchivedAt.is_not_null())
            .filter(task::Column::DeletedAt.is_null())
            .order_by_desc(task::Column::ArchivedAt);
        if let Some(space_id) = scope_space_id {
            query = query.filter(task::Column::SpaceId.eq(space_id));
        }
        query
            .all(&self.db)
            .await
            .map(|rows| {
                rows.into_iter()
                    .map(|row| LifecycleTaskListRecord {
                        id: row.id,
                        space_id: row.space_id,
                        project_id: row.project_id,
                        title: row.title,
                        archived_at: row.archived_at,
                        deleted_at: row.deleted_at,
                    })
                    .collect()
            })
            .map_err(from_display)
    }

    async fn list_trashed(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<Vec<LifecycleTaskListRecord>, ApplicationError> {
        let mut query = Task::find()
            .filter(task::Column::DeletedAt.is_not_null())
            .order_by_desc(task::Column::DeletedAt);
        if let Some(space_id) = scope_space_id {
            query = query.filter(task::Column::SpaceId.eq(space_id));
        }
        query
            .all(&self.db)
            .await
            .map(|rows| {
                rows.into_iter()
                    .map(|row| LifecycleTaskListRecord {
                        id: row.id,
                        space_id: row.space_id,
                        project_id: row.project_id,
                        title: row.title,
                        archived_at: row.archived_at,
                        deleted_at: row.deleted_at,
                    })
                    .collect()
            })
            .map_err(from_display)
    }

    async fn archive_raw(
        &self,
        connection: &Self::Connection,
        task_id: &str,
        archived_at: &str,
        _updated_at: &str,
    ) -> Result<Option<TaskRecord>, ApplicationError> {
        self.tasks
            .archive(connection, task_id, "lifecycle", archived_at)
            .await
            .map(|row| row.map(map_task))
            .map_err(from_storage)
    }

    async fn soft_delete_raw(
        &self,
        connection: &Self::Connection,
        task_id: &str,
        deleted_at: &str,
        _updated_at: &str,
    ) -> Result<Option<TaskRecord>, ApplicationError> {
        self.tasks
            .soft_delete(connection, task_id, "lifecycle", deleted_at)
            .await
            .map(|row| row.map(map_task))
            .map_err(from_storage)
    }

    async fn restore_raw(
        &self,
        connection: &Self::Connection,
        task_id: &str,
        updated_at: &str,
    ) -> Result<Option<TaskRecord>, ApplicationError> {
        self.tasks
            .restore(connection, task_id, "lifecycle", updated_at)
            .await
            .map(|row| row.map(map_task))
            .map_err(from_storage)
    }

    async fn hard_delete(
        &self,
        connection: &Self::Connection,
        task_id: &str,
    ) -> Result<(), ApplicationError> {
        self.tasks
            .permanently_delete(connection, task_id)
            .await
            .map(|_| ())
            .map_err(from_storage)
    }
}

fn map_space(model: space::Model) -> SpaceRecord {
    SpaceRecord {
        id: model.id,
        name: model.name,
        icon_key: model.icon_key,
        color_key: model.color_key,
        is_default: model.is_default,
        position: model.position,
        generation: model.generation,
        archived_at: model.archived_at,
        deleted_at: model.deleted_at,
        archived_by_operation_id: model.archived_by_operation_id,
        deleted_by_operation_id: model.deleted_by_operation_id,
        created_at: model.created_at,
        updated_at: model.updated_at,
    }
}

fn map_project(row: project::Model) -> ProjectRecord {
    ProjectRecord {
        id: row.id,
        space_id: row.space_id,
        name: row.name,
        description: row.description,
        status: work_status_to_domain(row.status),
        priority: row.priority,
        planned_at: row.planned_at,
        due_at: row.due_at,
        remind_at: row.remind_at,
        status_changed_at: row.status_changed_at,
        completed_at: row.completed_at,
        position: row.position,
        generation: row.generation,
        archived_at: row.archived_at,
        deleted_at: row.deleted_at,
        archived_by_operation_id: row.archived_by_operation_id,
        deleted_by_operation_id: row.deleted_by_operation_id,
        created_at: row.created_at,
        updated_at: row.updated_at,
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

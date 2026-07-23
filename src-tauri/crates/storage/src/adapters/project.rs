//! Project port 实现与 application service 工厂。

use std::collections::HashMap;

use sea_orm::{DatabaseConnection, DatabaseTransaction, TransactionTrait};
use stoneflow_application::{
    activity::{
        ActivityChangeRecord, ActivityEventRecord, ActivityPersistence, ActivityService,
        ActivityTimelineEntry, GetEntityActivitiesInput,
    },
    operation::OutboxEnqueueRecord,
    project::{
        CreateProjectPersistenceRecord, ProjectCascadeRecord, ProjectPersistence, ProjectRecord,
        ProjectService, ProjectSpaceReader, ProjectSpaceRecord, ProjectTaskCount, ProjectTaskCounter,
        UpdateProjectPatch as AppUpdateProjectPatch,
    },
    ApplicationError,
};

use crate::adapters::error::{from_db, from_storage};
use crate::entities::project;
use crate::mappers::work_status_to_domain;
use crate::repositories::{
    ActivityRepository, CreateProjectRecord, OutboxRepository, ProjectRepository, SpaceRepository,
    UpdateProjectPatch,
};

/// 已装配的 Project application service。
pub type ProjectAppService = ProjectService<
    ProjectPersistenceAdapter,
    ProjectPersistenceAdapter,
    ProjectPersistenceAdapter,
    ProjectPersistenceAdapter,
>;

/// 从数据库连接构造 Project 用例。
pub fn build_project_service(connection: DatabaseConnection) -> ProjectAppService {
    let projects = ProjectRepository::new(connection.clone());
    let spaces = SpaceRepository::new(connection);
    let adapter = ProjectPersistenceAdapter::new(projects, spaces);
    ProjectService::new(
        adapter.clone(),
        ActivityService::new(adapter.clone()),
        adapter.clone(),
        adapter,
    )
}

/// Project 持久化 adapter。
#[derive(Debug, Clone)]
pub struct ProjectPersistenceAdapter {
    projects: ProjectRepository,
    spaces: SpaceRepository,
    outbox: OutboxRepository,
    activities: ActivityRepository,
}

impl ProjectPersistenceAdapter {
    pub fn new(projects: ProjectRepository, spaces: SpaceRepository) -> Self {
        let connection = projects.connection().clone();
        Self {
            projects,
            spaces,
            outbox: OutboxRepository::new(connection),
            activities: ActivityRepository::new(),
        }
    }
}

impl ProjectPersistence for ProjectPersistenceAdapter {
    type Connection = DatabaseTransaction;

    async fn begin(&self) -> Result<Self::Connection, ApplicationError> {
        self.projects.connection().begin().await.map_err(from_db)
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
    async fn get_visible_by_name(
        &self,
        space_id: &str,
        name: &str,
    ) -> Result<Option<ProjectRecord>, ApplicationError> {
        self.projects
            .get_visible_by_name(space_id, name)
            .await
            .map(|row| row.map(map_project))
            .map_err(from_storage)
    }
    async fn next_position(
        &self,
        connection: &Self::Connection,
        space_id: &str,
    ) -> Result<i64, ApplicationError> {
        self.projects
            .next_position(connection, space_id)
            .await
            .map_err(from_storage)
    }
    async fn create(
        &self,
        connection: &Self::Connection,
        record: CreateProjectPersistenceRecord,
    ) -> Result<ProjectRecord, ApplicationError> {
        self.projects
            .create(
                connection,
                CreateProjectRecord {
                    id: record.id,
                    space_id: record.space_id,
                    name: record.name,
                    description: record.description,
                    status: record.status,
                    priority: record.priority,
                    planned_at: record.planned_at,
                    due_at: record.due_at,
                    remind_at: record.remind_at,
                    status_changed_at: record.status_changed_at,
                    completed_at: record.completed_at,
                    position: record.position,
                    created_at: record.created_at,
                    updated_at: record.updated_at,
                },
            )
            .await
            .map(map_project)
            .map_err(from_storage)
    }
    async fn update(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        patch: AppUpdateProjectPatch,
        updated_at: &str,
    ) -> Result<Option<ProjectRecord>, ApplicationError> {
        self.projects
            .update(
                connection,
                project_id,
                UpdateProjectPatch {
                    name: patch.name,
                    description: patch.description,
                    status: patch.status,
                    priority: patch.priority,
                    planned_at: patch.planned_at,
                    due_at: patch.due_at,
                    remind_at: patch.remind_at,
                    status_changed_at: patch.status_changed_at,
                    completed_at: patch.completed_at,
                    position: patch.position,
                },
                updated_at,
            )
            .await
            .map(|row| row.map(map_project))
            .map_err(from_storage)
    }
    async fn list_overview_by_scope(
        &self,
        space_id: Option<&str>,
        view: stoneflow_application::project::ProjectOverviewView,
    ) -> Result<Vec<ProjectRecord>, ApplicationError> {
        let include_completed = !matches!(
            view,
            stoneflow_application::project::ProjectOverviewView::Active
        );
        let mut rows = self
            .projects
            .list_visible(space_id, include_completed)
            .await
            .map_err(from_storage)?;
        if matches!(
            view,
            stoneflow_application::project::ProjectOverviewView::Completed
        ) {
            rows.retain(|row| row.completed_at.is_some());
        }
        if matches!(
            view,
            stoneflow_application::project::ProjectOverviewView::Active
        ) {
            rows.retain(|row| row.completed_at.is_none());
        }
        Ok(rows.into_iter().map(map_project).collect())
    }
    async fn list_sidebar_by_scope(
        &self,
        space_id: Option<&str>,
        show_completed: bool,
        max_visible: Option<u64>,
    ) -> Result<Vec<ProjectRecord>, ApplicationError> {
        let mut rows = self
            .projects
            .list_visible(space_id, show_completed)
            .await
            .map_err(from_storage)?;
        if let Some(max_visible) = max_visible {
            rows.truncate(max_visible as usize);
        }
        Ok(rows.into_iter().map(map_project).collect())
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
    async fn archive_cascade(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        operation_id: &str,
        archived_at: &str,
    ) -> Result<Option<ProjectCascadeRecord>, ApplicationError> {
        self.projects
            .archive_cascade(connection, project_id, operation_id, archived_at)
            .await
            .map(|row| {
                row.map(|row| ProjectCascadeRecord {
                    project: map_project(row.project),
                    affected_task_count: row.affected_task_count,
                })
            })
            .map_err(from_storage)
    }
    async fn soft_delete_cascade(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        operation_id: &str,
        deleted_at: &str,
    ) -> Result<Option<ProjectCascadeRecord>, ApplicationError> {
        self.projects
            .soft_delete_cascade(connection, project_id, operation_id, deleted_at)
            .await
            .map(|row| {
                row.map(|row| ProjectCascadeRecord {
                    project: map_project(row.project),
                    affected_task_count: row.affected_task_count,
                })
            })
            .map_err(from_storage)
    }
    async fn restore_archive_cascade(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        operation_id: &str,
        updated_at: &str,
    ) -> Result<Option<ProjectCascadeRecord>, ApplicationError> {
        self.projects
            .restore_archive_cascade(connection, project_id, operation_id, updated_at)
            .await
            .map(|row| {
                row.map(|row| ProjectCascadeRecord {
                    project: map_project(row.project),
                    affected_task_count: row.affected_task_count,
                })
            })
            .map_err(from_storage)
    }
    async fn restore_deleted_cascade(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        operation_id: &str,
        updated_at: &str,
    ) -> Result<Option<ProjectCascadeRecord>, ApplicationError> {
        self.projects
            .restore_deleted_cascade(connection, project_id, operation_id, updated_at)
            .await
            .map(|row| {
                row.map(|row| ProjectCascadeRecord {
                    project: map_project(row.project),
                    affected_task_count: row.affected_task_count,
                })
            })
            .map_err(from_storage)
    }
    async fn permanently_delete_cascade(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        deleted_at: &str,
    ) -> Result<Option<ProjectCascadeRecord>, ApplicationError> {
        self.projects
            .permanently_delete_cascade(connection, project_id, deleted_at)
            .await
            .map(|row| {
                row.map(|row| ProjectCascadeRecord {
                    project: map_project(row.project),
                    affected_task_count: row.affected_task_count,
                })
            })
            .map_err(from_storage)
    }
}

impl ProjectSpaceReader for ProjectPersistenceAdapter {
    async fn get(&self, space_id: &str) -> Result<Option<ProjectSpaceRecord>, ApplicationError> {
        self.spaces
            .get(space_id)
            .await
            .map(|row| {
                row.map(|space| ProjectSpaceRecord {
                    id: space.id,
                    name: space.name,
                    archived_at: space.archived_at,
                })
            })
            .map_err(from_storage)
    }
    async fn list_by_ids(
        &self,
        space_ids: &[String],
    ) -> Result<Vec<ProjectSpaceRecord>, ApplicationError> {
        let mut spaces = Vec::new();
        for space_id in space_ids {
            if let Some(space) = ProjectSpaceReader::get(self, space_id).await? {
                spaces.push(space);
            }
        }
        Ok(spaces)
    }
}

impl ProjectTaskCounter for ProjectPersistenceAdapter {
    async fn count_by_project_ids(
        &self,
        project_ids: &[String],
    ) -> Result<HashMap<String, ProjectTaskCount>, ApplicationError> {
        Ok(self
            .projects
            .count_tasks_by_project_ids(project_ids)
            .await
            .map_err(from_storage)?
            .into_iter()
            .map(|(id, total_count, active_count)| {
                (
                    id,
                    ProjectTaskCount {
                        total_count,
                        active_count,
                    },
                )
            })
            .collect())
    }
}

impl ActivityPersistence for ProjectPersistenceAdapter {
    type Connection = DatabaseTransaction;
    async fn begin(&self) -> Result<Self::Connection, ApplicationError> {
        ProjectPersistence::begin(self).await
    }
    async fn commit(&self, connection: Self::Connection) -> Result<(), ApplicationError> {
        ProjectPersistence::commit(self, connection).await
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

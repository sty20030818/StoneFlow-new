//! Project runtime adapter：实现 application ports，不在 command 层保留业务规则。

use std::collections::HashMap;

use sea_orm::{DatabaseTransaction, TransactionTrait};
use stoneflow_application::{
    activity::{
        ActivityChangeRecord, ActivityEventRecord, ActivityPersistence, ActivityTimelineEntry,
        GetEntityActivitiesInput,
    },
    operation::OutboxEnqueueRecord,
    project::{
        CreateProjectPersistenceRecord, ProjectCascadeRecord, ProjectPersistence, ProjectRecord,
        ProjectService as ProjectUsecase, ProjectSpaceReader, ProjectSpaceRecord, ProjectTaskCount,
        ProjectTaskCounter, UpdateProjectPatch as AppUpdateProjectPatch,
    },
    ApplicationError,
};
use stoneflow_storage::{
    entities::{common::WorkStatus as StorageWorkStatus, project},
    repositories::{
        ActivityRepository, CreateProjectRecord, OutboxRepository, ProjectRepository,
        SpaceRepository, UpdateProjectPatch,
    },
};

use crate::app::error::AppError;

pub use stoneflow_application::project::{
    CreateProjectInput, ListProjectOverviewInput, ListSidebarProjectsInput, ProjectDetailDto,
    ProjectIdInput, ProjectOverviewItemDto, ProjectSidebarItemDto, UpdateProjectInput,
};

type InnerProjectService = ProjectUsecase<
    ProjectPersistenceAdapter,
    ProjectPersistenceAdapter,
    ProjectPersistenceAdapter,
    ProjectPersistenceAdapter,
>;

pub struct ProjectService {
    inner: InnerProjectService,
}

impl ProjectService {
    pub fn new(repository: ProjectRepository, spaces: SpaceRepository) -> Self {
        let adapter = ProjectPersistenceAdapter::new(repository, spaces);
        Self {
            inner: ProjectUsecase::new(
                adapter.clone(),
                stoneflow_application::activity::ActivityService::new(adapter.clone()),
                adapter.clone(),
                adapter,
            ),
        }
    }

    pub async fn list_project_overview(
        &self,
        input: ListProjectOverviewInput,
    ) -> Result<Vec<ProjectOverviewItemDto>, AppError> {
        self.inner
            .list_project_overview(input)
            .await
            .map_err(AppError::from)
    }
    pub async fn list_sidebar_projects(
        &self,
        input: ListSidebarProjectsInput,
    ) -> Result<Vec<ProjectSidebarItemDto>, AppError> {
        self.inner
            .list_sidebar_projects(input)
            .await
            .map_err(AppError::from)
    }
    pub async fn get_project_detail(
        &self,
        input: ProjectIdInput,
    ) -> Result<ProjectDetailDto, AppError> {
        self.inner
            .get_project_detail(input)
            .await
            .map_err(AppError::from)
    }
    pub async fn create_project(
        &self,
        input: CreateProjectInput,
    ) -> Result<ProjectDetailDto, AppError> {
        self.inner
            .create_project(input)
            .await
            .map_err(AppError::from)
    }
    pub async fn update_project(
        &self,
        input: UpdateProjectInput,
    ) -> Result<ProjectDetailDto, AppError> {
        self.inner
            .update_project(input)
            .await
            .map_err(AppError::from)
    }
    pub async fn archive_project(
        &self,
        input: ProjectIdInput,
    ) -> Result<ProjectDetailDto, AppError> {
        self.inner
            .archive_project(input)
            .await
            .map_err(AppError::from)
    }
    pub async fn restore_project(
        &self,
        input: ProjectIdInput,
    ) -> Result<ProjectDetailDto, AppError> {
        self.inner
            .restore_project(input)
            .await
            .map_err(AppError::from)
    }
    pub async fn delete_project(
        &self,
        input: ProjectIdInput,
    ) -> Result<ProjectDetailDto, AppError> {
        self.inner
            .delete_project(input)
            .await
            .map_err(AppError::from)
    }
    pub async fn permanently_delete_project(&self, input: ProjectIdInput) -> Result<(), AppError> {
        self.inner
            .permanently_delete_project(input)
            .await
            .map_err(AppError::from)
    }
}

#[derive(Debug, Clone)]
struct ProjectPersistenceAdapter {
    projects: ProjectRepository,
    spaces: SpaceRepository,
    outbox: OutboxRepository,
    activities: ActivityRepository,
}

impl ProjectPersistenceAdapter {
    fn new(projects: ProjectRepository, spaces: SpaceRepository) -> Self {
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
        self.projects
            .connection()
            .begin()
            .await
            .map_err(storage_error)
    }
    async fn commit(&self, connection: Self::Connection) -> Result<(), ApplicationError> {
        connection.commit().await.map_err(storage_error)
    }
    async fn get(&self, project_id: &str) -> Result<Option<ProjectRecord>, ApplicationError> {
        self.projects
            .get(project_id)
            .await
            .map(|row| row.map(map_project))
            .map_err(map_storage_error)
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
            .map_err(map_storage_error)
    }
    async fn next_position(
        &self,
        connection: &Self::Connection,
        space_id: &str,
    ) -> Result<i64, ApplicationError> {
        self.projects
            .next_position(connection, space_id)
            .await
            .map_err(map_storage_error)
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
            .map_err(map_storage_error)
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
            .map_err(map_storage_error)
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
            .map_err(map_storage_error)?;
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
            .map_err(map_storage_error)?;
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
            .map_err(map_storage_error)
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
            .map_err(map_storage_error)
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
            .map_err(map_storage_error)
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
            .map_err(map_storage_error)
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
            .map_err(map_storage_error)
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
            .map_err(map_storage_error)
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
            .map_err(map_storage_error)
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
            .map_err(map_storage_error)?
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
            .map_err(map_storage_error)
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
        status: from_storage_status(row.status),
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

fn from_storage_status(status: StorageWorkStatus) -> stoneflow_domain::WorkStatus {
    match status {
        StorageWorkStatus::Todo => stoneflow_domain::WorkStatus::Todo,
        StorageWorkStatus::Doing => stoneflow_domain::WorkStatus::Doing,
        StorageWorkStatus::Waiting => stoneflow_domain::WorkStatus::Waiting,
        StorageWorkStatus::Done => stoneflow_domain::WorkStatus::Done,
        StorageWorkStatus::Canceled => stoneflow_domain::WorkStatus::Canceled,
    }
}
fn storage_error(error: sea_orm::DbErr) -> ApplicationError {
    ApplicationError::storage(error.to_string())
}
fn map_storage_error(error: stoneflow_storage::StorageError) -> ApplicationError {
    ApplicationError::storage(error.to_string())
}

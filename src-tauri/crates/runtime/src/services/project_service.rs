//! Project Service 兼容壳：CRUD 真源在 `stoneflow-usecase`；生命周期仍委托 `LifecycleService`。

use sea_orm::TransactionTrait;
use stoneflow_domain::validate_project_id;
use stoneflow_usecase::{
    activity::ActivityService as ActivityUsecase,
    project::{
        ProjectPersistence, ProjectService as ProjectUsecase, ProjectSpaceReader,
        ProjectTaskCounter,
    },
};

use crate::{

    app::error::AppError,
    services::{
        activity::ActivityPersistenceAdapter,
        LifecycleService,
    }
};
use stoneflow_storage::{
        mappers::{map_project_model_to_record, map_space_model_to_project_space_record},
        repositories::{
            CreateProjectRecord, ProjectOverviewView as RepoProjectOverviewView,
            ProjectRepository, SpaceRepository, TaskRepository, UpdateProjectPatch,
        },};


pub use stoneflow_usecase::project::{
    CreateProjectInput, ListProjectOverviewInput, ListSidebarProjectsInput, ProjectDetailDto,
    ProjectIdInput, ProjectOverviewItemDto, ProjectScopeInput, ProjectScopeKind,
    ProjectSidebarItemDto, UpdateProjectInput,
};

/// Project 编排兼容壳。
#[derive(Debug, Clone)]
pub struct ProjectService {
    inner: ProjectUsecase<
        ProjectPersistenceAdapter,
        ActivityPersistenceAdapter,
        ProjectSpaceReaderAdapter,
        ProjectTaskCounterAdapter,
    >,
    space_repository: SpaceRepository,
    repository: ProjectRepository,
    task_repository: TaskRepository,
    activity_service: crate::services::activity::ActivityService,
}

impl ProjectService {
    pub fn new(
        space_repository: SpaceRepository,
        repository: ProjectRepository,
        task_repository: TaskRepository,
        activity_service: crate::services::activity::ActivityService,
    ) -> Self {
        let activity_repo = activity_service.repository().clone();
        Self {
            inner: ProjectUsecase::new(
                ProjectPersistenceAdapter::new(repository.clone()),
                ActivityUsecase::new(ActivityPersistenceAdapter::new(activity_repo)),
                ProjectSpaceReaderAdapter::new(space_repository.clone()),
                ProjectTaskCounterAdapter::new(task_repository.clone()),
            ),
            space_repository,
            repository,
            task_repository,
            activity_service,
        }
    }

    pub fn repository(&self) -> &ProjectRepository {
        &self.repository
    }

    fn lifecycle_service(&self) -> LifecycleService {
        LifecycleService::new(
            self.space_repository.clone(),
            self.repository.clone(),
            self.task_repository.clone(),
            self.activity_service.clone(),
        )
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

    pub async fn complete_project(
        &self,
        input: ProjectIdInput,
    ) -> Result<ProjectDetailDto, AppError> {
        self.inner
            .complete_project(input)
            .await
            .map_err(AppError::from)
    }

    pub async fn reopen_project(
        &self,
        input: ProjectIdInput,
    ) -> Result<ProjectDetailDto, AppError> {
        self.inner
            .reopen_project(input)
            .await
            .map_err(AppError::from)
    }

    pub async fn archive_project(
        &self,
        input: ProjectIdInput,
    ) -> Result<ProjectDetailDto, AppError> {
        let project_id = validate_project_id(&input.project_id).map_err(AppError::from)?;
        let updated = self
            .lifecycle_service()
            .archive_project(&project_id)
            .await?;
        self.inner
            .build_project_detail_from_record(updated)
            .await
            .map_err(AppError::from)
    }

    pub async fn restore_project(
        &self,
        input: ProjectIdInput,
    ) -> Result<ProjectDetailDto, AppError> {
        let project_id = validate_project_id(&input.project_id).map_err(AppError::from)?;
        let updated = self
            .lifecycle_service()
            .restore_project(&project_id)
            .await?;
        self.inner
            .build_project_detail_from_record(updated)
            .await
            .map_err(AppError::from)
    }

    pub async fn delete_project(
        &self,
        input: ProjectIdInput,
    ) -> Result<ProjectDetailDto, AppError> {
        let project_id = validate_project_id(&input.project_id).map_err(AppError::from)?;
        let updated = self
            .lifecycle_service()
            .delete_project(&project_id)
            .await?;
        self.inner
            .build_project_detail_from_record(updated)
            .await
            .map_err(AppError::from)
    }
}

#[derive(Debug, Clone)]
struct ProjectPersistenceAdapter {
    repository: ProjectRepository,
}

impl ProjectPersistenceAdapter {
    fn new(repository: ProjectRepository) -> Self {
        Self { repository }
    }
}

impl ProjectPersistence for ProjectPersistenceAdapter {
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
    ) -> Result<Option<stoneflow_usecase::project::ProjectRecord>, stoneflow_usecase::UsecaseError>
    {
        self.repository
            .get(project_id)
            .await
            .map(|project| project.map(map_project_model_to_record))
            .map_err(|error| map_app_error(error.into()))
    }

    async fn get_visible_by_name(
        &self,
        space_id: &str,
        name: &str,
    ) -> Result<Option<stoneflow_usecase::project::ProjectRecord>, stoneflow_usecase::UsecaseError>
    {
        self.repository
            .get_visible_by_name(space_id, name)
            .await
            .map(|project| project.map(map_project_model_to_record))
            .map_err(|error| map_app_error(error.into()))
    }

    async fn next_sort_order(
        &self,
        connection: &Self::Connection,
        space_id: &str,
    ) -> Result<i32, stoneflow_usecase::UsecaseError> {
        self.repository
            .next_sort_order(connection, space_id)
            .await
            .map_err(|error| map_app_error(error.into()))
    }

    async fn create(
        &self,
        connection: &Self::Connection,
        record: stoneflow_usecase::project::CreateProjectPersistenceRecord,
    ) -> Result<stoneflow_usecase::project::ProjectRecord, stoneflow_usecase::UsecaseError> {
        self.repository
            .create(
                connection,
                CreateProjectRecord {
                    id: record.id,
                    space_id: record.space_id,
                    name: record.name,
                    description: record.description,
                    due_at: record.due_at,
                    sort_order: record.sort_order,
                    created_at: record.created_at,
                    updated_at: record.updated_at,
                },
            )
            .await
            .map(map_project_model_to_record)
            .map_err(|error| map_app_error(error.into()))
    }

    async fn update(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        patch: stoneflow_usecase::project::UpdateProjectPatch,
        updated_at: &str,
    ) -> Result<Option<stoneflow_usecase::project::ProjectRecord>, stoneflow_usecase::UsecaseError>
    {
        self.repository
            .update(
                connection,
                project_id,
                UpdateProjectPatch {
                    name: patch.name,
                    description: patch.description,
                    due_at: patch.due_at,
                    sort_order: patch.sort_order,
                },
                updated_at,
            )
            .await
            .map(|project| project.map(map_project_model_to_record))
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list_overview_by_scope(
        &self,
        space_id: Option<&str>,
        view: stoneflow_usecase::project::ProjectOverviewView,
    ) -> Result<Vec<stoneflow_usecase::project::ProjectRecord>, stoneflow_usecase::UsecaseError>
    {
        self.repository
            .list_overview_by_scope(space_id, map_overview_view_to_repo(view))
            .await
            .map(|projects| projects.into_iter().map(map_project_model_to_record).collect())
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list_sidebar_by_scope(
        &self,
        space_id: Option<&str>,
        show_completed: bool,
        max_visible: Option<u64>,
    ) -> Result<Vec<stoneflow_usecase::project::ProjectRecord>, stoneflow_usecase::UsecaseError>
    {
        self.repository
            .list_sidebar_by_scope(space_id, show_completed, max_visible)
            .await
            .map(|projects| projects.into_iter().map(map_project_model_to_record).collect())
            .map_err(|error| map_app_error(error.into()))
    }

    async fn complete_raw(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        completed_at: &str,
        updated_at: &str,
    ) -> Result<Option<stoneflow_usecase::project::ProjectRecord>, stoneflow_usecase::UsecaseError>
    {
        self.repository
            .complete_raw(connection, project_id, completed_at, updated_at)
            .await
            .map(|project| project.map(map_project_model_to_record))
            .map_err(|error| map_app_error(error.into()))
    }

    async fn reopen_raw(
        &self,
        connection: &Self::Connection,
        project_id: &str,
        updated_at: &str,
    ) -> Result<Option<stoneflow_usecase::project::ProjectRecord>, stoneflow_usecase::UsecaseError>
    {
        self.repository
            .reopen_raw(connection, project_id, updated_at)
            .await
            .map(|project| project.map(map_project_model_to_record))
            .map_err(|error| map_app_error(error.into()))
    }
}

#[derive(Debug, Clone)]
struct ProjectSpaceReaderAdapter {
    repository: SpaceRepository,
}

impl ProjectSpaceReaderAdapter {
    fn new(repository: SpaceRepository) -> Self {
        Self { repository }
    }
}

impl ProjectSpaceReader for ProjectSpaceReaderAdapter {
    async fn get(
        &self,
        space_id: &str,
    ) -> Result<Option<stoneflow_usecase::project::ProjectSpaceRecord>, stoneflow_usecase::UsecaseError>
    {
        self.repository
            .get(space_id)
            .await
            .map(|space| space.map(map_space_model_to_project_space_record))
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list_by_ids(
        &self,
        space_ids: &[String],
    ) -> Result<Vec<stoneflow_usecase::project::ProjectSpaceRecord>, stoneflow_usecase::UsecaseError>
    {
        self.repository
            .list_by_ids(space_ids)
            .await
            .map(|spaces| {
                spaces
                    .into_iter()
                    .map(map_space_model_to_project_space_record)
                    .collect()
            })
            .map_err(|error| map_app_error(error.into()))
    }
}

#[derive(Debug, Clone)]
struct ProjectTaskCounterAdapter {
    repository: TaskRepository,
}

impl ProjectTaskCounterAdapter {
    fn new(repository: TaskRepository) -> Self {
        Self { repository }
    }
}

impl ProjectTaskCounter for ProjectTaskCounterAdapter {
    async fn count_by_project_ids(
        &self,
        project_ids: &[String],
    ) -> Result<
        std::collections::HashMap<String, stoneflow_usecase::project::ProjectTaskCount>,
        stoneflow_usecase::UsecaseError,
    > {
        self.repository
            .count_by_project_ids(project_ids)
            .await
            .map(|counts| {
                counts
                    .into_iter()
                    .map(|(id, count)| {
                        (
                            id,
                            stoneflow_usecase::project::ProjectTaskCount {
                                total_count: count.total_count,
                                active_count: count.active_count,
                            },
                        )
                    })
                    .collect()
            })
            .map_err(|error| map_app_error(error.into()))
    }
}

fn map_overview_view_to_repo(
    view: stoneflow_usecase::project::ProjectOverviewView,
) -> RepoProjectOverviewView {
    match view {
        stoneflow_usecase::project::ProjectOverviewView::Active => {
            RepoProjectOverviewView::Active
        }
        stoneflow_usecase::project::ProjectOverviewView::Completed => {
            RepoProjectOverviewView::Completed
        }
        stoneflow_usecase::project::ProjectOverviewView::Archived => {
            RepoProjectOverviewView::Archived
        }
        stoneflow_usecase::project::ProjectOverviewView::All => RepoProjectOverviewView::All,
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
        AppError::Internal(message)
        | AppError::Forbidden(message)
        | AppError::CaptureSpaceUnavailable(message)
        | AppError::DefaultSpaceUnavailable(message)
        | AppError::CapturePersistence(message) => {
            stoneflow_usecase::UsecaseError::internal(message)
        }
    }
}

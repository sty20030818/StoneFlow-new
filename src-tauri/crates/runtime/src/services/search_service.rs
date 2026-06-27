//! Search Service 兼容壳：真实搜索编排已迁到 `stoneflow-usecase`。

use stoneflow_usecase::search::{
    ProjectSearchLifecycle as UsecaseProjectSearchLifecycle, SearchProjectReader,
    SearchProjectRecord, SearchService as SearchUsecase, SearchSpaceReader, SearchSpaceRecord,
    SearchTaskReader, SearchTaskRecord, TaskSearchLifecycle as UsecaseTaskSearchLifecycle,
};

use crate::app::error::AppError;
use stoneflow_storage::{
    mappers::task_status_to_domain,
    repositories::{
        ProjectRepository, ProjectSearchLifecycle, SpaceRepository, TaskRepository,
        TaskSearchLifecycle,
    },
};

pub use stoneflow_usecase::search::{
    SearchEntitiesInput, SearchEntitiesResultDto, SearchProjectItemDto, SearchTaskItemDto,
};

#[derive(Debug, Clone)]
struct SpaceReaderAdapter {
    repository: SpaceRepository,
}

impl SearchSpaceReader for SpaceReaderAdapter {
    async fn list_visible_spaces(
        &self,
    ) -> Result<Vec<SearchSpaceRecord>, stoneflow_usecase::UsecaseError> {
        self.repository
            .list_visible()
            .await
            .map(|spaces| {
                spaces
                    .into_iter()
                    .map(|space| SearchSpaceRecord {
                        id: space.id,
                        name: space.name,
                    })
                    .collect()
            })
            .map_err(|error| map_app_error(error.into()))
    }
}

#[derive(Debug, Clone)]
struct ProjectReaderAdapter {
    repository: ProjectRepository,
}

impl SearchProjectReader for ProjectReaderAdapter {
    async fn search_projects(
        &self,
        query: &str,
        lifecycle: UsecaseProjectSearchLifecycle,
    ) -> Result<Vec<SearchProjectRecord>, stoneflow_usecase::UsecaseError> {
        self.repository
            .search_by_query(
                query,
                match lifecycle {
                    UsecaseProjectSearchLifecycle::Active => ProjectSearchLifecycle::Active,
                    UsecaseProjectSearchLifecycle::Completed => ProjectSearchLifecycle::Completed,
                },
            )
            .await
            .map(|projects| projects.into_iter().map(map_project_record).collect())
            .map_err(|error| map_app_error(error.into()))
    }
}

#[derive(Debug, Clone)]
struct TaskReaderAdapter {
    task_repository: TaskRepository,
    project_repository: ProjectRepository,
}

impl SearchTaskReader for TaskReaderAdapter {
    async fn search_tasks(
        &self,
        query: &str,
        lifecycle: UsecaseTaskSearchLifecycle,
    ) -> Result<Vec<SearchTaskRecord>, stoneflow_usecase::UsecaseError> {
        self.task_repository
            .search_by_query(
                query,
                match lifecycle {
                    UsecaseTaskSearchLifecycle::Active => TaskSearchLifecycle::Active,
                    UsecaseTaskSearchLifecycle::Closed => TaskSearchLifecycle::Closed,
                },
            )
            .await
            .map(|tasks| tasks.into_iter().map(map_task_record).collect())
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list_projects_by_ids(
        &self,
        project_ids: &[String],
    ) -> Result<Vec<SearchProjectRecord>, stoneflow_usecase::UsecaseError> {
        self.project_repository
            .list_by_ids(project_ids)
            .await
            .map(|projects| projects.into_iter().map(map_project_record).collect())
            .map_err(|error| map_app_error(error.into()))
    }
}

/// 搜索兼容壳。
#[derive(Debug, Clone)]
pub struct SearchService {
    inner: SearchUsecase<SpaceReaderAdapter, ProjectReaderAdapter, TaskReaderAdapter>,
}

impl SearchService {
    pub fn new(
        space_repository: SpaceRepository,
        project_repository: ProjectRepository,
        task_repository: TaskRepository,
    ) -> Self {
        Self {
            inner: SearchUsecase::new(
                SpaceReaderAdapter {
                    repository: space_repository,
                },
                ProjectReaderAdapter {
                    repository: project_repository.clone(),
                },
                TaskReaderAdapter {
                    task_repository,
                    project_repository,
                },
            ),
        }
    }

    pub async fn search_entities(
        &self,
        input: SearchEntitiesInput,
    ) -> Result<SearchEntitiesResultDto, AppError> {
        self.inner
            .search_entities(input)
            .await
            .map_err(AppError::from)
    }
}

fn map_project_record(project: stoneflow_schema::project::Model) -> SearchProjectRecord {
    SearchProjectRecord {
        id: project.id,
        space_id: project.space_id,
        name: project.name,
        note: project.description,
        updated_at: project.updated_at,
        completed_at: project.completed_at,
    }
}

fn map_task_record(task: stoneflow_schema::task::Model) -> SearchTaskRecord {
    SearchTaskRecord {
        id: task.id,
        space_id: task.space_id,
        project_id: task.project_id,
        inbox_at: task.inbox_at,
        title: task.title,
        note: task.note,
        priority: task.priority,
        status: task_status_to_domain(task.status),
        updated_at: task.updated_at,
        completed_at: task.completed_at,
    }
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

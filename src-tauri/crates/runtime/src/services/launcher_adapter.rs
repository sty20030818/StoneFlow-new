//! Launcher port adapter：连接 usecase 与 runtime 服务/仓储。

use std::collections::HashMap;

use stoneflow_domain::LauncherSpaceCandidate;
use stoneflow_schema::{project, space, task};
use stoneflow_usecase::{
    launcher::{
        LauncherPorts, LauncherTaskDetail, LauncherProjectItemDto, LauncherSidebarProjectDto,
        LauncherSpaceSummaryDto, LauncherTaskItemDto,
    },
    UsecaseError,
};

use crate::{
    app::error::AppError,
    services::{
        ListSidebarProjectsInput, ProjectScopeInput, ProjectScopeKind, ProjectService,
        SpaceService, TaskDetailDto, TaskIdInput, TaskService,
    },
};
use stoneflow_storage::{
    mappers::task_status_to_domain,
    repositories::{ProjectRepository, SpaceRepository, TaskPlacementQuery, TaskRepository},
};

#[derive(Debug, Clone)]
pub struct LauncherPortsAdapter {
    space_service: SpaceService,
    project_service: ProjectService,
    task_service: TaskService,
    space_repository: SpaceRepository,
    project_repository: ProjectRepository,
    task_repository: TaskRepository,
}

impl LauncherPortsAdapter {
    pub fn new(
        space_service: SpaceService,
        project_service: ProjectService,
        task_service: TaskService,
        space_repository: SpaceRepository,
        project_repository: ProjectRepository,
        task_repository: TaskRepository,
    ) -> Self {
        Self {
            space_service,
            project_service,
            task_service,
            space_repository,
            project_repository,
            task_repository,
        }
    }
}

impl LauncherPorts for LauncherPortsAdapter {
    async fn list_visible_spaces(&self) -> Result<Vec<LauncherSpaceSummaryDto>, UsecaseError> {
        self.space_service
            .list_visible_spaces()
            .await
            .map(|spaces| {
                spaces
                    .into_iter()
                    .map(|space| LauncherSpaceSummaryDto {
                        id: space.id,
                        name: space.name,
                        icon_key: space.icon_key,
                        color_key: space.color_key,
                        is_default: space.is_default,
                    })
                    .collect()
            })
            .map_err(map_app_error)
    }

    async fn list_space_candidates(&self) -> Result<Vec<LauncherSpaceCandidate>, UsecaseError> {
        self.space_repository
            .list_visible()
            .await
            .map(|spaces| {
                spaces
                    .into_iter()
                    .map(|space| LauncherSpaceCandidate {
                        id: space.id,
                        is_default: space.is_default,
                    })
                    .collect()
            })
            .map_err(map_storage_error)
    }

    async fn get_space(
        &self,
        space_id: &str,
    ) -> Result<Option<LauncherSpaceCandidate>, UsecaseError> {
        self.space_repository
            .get(space_id)
            .await
            .map(|space| {
                space.map(|space| LauncherSpaceCandidate {
                    id: space.id,
                    is_default: space.is_default,
                })
            })
            .map_err(map_storage_error)
    }

    async fn list_sidebar_projects_for_space(
        &self,
        space_id: &str,
    ) -> Result<Vec<LauncherSidebarProjectDto>, UsecaseError> {
        self.project_service
            .list_sidebar_projects(ListSidebarProjectsInput {
                scope: ProjectScopeInput {
                    kind: ProjectScopeKind::Space,
                    space_id: Some(space_id.to_owned()),
                },
                show_completed: true,
                max_visible: None,
            })
            .await
            .map(|projects| {
                projects
                    .into_iter()
                    .map(|project| LauncherSidebarProjectDto {
                        id: project.id,
                        space_id: project.space_id,
                        name: project.name,
                    })
                    .collect()
            })
            .map_err(map_app_error)
    }

    async fn get_task_detail(&self, task_id: &str) -> Result<LauncherTaskDetail, UsecaseError> {
        self.task_service
            .get_task_detail(TaskIdInput {
                task_id: task_id.to_owned(),
            })
            .await
            .map(map_task_detail)
            .map_err(map_app_error)
    }

    async fn get_project_space_id(&self, project_id: &str) -> Result<String, UsecaseError> {
        self.project_service
            .get_project_detail(stoneflow_usecase::project::ProjectIdInput {
                project_id: project_id.to_owned(),
            })
            .await
            .map(|detail| detail.space_id)
            .map_err(map_app_error)
    }

    async fn list_recent_tasks(&self, limit: usize) -> Result<Vec<LauncherTaskItemDto>, UsecaseError> {
        let spaces = self
            .space_repository
            .list_visible()
            .await
            .map_err(map_storage_error)?;
        let space_map: HashMap<String, space::Model> = spaces
            .into_iter()
            .map(|space| (space.id.clone(), space))
            .collect();

        let mut tasks = self
            .task_repository
            .list_candidates(None, TaskPlacementQuery::All, false)
            .await
            .map_err(map_storage_error)?;
        tasks.retain(|item| item.archived_at.is_none());
        tasks.sort_by(|left, right| right.updated_at.cmp(&left.updated_at));
        tasks.truncate(limit);

        let project_ids: Vec<String> = tasks
            .iter()
            .filter_map(|task| task.project_id.clone())
            .collect();
        let project_map: HashMap<String, project::Model> = self
            .project_repository
            .list_by_ids(&project_ids)
            .await
            .map_err(map_storage_error)?
            .into_iter()
            .map(|project| (project.id.clone(), project))
            .collect();

        Ok(tasks
            .into_iter()
            .map(|task| map_task_model(task, &space_map, &project_map))
            .collect())
    }

    async fn list_recent_projects(
        &self,
        limit: usize,
    ) -> Result<Vec<LauncherProjectItemDto>, UsecaseError> {
        let spaces = self
            .space_repository
            .list_visible()
            .await
            .map_err(map_storage_error)?;
        let space_map: HashMap<String, space::Model> = spaces
            .into_iter()
            .map(|space| (space.id.clone(), space))
            .collect();

        let mut projects = self
            .project_repository
            .list_sidebar_by_scope(None, true, None)
            .await
            .map_err(map_storage_error)?;
        projects.sort_by(|left, right| right.updated_at.cmp(&left.updated_at));
        projects.truncate(limit);

        Ok(projects
            .into_iter()
            .map(|project| map_project_model(project, &space_map))
            .collect())
    }
}

fn map_task_detail(detail: TaskDetailDto) -> LauncherTaskDetail {
    LauncherTaskDetail {
        id: detail.id,
        space_id: detail.space_id,
        project_id: detail.project_id,
        inbox_at: detail.inbox_at,
        title: detail.title,
        note: detail.note,
        due_at: detail.due_at,
        scheduled_at: detail.scheduled_at,
        reminder_at: detail.reminder_at,
    }
}

fn map_task_model(
    task: task::Model,
    spaces: &HashMap<String, space::Model>,
    projects: &HashMap<String, project::Model>,
) -> LauncherTaskItemDto {
    let space_name = spaces
        .get(&task.space_id)
        .map(|space| space.name.clone())
        .unwrap_or_else(|| task.space_id.clone());
    let project_name = task
        .project_id
        .as_ref()
        .and_then(|project_id| projects.get(project_id))
        .map(|project| project.name.clone());

    LauncherTaskItemDto {
        id: task.id,
        space_id: task.space_id,
        space_name,
        project_id: task.project_id,
        project_name,
        inbox_at: task.inbox_at,
        title: task.title,
        note: task.note,
        priority: task.priority,
        status: map_schema_task_status(task.status),
        updated_at: task.updated_at,
        completed_at: task.completed_at,
    }
}

fn map_project_model(
    project: project::Model,
    spaces: &HashMap<String, space::Model>,
) -> LauncherProjectItemDto {
    let space_name = spaces
        .get(&project.space_id)
        .map(|space| space.name.clone())
        .unwrap_or_else(|| project.space_id.clone());

    LauncherProjectItemDto {
        id: project.id,
        space_id: project.space_id,
        space_name,
        name: project.name,
        note: project.description,
        updated_at: project.updated_at,
        completed_at: project.completed_at,
    }
}

fn map_schema_task_status(status: stoneflow_schema::common::TaskStatus) -> String {
    match task_status_to_domain(status) {
        stoneflow_domain::TaskStatus::Todo => "todo".to_owned(),
        stoneflow_domain::TaskStatus::Doing => "doing".to_owned(),
        stoneflow_domain::TaskStatus::Waiting => "waiting".to_owned(),
        stoneflow_domain::TaskStatus::Done => "done".to_owned(),
        stoneflow_domain::TaskStatus::Canceled => "canceled".to_owned(),
    }
}

fn map_storage_error(error: stoneflow_storage::StorageError) -> UsecaseError {
    map_app_error(AppError::from(error))
}

pub fn map_app_error(error: AppError) -> UsecaseError {
    match error {
        AppError::Validation(message) => UsecaseError::validation(message),
        AppError::NotFound(message) => UsecaseError::not_found(message),
        AppError::Conflict(message) => UsecaseError::conflict(message),
        AppError::Database(message) => UsecaseError::storage(message),
        AppError::Initialization(message) => UsecaseError::initialization(message),
        AppError::DefaultSpaceUnavailable(message) => {
            UsecaseError::default_space_unavailable(message)
        }
        AppError::Internal(message)
        | AppError::Forbidden(message)
        | AppError::CaptureSpaceUnavailable(message)
        | AppError::CapturePersistence(message) => UsecaseError::internal(message),
    }
}

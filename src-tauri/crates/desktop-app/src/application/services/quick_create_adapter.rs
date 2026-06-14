//! Quick Create port adapter：连接 usecase 与 desktop-app 服务/仓储。

use std::collections::HashMap;

use stoneflow_domain::QuickCreateSpaceCandidate;
use stoneflow_schema::{project, space, task};
use stoneflow_usecase::{
    quick_create::{
        QuickCreatePorts, QuickCreateTaskDetail, QuickCreateTaskInput, QuickCreateTaskPlacement,
        QuickPlacementKind, QuickProjectItemDto, QuickSidebarProjectDto, QuickSpaceSummaryDto,
        QuickTaskItemDto,
    },
    search::SearchEntitiesInput,
    UsecaseError,
};

use crate::{
    app::error::AppError,
    application::services::{
        CreateTaskInput, CreateTaskPlacementInput, CreateTaskPlacementKind, ListSidebarProjectsInput,
        ProjectScopeInput, ProjectScopeKind, ProjectService, SearchService, SpaceService,
        TaskDetailDto, TaskIdInput, TaskService,
    },
    infrastructure::{
        mappers::task_status_to_domain,
        repositories::{ProjectRepository, SpaceRepository, TaskPlacementQuery, TaskRepository},
    },
};

#[derive(Debug, Clone)]
pub struct QuickCreatePortsAdapter {
    space_service: SpaceService,
    project_service: ProjectService,
    task_service: TaskService,
    search_service: SearchService,
    space_repository: SpaceRepository,
    project_repository: ProjectRepository,
    task_repository: TaskRepository,
}

impl QuickCreatePortsAdapter {
    pub fn new(
        space_service: SpaceService,
        project_service: ProjectService,
        task_service: TaskService,
        search_service: SearchService,
        space_repository: SpaceRepository,
        project_repository: ProjectRepository,
        task_repository: TaskRepository,
    ) -> Self {
        Self {
            space_service,
            project_service,
            task_service,
            search_service,
            space_repository,
            project_repository,
            task_repository,
        }
    }
}

impl QuickCreatePorts for QuickCreatePortsAdapter {
    async fn list_visible_spaces(&self) -> Result<Vec<QuickSpaceSummaryDto>, UsecaseError> {
        self.space_service
            .list_visible_spaces()
            .await
            .map(|spaces| {
                spaces
                    .into_iter()
                    .map(|space| QuickSpaceSummaryDto {
                        id: space.id,
                        name: space.name,
                        icon_key: space.icon_key,
                        color_key: space.color_key,
                        is_default: space.is_default,
                    })
                    .collect()
            })
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list_space_candidates(&self) -> Result<Vec<QuickCreateSpaceCandidate>, UsecaseError> {
        self.space_repository
            .list_visible()
            .await
            .map(|spaces| {
                spaces
                    .into_iter()
                    .map(|space| QuickCreateSpaceCandidate {
                        id: space.id,
                        is_default: space.is_default,
                    })
                    .collect()
            })
            .map_err(|error| map_app_error(error.into()))
    }

    async fn get_space(
        &self,
        space_id: &str,
    ) -> Result<Option<QuickCreateSpaceCandidate>, UsecaseError> {
        self.space_repository
            .get(space_id)
            .await
            .map(|space| {
                space.map(|space| QuickCreateSpaceCandidate {
                    id: space.id,
                    is_default: space.is_default,
                })
            })
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list_sidebar_projects_for_space(
        &self,
        space_id: &str,
    ) -> Result<Vec<QuickSidebarProjectDto>, UsecaseError> {
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
                    .map(|project| QuickSidebarProjectDto {
                        id: project.id,
                        space_id: project.space_id,
                        name: project.name,
                    })
                    .collect()
            })
            .map_err(|error| map_app_error(error.into()))
    }

    async fn search_entities(
        &self,
        input: SearchEntitiesInput,
    ) -> Result<stoneflow_usecase::search::SearchEntitiesResultDto, UsecaseError> {
        self.search_service
            .search_entities(input)
            .await
            .map_err(|error| map_app_error(error.into()))
    }

    async fn create_task(
        &self,
        input: QuickCreateTaskInput,
    ) -> Result<QuickCreateTaskDetail, UsecaseError> {
        self.task_service
            .create_task(CreateTaskInput {
                space_id: input.space_id,
                placement: map_task_placement_input(&input.placement),
                title: input.title,
                note: input.note,
                status: input.status,
                priority: input.priority,
                due_at: input.due_at,
                scheduled_at: input.scheduled_at,
                reminder_at: input.reminder_at,
            })
            .await
            .map(map_task_detail)
            .map_err(|error| map_app_error(error.into()))
    }

    async fn get_task_detail(&self, task_id: &str) -> Result<QuickCreateTaskDetail, UsecaseError> {
        self.task_service
            .get_task_detail(TaskIdInput {
                task_id: task_id.to_owned(),
            })
            .await
            .map(map_task_detail)
            .map_err(|error| map_app_error(error.into()))
    }

    async fn get_project_space_id(&self, project_id: &str) -> Result<String, UsecaseError> {
        self.project_service
            .get_project_detail(stoneflow_usecase::project::ProjectIdInput {
                project_id: project_id.to_owned(),
            })
            .await
            .map(|detail| detail.space_id)
            .map_err(|error| map_app_error(error.into()))
    }

    async fn list_recent_tasks(&self, limit: usize) -> Result<Vec<QuickTaskItemDto>, UsecaseError> {
        let spaces = self.space_repository.list_visible().await.map_err(|error| map_app_error(error.into()))?;
        let space_map: HashMap<String, space::Model> = spaces
            .into_iter()
            .map(|space| (space.id.clone(), space))
            .collect();

        let mut tasks = self
            .task_repository
            .list_candidates(None, TaskPlacementQuery::All, false)
            .await
            .map_err(|error| map_app_error(error.into()))?;
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
            .map_err(|error| map_app_error(error.into()))?
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
    ) -> Result<Vec<QuickProjectItemDto>, UsecaseError> {
        let spaces = self.space_repository.list_visible().await.map_err(|error| map_app_error(error.into()))?;
        let space_map: HashMap<String, space::Model> = spaces
            .into_iter()
            .map(|space| (space.id.clone(), space))
            .collect();

        let mut projects = self
            .project_repository
            .list_sidebar_by_scope(None, true, None)
            .await
            .map_err(|error| map_app_error(error.into()))?;
        projects.sort_by(|left, right| right.updated_at.cmp(&left.updated_at));
        projects.truncate(limit);

        Ok(projects
            .into_iter()
            .map(|project| map_project_model(project, &space_map))
            .collect())
    }
}

fn map_task_placement_input(placement: &QuickCreateTaskPlacement) -> CreateTaskPlacementInput {
    CreateTaskPlacementInput {
        kind: match placement.kind {
            QuickPlacementKind::Inbox => CreateTaskPlacementKind::Inbox,
            QuickPlacementKind::NoProject => CreateTaskPlacementKind::NoProject,
            QuickPlacementKind::Project => CreateTaskPlacementKind::Project,
        },
        project_id: placement.project_id.clone(),
    }
}

fn map_task_detail(detail: TaskDetailDto) -> QuickCreateTaskDetail {
    QuickCreateTaskDetail {
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
) -> QuickTaskItemDto {
    let space_name = spaces
        .get(&task.space_id)
        .map(|space| space.name.clone())
        .unwrap_or_else(|| task.space_id.clone());
    let project_name = task
        .project_id
        .as_ref()
        .and_then(|project_id| projects.get(project_id))
        .map(|project| project.name.clone());

    QuickTaskItemDto {
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
) -> QuickProjectItemDto {
    let space_name = spaces
        .get(&project.space_id)
        .map(|space| space.name.clone())
        .unwrap_or_else(|| project.space_id.clone());

    QuickProjectItemDto {
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

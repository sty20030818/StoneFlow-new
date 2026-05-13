//! Quick Create Service：集中承载 Helper / Quick Create 入口的编排规则。

use stoneflow_entity::{common::TaskStatus, space};
use stoneflow_ipc_protocol::{
    QuickCreatePayload, QuickCreatedPayload, QuickListProjectsBySpacePayload,
    QuickPlacementKind, QuickPlacementPayload, QuickProjectItemPayload,
    QuickProjectOptionKind, QuickProjectOptionPayload, QuickProjectsBySpaceResponsePayload,
    QuickSearchPayload, QuickSearchResponsePayload, QuickTaskItemPayload,
};

use crate::{
    app::{error::AppError, state::ActiveScopeSnapshot},
    application::{
        activity::ActivityService,
        services::{
            CreateTaskInput, CreateTaskPlacementInput, CreateTaskPlacementKind,
            ProjectService, SearchEntitiesInput, SearchProjectItemDto, SearchService,
            SearchTaskItemDto, SpaceDto, SpaceService, TaskDetailDto, TaskService,
        },
    },
    infrastructure::repositories::{ActivityRepository, ProjectRepository, SpaceRepository, TaskRepository},
};
const QUICK_CREATE_SEARCH_LIMIT: u64 = 3;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum QuickResolvedPlacement {
    Project,
    Inbox,
    NoProject,
}

fn resolve_default_space<'a>(
    active_scope: &Option<ActiveScopeSnapshot>,
    spaces: &'a [space::Model],
) -> Result<&'a space::Model, AppError> {
    if spaces.is_empty() {
        return Err(AppError::DefaultSpaceUnavailable(
            "当前没有可用 Space".to_owned(),
        ));
    }

    if let Some(scope) = active_scope {
        if let Some(space_id) = scope.space_id {
            if let Some(space) = spaces.iter().find(|space| space.id == space_id.to_string()) {
                return Ok(space);
            }
        }
    }

    spaces
        .iter()
        .find(|space| space.is_default)
        .or_else(|| spaces.first())
        .ok_or_else(|| AppError::DefaultSpaceUnavailable("默认 Space 不可用".to_owned()))
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct QuickResolvedOpenTarget {
    pub kind: &'static str,
    pub id: String,
    pub space_id: String,
    pub project_id: Option<String>,
    pub placement: QuickResolvedPlacement,
}

#[derive(Debug, Clone)]
pub struct QuickCreateService {
    space_service: SpaceService,
    project_service: ProjectService,
    task_service: TaskService,
    search_service: SearchService,
    space_repository: SpaceRepository,
}

impl QuickCreateService {
    pub fn new(
        space_repository: SpaceRepository,
        project_repository: ProjectRepository,
        task_repository: TaskRepository,
        activity_repository: ActivityRepository,
    ) -> Self {
        let activity_service = ActivityService::new(activity_repository);

        Self {
            space_service: SpaceService::new(
                space_repository.clone(),
                project_repository.clone(),
                task_repository.clone(),
                activity_service.clone(),
            ),
            project_service: ProjectService::new(
                space_repository.clone(),
                project_repository.clone(),
                task_repository.clone(),
                activity_service.clone(),
            ),
            task_service: TaskService::new(
                space_repository.clone(),
                project_repository.clone(),
                task_repository.clone(),
                activity_service,
            ),
            search_service: SearchService::new(
                space_repository.clone(),
                project_repository.clone(),
                task_repository.clone(),
            ),
            space_repository,
        }
    }

    pub async fn list_visible_spaces(&self) -> Result<Vec<SpaceDto>, AppError> {
        self.space_service.list_visible_spaces().await
    }

    pub async fn list_projects_by_space(
        &self,
        input: QuickListProjectsBySpacePayload,
    ) -> Result<QuickProjectsBySpaceResponsePayload, AppError> {
        let space = self
            .space_repository
            .get(&input.space_id)
            .await?
            .ok_or_else(|| AppError::not_found("Space 不存在"))?;

        let projects = self
            .project_service
            .list_sidebar_projects(crate::application::services::ListSidebarProjectsInput {
                scope: crate::application::services::ProjectScopeInput {
                    kind: crate::application::services::ProjectScopeKind::Space,
                    space_id: Some(space.id.clone()),
                },
                show_completed: true,
                max_visible: None,
            })
            .await?;

        Ok(QuickProjectsBySpaceResponsePayload {
            space_id: space.id.clone(),
            inbox_project: QuickProjectOptionPayload {
                kind: QuickProjectOptionKind::Inbox,
                id: None,
                space_id: space.id.clone(),
                name: "收件箱".to_owned(),
            },
            no_project_option: QuickProjectOptionPayload {
                kind: QuickProjectOptionKind::NoProject,
                id: None,
                space_id: space.id.clone(),
                name: "独立事项".to_owned(),
            },
            projects: projects
                .into_iter()
                .map(|project| QuickProjectOptionPayload {
                    kind: QuickProjectOptionKind::Project,
                    id: Some(project.id),
                    space_id: project.space_id,
                    name: project.name,
                })
                .collect(),
        })
    }

    pub async fn search(
        &self,
        input: QuickSearchPayload,
    ) -> Result<QuickSearchResponsePayload, AppError> {
        let result = self
            .search_service
            .search_entities(SearchEntitiesInput {
                query: input.query,
                limit_per_section: Some(input.limit.max(1).min(QUICK_CREATE_SEARCH_LIMIT)),
            })
            .await?;

        Ok(QuickSearchResponsePayload {
            tasks: result.tasks.into_iter().map(map_search_task).collect(),
            projects: result.projects.into_iter().map(map_search_project).collect(),
        })
    }

    pub async fn create(
        &self,
        input: QuickCreatePayload,
        active_scope: Option<ActiveScopeSnapshot>,
    ) -> Result<QuickCreatedPayload, AppError> {
        let visible_spaces = self.space_repository.list_visible().await?;
        let default_space = resolve_default_space(&active_scope, &visible_spaces)?;
        let resolved_space_id = input
            .space_id
            .clone()
            .unwrap_or_else(|| default_space.id.clone());
        let detail = self
            .task_service
            .create_task(CreateTaskInput {
                space_id: Some(resolved_space_id.clone()),
                placement: map_create_placement(&input.placement)?,
                title: input.title,
                note: input.note,
                status: parse_task_status(input.status.as_deref())?,
                priority: input.priority,
                due_at: input.due_at,
                scheduled_at: input.scheduled_at,
                reminder_at: input.reminder_at,
            })
            .await?;

        Ok(map_created_payload(
            detail,
            input.space_id.is_none() || default_space.id != resolved_space_id,
        ))
    }

    pub async fn get_task_detail(&self, task_id: &str) -> Result<TaskDetailDto, AppError> {
        self.task_service
            .get_task_detail(crate::application::services::TaskIdInput {
                task_id: task_id.to_owned(),
            })
            .await
    }

    pub async fn resolve_task_open_target(
        &self,
        task_id: &str,
    ) -> Result<QuickResolvedOpenTarget, AppError> {
        let detail = self.get_task_detail(task_id).await?;
        let placement = resolve_task_placement(&detail);

        Ok(QuickResolvedOpenTarget {
            kind: "task",
            id: detail.id,
            space_id: detail.space_id,
            project_id: detail.project_id.clone(),
            placement,
        })
    }

    pub async fn get_project_detail(
        &self,
        project_id: &str,
    ) -> Result<crate::application::services::ProjectDetailDto, AppError> {
        self.project_service
            .get_project_detail(crate::application::services::ProjectIdInput {
                project_id: project_id.to_owned(),
            })
            .await
    }

    pub async fn resolve_project_open_target(
        &self,
        project_id: &str,
    ) -> Result<QuickResolvedOpenTarget, AppError> {
        let detail = self.get_project_detail(project_id).await?;

        Ok(QuickResolvedOpenTarget {
            kind: "project",
            id: detail.id,
            space_id: detail.space_id,
            project_id: None,
            placement: QuickResolvedPlacement::Project,
        })
    }

}

fn map_create_placement(
    input: &QuickPlacementPayload,
) -> Result<CreateTaskPlacementInput, AppError> {
    let kind = match input.kind {
        QuickPlacementKind::Inbox => CreateTaskPlacementKind::Inbox,
        QuickPlacementKind::NoProject => CreateTaskPlacementKind::NoProject,
        QuickPlacementKind::Project => CreateTaskPlacementKind::Project,
    };

    if matches!(kind, CreateTaskPlacementKind::Project) && input.project_id.is_none() {
        return Err(AppError::validation("placement.kind=project 时必须提供 projectId"));
    }

    Ok(CreateTaskPlacementInput {
        kind,
        project_id: input.project_id.clone(),
    })
}

fn parse_task_status(status: Option<&str>) -> Result<Option<TaskStatus>, AppError> {
    let Some(status) = status else {
        return Ok(None);
    };

    match status {
        "todo" => Ok(Some(TaskStatus::Todo)),
        "doing" => Ok(Some(TaskStatus::Doing)),
        "waiting" => Ok(Some(TaskStatus::Waiting)),
        "done" => Ok(Some(TaskStatus::Done)),
        "canceled" => Ok(Some(TaskStatus::Canceled)),
        other => Err(AppError::validation(format!("未知任务状态: {other}"))),
    }
}

fn map_created_payload(detail: TaskDetailDto, space_fallback: bool) -> QuickCreatedPayload {
    QuickCreatedPayload {
        id: detail.id,
        title: detail.title,
        space_id: detail.space_id,
        project_id: detail.project_id,
        inbox_at: detail.inbox_at,
        space_fallback,
    }
}

fn resolve_task_placement(detail: &TaskDetailDto) -> QuickResolvedPlacement {
    if detail.project_id.is_some() {
        return QuickResolvedPlacement::Project;
    }

    if detail.inbox_at.is_some() {
        return QuickResolvedPlacement::Inbox;
    }

    QuickResolvedPlacement::NoProject
}

fn map_search_task(task: SearchTaskItemDto) -> QuickTaskItemPayload {
    QuickTaskItemPayload {
        id: task.id,
        space_id: task.space_id,
        space_name: task.space_name,
        project_id: task.project_id,
        project_name: task.project_name,
        inbox_at: task.inbox_at,
        title: task.title,
        note: task.note,
        priority: task.priority,
        status: map_task_status(task.status),
        updated_at: task.updated_at,
        completed_at: task.completed_at,
    }
}

fn map_search_project(project: SearchProjectItemDto) -> QuickProjectItemPayload {
    QuickProjectItemPayload {
        id: project.id,
        space_id: project.space_id,
        space_name: project.space_name,
        name: project.name,
        note: project.note,
        updated_at: project.updated_at,
        completed_at: project.completed_at,
    }
}


fn map_task_status(status: TaskStatus) -> String {
    match status {
        TaskStatus::Todo => "todo",
        TaskStatus::Doing => "doing",
        TaskStatus::Waiting => "waiting",
        TaskStatus::Done => "done",
        TaskStatus::Canceled => "canceled",
    }
    .to_owned()
}

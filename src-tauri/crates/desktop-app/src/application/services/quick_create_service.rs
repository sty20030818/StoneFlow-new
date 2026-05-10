//! Quick Create Service：集中承载 Helper / Quick Create 入口的编排规则。

use std::collections::HashMap;

use stoneflow_entity::{
    common::TaskStatus,
    project, space, task,
};
use stoneflow_ipc_protocol::{
    QuickCreatePayload, QuickCreatedPayload, QuickInitialStatePayload,
    QuickListProjectsBySpacePayload, QuickPlacementKind, QuickPlacementPayload,
    QuickProjectItemPayload, QuickProjectOptionKind, QuickProjectOptionPayload,
    QuickProjectsBySpaceResponsePayload, QuickScopeKind, QuickScopePayload,
    QuickSearchPayload, QuickSearchResponsePayload, QuickSpaceSummaryPayload,
    QuickTaskItemPayload,
};

use crate::{
    app::{
        error::AppError,
        state::{ActiveScopeKind, ActiveScopeSnapshot},
    },
    application::{
        activity::ActivityService,
        services::{
            CreateTaskInput, CreateTaskPlacementInput, CreateTaskPlacementKind, ProjectService,
            SearchEntitiesInput, SearchProjectItemDto, SearchService, SearchTaskItemDto,
            SpaceService, TaskDetailDto, TaskService,
        },
    },
    infrastructure::repositories::{
        ActivityRepository, ProjectRepository, SpaceRepository, TaskPlacementQuery, TaskRepository,
    },
};

const DEFAULT_RECENT_LIMIT: usize = 5;

#[derive(Debug, Clone)]
pub struct QuickCreateService {
    space_service: SpaceService,
    project_service: ProjectService,
    task_service: TaskService,
    search_service: SearchService,
    space_repository: SpaceRepository,
    project_repository: ProjectRepository,
    task_repository: TaskRepository,
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
            project_repository,
            task_repository,
        }
    }

    pub async fn get_initial_state(
        &self,
        active_scope: Option<ActiveScopeSnapshot>,
    ) -> Result<QuickInitialStatePayload, AppError> {
        let spaces = self.space_service.list_visible_spaces().await?;
        let visible_spaces = self.space_repository.list_visible().await?;
        let default_space = resolve_default_space(&active_scope, &visible_spaces)?;
        let current_scope = map_scope_payload(active_scope, default_space.id.clone());
        let projects = self
            .list_projects_by_space(QuickListProjectsBySpacePayload {
                space_id: default_space.id.clone(),
            })
            .await?
            .projects;
        let (recent_tasks, recent_projects) = self
            .list_recent_entities(current_scope.space_id.as_deref())
            .await?;

        Ok(QuickInitialStatePayload {
            current_scope,
            default_space_id: default_space.id.clone(),
            default_placement: QuickPlacementPayload {
                kind: QuickPlacementKind::Inbox,
                project_id: None,
            },
            spaces: spaces
                .into_iter()
                .map(|space| QuickSpaceSummaryPayload {
                    id: space.id,
                    name: space.name,
                    is_default: space.is_default,
                })
                .collect(),
            projects,
            recent_tasks,
            recent_projects,
        })
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
                name: "Inbox".to_owned(),
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
                limit_per_section: Some(input.limit.max(1)),
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

    async fn list_recent_entities(
        &self,
        scope_space_id: Option<&str>,
    ) -> Result<(Vec<QuickTaskItemPayload>, Vec<QuickProjectItemPayload>), AppError> {
        let spaces = self.space_repository.list_visible().await?;
        let space_map: HashMap<String, space::Model> = spaces
            .into_iter()
            .map(|space| (space.id.clone(), space))
            .collect();

        let mut tasks = self
            .task_repository
            .list_candidates(
                scope_space_id.map(ToOwned::to_owned),
                TaskPlacementQuery::All,
                false,
            )
            .await?;
        tasks.retain(|item| item.archived_at.is_none());
        tasks.sort_by(|left, right| right.updated_at.cmp(&left.updated_at));
        tasks.truncate(DEFAULT_RECENT_LIMIT);

        let project_ids: Vec<String> = tasks
            .iter()
            .filter_map(|task| task.project_id.clone())
            .collect();
        let project_map: HashMap<String, project::Model> = self
            .project_repository
            .list_by_ids(&project_ids)
            .await?
            .into_iter()
            .map(|project| (project.id.clone(), project))
            .collect();

        let recent_tasks = tasks
            .into_iter()
            .map(|task| map_task_model(task, &space_map, &project_map))
            .collect();

        let mut projects = self
            .project_repository
            .list_sidebar_by_scope(scope_space_id, true, None)
            .await?;
        projects.sort_by(|left, right| right.updated_at.cmp(&left.updated_at));
        projects.truncate(DEFAULT_RECENT_LIMIT);

        let recent_projects = projects
            .into_iter()
            .map(|project| map_project_model(project, &space_map))
            .collect();

        Ok((recent_tasks, recent_projects))
    }
}

fn map_scope_payload(
    active_scope: Option<ActiveScopeSnapshot>,
    default_space_id: String,
) -> QuickScopePayload {
    match active_scope {
        Some(scope) if scope.kind == ActiveScopeKind::Space => QuickScopePayload {
            kind: QuickScopeKind::Space,
            space_id: scope.space_id.map(|space_id| space_id.to_string()),
        },
        Some(_) => QuickScopePayload {
            kind: QuickScopeKind::All,
            space_id: None,
        },
        None => QuickScopePayload {
            kind: QuickScopeKind::Space,
            space_id: Some(default_space_id),
        },
    }
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

fn map_task_model(
    task: task::Model,
    spaces: &HashMap<String, space::Model>,
    projects: &HashMap<String, project::Model>,
) -> QuickTaskItemPayload {
    let space_name = spaces
        .get(&task.space_id)
        .map(|space| space.name.clone())
        .unwrap_or_else(|| task.space_id.clone());
    let project_name = task
        .project_id
        .as_ref()
        .and_then(|project_id| projects.get(project_id))
        .map(|project| project.name.clone());

    QuickTaskItemPayload {
        id: task.id,
        space_id: task.space_id,
        space_name,
        project_id: task.project_id,
        project_name,
        inbox_at: task.inbox_at,
        title: task.title,
        note: task.note,
        priority: task.priority,
        status: map_task_status(task.status),
        updated_at: task.updated_at,
        completed_at: task.completed_at,
    }
}

fn map_project_model(
    project: project::Model,
    spaces: &HashMap<String, space::Model>,
) -> QuickProjectItemPayload {
    let space_name = spaces
        .get(&project.space_id)
        .map(|space| space.name.clone())
        .unwrap_or_else(|| project.space_id.clone());

    QuickProjectItemPayload {
        id: project.id,
        space_id: project.space_id,
        space_name,
        name: project.name,
        note: project.description,
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

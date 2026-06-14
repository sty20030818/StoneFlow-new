//! Quick Create Open Context：聚合 helper prepare-session 所需的只读上下文。

use std::collections::HashMap;

use stoneflow_schema::{project, space, task};
use stoneflow_ipc_protocol::{
    QuickInitialStatePayload, QuickListProjectsBySpacePayload, QuickPlacementKind,
    QuickPlacementPayload, QuickProjectItemPayload, QuickProjectOptionPayload, QuickScopeKind,
    QuickScopePayload, QuickSpaceSummaryPayload, QuickTaskItemPayload,
};

use crate::{
    app::{
        error::AppError,
        state::{ActiveScopeKind, ActiveScopeSnapshot},
    },
    application::services::QuickCreateService,
    infrastructure::repositories::{ProjectRepository, SpaceRepository, TaskPlacementQuery, TaskRepository},
};

const DEFAULT_RECENT_LIMIT: usize = 3;

#[derive(Debug, Clone)]
pub struct QuickCreateOpenContextService {
    quick_create_service: QuickCreateService,
    space_repository: SpaceRepository,
    project_repository: ProjectRepository,
    task_repository: TaskRepository,
}

impl QuickCreateOpenContextService {
    pub fn new(
        quick_create_service: QuickCreateService,
        space_repository: SpaceRepository,
        project_repository: ProjectRepository,
        task_repository: TaskRepository,
    ) -> Self {
        Self {
            quick_create_service,
            space_repository,
            project_repository,
            task_repository,
        }
    }

    pub async fn get_initial_state(
        &self,
        active_scope: Option<ActiveScopeSnapshot>,
    ) -> Result<QuickInitialStatePayload, AppError> {
        let spaces = self.quick_create_service.list_visible_spaces().await?;
        let visible_spaces = self.space_repository.list_visible().await?;
        let default_space = resolve_default_space(&active_scope, &visible_spaces)?;
        let current_scope = map_scope_payload(active_scope, default_space.id.clone());
        let projects_payload = self
            .quick_create_service
            .list_projects_by_space(QuickListProjectsBySpacePayload {
                space_id: default_space.id.clone(),
            })
            .await?;
        let (recent_tasks, recent_projects) = self.list_recent_entities().await?;

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
                    icon_key: space.icon_key,
                    color_key: space.color_key,
                    is_default: space.is_default,
                })
                .collect(),
            projects: std::iter::once(projects_payload.inbox_project)
                .chain(std::iter::once(projects_payload.no_project_option))
                .chain(projects_payload.projects.into_iter())
                .collect::<Vec<QuickProjectOptionPayload>>(),
            recent_tasks,
            recent_projects,
        })
    }

    pub async fn list_recent_entities(
        &self,
    ) -> Result<(Vec<QuickTaskItemPayload>, Vec<QuickProjectItemPayload>), AppError> {
        let spaces = self.space_repository.list_visible().await?;
        let space_map: HashMap<String, space::Model> = spaces
            .into_iter()
            .map(|space| (space.id.clone(), space))
            .collect();

        let mut tasks = self
            .task_repository
            .list_candidates(None, TaskPlacementQuery::All, false)
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
            .list_sidebar_by_scope(None, true, None)
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

fn map_task_status(status: stoneflow_schema::common::TaskStatus) -> String {
    match status {
        stoneflow_schema::common::TaskStatus::Todo => "todo",
        stoneflow_schema::common::TaskStatus::Doing => "doing",
        stoneflow_schema::common::TaskStatus::Waiting => "waiting",
        stoneflow_schema::common::TaskStatus::Done => "done",
        stoneflow_schema::common::TaskStatus::Canceled => "canceled",
    }
    .to_owned()
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

//! Quick Create 用例编排。

#![allow(async_fn_in_trait)]

use serde::{Deserialize, Serialize};
use stoneflow_domain::{resolve_default_space_id, QuickCreateSpaceCandidate, TaskStatus};

use crate::{
    quick_create_search_ranking::{
        rank_quick_create_projects, rank_quick_create_tasks, QuickSearchScopeContext,
        QUICK_CREATE_SEARCH_POOL_LIMIT,
    },
    search::SearchEntitiesInput,
    UsecaseError,
};

pub const QUICK_CREATE_SEARCH_LIMIT: u64 = 3;

/// 当前 Scope 的轻量输入（与 Tauri 运行时解耦）。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ActiveScopeInput {
    pub kind: ActiveScopeKind,
    pub space_id: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ActiveScopeKind {
    All,
    Space,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum QuickResolvedPlacement {
    Project,
    Inbox,
    NoProject,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct QuickResolvedOpenTarget {
    pub kind: &'static str,
    pub id: String,
    pub space_id: String,
    pub project_id: Option<String>,
    pub placement: QuickResolvedPlacement,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum QuickScopeKind {
    All,
    Space,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickScopeDto {
    #[serde(rename = "type")]
    pub kind: QuickScopeKind,
    pub space_id: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum QuickPlacementKind {
    Inbox,
    NoProject,
    Project,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickPlacementDto {
    #[serde(rename = "kind")]
    pub kind: QuickPlacementKind,
    pub project_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickSpaceSummaryDto {
    pub id: String,
    pub name: String,
    pub icon_key: String,
    pub color_key: String,
    pub is_default: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum QuickProjectOptionKind {
    Inbox,
    NoProject,
    Project,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickProjectOptionDto {
    #[serde(rename = "kind")]
    pub kind: QuickProjectOptionKind,
    pub id: Option<String>,
    pub space_id: String,
    pub name: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickTaskItemDto {
    pub id: String,
    pub space_id: String,
    pub space_name: String,
    pub project_id: Option<String>,
    pub project_name: Option<String>,
    pub inbox_at: Option<String>,
    pub title: String,
    pub note: Option<String>,
    pub priority: i32,
    pub status: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickProjectItemDto {
    pub id: String,
    pub space_id: String,
    pub space_name: String,
    pub name: String,
    pub note: Option<String>,
    pub updated_at: String,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickListProjectsBySpaceInput {
    pub space_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickProjectsBySpaceDto {
    pub space_id: String,
    pub inbox_project: QuickProjectOptionDto,
    pub no_project_option: QuickProjectOptionDto,
    pub projects: Vec<QuickProjectOptionDto>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickSearchInput {
    pub query: String,
    pub limit: u64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickSearchResultDto {
    pub tasks: Vec<QuickTaskItemDto>,
    pub projects: Vec<QuickProjectItemDto>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickCreateInput {
    pub space_id: Option<String>,
    pub placement: QuickPlacementDto,
    pub title: String,
    pub note: Option<String>,
    pub status: Option<String>,
    pub priority: Option<i32>,
    pub due_at: Option<String>,
    pub scheduled_at: Option<String>,
    pub reminder_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickCreatedDto {
    pub id: String,
    pub title: String,
    pub space_id: String,
    pub project_id: Option<String>,
    pub inbox_at: Option<String>,
    pub space_fallback: bool,
}

/// Quick Create 任务创建输入（Task 服务未迁完前的 port 边界）。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct QuickCreateTaskInput {
    pub space_id: Option<String>,
    pub placement: QuickCreateTaskPlacement,
    pub title: String,
    pub note: Option<String>,
    pub status: Option<TaskStatus>,
    pub priority: Option<i32>,
    pub due_at: Option<String>,
    pub scheduled_at: Option<String>,
    pub reminder_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct QuickCreateTaskPlacement {
    pub kind: QuickPlacementKind,
    pub project_id: Option<String>,
}

/// Quick Create 读取任务详情所需字段。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct QuickCreateTaskDetail {
    pub id: String,
    pub space_id: String,
    pub project_id: Option<String>,
    pub inbox_at: Option<String>,
    pub title: String,
    pub note: Option<String>,
    pub due_at: Option<String>,
    pub scheduled_at: Option<String>,
    pub reminder_at: Option<String>,
}

/// Sidebar 项目摘要。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct QuickSidebarProjectDto {
    pub id: String,
    pub space_id: String,
    pub name: String,
}

/// Quick Create 编排所需的跨服务 port。
pub trait QuickCreatePorts: Send + Sync + Clone {
    async fn list_visible_spaces(&self) -> Result<Vec<QuickSpaceSummaryDto>, UsecaseError>;
    async fn list_space_candidates(&self) -> Result<Vec<QuickCreateSpaceCandidate>, UsecaseError>;
    async fn get_space(
        &self,
        space_id: &str,
    ) -> Result<Option<QuickCreateSpaceCandidate>, UsecaseError>;
    async fn list_sidebar_projects_for_space(
        &self,
        space_id: &str,
    ) -> Result<Vec<QuickSidebarProjectDto>, UsecaseError>;
    async fn search_entities(
        &self,
        input: SearchEntitiesInput,
    ) -> Result<crate::search::SearchEntitiesResultDto, UsecaseError>;
    async fn create_task(
        &self,
        input: QuickCreateTaskInput,
    ) -> Result<QuickCreateTaskDetail, UsecaseError>;
    async fn get_task_detail(&self, task_id: &str) -> Result<QuickCreateTaskDetail, UsecaseError>;
    async fn get_project_space_id(&self, project_id: &str) -> Result<String, UsecaseError>;
    async fn list_recent_tasks(&self, limit: usize) -> Result<Vec<QuickTaskItemDto>, UsecaseError>;
    async fn list_recent_projects(
        &self,
        limit: usize,
    ) -> Result<Vec<QuickProjectItemDto>, UsecaseError>;
}

/// Quick Create 编排服务。
#[derive(Debug, Clone)]
pub struct QuickCreateService<P: QuickCreatePorts> {
    ports: P,
}

impl<P: QuickCreatePorts> QuickCreateService<P> {
    pub fn new(ports: P) -> Self {
        Self { ports }
    }

    pub async fn list_visible_spaces(&self) -> Result<Vec<QuickSpaceSummaryDto>, UsecaseError> {
        self.ports.list_visible_spaces().await
    }

    pub async fn list_projects_by_space(
        &self,
        input: QuickListProjectsBySpaceInput,
    ) -> Result<QuickProjectsBySpaceDto, UsecaseError> {
        let space = self
            .ports
            .get_space(&input.space_id)
            .await?
            .ok_or_else(|| UsecaseError::not_found("Space 不存在"))?;

        let projects = self
            .ports
            .list_sidebar_projects_for_space(&space.id)
            .await?;

        Ok(QuickProjectsBySpaceDto {
            space_id: space.id.clone(),
            inbox_project: QuickProjectOptionDto {
                kind: QuickProjectOptionKind::Inbox,
                id: None,
                space_id: space.id.clone(),
                name: "收件箱".to_owned(),
            },
            no_project_option: QuickProjectOptionDto {
                kind: QuickProjectOptionKind::NoProject,
                id: None,
                space_id: space.id.clone(),
                name: "独立事项".to_owned(),
            },
            projects: projects
                .into_iter()
                .map(|project| QuickProjectOptionDto {
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
        input: QuickSearchInput,
        active_scope: Option<ActiveScopeInput>,
    ) -> Result<QuickSearchResultDto, UsecaseError> {
        let limit = input.limit.clamp(1, QUICK_CREATE_SEARCH_LIMIT) as usize;
        let candidates = self.ports.list_space_candidates().await?;
        let default_space_id =
            resolve_default_space_from_candidates(active_scope.as_ref(), &candidates).ok();
        let current_space_id = match active_scope.as_ref() {
            Some(scope) if scope.kind == ActiveScopeKind::Space => scope.space_id.clone(),
            _ => None,
        };
        let scope = QuickSearchScopeContext {
            current_space_id,
            default_space_id,
        };

        let result = self
            .ports
            .search_entities(SearchEntitiesInput {
                query: input.query.clone(),
                limit_per_section: Some(QUICK_CREATE_SEARCH_POOL_LIMIT),
            })
            .await?;

        let mut tasks = result
            .tasks
            .into_iter()
            .map(map_search_task)
            .chain(result.completed_tasks.into_iter().map(map_search_task))
            .collect::<Vec<_>>();
        let mut projects = result
            .projects
            .into_iter()
            .map(map_search_project)
            .chain(
                result
                    .completed_projects
                    .into_iter()
                    .map(map_search_project),
            )
            .collect::<Vec<_>>();

        rank_quick_create_tasks(&mut tasks, &input.query, &scope);
        rank_quick_create_projects(&mut projects, &input.query, &scope);

        tasks.truncate(limit);
        projects.truncate(limit);

        Ok(QuickSearchResultDto { tasks, projects })
    }

    pub async fn create(
        &self,
        input: QuickCreateInput,
        active_scope: Option<ActiveScopeInput>,
    ) -> Result<QuickCreatedDto, UsecaseError> {
        let candidates = self.ports.list_space_candidates().await?;
        let default_space_id = resolve_default_space_id(
            active_scope
                .as_ref()
                .and_then(|scope| scope.space_id.as_deref()),
            &candidates,
        )
        .map_err(map_default_space_domain_error)?;
        let resolved_space_id = input
            .space_id
            .clone()
            .unwrap_or_else(|| default_space_id.clone());
        let detail = self
            .ports
            .create_task(QuickCreateTaskInput {
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

        Ok(map_created_dto(
            detail,
            input.space_id.is_none() || default_space_id != resolved_space_id,
        ))
    }

    pub async fn get_task_detail(
        &self,
        task_id: &str,
    ) -> Result<QuickCreateTaskDetail, UsecaseError> {
        self.ports.get_task_detail(task_id).await
    }

    pub async fn resolve_task_open_target(
        &self,
        task_id: &str,
    ) -> Result<QuickResolvedOpenTarget, UsecaseError> {
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

    pub async fn resolve_project_open_target(
        &self,
        project_id: &str,
    ) -> Result<QuickResolvedOpenTarget, UsecaseError> {
        let space_id = self.ports.get_project_space_id(project_id).await?;

        Ok(QuickResolvedOpenTarget {
            kind: "project",
            id: project_id.to_owned(),
            space_id,
            project_id: None,
            placement: QuickResolvedPlacement::Project,
        })
    }
}

fn map_create_placement(
    input: &QuickPlacementDto,
) -> Result<QuickCreateTaskPlacement, UsecaseError> {
    if matches!(input.kind, QuickPlacementKind::Project) && input.project_id.is_none() {
        return Err(UsecaseError::validation(
            "placement.kind=project 时必须提供 projectId",
        ));
    }

    Ok(QuickCreateTaskPlacement {
        kind: input.kind,
        project_id: input.project_id.clone(),
    })
}

fn parse_task_status(status: Option<&str>) -> Result<Option<TaskStatus>, UsecaseError> {
    let Some(status) = status else {
        return Ok(None);
    };

    match status {
        "todo" => Ok(Some(TaskStatus::Todo)),
        "doing" => Ok(Some(TaskStatus::Doing)),
        "waiting" => Ok(Some(TaskStatus::Waiting)),
        "done" => Ok(Some(TaskStatus::Done)),
        "canceled" => Ok(Some(TaskStatus::Canceled)),
        other => Err(UsecaseError::validation(format!("未知任务状态: {other}"))),
    }
}

fn map_created_dto(detail: QuickCreateTaskDetail, space_fallback: bool) -> QuickCreatedDto {
    QuickCreatedDto {
        id: detail.id,
        title: detail.title,
        space_id: detail.space_id,
        project_id: detail.project_id,
        inbox_at: detail.inbox_at,
        space_fallback,
    }
}

fn resolve_task_placement(detail: &QuickCreateTaskDetail) -> QuickResolvedPlacement {
    if detail.project_id.is_some() {
        return QuickResolvedPlacement::Project;
    }

    if detail.inbox_at.is_some() {
        return QuickResolvedPlacement::Inbox;
    }

    QuickResolvedPlacement::NoProject
}

fn map_search_task(task: crate::search::SearchTaskItemDto) -> QuickTaskItemDto {
    QuickTaskItemDto {
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

fn map_search_project(project: crate::search::SearchProjectItemDto) -> QuickProjectItemDto {
    QuickProjectItemDto {
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

fn map_default_space_domain_error(error: stoneflow_domain::DomainError) -> UsecaseError {
    match error {
        stoneflow_domain::DomainError::Validation(message) if message.contains("Space") => {
            UsecaseError::default_space_unavailable(message)
        }
        stoneflow_domain::DomainError::Validation(message) => UsecaseError::validation(message),
    }
}

/// 供 open context 复用：映射 Scope。
pub fn map_scope_dto(
    active_scope: Option<ActiveScopeInput>,
    default_space_id: String,
) -> QuickScopeDto {
    match active_scope {
        Some(scope) if scope.kind == ActiveScopeKind::Space => QuickScopeDto {
            kind: QuickScopeKind::Space,
            space_id: scope.space_id,
        },
        Some(_) => QuickScopeDto {
            kind: QuickScopeKind::All,
            space_id: None,
        },
        None => QuickScopeDto {
            kind: QuickScopeKind::Space,
            space_id: Some(default_space_id),
        },
    }
}

/// 供 open context 复用：解析默认 Space。
pub fn resolve_default_space_from_candidates(
    active_scope: Option<&ActiveScopeInput>,
    candidates: &[QuickCreateSpaceCandidate],
) -> Result<String, UsecaseError> {
    resolve_default_space_id(
        active_scope.and_then(|scope| scope.space_id.as_deref()),
        candidates,
    )
    .map_err(map_default_space_domain_error)
}

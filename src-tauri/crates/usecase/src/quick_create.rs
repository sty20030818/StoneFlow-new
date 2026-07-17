//! Quick Create 用例编排。

#![allow(async_fn_in_trait)]

use serde::{Deserialize, Serialize};
use stoneflow_domain::{resolve_default_space_id, QuickCreateSpaceCandidate};

use crate::UsecaseError;

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

fn resolve_task_placement(detail: &QuickCreateTaskDetail) -> QuickResolvedPlacement {
    if detail.project_id.is_some() {
        return QuickResolvedPlacement::Project;
    }

    if detail.inbox_at.is_some() {
        return QuickResolvedPlacement::Inbox;
    }

    QuickResolvedPlacement::NoProject
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

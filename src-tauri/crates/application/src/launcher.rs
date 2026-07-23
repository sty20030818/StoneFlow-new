//! Launcher 用例编排。

#![allow(async_fn_in_trait)]

use serde::{Deserialize, Serialize};
use stoneflow_domain::{resolve_default_space_id, LauncherSpaceCandidate};

use crate::ApplicationError;

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
pub enum LauncherResolvedPlacement {
    Project,
    Standalone,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LauncherResolvedOpenTarget {
    pub kind: &'static str,
    pub id: String,
    pub space_id: String,
    pub project_id: Option<String>,
    pub placement: LauncherResolvedPlacement,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum LauncherScopeKind {
    All,
    Space,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherScopeDto {
    #[serde(rename = "type")]
    pub kind: LauncherScopeKind,
    pub space_id: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum LauncherPlacementKind {
    Standalone,
    Project,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherPlacementDto {
    #[serde(rename = "kind")]
    pub kind: LauncherPlacementKind,
    pub project_id: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherSpaceSummaryDto {
    pub id: String,
    pub name: String,
    pub icon_key: String,
    pub color_key: String,
    pub is_default: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum LauncherProjectOptionKind {
    Standalone,
    Project,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherProjectOptionDto {
    #[serde(rename = "kind")]
    pub kind: LauncherProjectOptionKind,
    pub id: Option<String>,
    pub space_id: String,
    pub name: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherTaskItemDto {
    pub id: String,
    pub space_id: String,
    pub space_name: String,
    pub project_id: Option<String>,
    pub project_name: Option<String>,
    pub title: String,
    pub note: Option<String>,
    pub priority: i32,
    pub status: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherProjectItemDto {
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
pub struct LauncherListProjectsBySpaceInput {
    pub space_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherProjectsBySpaceDto {
    pub space_id: String,
    pub standalone_option: LauncherProjectOptionDto,
    pub projects: Vec<LauncherProjectOptionDto>,
}

/// Launcher 读取任务详情所需字段。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LauncherTaskDetail {
    pub id: String,
    pub space_id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub note: Option<String>,
    pub due_at: Option<String>,
    pub scheduled_at: Option<String>,
    pub reminder_at: Option<String>,
}

/// Sidebar 项目摘要。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LauncherSidebarProjectDto {
    pub id: String,
    pub space_id: String,
    pub name: String,
}

/// Launcher 编排所需的跨服务 port。
pub trait LauncherPorts: Send + Sync + Clone {
    async fn list_visible_spaces(&self) -> Result<Vec<LauncherSpaceSummaryDto>, ApplicationError>;
    async fn list_space_candidates(&self) -> Result<Vec<LauncherSpaceCandidate>, ApplicationError>;
    async fn get_space(
        &self,
        space_id: &str,
    ) -> Result<Option<LauncherSpaceCandidate>, ApplicationError>;
    async fn list_sidebar_projects_for_space(
        &self,
        space_id: &str,
    ) -> Result<Vec<LauncherSidebarProjectDto>, ApplicationError>;
    async fn get_task_detail(&self, task_id: &str) -> Result<LauncherTaskDetail, ApplicationError>;
    async fn get_project_space_id(&self, project_id: &str) -> Result<String, ApplicationError>;
    async fn list_recent_tasks(
        &self,
        limit: usize,
    ) -> Result<Vec<LauncherTaskItemDto>, ApplicationError>;
    async fn list_recent_projects(
        &self,
        limit: usize,
    ) -> Result<Vec<LauncherProjectItemDto>, ApplicationError>;
}

/// Launcher 编排服务。
#[derive(Debug, Clone)]
pub struct LauncherService<P: LauncherPorts> {
    ports: P,
}

impl<P: LauncherPorts> LauncherService<P> {
    pub fn new(ports: P) -> Self {
        Self { ports }
    }

    pub async fn list_visible_spaces(
        &self,
    ) -> Result<Vec<LauncherSpaceSummaryDto>, ApplicationError> {
        self.ports.list_visible_spaces().await
    }

    pub async fn list_projects_by_space(
        &self,
        input: LauncherListProjectsBySpaceInput,
    ) -> Result<LauncherProjectsBySpaceDto, ApplicationError> {
        let space = self
            .ports
            .get_space(&input.space_id)
            .await?
            .ok_or_else(|| ApplicationError::not_found("Space 不存在"))?;

        let projects = self
            .ports
            .list_sidebar_projects_for_space(&space.id)
            .await?;

        Ok(LauncherProjectsBySpaceDto {
            space_id: space.id.clone(),
            standalone_option: LauncherProjectOptionDto {
                kind: LauncherProjectOptionKind::Standalone,
                id: None,
                space_id: space.id.clone(),
                name: "独立事项".to_owned(),
            },
            projects: projects
                .into_iter()
                .map(|project| LauncherProjectOptionDto {
                    kind: LauncherProjectOptionKind::Project,
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
    ) -> Result<LauncherTaskDetail, ApplicationError> {
        self.ports.get_task_detail(task_id).await
    }

    pub async fn resolve_task_open_target(
        &self,
        task_id: &str,
    ) -> Result<LauncherResolvedOpenTarget, ApplicationError> {
        let detail = self.get_task_detail(task_id).await?;
        let placement = resolve_task_placement(&detail);

        Ok(LauncherResolvedOpenTarget {
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
    ) -> Result<LauncherResolvedOpenTarget, ApplicationError> {
        let space_id = self.ports.get_project_space_id(project_id).await?;

        Ok(LauncherResolvedOpenTarget {
            kind: "project",
            id: project_id.to_owned(),
            space_id,
            project_id: None,
            placement: LauncherResolvedPlacement::Project,
        })
    }
}

fn resolve_task_placement(detail: &LauncherTaskDetail) -> LauncherResolvedPlacement {
    if detail.project_id.is_some() {
        return LauncherResolvedPlacement::Project;
    }
    LauncherResolvedPlacement::Standalone
}

fn map_default_space_domain_error(error: stoneflow_domain::DomainError) -> ApplicationError {
    match error {
        stoneflow_domain::DomainError::Validation(message) if message.contains("Space") => {
            ApplicationError::default_space_unavailable(message)
        }
        stoneflow_domain::DomainError::Validation(message) => ApplicationError::validation(message),
    }
}

/// 供 open context 复用：映射 Scope。
pub fn map_scope_dto(
    active_scope: Option<ActiveScopeInput>,
    default_space_id: String,
) -> LauncherScopeDto {
    match active_scope {
        Some(scope) if scope.kind == ActiveScopeKind::Space => LauncherScopeDto {
            kind: LauncherScopeKind::Space,
            space_id: scope.space_id,
        },
        Some(_) => LauncherScopeDto {
            kind: LauncherScopeKind::All,
            space_id: None,
        },
        None => LauncherScopeDto {
            kind: LauncherScopeKind::Space,
            space_id: Some(default_space_id),
        },
    }
}

/// 供 open context 复用：解析默认 Space。
pub fn resolve_default_space_from_candidates(
    active_scope: Option<&ActiveScopeInput>,
    candidates: &[LauncherSpaceCandidate],
) -> Result<String, ApplicationError> {
    resolve_default_space_id(
        active_scope.and_then(|scope| scope.space_id.as_deref()),
        candidates,
    )
    .map_err(map_default_space_domain_error)
}

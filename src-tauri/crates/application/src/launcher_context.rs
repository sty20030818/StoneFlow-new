//! Launcher 初始态编排：prepare-session 所需的只读上下文。

#![allow(async_fn_in_trait)]

use serde::Serialize;

use crate::{
    launcher::{
        map_scope_dto, resolve_default_space_from_candidates, ActiveScopeInput,
        LauncherPlacementDto, LauncherPlacementKind, LauncherPorts, LauncherProjectItemDto,
        LauncherProjectOptionDto, LauncherService, LauncherSpaceSummaryDto, LauncherTaskItemDto,
    },
    ApplicationError,
};

pub const DEFAULT_RECENT_LIMIT: usize = 5;

/// Launcher 初始态 DTO。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherInitialStateDto {
    pub current_scope: crate::launcher::LauncherScopeDto,
    pub default_space_id: String,
    pub default_placement: LauncherPlacementDto,
    pub spaces: Vec<LauncherSpaceSummaryDto>,
    pub projects: Vec<LauncherProjectOptionDto>,
    pub recent_tasks: Vec<LauncherTaskItemDto>,
    pub recent_projects: Vec<LauncherProjectItemDto>,
}

/// Launcher 初始态编排。
#[derive(Debug, Clone)]
pub struct LauncherContextService<P: LauncherPorts> {
    ports: P,
}

impl<P: LauncherPorts> LauncherContextService<P> {
    pub fn new(ports: P) -> Self {
        Self { ports }
    }

    pub async fn get_initial_state(
        &self,
        active_scope: Option<ActiveScopeInput>,
    ) -> Result<LauncherInitialStateDto, ApplicationError> {
        let spaces = LauncherService::new(self.ports.clone())
            .list_visible_spaces()
            .await?;
        let candidates = self.ports.list_space_candidates().await?;
        let default_space_id =
            resolve_default_space_from_candidates(active_scope.as_ref(), &candidates)?;
        let current_scope = map_scope_dto(active_scope, default_space_id.clone());
        let projects_payload = LauncherService::new(self.ports.clone())
            .list_projects_by_space(crate::launcher::LauncherListProjectsBySpaceInput {
                space_id: default_space_id.clone(),
            })
            .await?;
        let (recent_tasks, recent_projects) = self.list_recent_entities().await?;

        Ok(LauncherInitialStateDto {
            current_scope,
            default_space_id,
            // 默认落在独立事项（当前 Space 内无 Project 归属）。
            default_placement: LauncherPlacementDto {
                kind: LauncherPlacementKind::Standalone,
                project_id: None,
            },
            spaces,
            projects: std::iter::once(projects_payload.standalone_option)
                .chain(projects_payload.projects)
                .collect(),
            recent_tasks,
            recent_projects,
        })
    }

    pub async fn list_recent_entities(
        &self,
    ) -> Result<(Vec<LauncherTaskItemDto>, Vec<LauncherProjectItemDto>), ApplicationError> {
        let recent_tasks = self.ports.list_recent_tasks(DEFAULT_RECENT_LIMIT).await?;
        let recent_projects = self
            .ports
            .list_recent_projects(DEFAULT_RECENT_LIMIT)
            .await?;
        Ok((recent_tasks, recent_projects))
    }
}

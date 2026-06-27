//! Quick Create 初始态编排：prepare-session 所需的只读上下文。

#![allow(async_fn_in_trait)]

use serde::Serialize;

use crate::{
    quick_create::{
        map_scope_dto, resolve_default_space_from_candidates, ActiveScopeInput, QuickCreatePorts,
        QuickCreateService, QuickPlacementDto, QuickPlacementKind, QuickProjectItemDto,
        QuickProjectOptionDto, QuickSpaceSummaryDto, QuickTaskItemDto,
    },
    UsecaseError,
};

pub const DEFAULT_RECENT_LIMIT: usize = 3;

/// Quick Create 初始态 DTO。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickInitialStateDto {
    pub current_scope: crate::quick_create::QuickScopeDto,
    pub default_space_id: String,
    pub default_placement: QuickPlacementDto,
    pub spaces: Vec<QuickSpaceSummaryDto>,
    pub projects: Vec<QuickProjectOptionDto>,
    pub recent_tasks: Vec<QuickTaskItemDto>,
    pub recent_projects: Vec<QuickProjectItemDto>,
}

/// Quick Create 初始态编排。
#[derive(Debug, Clone)]
pub struct QuickCreateContextService<P: QuickCreatePorts> {
    ports: P,
}

impl<P: QuickCreatePorts> QuickCreateContextService<P> {
    pub fn new(ports: P) -> Self {
        Self { ports }
    }

    pub async fn get_initial_state(
        &self,
        active_scope: Option<ActiveScopeInput>,
    ) -> Result<QuickInitialStateDto, UsecaseError> {
        let spaces = QuickCreateService::new(self.ports.clone())
            .list_visible_spaces()
            .await?;
        let candidates = self.ports.list_space_candidates().await?;
        let default_space_id =
            resolve_default_space_from_candidates(active_scope.as_ref(), &candidates)?;
        let current_scope = map_scope_dto(active_scope, default_space_id.clone());
        let projects_payload = QuickCreateService::new(self.ports.clone())
            .list_projects_by_space(crate::quick_create::QuickListProjectsBySpaceInput {
                space_id: default_space_id.clone(),
            })
            .await?;
        let (recent_tasks, recent_projects) = self.list_recent_entities().await?;

        Ok(QuickInitialStateDto {
            current_scope,
            default_space_id,
            default_placement: QuickPlacementDto {
                kind: QuickPlacementKind::Inbox,
                project_id: None,
            },
            spaces,
            projects: std::iter::once(projects_payload.inbox_project)
                .chain(std::iter::once(projects_payload.no_project_option))
                .chain(projects_payload.projects.into_iter())
                .collect(),
            recent_tasks,
            recent_projects,
        })
    }

    pub async fn list_recent_entities(
        &self,
    ) -> Result<(Vec<QuickTaskItemDto>, Vec<QuickProjectItemDto>), UsecaseError> {
        let recent_tasks = self.ports.list_recent_tasks(DEFAULT_RECENT_LIMIT).await?;
        let recent_projects = self
            .ports
            .list_recent_projects(DEFAULT_RECENT_LIMIT)
            .await?;
        Ok((recent_tasks, recent_projects))
    }
}

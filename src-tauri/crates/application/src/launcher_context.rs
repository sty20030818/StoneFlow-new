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

/// Launcher 打开会话所需的最小上下文。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherOpenContextDto {
    pub current_scope: crate::launcher::LauncherScopeDto,
    pub default_space_id: String,
    pub default_placement: LauncherPlacementDto,
    pub spaces: Vec<LauncherSpaceSummaryDto>,
    pub projects: Vec<LauncherProjectOptionDto>,
}

/// Launcher 最近记录，仅作为会话可见后的增强数据。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherRecentDataDto {
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

    pub async fn get_open_context(
        &self,
        active_scope: Option<ActiveScopeInput>,
    ) -> Result<LauncherOpenContextDto, ApplicationError> {
        let launcher = LauncherService::new(self.ports.clone());
        let (spaces, candidates) = tokio::try_join!(
            launcher.list_visible_spaces(),
            self.ports.list_space_candidates(),
        )?;
        let default_space_id =
            resolve_default_space_from_candidates(active_scope.as_ref(), &candidates)?;
        let current_scope = map_scope_dto(active_scope, default_space_id.clone());
        let projects_payload = LauncherService::new(self.ports.clone())
            .list_projects_by_space(crate::launcher::LauncherListProjectsBySpaceInput {
                space_id: default_space_id.clone(),
            })
            .await?;
        Ok(LauncherOpenContextDto {
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
        })
    }

    pub async fn get_recent_data(&self) -> Result<LauncherRecentDataDto, ApplicationError> {
        let (recent_tasks, recent_projects) = tokio::try_join!(
            self.ports.list_recent_tasks(DEFAULT_RECENT_LIMIT),
            self.ports.list_recent_projects(DEFAULT_RECENT_LIMIT),
        )?;
        Ok(LauncherRecentDataDto {
            recent_tasks,
            recent_projects,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::launcher::{
        LauncherProjectItemDto, LauncherSidebarProjectDto, LauncherTaskDetail, LauncherTaskItemDto,
    };
    use stoneflow_domain::LauncherSpaceCandidate;

    #[derive(Clone)]
    struct FakeLauncherPorts {
        spaces: Vec<LauncherSpaceSummaryDto>,
        candidates: Result<Vec<LauncherSpaceCandidate>, ApplicationError>,
        projects: Vec<LauncherSidebarProjectDto>,
        recent_tasks: Result<Vec<LauncherTaskItemDto>, ApplicationError>,
        recent_projects: Result<Vec<LauncherProjectItemDto>, ApplicationError>,
    }

    impl FakeLauncherPorts {
        fn ready() -> Self {
            Self {
                spaces: vec![
                    space("space-a", "工作", true),
                    space("space-b", "生活", false),
                ],
                candidates: Ok(vec![
                    candidate("space-a", true),
                    candidate("space-b", false),
                ]),
                projects: Vec::new(),
                recent_tasks: Ok(Vec::new()),
                recent_projects: Ok(Vec::new()),
            }
        }
    }

    impl LauncherPorts for FakeLauncherPorts {
        async fn list_visible_spaces(
            &self,
        ) -> Result<Vec<LauncherSpaceSummaryDto>, ApplicationError> {
            Ok(self.spaces.clone())
        }

        async fn list_space_candidates(
            &self,
        ) -> Result<Vec<LauncherSpaceCandidate>, ApplicationError> {
            self.candidates.clone()
        }

        async fn get_space(
            &self,
            space_id: &str,
        ) -> Result<Option<LauncherSpaceCandidate>, ApplicationError> {
            Ok(self
                .candidates
                .clone()?
                .into_iter()
                .find(|candidate| candidate.id == space_id))
        }

        async fn list_sidebar_projects_for_space(
            &self,
            space_id: &str,
        ) -> Result<Vec<LauncherSidebarProjectDto>, ApplicationError> {
            Ok(self
                .projects
                .iter()
                .filter(|project| project.space_id == space_id)
                .cloned()
                .collect())
        }

        async fn get_task_detail(
            &self,
            _task_id: &str,
        ) -> Result<LauncherTaskDetail, ApplicationError> {
            Err(ApplicationError::not_found("Task 不存在"))
        }

        async fn get_project_space_id(&self, project_id: &str) -> Result<String, ApplicationError> {
            self.projects
                .iter()
                .find(|project| project.id == project_id)
                .map(|project| project.space_id.clone())
                .ok_or_else(|| ApplicationError::not_found("Project 不存在"))
        }

        async fn list_recent_tasks(
            &self,
            _limit: usize,
        ) -> Result<Vec<LauncherTaskItemDto>, ApplicationError> {
            self.recent_tasks.clone()
        }

        async fn list_recent_projects(
            &self,
            _limit: usize,
        ) -> Result<Vec<LauncherProjectItemDto>, ApplicationError> {
            self.recent_projects.clone()
        }
    }

    fn candidate(id: &str, is_default: bool) -> LauncherSpaceCandidate {
        LauncherSpaceCandidate {
            id: id.to_owned(),
            is_default,
        }
    }

    fn space(id: &str, name: &str, is_default: bool) -> LauncherSpaceSummaryDto {
        LauncherSpaceSummaryDto {
            id: id.to_owned(),
            name: name.to_owned(),
            icon_key: "folder".to_owned(),
            color_key: "blue".to_owned(),
            is_default,
        }
    }

    #[tokio::test]
    async fn open_context_should_prefer_the_active_space_and_include_standalone_placement() {
        let service = LauncherContextService::new(FakeLauncherPorts::ready());

        let context = service
            .get_open_context(Some(ActiveScopeInput {
                kind: crate::launcher::ActiveScopeKind::Space,
                space_id: Some("space-b".to_owned()),
            }))
            .await
            .expect("active space should resolve");

        assert_eq!(context.default_space_id, "space-b");
        assert_eq!(context.current_scope.space_id.as_deref(), Some("space-b"));
        assert_eq!(context.projects.len(), 1);
        assert_eq!(context.projects[0].kind, LauncherPlacementKind::Standalone);
    }

    #[tokio::test]
    async fn open_context_should_fail_when_no_space_candidate_is_available() {
        let mut ports = FakeLauncherPorts::ready();
        ports.candidates = Ok(Vec::new());
        let service = LauncherContextService::new(ports);

        let error = service
            .get_open_context(None)
            .await
            .expect_err("an empty workspace cannot provide a default space");

        assert!(matches!(
            error,
            ApplicationError::DefaultSpaceUnavailable(_)
        ));
    }

    #[tokio::test]
    async fn recent_data_should_propagate_storage_errors() {
        let mut ports = FakeLauncherPorts::ready();
        ports.recent_tasks = Err(ApplicationError::storage("recent tasks query failed"));
        let service = LauncherContextService::new(ports);

        let error = service
            .get_recent_data()
            .await
            .expect_err("recent-data errors must reach the IPC boundary");

        assert_eq!(
            error,
            ApplicationError::storage("recent tasks query failed")
        );
    }
}

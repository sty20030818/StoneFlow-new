//! Quick Create Service 兼容壳：真源在 `stoneflow-usecase`；IPC 映射在 `quick_create_ipc`。

use stoneflow_ipc_protocol::{
    QuickCreatePayload, QuickCreatedPayload, QuickListProjectsBySpacePayload,
    QuickProjectsBySpaceResponsePayload, QuickSearchPayload, QuickSearchResponsePayload,
};
use stoneflow_usecase::quick_create::{
    ActiveScopeInput, ActiveScopeKind, QuickCreateService as QuickCreateUsecase,
};

pub use stoneflow_usecase::quick_create::{QuickResolvedOpenTarget, QuickResolvedPlacement};

use crate::{
    app::{error::AppError, state::ActiveScopeSnapshot},
    application::{
        activity::ActivityService,
        services::{
            quick_create_adapter::QuickCreatePortsAdapter,
            quick_create_ipc::{
                map_create_input, map_created_output, map_list_projects_input,
                map_projects_by_space_output, map_search_input, map_search_output,
            },
            ProjectService, SearchService, SpaceService, TaskDetailDto, TaskService,
        },
    },
    infrastructure::repositories::{
        ActivityRepository, ProjectRepository, SpaceRepository, TaskRepository,
    },
};

#[derive(Debug, Clone)]
pub struct QuickCreateService {
    inner: QuickCreateUsecase<QuickCreatePortsAdapter>,
    task_service: TaskService,
}

impl QuickCreateService {
    pub fn new(
        space_repository: SpaceRepository,
        project_repository: ProjectRepository,
        task_repository: TaskRepository,
        activity_repository: ActivityRepository,
    ) -> Self {
        let activity_service = ActivityService::new(activity_repository);
        let space_service = SpaceService::new(
            space_repository.clone(),
            project_repository.clone(),
            task_repository.clone(),
            activity_service.clone(),
        );
        let project_service = ProjectService::new(
            space_repository.clone(),
            project_repository.clone(),
            task_repository.clone(),
            activity_service.clone(),
        );
        let task_service = TaskService::new(
            space_repository.clone(),
            project_repository.clone(),
            task_repository.clone(),
            activity_service,
        );
        let search_service = SearchService::new(
            space_repository.clone(),
            project_repository.clone(),
            task_repository.clone(),
        );
        let ports = QuickCreatePortsAdapter::new(
            space_service,
            project_service,
            task_service.clone(),
            search_service,
            space_repository,
            project_repository,
            task_repository,
        );

        Self {
            inner: QuickCreateUsecase::new(ports),
            task_service,
        }
    }

    pub async fn list_projects_by_space(
        &self,
        input: QuickListProjectsBySpacePayload,
    ) -> Result<QuickProjectsBySpaceResponsePayload, AppError> {
        self.inner
            .list_projects_by_space(map_list_projects_input(input))
            .await
            .map(map_projects_by_space_output)
            .map_err(AppError::from)
    }

    pub async fn search(
        &self,
        input: QuickSearchPayload,
    ) -> Result<QuickSearchResponsePayload, AppError> {
        self.inner
            .search(map_search_input(input))
            .await
            .map(map_search_output)
            .map_err(AppError::from)
    }

    pub async fn create(
        &self,
        input: QuickCreatePayload,
        active_scope: Option<ActiveScopeSnapshot>,
    ) -> Result<QuickCreatedPayload, AppError> {
        self.inner
            .create(map_create_input(input), map_active_scope(active_scope))
            .await
            .map(map_created_output)
            .map_err(AppError::from)
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
        self.inner
            .resolve_task_open_target(task_id)
            .await
            .map_err(AppError::from)
    }

    pub async fn resolve_project_open_target(
        &self,
        project_id: &str,
    ) -> Result<QuickResolvedOpenTarget, AppError> {
        self.inner
            .resolve_project_open_target(project_id)
            .await
            .map_err(AppError::from)
    }
}

pub(crate) fn map_active_scope(snapshot: Option<ActiveScopeSnapshot>) -> Option<ActiveScopeInput> {
    snapshot.map(|scope| ActiveScopeInput {
        kind: match scope.kind {
            crate::app::state::ActiveScopeKind::All => ActiveScopeKind::All,
            crate::app::state::ActiveScopeKind::Space => ActiveScopeKind::Space,
        },
        space_id: scope.space_id.map(|id| id.to_string()),
    })
}

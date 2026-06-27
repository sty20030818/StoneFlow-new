//! Quick Create Open Context 兼容壳。

use stoneflow_usecase::quick_create_context::{
    QuickCreateContextService as QuickCreateContextUsecase, QuickInitialStateDto,
};

use crate::{
    app::{error::AppError, state::ActiveScopeSnapshot},
    services::{
        activity::ActivityService, quick_create_adapter::QuickCreatePortsAdapter,
        quick_create_service::map_active_scope, ProjectService, QuickCreateService, SearchService,
        SpaceService, TaskService,
    },
};
use stoneflow_storage::repositories::{
    ActivityRepository, ProjectRepository, SpaceRepository, SyncRepository, TaskRepository,
};

#[derive(Debug, Clone)]
pub struct QuickCreateOpenContextService {
    inner: QuickCreateContextUsecase<QuickCreatePortsAdapter>,
}

impl QuickCreateOpenContextService {
    pub fn new(
        quick_create_service: QuickCreateService,
        space_repository: SpaceRepository,
        project_repository: ProjectRepository,
        task_repository: TaskRepository,
    ) -> Self {
        let _ = quick_create_service;
        let connection = space_repository.connection().clone();
        let activity_service = ActivityService::new(ActivityRepository::new(connection.clone()));
        let ports = QuickCreatePortsAdapter::new(
            SpaceService::new(
                space_repository.clone(),
                SyncRepository::new(connection.clone()),
                project_repository.clone(),
                task_repository.clone(),
                activity_service.clone(),
            ),
            ProjectService::new(
                space_repository.clone(),
                project_repository.clone(),
                task_repository.clone(),
                SyncRepository::new(connection.clone()),
                activity_service.clone(),
            ),
            TaskService::new(
                space_repository.clone(),
                project_repository.clone(),
                task_repository.clone(),
                SyncRepository::new(connection.clone()),
                activity_service,
            ),
            SearchService::new(
                space_repository.clone(),
                project_repository.clone(),
                task_repository.clone(),
            ),
            space_repository,
            project_repository,
            task_repository,
        );

        Self {
            inner: QuickCreateContextUsecase::new(ports),
        }
    }

    pub async fn get_initial_state(
        &self,
        active_scope: Option<ActiveScopeSnapshot>,
    ) -> Result<QuickInitialStateDto, AppError> {
        self.inner
            .get_initial_state(map_active_scope(active_scope))
            .await
            .map_err(AppError::from)
    }
}

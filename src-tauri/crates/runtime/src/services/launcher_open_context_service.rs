//! Launcher Open Context：prepare-session 只读上下文编排壳（真源在 usecase）。

use stoneflow_application::launcher_context::{
    LauncherContextService as LauncherContextUsecase, LauncherInitialStateDto,
};

use crate::{
    app::{error::AppError, state::ActiveScopeSnapshot},
    services::{
        activity::ActivityService, launcher_adapter::LauncherPortsAdapter,
        launcher_service::map_active_scope, LauncherService, ProjectService, SpaceService,
        TaskService,
    },
};
use stoneflow_storage::repositories::{
    ActivityRepository, ProjectRepository, SpaceRepository, SyncRepository, TaskRepository,
};

#[derive(Debug, Clone)]
pub struct LauncherOpenContextService {
    inner: LauncherContextUsecase<LauncherPortsAdapter>,
}

impl LauncherOpenContextService {
    pub fn new(
        launcher_service: LauncherService,
        space_repository: SpaceRepository,
        project_repository: ProjectRepository,
        task_repository: TaskRepository,
    ) -> Self {
        let _ = launcher_service;
        let connection = space_repository.connection().clone();
        let activity_service = ActivityService::new(ActivityRepository::new(connection.clone()));
        let ports = LauncherPortsAdapter::new(
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
            space_repository,
            project_repository,
            task_repository,
        );

        Self {
            inner: LauncherContextUsecase::new(ports),
        }
    }

    pub async fn get_initial_state(
        &self,
        active_scope: Option<ActiveScopeSnapshot>,
    ) -> Result<LauncherInitialStateDto, AppError> {
        self.inner
            .get_initial_state(map_active_scope(active_scope))
            .await
            .map_err(AppError::from)
    }
}

//! Runtime 组装层：集中构造 commands 与 window 需要的服务。

use crate::services::{
    activity::ActivityService, LifecycleService, ProjectService, LauncherOpenContextService,
    LauncherService, LauncherSessionBridge, SearchService, SettingsService, SpaceService,
    TaskLinkService, TaskService, ViewService,
};
use stoneflow_storage::{
    database::DatabaseRuntimeState,
    repositories::{
        ActivityRepository, ProjectRepository, SettingsRepository, SpaceRepository,
        SyncRepository, TaskLinkRepository, TaskRepository, ViewRepository,
    },
};

pub fn build_lifecycle_service(database: &DatabaseRuntimeState) -> LifecycleService {
    let connection = database.connection().clone();
    LifecycleService::new(
        SpaceRepository::new(connection.clone()),
        SyncRepository::new(connection.clone()),
        ProjectRepository::new(connection.clone()),
        TaskRepository::new(connection.clone()),
        ActivityService::new(ActivityRepository::new(connection)),
    )
}

pub fn build_project_service(database: &DatabaseRuntimeState) -> ProjectService {
    let connection = database.connection().clone();
    ProjectService::new(
        SpaceRepository::new(connection.clone()),
        ProjectRepository::new(connection.clone()),
        TaskRepository::new(connection.clone()),
        SyncRepository::new(connection.clone()),
        ActivityService::new(ActivityRepository::new(connection)),
    )
}

pub fn build_launcher_service(database: &DatabaseRuntimeState) -> LauncherService {
    let connection = database.connection().clone();
    LauncherService::new(
        SpaceRepository::new(connection.clone()),
        ProjectRepository::new(connection.clone()),
        TaskRepository::new(connection.clone()),
        ActivityRepository::new(connection),
    )
}

pub fn build_launcher_session_bridge(
    database: &DatabaseRuntimeState,
) -> LauncherSessionBridge {
    let connection = database.connection().clone();
    let space_repository = SpaceRepository::new(connection.clone());
    let project_repository = ProjectRepository::new(connection.clone());
    let task_repository = TaskRepository::new(connection.clone());
    let launcher_service = LauncherService::new(
        space_repository.clone(),
        project_repository.clone(),
        task_repository.clone(),
        ActivityRepository::new(connection),
    );

    LauncherSessionBridge::new(LauncherOpenContextService::new(
        launcher_service,
        space_repository,
        project_repository,
        task_repository,
    ))
}

pub fn build_search_service(database: &DatabaseRuntimeState) -> SearchService {
    let connection = database.connection().clone();
    SearchService::new(
        SpaceRepository::new(connection.clone()),
        ProjectRepository::new(connection.clone()),
        TaskRepository::new(connection),
    )
}

pub fn build_settings_service(database: &DatabaseRuntimeState) -> SettingsService {
    let connection = database.connection().clone();
    SettingsService::new(
        SettingsRepository::new(connection.clone()),
        SyncRepository::new(connection.clone()),
        ActivityService::new(ActivityRepository::new(connection)),
    )
}

pub fn build_space_service(database: &DatabaseRuntimeState) -> SpaceService {
    let connection = database.connection().clone();
    SpaceService::new(
        SpaceRepository::new(connection.clone()),
        SyncRepository::new(connection.clone()),
        ProjectRepository::new(connection.clone()),
        TaskRepository::new(connection.clone()),
        ActivityService::new(ActivityRepository::new(connection)),
    )
}

pub fn build_task_service(database: &DatabaseRuntimeState) -> TaskService {
    let connection = database.connection().clone();
    TaskService::new(
        SpaceRepository::new(connection.clone()),
        ProjectRepository::new(connection.clone()),
        TaskRepository::new(connection.clone()),
        SyncRepository::new(connection.clone()),
        ActivityService::new(ActivityRepository::new(connection)),
    )
}

pub fn build_task_link_service(database: &DatabaseRuntimeState) -> TaskLinkService {
    let connection = database.connection().clone();
    TaskLinkService::new(
        TaskRepository::new(connection.clone()),
        TaskLinkRepository::new(connection.clone()),
        SyncRepository::new(connection.clone()),
        ActivityService::new(ActivityRepository::new(connection)),
    )
}

pub fn build_view_service(database: &DatabaseRuntimeState) -> ViewService {
    let connection = database.connection().clone();
    ViewService::new(
        ViewRepository::new(connection.clone()),
        SyncRepository::new(connection.clone()),
        SpaceRepository::new(connection.clone()),
        ProjectRepository::new(connection.clone()),
        TaskRepository::new(connection.clone()),
        ActivityService::new(ActivityRepository::new(connection)),
    )
}

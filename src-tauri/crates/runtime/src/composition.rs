//! Runtime 组装层：集中构造 commands 与 window 需要的服务。

use crate::services::{
    activity::ActivityService, LauncherService, LauncherSessionBridge, LifecycleService,
    ProjectService, SearchService, SettingsService, SpaceService, TaskLinkService, TaskService,
    ViewService,
};
use stoneflow_storage::{
    database::DatabaseRuntimeState,
    repositories::{ProjectRepository, SettingsRepository, SpaceRepository},
};

pub fn build_lifecycle_service(database: &DatabaseRuntimeState) -> LifecycleService {
    LifecycleService::new(database)
}

pub fn build_project_service(database: &DatabaseRuntimeState) -> ProjectService {
    ProjectService::new(
        ProjectRepository::new(database.connection().clone()),
        SpaceRepository::new(database.connection().clone()),
    )
}

pub fn build_launcher_service(database: &DatabaseRuntimeState) -> LauncherService {
    LauncherService::new(database)
}

pub fn build_launcher_session_bridge(database: &DatabaseRuntimeState) -> LauncherSessionBridge {
    LauncherSessionBridge::new(database)
}

pub fn build_search_service(database: &DatabaseRuntimeState) -> SearchService {
    SearchService::new(database)
}

pub fn build_settings_service(database: &DatabaseRuntimeState) -> SettingsService {
    SettingsService::new(SettingsRepository::new(database.connection().clone()))
}

pub fn build_space_service(database: &DatabaseRuntimeState) -> SpaceService {
    SpaceService::new(SpaceRepository::new(database.connection().clone()))
}

pub fn build_task_service(database: &DatabaseRuntimeState) -> TaskService {
    TaskService::new(database)
}

pub fn build_task_link_service(database: &DatabaseRuntimeState) -> TaskLinkService {
    TaskLinkService::new(database)
}

pub fn build_view_service(database: &DatabaseRuntimeState) -> ViewService {
    ViewService::new(database)
}

pub fn build_activity_service(database: &DatabaseRuntimeState) -> ActivityService {
    ActivityService::new(database)
}

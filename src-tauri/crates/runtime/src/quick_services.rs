//! Quick Create 相关 service 组装（IPC 命令与单 Binary 命令共享）。

use crate::services::{
    QuickCreateOpenContextService, QuickCreateService, QuickCreateSessionBridge,
};
use stoneflow_storage::{
    database::DatabaseRuntimeState,
    repositories::{ActivityRepository, ProjectRepository, SpaceRepository, TaskRepository},
};

pub fn build_quick_create_service(database: &DatabaseRuntimeState) -> QuickCreateService {
    let connection = database.connection().clone();
    QuickCreateService::new(
        SpaceRepository::new(connection.clone()),
        ProjectRepository::new(connection.clone()),
        TaskRepository::new(connection.clone()),
        ActivityRepository::new(connection),
    )
}

pub fn build_quick_create_session_bridge(database: &DatabaseRuntimeState) -> QuickCreateSessionBridge {
    let connection = database.connection().clone();
    let space_repository = SpaceRepository::new(connection.clone());
    let project_repository = ProjectRepository::new(connection.clone());
    let task_repository = TaskRepository::new(connection.clone());
    let quick_create_service = QuickCreateService::new(
        space_repository.clone(),
        project_repository.clone(),
        task_repository.clone(),
        ActivityRepository::new(connection),
    );

    QuickCreateSessionBridge::new(QuickCreateOpenContextService::new(
        quick_create_service,
        space_repository,
        project_repository,
        task_repository,
    ))
}

//! Lifecycle 命令：统一 Archive / Trash 列表查询与生命周期内核组装。

use tauri::State;

use crate::app::error::AppError;
use crate::services::{
    activity::ActivityService,
    LifecycleEntry, LifecycleService, ListLifecycleEntriesInput
};
use stoneflow_storage::{
    database::DatabaseRuntimeState,
    repositories::{ActivityRepository, ProjectRepository, SpaceRepository, TaskRepository},
};

#[tauri::command]
pub async fn list_archive_entries(
    input: ListLifecycleEntriesInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<Vec<LifecycleEntry>, AppError> {
    build_lifecycle_service(database.inner())
        .list_archive_entries(input)
        .await
}

#[tauri::command]
pub async fn list_trash_entries(
    input: ListLifecycleEntriesInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<Vec<LifecycleEntry>, AppError> {
    build_lifecycle_service(database.inner())
        .list_trash_entries(input)
        .await
}

pub(crate) fn build_lifecycle_service(database: &DatabaseRuntimeState) -> LifecycleService {
    let connection = database.connection().clone();
    LifecycleService::new(
        SpaceRepository::new(connection.clone()),
        ProjectRepository::new(connection.clone()),
        TaskRepository::new(connection.clone()),
        ActivityService::new(ActivityRepository::new(connection)),
    )
}

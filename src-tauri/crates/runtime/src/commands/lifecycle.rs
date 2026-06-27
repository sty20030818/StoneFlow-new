//! Lifecycle 命令：统一 Archive / Trash 列表查询与生命周期内核组装。

use tauri::State;

use crate::app::error::AppError;
use crate::composition::build_lifecycle_service;
use crate::services::{LifecycleEntry, ListLifecycleEntriesInput};
use stoneflow_storage::database::DatabaseRuntimeState;

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

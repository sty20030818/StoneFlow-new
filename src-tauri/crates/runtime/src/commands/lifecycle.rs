//! Lifecycle 命令：归档 / 回收站列表。

use tauri::State;

use crate::app::error::AppError;
use crate::app::state::AppState;
use stoneflow_application::lifecycle::{LifecycleEntry, ListLifecycleEntriesInput};

#[tauri::command]
pub async fn list_archive_entries(
    input: ListLifecycleEntriesInput,
    state: State<'_, AppState>,
) -> Result<Vec<LifecycleEntry>, AppError> {
    state
        .lifecycle
        .list_archive_entries(input)
        .await
        .map_err(AppError::from)
}

#[tauri::command]
pub async fn list_trash_entries(
    input: ListLifecycleEntriesInput,
    state: State<'_, AppState>,
) -> Result<Vec<LifecycleEntry>, AppError> {
    state
        .lifecycle
        .list_trash_entries(input)
        .await
        .map_err(AppError::from)
}

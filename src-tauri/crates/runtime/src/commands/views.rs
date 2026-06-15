//! View 命令：Tauri IPC 边界只负责 DTO 与 service 组装。

use tauri::State;

use crate::composition::build_view_service;
use crate::app::error::AppError;
use crate::services::{
    CreateViewInput, DeleteViewInput, ListViewsInput, ReorderViewsInput, RunTaskViewInput,
    RunTaskViewOutput, ToggleViewVisibleInput, UpdateViewInput, ViewDto,
};
use stoneflow_storage::database::DatabaseRuntimeState;

#[tauri::command]
pub async fn list_views(
    input: ListViewsInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<Vec<ViewDto>, AppError> {
    build_view_service(database.inner()).list_views(input).await
}

#[tauri::command]
pub async fn run_task_view(
    input: RunTaskViewInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<RunTaskViewOutput, AppError> {
    build_view_service(database.inner())
        .run_task_view(input)
        .await
}

#[tauri::command]
pub async fn create_view(
    input: CreateViewInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<ViewDto, AppError> {
    build_view_service(database.inner())
        .create_view(input)
        .await
}

#[tauri::command]
pub async fn update_view(
    input: UpdateViewInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<ViewDto, AppError> {
    build_view_service(database.inner())
        .update_view(input)
        .await
}

#[tauri::command]
pub async fn delete_view(
    input: DeleteViewInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<(), AppError> {
    build_view_service(database.inner())
        .delete_view(input)
        .await
}

#[tauri::command]
pub async fn toggle_view_visible(
    input: ToggleViewVisibleInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<ViewDto, AppError> {
    build_view_service(database.inner())
        .toggle_view_visible(input)
        .await
}

#[tauri::command]
pub async fn reorder_views(
    input: ReorderViewsInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<Vec<ViewDto>, AppError> {
    build_view_service(database.inner())
        .reorder_views(input)
        .await
}

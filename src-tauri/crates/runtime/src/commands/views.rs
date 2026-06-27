//! View 命令：Tauri IPC 边界只负责 DTO 与 service 组装。

use tauri::State;

use crate::app::error::AppError;
use crate::composition::build_view_service;
use crate::services::{
    CreateViewInput, DeleteViewInput, ListViewsInput, ReorderViewsInput, RunTaskViewInput,
    RunTaskViewOutput, ToggleViewVisibleInput, UpdateViewInput, ViewDto,
};
use crate::sync;
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
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<ViewDto, AppError> {
    let view = build_view_service(database.inner())
        .create_view(input)
        .await?;
    sync::note_local_write(&app_handle).await;
    Ok(view)
}

#[tauri::command]
pub async fn update_view(
    input: UpdateViewInput,
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<ViewDto, AppError> {
    let view = build_view_service(database.inner())
        .update_view(input)
        .await?;
    sync::note_local_write(&app_handle).await;
    Ok(view)
}

#[tauri::command]
pub async fn delete_view(
    input: DeleteViewInput,
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<(), AppError> {
    build_view_service(database.inner())
        .delete_view(input)
        .await?;
    sync::note_local_write(&app_handle).await;
    Ok(())
}

#[tauri::command]
pub async fn toggle_view_visible(
    input: ToggleViewVisibleInput,
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<ViewDto, AppError> {
    let view = build_view_service(database.inner())
        .toggle_view_visible(input)
        .await?;
    sync::note_local_write(&app_handle).await;
    Ok(view)
}

#[tauri::command]
pub async fn reorder_views(
    input: ReorderViewsInput,
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<Vec<ViewDto>, AppError> {
    let views = build_view_service(database.inner())
        .reorder_views(input)
        .await?;
    sync::note_local_write(&app_handle).await;
    Ok(views)
}

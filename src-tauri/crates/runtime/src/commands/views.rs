//! View 命令：薄 transport — 解析 owned DTO、调 AppState 服务、映射错误。

use tauri::State;

use crate::app::error::AppError;
use crate::app::state::AppState;
use crate::sync;
use stoneflow_application::view::{
    CreateViewInput, ListViewsInput, RunTaskViewInput, RunTaskViewOutput, UpdateViewInput, ViewDto,
};

#[tauri::command]
pub async fn list_views(
    input: ListViewsInput,
    state: State<'_, AppState>,
) -> Result<Vec<ViewDto>, AppError> {
    state.views.list_views(input).await.map_err(AppError::from)
}

#[tauri::command]
pub async fn run_task_view(
    input: RunTaskViewInput,
    state: State<'_, AppState>,
) -> Result<RunTaskViewOutput, AppError> {
    state
        .views
        .run_task_view(input)
        .await
        .map_err(AppError::from)
}

#[tauri::command]
pub async fn create_view(
    input: CreateViewInput,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<ViewDto, AppError> {
    let view = state
        .views
        .create_view(input)
        .await
        .map_err(AppError::from)?;
    sync::note_local_write(&app_handle).await;
    Ok(view)
}

#[tauri::command]
pub async fn update_view(
    input: UpdateViewInput,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<ViewDto, AppError> {
    let view = state
        .views
        .update_view(input)
        .await
        .map_err(AppError::from)?;
    sync::note_local_write(&app_handle).await;
    Ok(view)
}

#[tauri::command]
pub async fn delete_view(
    view_id: String,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<(), AppError> {
    state
        .views
        .delete_view(&view_id)
        .await
        .map_err(AppError::from)?;
    sync::note_local_write(&app_handle).await;
    Ok(())
}

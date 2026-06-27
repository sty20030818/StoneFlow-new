//! Task 命令：Tauri IPC 边界只负责 DTO、service 组装与事件发射。

use serde::Serialize;
use tauri::{Emitter, State};

use crate::app::error::AppError;
use crate::composition::{build_lifecycle_service, build_task_link_service, build_task_service};
use crate::services::{
    CreateTaskInput, CreateTaskLinkInput, DeleteTaskLinkInput, ListTaskLinksInput, ListTasksInput,
    TaskDetailDto, TaskIdInput, TaskLinkDto, TaskListItemDto, UpdateTaskInput, UpdateTaskLinkInput,
};
use crate::sync;
use stoneflow_storage::database::DatabaseRuntimeState;

const TASKS_CHANGED_EVENT: &str = "stoneflow://tasks/changed";

#[derive(Debug, Clone, Serialize)]
struct TaskChangedPayload {
    space_id: String,
    space_slug: String,
    task_id: String,
    source: String,
    space_fallback: bool,
}

#[tauri::command]
pub async fn list_tasks(
    input: ListTasksInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<Vec<TaskListItemDto>, AppError> {
    build_task_service(database.inner()).list_tasks(input).await
}

#[tauri::command]
pub async fn get_task_detail(
    input: TaskIdInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<TaskDetailDto, AppError> {
    build_task_service(database.inner())
        .get_task_detail(input)
        .await
}

#[tauri::command]
pub async fn create_task(
    input: CreateTaskInput,
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<TaskDetailDto, AppError> {
    let detail = build_task_service(database.inner())
        .create_task(input)
        .await?;
    sync::note_local_write(&app_handle).await;
    emit_task_changed(&app_handle, &detail)?;
    Ok(detail)
}

#[tauri::command]
pub async fn update_task(
    input: UpdateTaskInput,
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<TaskDetailDto, AppError> {
    let detail = build_task_service(database.inner())
        .update_task(input)
        .await?;
    sync::note_local_write(&app_handle).await;
    emit_task_changed(&app_handle, &detail)?;
    Ok(detail)
}

#[tauri::command]
pub async fn archive_task(
    input: TaskIdInput,
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<TaskDetailDto, AppError> {
    let detail = build_task_service(database.inner())
        .archive_task(input)
        .await?;
    sync::note_local_write(&app_handle).await;
    emit_task_changed(&app_handle, &detail)?;
    Ok(detail)
}

#[tauri::command]
pub async fn restore_task(
    input: TaskIdInput,
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<TaskDetailDto, AppError> {
    let detail = build_task_service(database.inner())
        .restore_task(input)
        .await?;
    sync::note_local_write(&app_handle).await;
    emit_task_changed(&app_handle, &detail)?;
    Ok(detail)
}

#[tauri::command]
pub async fn list_task_links(
    input: ListTaskLinksInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<Vec<TaskLinkDto>, AppError> {
    build_task_link_service(database.inner())
        .list_task_links(input)
        .await
}

#[tauri::command]
pub async fn create_task_link(
    input: CreateTaskLinkInput,
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<TaskLinkDto, AppError> {
    let link = build_task_link_service(database.inner())
        .create_task_link(input)
        .await?;
    sync::note_local_write(&app_handle).await;
    emit_task_changed_for_task_id(&app_handle, database.inner(), &link.task_id).await?;
    Ok(link)
}

#[tauri::command]
pub async fn update_task_link(
    input: UpdateTaskLinkInput,
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<TaskLinkDto, AppError> {
    let link = build_task_link_service(database.inner())
        .update_task_link(input)
        .await?;
    sync::note_local_write(&app_handle).await;
    emit_task_changed_for_task_id(&app_handle, database.inner(), &link.task_id).await?;
    Ok(link)
}

#[tauri::command]
pub async fn delete_task_link(
    input: DeleteTaskLinkInput,
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<TaskLinkDto, AppError> {
    let link = build_task_link_service(database.inner())
        .delete_task_link(input)
        .await?;
    sync::note_local_write(&app_handle).await;
    emit_task_changed_for_task_id(&app_handle, database.inner(), &link.task_id).await?;
    Ok(link)
}

#[tauri::command]
pub async fn delete_task(
    input: TaskIdInput,
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<TaskDetailDto, AppError> {
    let detail = build_task_service(database.inner())
        .delete_task(input)
        .await?;
    sync::note_local_write(&app_handle).await;
    emit_task_changed(&app_handle, &detail)?;
    Ok(detail)
}

#[tauri::command]
pub async fn permanently_delete_task(
    input: TaskIdInput,
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<(), AppError> {
    build_lifecycle_service(database.inner())
        .permanently_delete_task(&input.task_id)
        .await?;
    sync::note_local_write(&app_handle).await;
    Ok(())
}

fn emit_task_changed(
    app_handle: &tauri::AppHandle,
    detail: &TaskDetailDto,
) -> Result<(), AppError> {
    app_handle
        .emit(
            TASKS_CHANGED_EVENT,
            TaskChangedPayload {
                space_id: detail.space_id.clone(),
                space_slug: detail.space_slug.clone(),
                task_id: detail.id.clone(),
                source: "app".to_owned(),
                space_fallback: false,
            },
        )
        .map_err(|error| AppError::internal(error.to_string()))
}

async fn emit_task_changed_for_task_id(
    app_handle: &tauri::AppHandle,
    database: &DatabaseRuntimeState,
    task_id: &str,
) -> Result<(), AppError> {
    let detail = build_task_service(database)
        .get_task_detail(TaskIdInput {
            task_id: task_id.to_owned(),
        })
        .await?;
    emit_task_changed(app_handle, &detail)
}

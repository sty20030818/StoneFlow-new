//! Task 命令：Tauri IPC 边界只负责 DTO、service 组装与事件发射。

use serde::Serialize;
use tauri::{Emitter, State};

use crate::{
    app::error::AppError,
    application::{
        activity::ActivityService,
        services::{
            CreateTaskInput, ListTasksInput, TaskDetailDto, TaskIdInput, TaskListItemDto,
            TaskService, UpdateTaskInput,
        },
    },
    infrastructure::{
        database::DatabaseRuntimeState,
        repositories::{ActivityRepository, ProjectRepository, SpaceRepository, TaskRepository},
    },
};

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
    build_task_service(database.inner()).get_task_detail(input).await
}

#[tauri::command]
pub async fn create_task(
    input: CreateTaskInput,
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<TaskDetailDto, AppError> {
    let detail = build_task_service(database.inner()).create_task(input).await?;
    emit_task_changed(&app_handle, &detail)?;
    Ok(detail)
}

#[tauri::command]
pub async fn update_task(
    input: UpdateTaskInput,
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<TaskDetailDto, AppError> {
    let detail = build_task_service(database.inner()).update_task(input).await?;
    emit_task_changed(&app_handle, &detail)?;
    Ok(detail)
}

#[tauri::command]
pub async fn archive_task(
    input: TaskIdInput,
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<TaskDetailDto, AppError> {
    let detail = build_task_service(database.inner()).archive_task(input).await?;
    emit_task_changed(&app_handle, &detail)?;
    Ok(detail)
}

#[tauri::command]
pub async fn restore_task(
    input: TaskIdInput,
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<TaskDetailDto, AppError> {
    let detail = build_task_service(database.inner()).restore_task(input).await?;
    emit_task_changed(&app_handle, &detail)?;
    Ok(detail)
}

#[tauri::command]
pub async fn delete_task(
    input: TaskIdInput,
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<TaskDetailDto, AppError> {
    let detail = build_task_service(database.inner()).delete_task(input).await?;
    emit_task_changed(&app_handle, &detail)?;
    Ok(detail)
}

fn emit_task_changed(app_handle: &tauri::AppHandle, detail: &TaskDetailDto) -> Result<(), AppError> {
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

fn build_task_service(database: &DatabaseRuntimeState) -> TaskService {
    let connection = database.connection().clone();
    TaskService::new(
        SpaceRepository::new(connection.clone()),
        ProjectRepository::new(connection.clone()),
        TaskRepository::new(connection.clone()),
        ActivityService::new(ActivityRepository::new(connection)),
    )
}

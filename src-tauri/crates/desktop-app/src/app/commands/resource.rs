//! Resource 相关的 Tauri Commands。

use tauri::State;

use crate::app::error::AppError;
use crate::application::resource::{
    create_task_resource as create_task_resource_usecase,
    delete_task_resource as delete_task_resource_usecase,
    list_task_resources as list_task_resources_usecase,
    open_task_resource as open_task_resource_usecase,
    CreateTaskResourceInput, CreatedTaskResourcePayload, DeleteTaskResourceInput,
    DeletedTaskResourcePayload, ListTaskResourcesInput, OpenTaskResourceInput,
    OpenedTaskResourcePayload, TaskResourceListPayload,
};
use crate::infrastructure::database::DatabaseState;

#[tauri::command]
pub async fn list_task_resources(
    input: ListTaskResourcesInput,
    database: State<'_, DatabaseState>,
) -> Result<TaskResourceListPayload, AppError> {
    list_task_resources_usecase(&database, input)
        .await
        .map_err(Into::into)
}

#[tauri::command]
pub async fn create_task_resource(
    input: CreateTaskResourceInput,
    database: State<'_, DatabaseState>,
) -> Result<CreatedTaskResourcePayload, AppError> {
    create_task_resource_usecase(&database, input)
        .await
        .map_err(Into::into)
}

#[tauri::command]
pub async fn open_task_resource(
    input: OpenTaskResourceInput,
    database: State<'_, DatabaseState>,
) -> Result<OpenedTaskResourcePayload, AppError> {
    open_task_resource_usecase(&database, input)
        .await
        .map_err(Into::into)
}

#[tauri::command]
pub async fn delete_task_resource(
    input: DeleteTaskResourceInput,
    database: State<'_, DatabaseState>,
) -> Result<DeletedTaskResourcePayload, AppError> {
    delete_task_resource_usecase(&database, input)
        .await
        .map_err(Into::into)
}

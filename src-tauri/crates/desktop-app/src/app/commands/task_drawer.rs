//! Task Drawer 相关的 Tauri Commands。

use tauri::State;

use crate::app::error::AppError;
use crate::application::task_drawer::{
    delete_task_to_trash as delete_task_to_trash_usecase,
    get_task_drawer_detail as get_task_drawer_detail_usecase,
    update_task_drawer_fields as update_task_drawer_fields_usecase, DeleteTaskToTrashInput,
    DeletedTaskPayload, GetTaskDrawerDetailInput, TaskDrawerDetailPayload,
    UpdateTaskDrawerFieldsInput, UpdatedTaskDrawerPayload,
};
use crate::infrastructure::database::DatabaseState;

#[tauri::command]
pub async fn get_task_drawer_detail(
    input: GetTaskDrawerDetailInput,
    database: State<'_, DatabaseState>,
) -> Result<TaskDrawerDetailPayload, AppError> {
    get_task_drawer_detail_usecase(&database, input)
        .await
        .map_err(Into::into)
}

#[tauri::command]
pub async fn update_task_drawer_fields(
    input: UpdateTaskDrawerFieldsInput,
    database: State<'_, DatabaseState>,
) -> Result<UpdatedTaskDrawerPayload, AppError> {
    update_task_drawer_fields_usecase(&database, input)
        .await
        .map_err(Into::into)
}

#[tauri::command]
pub async fn delete_task_to_trash(
    input: DeleteTaskToTrashInput,
    database: State<'_, DatabaseState>,
) -> Result<DeletedTaskPayload, AppError> {
    delete_task_to_trash_usecase(&database, input)
        .await
        .map_err(Into::into)
}

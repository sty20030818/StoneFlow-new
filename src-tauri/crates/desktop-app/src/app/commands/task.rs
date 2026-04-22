//! Task 相关的 Tauri Commands。

use tauri::State;

use crate::app::error::AppError;
use crate::application::create::{
    create_capture_task as create_capture_task_usecase, create_task as create_task_usecase,
    set_active_space as set_active_space_usecase, ActiveSpacePayload, ActiveSpaceState,
    CaptureTaskInput, CreateTaskInput, CreatedTaskPayload, SetActiveSpaceInput,
};
use crate::infrastructure::database::DatabaseState;

#[tauri::command]
pub async fn create_task(
    input: CreateTaskInput,
    database: State<'_, DatabaseState>,
) -> Result<CreatedTaskPayload, AppError> {
    create_task_usecase(&database, input)
        .await
        .map_err(Into::into)
}

#[tauri::command]
pub async fn set_active_space(
    input: SetActiveSpaceInput,
    database: State<'_, DatabaseState>,
    active_space_state: State<'_, ActiveSpaceState>,
) -> Result<ActiveSpacePayload, AppError> {
    set_active_space_usecase(&database, &active_space_state, input)
        .await
        .map_err(Into::into)
}

#[tauri::command]
pub async fn create_capture_task(
    input: CaptureTaskInput,
    database: State<'_, DatabaseState>,
    active_space_state: State<'_, ActiveSpaceState>,
) -> Result<CreatedTaskPayload, AppError> {
    create_capture_task_usecase(&database, &active_space_state, input)
        .await
        .map_err(Into::into)
}

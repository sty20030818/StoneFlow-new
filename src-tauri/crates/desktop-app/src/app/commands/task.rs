//! Task 相关的 Tauri Commands。

use tauri::State;

use crate::app::error::AppError;
use crate::application::create::{
    create_task as create_task_usecase, CreateTaskInput, CreatedTaskPayload,
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

//! Focus 相关的 Tauri Commands。

use tauri::State;

use crate::app::error::AppError;
use crate::application::focus::{
    get_focus_view_tasks as get_focus_view_tasks_usecase,
    list_focus_views as list_focus_views_usecase,
    update_task_pin_state as update_task_pin_state_usecase, FocusViewListPayload,
    FocusViewTasksPayload, GetFocusViewTasksInput, ListFocusViewsInput, UpdateTaskPinStateInput,
    UpdatedTaskPinStatePayload,
};
use crate::infrastructure::database::DatabaseState;

#[tauri::command]
pub async fn list_focus_views(
    input: ListFocusViewsInput,
    database: State<'_, DatabaseState>,
) -> Result<FocusViewListPayload, AppError> {
    list_focus_views_usecase(&database, input)
        .await
        .map_err(Into::into)
}

#[tauri::command]
pub async fn get_focus_view_tasks(
    input: GetFocusViewTasksInput,
    database: State<'_, DatabaseState>,
) -> Result<FocusViewTasksPayload, AppError> {
    get_focus_view_tasks_usecase(&database, input)
        .await
        .map_err(Into::into)
}

#[tauri::command]
pub async fn update_task_pin_state(
    input: UpdateTaskPinStateInput,
    database: State<'_, DatabaseState>,
) -> Result<UpdatedTaskPinStatePayload, AppError> {
    update_task_pin_state_usecase(&database, input)
        .await
        .map_err(Into::into)
}

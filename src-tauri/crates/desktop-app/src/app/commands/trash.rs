//! Trash 相关的 Tauri Commands。

use tauri::State;

use crate::app::error::AppError;
use crate::application::trash::{
    list_trash_entries as list_trash_entries_usecase,
    restore_project_from_trash as restore_project_usecase,
    restore_task_from_trash as restore_task_usecase, ListTrashEntriesInput,
    RestoreProjectFromTrashInput, RestoreTaskFromTrashInput, RestoredTrashEntryPayload,
    TrashListPayload,
};
use crate::infrastructure::database::DatabaseState;

#[tauri::command]
pub async fn list_trash_entries(
    input: ListTrashEntriesInput,
    database: State<'_, DatabaseState>,
) -> Result<TrashListPayload, AppError> {
    list_trash_entries_usecase(&database, input)
        .await
        .map_err(Into::into)
}

#[tauri::command]
pub async fn restore_task_from_trash(
    input: RestoreTaskFromTrashInput,
    database: State<'_, DatabaseState>,
) -> Result<RestoredTrashEntryPayload, AppError> {
    restore_task_usecase(&database, input)
        .await
        .map_err(Into::into)
}

#[tauri::command]
pub async fn restore_project_from_trash(
    input: RestoreProjectFromTrashInput,
    database: State<'_, DatabaseState>,
) -> Result<RestoredTrashEntryPayload, AppError> {
    restore_project_usecase(&database, input)
        .await
        .map_err(Into::into)
}

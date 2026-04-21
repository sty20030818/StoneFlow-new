//! Inbox 相关的 Tauri Commands。

use tauri::State;

use crate::app::error::AppError;
use crate::application::inbox::{
    list_inbox_tasks as list_inbox_tasks_usecase,
    triage_inbox_task as triage_inbox_task_usecase,
    InboxSnapshotPayload, ListInboxTasksInput, TriageInboxTaskInput, TriageInboxTaskPayload,
};
use crate::infrastructure::database::DatabaseState;

#[tauri::command]
pub async fn list_inbox_tasks(
    input: ListInboxTasksInput,
    database: State<'_, DatabaseState>,
) -> Result<InboxSnapshotPayload, AppError> {
    list_inbox_tasks_usecase(&database, input)
        .await
        .map_err(Into::into)
}

#[tauri::command]
pub async fn triage_inbox_task(
    input: TriageInboxTaskInput,
    database: State<'_, DatabaseState>,
) -> Result<TriageInboxTaskPayload, AppError> {
    triage_inbox_task_usecase(&database, input)
        .await
        .map_err(Into::into)
}

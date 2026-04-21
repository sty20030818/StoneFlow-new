//! Search 相关的 Tauri Commands。

use tauri::State;

use crate::app::error::AppError;
use crate::application::search::{
    search_workspace as search_workspace_usecase, SearchWorkspaceInput, WorkspaceSearchPayload,
};
use crate::infrastructure::database::DatabaseState;

#[tauri::command]
pub async fn search_workspace(
    input: SearchWorkspaceInput,
    database: State<'_, DatabaseState>,
) -> Result<WorkspaceSearchPayload, AppError> {
    search_workspace_usecase(&database, input)
        .await
        .map_err(Into::into)
}

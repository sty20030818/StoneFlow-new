//! 全局搜索命令：薄 transport。

use tauri::State;

use crate::app::error::AppError;
use crate::app::state::AppState;
use stoneflow_application::search::{SearchEntitiesInput, SearchEntitiesResultDto};

#[tauri::command]
pub async fn search_entities(
    input: SearchEntitiesInput,
    state: State<'_, AppState>,
) -> Result<SearchEntitiesResultDto, AppError> {
    state
        .search
        .search_entities(input)
        .await
        .map_err(AppError::from)
}

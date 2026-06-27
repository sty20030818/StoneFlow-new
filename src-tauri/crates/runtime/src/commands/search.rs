//! 全局搜索命令。

use tauri::State;

use crate::app::error::AppError;
use crate::composition::build_search_service;
use crate::services::{SearchEntitiesInput, SearchEntitiesResultDto};
use stoneflow_storage::database::DatabaseRuntimeState;

#[tauri::command]
pub async fn search_entities(
    input: SearchEntitiesInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<SearchEntitiesResultDto, AppError> {
    build_search_service(database.inner())
        .search_entities(input)
        .await
}

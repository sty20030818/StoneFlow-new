//! 全局搜索命令。

use tauri::State;

use crate::{
    app::error::AppError,
    application::services::{SearchEntitiesInput, SearchEntitiesResultDto, SearchService},
    infrastructure::{
        database::DatabaseRuntimeState,
        repositories::{ProjectRepository, SpaceRepository, TaskRepository},
    },
};

#[tauri::command]
pub async fn search_entities(
    input: SearchEntitiesInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<SearchEntitiesResultDto, AppError> {
    build_search_service(database.inner())
        .search_entities(input)
        .await
}

fn build_search_service(database: &DatabaseRuntimeState) -> SearchService {
    let connection = database.connection().clone();
    SearchService::new(
        SpaceRepository::new(connection.clone()),
        ProjectRepository::new(connection.clone()),
        TaskRepository::new(connection),
    )
}

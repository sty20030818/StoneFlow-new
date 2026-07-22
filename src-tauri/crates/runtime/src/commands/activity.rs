//! Activity 调试读取命令。

use tauri::State;

use crate::app::error::AppError;
use crate::composition::build_activity_service;
use crate::services::activity::{ActivityTimelineEntry, GetEntityActivitiesInput};
use stoneflow_storage::database::DatabaseRuntimeState;

#[tauri::command]
pub async fn get_entity_activities(
    input: GetEntityActivitiesInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<Vec<ActivityTimelineEntry>, AppError> {
    build_activity_service(database.inner())
        .get_entity_activities(input)
        .await
}

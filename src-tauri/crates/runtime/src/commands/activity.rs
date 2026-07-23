//! Activity 命令：薄 transport。

use tauri::State;

use crate::app::error::AppError;
use crate::app::state::AppState;
use stoneflow_application::activity::{ActivityTimelineEntry, GetEntityActivitiesInput};

#[tauri::command]
pub async fn get_entity_activities(
    input: GetEntityActivitiesInput,
    state: State<'_, AppState>,
) -> Result<Vec<ActivityTimelineEntry>, AppError> {
    state
        .activities
        .get_entity_activities(input)
        .await
        .map_err(AppError::from)
}

//! Activity 调试读取命令。

use tauri::State;

use desktop_app::app::error::AppError;
use desktop_app::application::activity::{
    ActivityService, ActivityTimelineEntry, GetEntityActivitiesInput,
};
use stoneflow_storage::{
    database::DatabaseRuntimeState,
    repositories::ActivityRepository,
};

#[tauri::command]
pub async fn get_entity_activities(
    input: GetEntityActivitiesInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<Vec<ActivityTimelineEntry>, AppError> {
    let repository = ActivityRepository::new(database.connection().clone());
    let service = ActivityService::new(repository);
    service.get_entity_activities(input).await
}

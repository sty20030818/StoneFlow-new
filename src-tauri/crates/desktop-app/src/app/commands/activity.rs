//! Activity 调试读取命令。

use tauri::State;

use crate::{
    app::error::AppError,
    application::activity::{ActivityService, ActivityTimelineEntry, GetEntityActivitiesInput},
    infrastructure::{database::DatabaseRuntimeState, repositories::ActivityRepository},
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

//! Space 相关的 Tauri Commands。

use tauri::State;

use crate::app::error::AppError;
use crate::application::create::{
    create_space as create_space_usecase, CreateSpaceInput, CreatedSpacePayload,
};
use crate::infrastructure::database::{DatabaseHealthcheckPayload, DatabaseState};

#[tauri::command]
pub fn healthcheck(database: State<'_, DatabaseState>) -> DatabaseHealthcheckPayload {
    database.payload()
}

#[tauri::command]
pub async fn create_space(
    input: CreateSpaceInput,
    database: State<'_, DatabaseState>,
) -> Result<CreatedSpacePayload, AppError> {
    create_space_usecase(&database, input)
        .await
        .map_err(Into::into)
}

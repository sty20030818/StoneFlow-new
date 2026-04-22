//! Project 相关的 Tauri Commands。

use tauri::State;

use crate::app::error::AppError;
use crate::application::create::{
    create_project as create_project_usecase, CreateProjectInput, CreatedProjectPayload,
};
use crate::application::project::{
    get_project_execution_view as get_view_usecase, list_projects as list_projects_usecase,
    update_project_task_status as update_status_usecase, GetProjectExecutionViewInput,
    ListProjectsInput, ProjectExecutionViewPayload, ProjectListPayload,
    UpdateProjectTaskStatusInput, UpdatedProjectTaskStatusPayload,
};
use crate::application::trash::{
    delete_project_to_trash as delete_project_usecase, DeleteProjectToTrashInput,
    DeletedProjectToTrashPayload,
};
use crate::infrastructure::database::DatabaseState;

#[tauri::command]
pub async fn list_projects(
    input: ListProjectsInput,
    database: State<'_, DatabaseState>,
) -> Result<ProjectListPayload, AppError> {
    list_projects_usecase(&database, input)
        .await
        .map_err(Into::into)
}

#[tauri::command]
pub async fn create_project(
    input: CreateProjectInput,
    database: State<'_, DatabaseState>,
) -> Result<CreatedProjectPayload, AppError> {
    create_project_usecase(&database, input)
        .await
        .map_err(Into::into)
}

#[tauri::command]
pub async fn get_project_execution_view(
    input: GetProjectExecutionViewInput,
    database: State<'_, DatabaseState>,
) -> Result<ProjectExecutionViewPayload, AppError> {
    get_view_usecase(&database, input).await.map_err(Into::into)
}

#[tauri::command]
pub async fn update_project_task_status(
    input: UpdateProjectTaskStatusInput,
    database: State<'_, DatabaseState>,
) -> Result<UpdatedProjectTaskStatusPayload, AppError> {
    update_status_usecase(&database, input)
        .await
        .map_err(Into::into)
}

#[tauri::command]
pub async fn delete_project_to_trash(
    input: DeleteProjectToTrashInput,
    database: State<'_, DatabaseState>,
) -> Result<DeletedProjectToTrashPayload, AppError> {
    delete_project_usecase(&database, input)
        .await
        .map_err(Into::into)
}

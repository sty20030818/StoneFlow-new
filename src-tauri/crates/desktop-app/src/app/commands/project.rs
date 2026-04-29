//! Project 占位命令。

use serde::{Deserialize, Serialize};

use crate::app::error::AppError;
use crate::application::placeholders::stage_unavailable;

#[derive(Debug, Clone, Deserialize)]
pub struct ListProjectsInput {
    pub space_slug: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateProjectInput {
    pub space_slug: String,
    pub name: String,
    pub note: Option<String>,
    pub parent_project_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GetProjectExecutionViewInput {
    pub space_slug: String,
    pub project_id: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateProjectTaskStatusInput {
    pub space_slug: String,
    pub project_id: String,
    pub task_id: String,
    pub status: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DeleteProjectToTrashInput {
    pub space_slug: String,
    pub project_id: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProjectListItemResponse {
    pub id: String,
    pub name: String,
    pub status: String,
    pub sort_order: i32,
    pub children: Vec<ProjectListItemResponse>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProjectListResponse {
    pub projects: Vec<ProjectListItemResponse>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CreateProjectResponse {
    pub id: String,
    pub space_id: String,
    pub parent_project_id: Option<String>,
    pub name: String,
    pub status: String,
    pub note: Option<String>,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProjectExecutionProjectResponse {
    pub id: String,
    pub name: String,
    pub status: String,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProjectExecutionTaskResponse {
    pub id: String,
    pub title: String,
    pub note: Option<String>,
    pub priority: String,
    pub status: &'static str,
    pub due_at: Option<String>,
    pub completed_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ProjectExecutionViewResponse {
    pub project: ProjectExecutionProjectResponse,
    pub child_projects: Vec<ProjectExecutionProjectResponse>,
    pub tasks: Vec<ProjectExecutionTaskResponse>,
}

#[derive(Debug, Clone, Serialize)]
pub struct UpdateProjectTaskStatusResponse {
    pub task_id: String,
    pub status: String,
    pub completed_at: Option<String>,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct DeletedProjectToTrashResponse {
    pub project_id: String,
    pub deleted_at: String,
}

#[tauri::command]
pub async fn list_projects(input: ListProjectsInput) -> Result<ProjectListResponse, AppError> {
    let _ = input.space_slug;
    Ok(ProjectListResponse { projects: Vec::new() })
}

#[tauri::command]
pub async fn create_project(input: CreateProjectInput) -> Result<CreateProjectResponse, AppError> {
    let _ = (
        input.space_slug,
        input.name,
        input.note,
        input.parent_project_id,
    );
    Err(stage_unavailable("create_project"))
}

#[tauri::command]
pub async fn get_project_execution_view(
    input: GetProjectExecutionViewInput,
) -> Result<ProjectExecutionViewResponse, AppError> {
    let _ = (input.space_slug, input.project_id);
    Err(stage_unavailable("get_project_execution_view"))
}

#[tauri::command]
pub async fn update_project_task_status(
    input: UpdateProjectTaskStatusInput,
) -> Result<UpdateProjectTaskStatusResponse, AppError> {
    let _ = (input.space_slug, input.project_id, input.task_id, input.status);
    Err(stage_unavailable("update_project_task_status"))
}

#[tauri::command]
pub async fn delete_project_to_trash(
    input: DeleteProjectToTrashInput,
) -> Result<DeletedProjectToTrashResponse, AppError> {
    let _ = (input.space_slug, input.project_id);
    Err(stage_unavailable("delete_project_to_trash"))
}

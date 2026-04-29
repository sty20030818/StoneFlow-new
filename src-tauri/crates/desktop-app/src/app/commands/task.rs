//! Task 占位命令。

use serde::{Deserialize, Serialize};

use crate::app::error::AppError;
use crate::application::placeholders::stage_unavailable;

#[derive(Debug, Clone, Deserialize)]
pub struct CreateTaskInput {
    pub space_slug: String,
    pub title: String,
    pub note: Option<String>,
    pub priority: Option<String>,
    pub project_id: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CaptureTaskInput {
    pub title: String,
    pub note: Option<String>,
    pub priority: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ListInboxTasksInput {
    pub space_slug: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct TriageInboxTaskInput {
    pub space_slug: String,
    pub task_id: String,
    pub project_id: Option<String>,
    pub priority: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GetTaskDrawerDetailInput {
    pub space_slug: String,
    pub task_id: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateTaskDrawerFieldsInput {
    pub space_slug: String,
    pub task_id: String,
    pub title: String,
    pub note: String,
    pub priority: Option<String>,
    pub project_id: Option<String>,
    pub status: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DeleteTaskToTrashInput {
    pub space_slug: String,
    pub task_id: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct CreateTaskResponse {
    pub id: String,
    pub space_id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub status: String,
    pub priority: Option<String>,
    pub note: Option<String>,
    pub source: String,
    pub space_fallback: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct InboxTaskResponse {
    pub id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub note: Option<String>,
    pub status: String,
    pub priority: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct InboxProjectOptionResponse {
    pub id: String,
    pub name: String,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize)]
pub struct InboxSnapshotResponse {
    pub tasks: Vec<InboxTaskResponse>,
    pub projects: Vec<InboxProjectOptionResponse>,
}

#[derive(Debug, Clone, Serialize)]
pub struct TriageInboxTaskResponse {
    pub task_id: String,
    pub project_id: Option<String>,
    pub priority: Option<String>,
    pub status: String,
    pub remains_in_inbox: bool,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct TaskDrawerTaskResponse {
    pub id: String,
    pub title: String,
    pub note: Option<String>,
    pub priority: Option<String>,
    pub project_id: Option<String>,
    pub status: &'static str,
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct TaskDrawerProjectOptionResponse {
    pub id: String,
    pub name: String,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize)]
pub struct TaskDrawerResourceResponse {
    pub id: String,
    pub task_id: String,
    pub type_: &'static str,
    pub title: String,
    pub target: String,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct TaskDrawerDetailResponse {
    pub task: TaskDrawerTaskResponse,
    pub projects: Vec<TaskDrawerProjectOptionResponse>,
    pub resources: Vec<TaskDrawerResourceResponse>,
}

#[derive(Debug, Clone, Serialize)]
pub struct UpdatedTaskDrawerResponse {
    pub task: TaskDrawerTaskResponse,
}

#[derive(Debug, Clone, Serialize)]
pub struct DeletedTaskResponse {
    pub task_id: String,
    pub deleted_at: String,
}

#[tauri::command]
pub async fn create_task(input: CreateTaskInput) -> Result<CreateTaskResponse, AppError> {
    let _ = (
        input.space_slug,
        input.title,
        input.note,
        input.priority,
        input.project_id,
        input.status,
    );
    Err(stage_unavailable("create_task"))
}

#[tauri::command]
pub async fn create_capture_task(input: CaptureTaskInput) -> Result<CreateTaskResponse, AppError> {
    let _ = (input.title, input.note, input.priority);
    Err(stage_unavailable("create_capture_task"))
}

#[tauri::command]
pub async fn list_inbox_tasks(input: ListInboxTasksInput) -> Result<InboxSnapshotResponse, AppError> {
    let _ = input.space_slug;
    Ok(InboxSnapshotResponse {
        tasks: Vec::new(),
        projects: Vec::new(),
    })
}

#[tauri::command]
pub async fn triage_inbox_task(input: TriageInboxTaskInput) -> Result<TriageInboxTaskResponse, AppError> {
    let _ = (input.space_slug, input.task_id, input.project_id, input.priority);
    Err(stage_unavailable("triage_inbox_task"))
}

#[tauri::command]
pub async fn get_task_drawer_detail(
    input: GetTaskDrawerDetailInput,
) -> Result<TaskDrawerDetailResponse, AppError> {
    let _ = (input.space_slug, input.task_id);
    Err(stage_unavailable("get_task_drawer_detail"))
}

#[tauri::command]
pub async fn update_task_drawer_fields(
    input: UpdateTaskDrawerFieldsInput,
) -> Result<UpdatedTaskDrawerResponse, AppError> {
    let _ = (
        input.space_slug,
        input.task_id,
        input.title,
        input.note,
        input.priority,
        input.project_id,
        input.status,
    );
    Err(stage_unavailable("update_task_drawer_fields"))
}

#[tauri::command]
pub async fn delete_task_to_trash(
    input: DeleteTaskToTrashInput,
) -> Result<DeletedTaskResponse, AppError> {
    let _ = (input.space_slug, input.task_id);
    Err(stage_unavailable("delete_task_to_trash"))
}

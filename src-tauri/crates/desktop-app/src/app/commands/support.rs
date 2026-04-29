//! Focus / Search / Resource / Trash 等非主链占位命令。

use serde::{Deserialize, Serialize};

use crate::app::error::AppError;
use crate::application::placeholders::stage_unavailable;
use crate::domain::focus_view_name;

#[derive(Debug, Clone, Deserialize)]
pub struct ListFocusViewsInput {
    pub space_slug: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GetFocusViewTasksInput {
    pub space_slug: String,
    pub view_key: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateTaskPinStateInput {
    pub space_slug: String,
    pub task_id: String,
    pub pinned: bool,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ListTaskResourcesInput {
    pub space_slug: String,
    pub task_id: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateTaskResourceInput {
    pub space_slug: String,
    pub task_id: String,
    #[serde(rename = "type")]
    pub type_: String,
    pub title: String,
    pub target: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct OpenTaskResourceInput {
    pub space_slug: String,
    pub resource_id: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DeleteTaskResourceInput {
    pub space_slug: String,
    pub resource_id: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SearchWorkspaceInput {
    pub space_slug: String,
    pub query: String,
    pub limit: Option<u64>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ListTrashEntriesInput {
    pub space_slug: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RestoreTaskFromTrashInput {
    pub space_slug: String,
    pub trash_entry_id: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RestoreProjectFromTrashInput {
    pub space_slug: String,
    pub trash_entry_id: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct FocusViewResponse {
    pub id: String,
    pub key: String,
    pub name: String,
    pub sort_order: i32,
    pub is_enabled: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct FocusViewListResponse {
    pub views: Vec<FocusViewResponse>,
}

#[derive(Debug, Clone, Serialize)]
pub struct FocusTaskResponse {
    pub id: String,
    pub project_id: String,
    pub title: String,
    pub note: Option<String>,
    pub priority: String,
    pub status: &'static str,
    pub pinned: bool,
    pub due_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct FocusViewTasksResponse {
    pub view: FocusViewResponse,
    pub tasks: Vec<FocusTaskResponse>,
}

#[derive(Debug, Clone, Serialize)]
pub struct UpdateTaskPinStateResponse {
    pub task_id: String,
    pub pinned: bool,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct TaskDrawerResourceResponse {
    pub id: String,
    pub task_id: String,
    #[serde(rename = "type")]
    pub type_: String,
    pub title: String,
    pub target: String,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct TaskResourceListResponse {
    pub resources: Vec<TaskDrawerResourceResponse>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CreateTaskResourceResponse {
    pub resource: TaskDrawerResourceResponse,
}

#[derive(Debug, Clone, Serialize)]
pub struct OpenTaskResourceResponse {
    pub resource_id: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct DeleteTaskResourceResponse {
    pub resource_id: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct SearchWorkspaceTaskResponse {
    pub id: String,
    pub title: String,
    pub note: Option<String>,
    pub priority: Option<String>,
    pub project_id: Option<String>,
    pub project_name: Option<String>,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct SearchWorkspaceProjectResponse {
    pub id: String,
    pub name: String,
    pub note: Option<String>,
    pub status: String,
    pub sort_order: i32,
}

#[derive(Debug, Clone, Serialize)]
pub struct SearchWorkspaceResponse {
    pub space_slug: Option<String>,
    pub tasks: Vec<SearchWorkspaceTaskResponse>,
    pub projects: Vec<SearchWorkspaceProjectResponse>,
}

#[derive(Debug, Clone, Serialize)]
pub struct TrashEntryResponse {
    pub id: String,
    pub entity_type: &'static str,
    pub entity_id: String,
    pub title: String,
    pub deleted_at: String,
    pub deleted_from: Option<String>,
    pub restore_hint: String,
    pub original_project_id: Option<String>,
    pub original_parent_project_id: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct TrashListResponse {
    pub entries: Vec<TrashEntryResponse>,
}

#[derive(Debug, Clone, Serialize)]
pub struct RestoredTrashEntryResponse {
    pub trash_entry_id: String,
    pub entity_type: &'static str,
    pub entity_id: String,
}

#[tauri::command]
pub async fn list_focus_views(input: ListFocusViewsInput) -> Result<FocusViewListResponse, AppError> {
    let _ = input.space_slug;
    Ok(FocusViewListResponse { views: Vec::new() })
}

#[tauri::command]
pub async fn get_focus_view_tasks(
    input: GetFocusViewTasksInput,
) -> Result<FocusViewTasksResponse, AppError> {
    let _ = input.space_slug;
    Ok(FocusViewTasksResponse {
        view: FocusViewResponse {
            id: format!("view-{}", input.view_key),
            key: input.view_key.clone(),
            name: focus_view_name(&input.view_key).to_owned(),
            sort_order: 0,
            is_enabled: true,
        },
        tasks: Vec::new(),
    })
}

#[tauri::command]
pub async fn update_task_pin_state(
    input: UpdateTaskPinStateInput,
) -> Result<UpdateTaskPinStateResponse, AppError> {
    let _ = (input.space_slug, input.task_id, input.pinned);
    Err(stage_unavailable("update_task_pin_state"))
}

#[tauri::command]
pub async fn list_task_resources(
    input: ListTaskResourcesInput,
) -> Result<TaskResourceListResponse, AppError> {
    let _ = (input.space_slug, input.task_id);
    Ok(TaskResourceListResponse {
        resources: Vec::new(),
    })
}

#[tauri::command]
pub async fn create_task_resource(
    input: CreateTaskResourceInput,
) -> Result<CreateTaskResourceResponse, AppError> {
    let _ = (
        input.space_slug,
        input.task_id,
        input.type_,
        input.title,
        input.target,
    );
    Err(stage_unavailable("create_task_resource"))
}

#[tauri::command]
pub async fn open_task_resource(
    input: OpenTaskResourceInput,
) -> Result<OpenTaskResourceResponse, AppError> {
    let _ = (input.space_slug, input.resource_id);
    Err(stage_unavailable("open_task_resource"))
}

#[tauri::command]
pub async fn delete_task_resource(
    input: DeleteTaskResourceInput,
) -> Result<DeleteTaskResourceResponse, AppError> {
    let _ = (input.space_slug, input.resource_id);
    Err(stage_unavailable("delete_task_resource"))
}

#[tauri::command]
pub async fn search_workspace(
    input: SearchWorkspaceInput,
) -> Result<SearchWorkspaceResponse, AppError> {
    let _ = (input.query, input.limit);
    Ok(SearchWorkspaceResponse {
        space_slug: Some(input.space_slug),
        tasks: Vec::new(),
        projects: Vec::new(),
    })
}

#[tauri::command]
pub async fn list_trash_entries(
    input: ListTrashEntriesInput,
) -> Result<TrashListResponse, AppError> {
    let _ = input.space_slug;
    Ok(TrashListResponse { entries: Vec::new() })
}

#[tauri::command]
pub async fn restore_task_from_trash(
    input: RestoreTaskFromTrashInput,
) -> Result<RestoredTrashEntryResponse, AppError> {
    let _ = (input.space_slug, input.trash_entry_id);
    Err(stage_unavailable("restore_task_from_trash"))
}

#[tauri::command]
pub async fn restore_project_from_trash(
    input: RestoreProjectFromTrashInput,
) -> Result<RestoredTrashEntryResponse, AppError> {
    let _ = (input.space_slug, input.trash_entry_id);
    Err(stage_unavailable("restore_project_from_trash"))
}

//! Helper 前端（Quick Create 页面）可调用的 Tauri Command。

use serde::{Deserialize, Serialize};
use stoneflow_ipc_protocol::{
    IpcError, QuickCreatePayload, QuickInitialStatePayload, QuickListProjectsBySpacePayload,
    QuickOpenTargetKind, QuickOpenTargetPayload, QuickPlacementKind, QuickPlacementPayload,
    QuickProjectItemPayload, QuickProjectOptionKind, QuickProjectOptionPayload,
    QuickProjectsBySpaceResponsePayload, QuickScopeKind, QuickScopePayload, QuickSearchPayload,
    QuickSearchResponsePayload, QuickSpaceSummaryPayload, QuickTaskItemPayload,
};
use tauri::{LogicalSize, Manager, Size};

use crate::{
    ipc_client,
    panel,
    window_spec::{
        QUICK_CREATE_LABEL, QUICK_CREATE_PANEL_MAX_HEIGHT, QUICK_CREATE_PANEL_MIN_HEIGHT,
        QUICK_CREATE_SHADOW_PADDING, QUICK_CREATE_WINDOW_MAX_HEIGHT, QUICK_CREATE_WINDOW_MIN_HEIGHT,
        QUICK_CREATE_WINDOW_VISUAL_BUFFER, QUICK_CREATE_WINDOW_WIDTH,
    },
};

#[derive(Debug, Clone, Serialize)]
pub struct QuickCreateErrorPayload {
    #[serde(rename = "type")]
    pub type_: &'static str,
    pub message: String,
}

impl From<IpcError> for QuickCreateErrorPayload {
    fn from(error: IpcError) -> Self {
        let (type_, message) = match error {
            IpcError::Validation(message) => ("Validation", message),
            IpcError::NotFound(message) => ("NotFound", message),
            IpcError::Forbidden(message) => ("Forbidden", message),
            IpcError::Conflict(message) => ("Conflict", message),
            IpcError::Internal(message) => ("Internal", message),
            IpcError::CaptureSpaceUnavailable(message) => ("QuickCreateSpaceUnavailable", message),
            IpcError::DefaultSpaceUnavailable(message) => ("DefaultSpaceUnavailable", message),
            IpcError::CapturePersistence(message) => ("QuickCreatePersistence", message),
        };

        Self { type_, message }
    }
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HelperQuickListProjectsBySpaceInput {
    pub space_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HelperQuickSearchInput {
    pub query: String,
    #[serde(default = "default_search_limit")]
    pub limit: u64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HelperQuickCreateInput {
    pub space_id: Option<String>,
    pub placement: HelperQuickPlacementInput,
    pub title: String,
    pub note: Option<String>,
    pub status: Option<String>,
    pub priority: Option<i32>,
    pub due_at: Option<String>,
    pub scheduled_at: Option<String>,
    pub reminder_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HelperQuickPlacementInput {
    #[serde(rename = "kind")]
    pub kind: HelperQuickPlacementKind,
    pub project_id: Option<String>,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum HelperQuickPlacementKind {
    Inbox,
    NoProject,
    Project,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HelperQuickOpenTargetInput {
    #[serde(rename = "kind")]
    pub kind: HelperQuickOpenTargetKind,
    pub id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HelperQuickResizeWindowInput {
    pub height: f64,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum HelperQuickOpenTargetKind {
    Task,
    Project,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HelperQuickInitialStateResponse {
    pub current_scope: HelperQuickScopeResponse,
    pub default_space_id: String,
    pub default_placement: HelperQuickPlacementResponse,
    pub spaces: Vec<HelperQuickSpaceSummaryResponse>,
    pub projects: Vec<HelperQuickProjectOptionResponse>,
    pub recent_tasks: Vec<HelperQuickTaskItemResponse>,
    pub recent_projects: Vec<HelperQuickProjectItemResponse>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HelperQuickProjectsBySpaceResponse {
    pub space_id: String,
    pub inbox_project: HelperQuickProjectOptionResponse,
    pub no_project_option: HelperQuickProjectOptionResponse,
    pub projects: Vec<HelperQuickProjectOptionResponse>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HelperQuickSearchResponse {
    pub tasks: Vec<HelperQuickTaskItemResponse>,
    pub projects: Vec<HelperQuickProjectItemResponse>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HelperQuickScopeResponse {
    #[serde(rename = "type")]
    pub kind: &'static str,
    pub space_id: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HelperQuickPlacementResponse {
    #[serde(rename = "kind")]
    pub kind: &'static str,
    pub project_id: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HelperQuickSpaceSummaryResponse {
    pub id: String,
    pub name: String,
    pub icon_key: String,
    pub color_key: String,
    pub is_default: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HelperQuickProjectOptionResponse {
    #[serde(rename = "kind")]
    pub kind: &'static str,
    pub id: Option<String>,
    pub space_id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HelperQuickTaskItemResponse {
    pub id: String,
    pub space_id: String,
    pub space_name: String,
    pub project_id: Option<String>,
    pub project_name: Option<String>,
    pub inbox_at: Option<String>,
    pub title: String,
    pub note: Option<String>,
    pub priority: i32,
    pub status: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HelperQuickProjectItemResponse {
    pub id: String,
    pub space_id: String,
    pub space_name: String,
    pub name: String,
    pub note: Option<String>,
    pub updated_at: String,
    pub completed_at: Option<String>,
}

const fn default_search_limit() -> u64 {
    5
}

#[tauri::command]
pub async fn helper_quick_get_initial_state(
) -> Result<HelperQuickInitialStateResponse, QuickCreateErrorPayload> {
    let payload = ipc_client::quick_get_initial_state()
        .await
        .map_err(QuickCreateErrorPayload::from)?;

    Ok(map_initial_state(payload))
}

#[tauri::command]
pub async fn helper_quick_list_projects_by_space(
    input: HelperQuickListProjectsBySpaceInput,
) -> Result<HelperQuickProjectsBySpaceResponse, QuickCreateErrorPayload> {
    let payload = ipc_client::quick_list_projects_by_space(QuickListProjectsBySpacePayload {
        space_id: input.space_id,
    })
    .await
    .map_err(QuickCreateErrorPayload::from)?;

    Ok(map_projects_by_space(payload))
}

#[tauri::command]
pub async fn helper_quick_search(
    input: HelperQuickSearchInput,
) -> Result<HelperQuickSearchResponse, QuickCreateErrorPayload> {
    let payload = ipc_client::quick_search(QuickSearchPayload {
        query: input.query,
        limit: input.limit,
    })
    .await
    .map_err(QuickCreateErrorPayload::from)?;

    Ok(map_search_response(payload))
}

#[tauri::command]
pub async fn helper_quick_create(
    input: HelperQuickCreateInput,
) -> Result<(), QuickCreateErrorPayload> {
    ipc_client::quick_create(map_create_payload(input))
        .await
        .map_err(QuickCreateErrorPayload::from)
}

#[tauri::command]
pub async fn helper_quick_create_and_open(
    input: HelperQuickCreateInput,
) -> Result<(), QuickCreateErrorPayload> {
    ipc_client::quick_create_and_open(map_create_payload(input))
        .await
        .map_err(QuickCreateErrorPayload::from)
}

#[tauri::command]
pub async fn helper_quick_open_target(
    input: HelperQuickOpenTargetInput,
) -> Result<(), QuickCreateErrorPayload> {
    ipc_client::quick_open_target(QuickOpenTargetPayload {
        kind: match input.kind {
            HelperQuickOpenTargetKind::Task => QuickOpenTargetKind::Task,
            HelperQuickOpenTargetKind::Project => QuickOpenTargetKind::Project,
        },
        id: input.id,
    })
    .await
    .map_err(QuickCreateErrorPayload::from)
}

#[tauri::command]
pub async fn helper_quick_resize_window(
    app_handle: tauri::AppHandle,
    input: HelperQuickResizeWindowInput,
) -> Result<(), QuickCreateErrorPayload> {
    let Some(window) = app_handle.get_webview_window(QUICK_CREATE_LABEL) else {
        return Err(QuickCreateErrorPayload {
            type_: "Internal",
            message: "quick create 窗口未初始化".to_owned(),
        });
    };

    let clamped_panel_height = input
        .height
        .clamp(QUICK_CREATE_PANEL_MIN_HEIGHT, QUICK_CREATE_PANEL_MAX_HEIGHT);
    let target_window_height =
        clamped_panel_height + QUICK_CREATE_SHADOW_PADDING * 2.0 + QUICK_CREATE_WINDOW_VISUAL_BUFFER;

    window
        .set_min_size(Some(Size::Logical(LogicalSize::new(
            QUICK_CREATE_WINDOW_WIDTH,
            QUICK_CREATE_WINDOW_MIN_HEIGHT,
        ))))
        .map_err(|error| QuickCreateErrorPayload {
            type_: "Internal",
            message: format!("设置 quick create 最小窗口尺寸失败: {error}"),
        })?;

    window
        .set_max_size(Some(Size::Logical(LogicalSize::new(
            QUICK_CREATE_WINDOW_WIDTH,
            QUICK_CREATE_WINDOW_MAX_HEIGHT,
        ))))
        .map_err(|error| QuickCreateErrorPayload {
            type_: "Internal",
            message: format!("设置 quick create 最大窗口尺寸失败: {error}"),
        })?;

    window
        .set_size(Size::Logical(LogicalSize::new(
            QUICK_CREATE_WINDOW_WIDTH,
            target_window_height,
        )))
        .map_err(|error| QuickCreateErrorPayload {
            type_: "Internal",
        message: format!("调整 quick create 窗口高度失败: {error}"),
        })?;

    #[cfg(target_os = "macos")]
    panel::recenter_quick_create_panel(&app_handle);

    Ok(())
}

fn map_create_payload(input: HelperQuickCreateInput) -> QuickCreatePayload {
    QuickCreatePayload {
        space_id: input.space_id,
        placement: QuickPlacementPayload {
            kind: match input.placement.kind {
                HelperQuickPlacementKind::Inbox => QuickPlacementKind::Inbox,
                HelperQuickPlacementKind::NoProject => QuickPlacementKind::NoProject,
                HelperQuickPlacementKind::Project => QuickPlacementKind::Project,
            },
            project_id: input.placement.project_id,
        },
        title: input.title,
        note: input.note,
        status: input.status,
        priority: input.priority,
        due_at: input.due_at,
        scheduled_at: input.scheduled_at,
        reminder_at: input.reminder_at,
    }
}

fn map_initial_state(payload: QuickInitialStatePayload) -> HelperQuickInitialStateResponse {
    HelperQuickInitialStateResponse {
        current_scope: map_scope(payload.current_scope),
        default_space_id: payload.default_space_id,
        default_placement: map_placement(payload.default_placement),
        spaces: payload.spaces.into_iter().map(map_space).collect(),
        projects: payload.projects.into_iter().map(map_project_option).collect(),
        recent_tasks: payload.recent_tasks.into_iter().map(map_task_item).collect(),
        recent_projects: payload
            .recent_projects
            .into_iter()
            .map(map_project_item)
            .collect(),
    }
}

fn map_projects_by_space(
    payload: QuickProjectsBySpaceResponsePayload,
) -> HelperQuickProjectsBySpaceResponse {
    HelperQuickProjectsBySpaceResponse {
        space_id: payload.space_id,
        inbox_project: map_project_option(payload.inbox_project),
        no_project_option: map_project_option(payload.no_project_option),
        projects: payload.projects.into_iter().map(map_project_option).collect(),
    }
}

fn map_search_response(payload: QuickSearchResponsePayload) -> HelperQuickSearchResponse {
    HelperQuickSearchResponse {
        tasks: payload.tasks.into_iter().map(map_task_item).collect(),
        projects: payload.projects.into_iter().map(map_project_item).collect(),
    }
}

fn map_scope(payload: QuickScopePayload) -> HelperQuickScopeResponse {
    HelperQuickScopeResponse {
        kind: match payload.kind {
            QuickScopeKind::All => "all",
            QuickScopeKind::Space => "space",
        },
        space_id: payload.space_id,
    }
}

fn map_placement(payload: QuickPlacementPayload) -> HelperQuickPlacementResponse {
    HelperQuickPlacementResponse {
        kind: match payload.kind {
            QuickPlacementKind::Inbox => "inbox",
            QuickPlacementKind::NoProject => "noProject",
            QuickPlacementKind::Project => "project",
        },
        project_id: payload.project_id,
    }
}

fn map_space(payload: QuickSpaceSummaryPayload) -> HelperQuickSpaceSummaryResponse {
    HelperQuickSpaceSummaryResponse {
        id: payload.id,
        name: payload.name,
        icon_key: payload.icon_key,
        color_key: payload.color_key,
        is_default: payload.is_default,
    }
}

fn map_project_option(payload: QuickProjectOptionPayload) -> HelperQuickProjectOptionResponse {
    HelperQuickProjectOptionResponse {
        kind: match payload.kind {
            QuickProjectOptionKind::Inbox => "inbox",
            QuickProjectOptionKind::NoProject => "noProject",
            QuickProjectOptionKind::Project => "project",
        },
        id: payload.id,
        space_id: payload.space_id,
        name: payload.name,
    }
}

fn map_task_item(payload: QuickTaskItemPayload) -> HelperQuickTaskItemResponse {
    HelperQuickTaskItemResponse {
        id: payload.id,
        space_id: payload.space_id,
        space_name: payload.space_name,
        project_id: payload.project_id,
        project_name: payload.project_name,
        inbox_at: payload.inbox_at,
        title: payload.title,
        note: payload.note,
        priority: payload.priority,
        status: payload.status,
        updated_at: payload.updated_at,
        completed_at: payload.completed_at,
    }
}

fn map_project_item(payload: QuickProjectItemPayload) -> HelperQuickProjectItemResponse {
    HelperQuickProjectItemResponse {
        id: payload.id,
        space_id: payload.space_id,
        space_name: payload.space_name,
        name: payload.name,
        note: payload.note,
        updated_at: payload.updated_at,
        completed_at: payload.completed_at,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_ipc_errors_to_frontend_quick_create_error_contract() {
        let cases = [
            (
                IpcError::Validation("blank title".to_owned()),
                "Validation",
                "blank title",
            ),
            (
                IpcError::CaptureSpaceUnavailable("active space missing".to_owned()),
                "QuickCreateSpaceUnavailable",
                "active space missing",
            ),
            (
                IpcError::DefaultSpaceUnavailable("default space archived".to_owned()),
                "DefaultSpaceUnavailable",
                "default space archived",
            ),
            (
                IpcError::CapturePersistence("sqlite write failed".to_owned()),
                "QuickCreatePersistence",
                "sqlite write failed",
            ),
            (
                IpcError::Internal("connect main app failed".to_owned()),
                "Internal",
                "connect main app failed",
            ),
        ];

        for (error, expected_type, expected_message) in cases {
            let payload = QuickCreateErrorPayload::from(error);
            assert_eq!(payload.type_, expected_type);
            assert_eq!(payload.message, expected_message);
        }
    }
}

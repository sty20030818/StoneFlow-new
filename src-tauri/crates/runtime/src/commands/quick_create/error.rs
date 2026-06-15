//! Quick Create 命令错误与 IPC 响应映射。

use desktop_app::app::error::AppError;
use serde::Serialize;
use stoneflow_ipc_protocol::{
    IpcError, QuickInitialStatePayload, QuickPlacementKind, QuickPlacementPayload,
    QuickProjectItemPayload, QuickProjectOptionKind, QuickProjectOptionPayload,
    QuickScopeKind, QuickScopePayload, QuickSpaceSummaryPayload, QuickTaskItemPayload,
};

#[derive(Debug, Clone, Serialize)]
pub struct QuickCreateErrorPayload {
    #[serde(rename = "type")]
    pub type_: &'static str,
    pub message: String,
}

impl From<AppError> for QuickCreateErrorPayload {
    fn from(error: AppError) -> Self {
        let message = error.to_string();
        let type_ = if message.starts_with("验证失败") {
            "Validation"
        } else if message.contains("不存在") {
            "NotFound"
        } else {
            "Internal"
        };
        Self { type_, message }
    }
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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickCreateOpenSessionResponse {
    pub session_id: String,
    pub opened_at: String,
    #[serde(flatten)]
    pub open_context: QuickCreateInitialStateResponse,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickCreateInitialStateResponse {
    pub current_scope: QuickCreateScopeResponse,
    pub default_space_id: String,
    pub default_placement: QuickCreatePlacementResponse,
    pub spaces: Vec<QuickCreateSpaceSummaryResponse>,
    pub projects: Vec<QuickCreateProjectOptionResponse>,
    pub recent_tasks: Vec<QuickCreateTaskItemResponse>,
    pub recent_projects: Vec<QuickCreateProjectItemResponse>,
}

impl QuickCreateInitialStateResponse {
    pub fn from_ipc(payload: QuickInitialStatePayload) -> Self {
        Self {
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
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickCreateScopeResponse {
    #[serde(rename = "type")]
    pub kind: &'static str,
    pub space_id: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickCreatePlacementResponse {
    #[serde(rename = "kind")]
    pub kind: &'static str,
    pub project_id: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickCreateSpaceSummaryResponse {
    pub id: String,
    pub name: String,
    pub icon_key: String,
    pub color_key: String,
    pub is_default: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickCreateProjectOptionResponse {
    #[serde(rename = "kind")]
    pub kind: &'static str,
    pub id: Option<String>,
    pub space_id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickCreateTaskItemResponse {
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
pub struct QuickCreateProjectItemResponse {
    pub id: String,
    pub space_id: String,
    pub space_name: String,
    pub name: String,
    pub note: Option<String>,
    pub updated_at: String,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickCreateProjectsBySpaceResponse {
    pub space_id: String,
    pub inbox_project: QuickCreateProjectOptionResponse,
    pub no_project_option: QuickCreateProjectOptionResponse,
    pub projects: Vec<QuickCreateProjectOptionResponse>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickCreateSearchResponse {
    pub tasks: Vec<QuickCreateTaskItemResponse>,
    pub projects: Vec<QuickCreateProjectItemResponse>,
}

fn map_scope(payload: QuickScopePayload) -> QuickCreateScopeResponse {
    QuickCreateScopeResponse {
        kind: match payload.kind {
            QuickScopeKind::All => "all",
            QuickScopeKind::Space => "space",
        },
        space_id: payload.space_id,
    }
}

fn map_placement(payload: QuickPlacementPayload) -> QuickCreatePlacementResponse {
    QuickCreatePlacementResponse {
        kind: match payload.kind {
            QuickPlacementKind::Inbox => "inbox",
            QuickPlacementKind::NoProject => "noProject",
            QuickPlacementKind::Project => "project",
        },
        project_id: payload.project_id,
    }
}

fn map_space(payload: QuickSpaceSummaryPayload) -> QuickCreateSpaceSummaryResponse {
    QuickCreateSpaceSummaryResponse {
        id: payload.id,
        name: payload.name,
        icon_key: payload.icon_key,
        color_key: payload.color_key,
        is_default: payload.is_default,
    }
}

fn map_project_option(payload: QuickProjectOptionPayload) -> QuickCreateProjectOptionResponse {
    QuickCreateProjectOptionResponse {
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

fn map_task_item(payload: QuickTaskItemPayload) -> QuickCreateTaskItemResponse {
    QuickCreateTaskItemResponse {
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

fn map_project_item(payload: QuickProjectItemPayload) -> QuickCreateProjectItemResponse {
    QuickCreateProjectItemResponse {
        id: payload.id,
        space_id: payload.space_id,
        space_name: payload.space_name,
        name: payload.name,
        note: payload.note,
        updated_at: payload.updated_at,
        completed_at: payload.completed_at,
    }
}

pub(crate) fn map_projects_by_space(
    payload: stoneflow_ipc_protocol::QuickProjectsBySpaceResponsePayload,
) -> QuickCreateProjectsBySpaceResponse {
    QuickCreateProjectsBySpaceResponse {
        space_id: payload.space_id,
        inbox_project: map_project_option(payload.inbox_project),
        no_project_option: map_project_option(payload.no_project_option),
        projects: payload
            .projects
            .into_iter()
            .map(map_project_option)
            .collect(),
    }
}

pub(crate) fn map_search_response(
    payload: stoneflow_ipc_protocol::QuickSearchResponsePayload,
) -> QuickCreateSearchResponse {
    QuickCreateSearchResponse {
        tasks: payload.tasks.into_iter().map(map_task_item).collect(),
        projects: payload.projects.into_iter().map(map_project_item).collect(),
    }
}

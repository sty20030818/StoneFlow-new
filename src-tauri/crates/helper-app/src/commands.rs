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
    window_spec::{QUICK_CREATE_LABEL, QUICK_CREATE_WINDOW_MIN_HEIGHT, QUICK_CREATE_WINDOW_WIDTH},
};

#[cfg(target_os = "macos")]
use crate::panel;

#[cfg(target_os = "windows")]
use crate::panel_windows;

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
    #[serde(default)]
    pub device_pixel_ratio: Option<f64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HelperQuickLayoutDiagnosticsInput {
    pub phase: String,
    pub target_height: f64,
    pub viewport_height: f64,
    pub device_pixel_ratio: f64,
    pub visual_viewport_width: f64,
    pub visual_viewport_height: f64,
    pub visual_viewport_scale: f64,
    pub document_client_height: f64,
    pub document_scroll_height: f64,
    pub body_client_height: f64,
    pub body_scroll_height: f64,
    pub root_client_height: f64,
    pub root_scroll_height: f64,
    pub surface_offset_height: f64,
    pub surface_scroll_height: f64,
    pub content_offset_height: f64,
    pub content_scroll_height: f64,
    pub footer_offset_height: f64,
    pub footer_scroll_height: f64,
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

    #[cfg(target_os = "windows")]
    panel_windows::position_window_on_active_monitor(&window);

    let native_scale_factor = window.scale_factor().unwrap_or(1.0);
    let css_to_native_logical_ratio =
        quick_create_css_to_native_logical_ratio(input.device_pixel_ratio, native_scale_factor);
    let target_css_height = input.height.max(QUICK_CREATE_WINDOW_MIN_HEIGHT);
    let target_window_width = QUICK_CREATE_WINDOW_WIDTH * css_to_native_logical_ratio;
    let target_window_height = target_css_height * css_to_native_logical_ratio;

    log::info!(
        "helper: quick create resize 请求 css_size={:.1}×{:.1} dpr={} native_scale={:.3} ratio={:.4} -> applied_logical={:.1}×{:.1}",
        QUICK_CREATE_WINDOW_WIDTH,
        input.height,
        format_optional_f64(input.device_pixel_ratio),
        native_scale_factor,
        css_to_native_logical_ratio,
        target_window_width,
        target_window_height
    );

    window
        .set_min_size(Some(Size::Logical(LogicalSize::new(
            QUICK_CREATE_WINDOW_WIDTH * css_to_native_logical_ratio,
            QUICK_CREATE_WINDOW_MIN_HEIGHT * css_to_native_logical_ratio,
        ))))
        .map_err(|error| QuickCreateErrorPayload {
            type_: "Internal",
            message: format!("设置 quick create 最小窗口尺寸失败: {error}"),
        })?;

    #[cfg(target_os = "macos")]
    panel::resize_quick_create_panel_preserving_top(&app_handle, target_window_height).map_err(
        |message| QuickCreateErrorPayload {
            type_: "Internal",
            message,
        },
    )?;

    #[cfg(target_os = "windows")]
    {
        let target_size =
            Size::Logical(LogicalSize::new(target_window_width, target_window_height));
        window
            .set_size(target_size)
            .map_err(|error| QuickCreateErrorPayload {
                type_: "Internal",
                message: format!("调整 quick create 窗口高度失败: {error}"),
            })?;
        window
            .as_ref()
            .set_size(target_size)
            .map_err(|error| QuickCreateErrorPayload {
                type_: "Internal",
                message: format!("调整 quick create WebView 高度失败: {error}"),
            })?;
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    window
        .set_size(Size::Logical(LogicalSize::new(
            QUICK_CREATE_WINDOW_WIDTH,
            target_window_height,
        )))
        .map_err(|error| QuickCreateErrorPayload {
            type_: "Internal",
            message: format!("调整 quick create 窗口高度失败: {error}"),
        })?;

    Ok(())
}

fn quick_create_css_to_native_logical_ratio(
    device_pixel_ratio: Option<f64>,
    native_scale_factor: f64,
) -> f64 {
    let safe_native_scale_factor = positive_or_one(native_scale_factor);
    let safe_device_pixel_ratio = device_pixel_ratio
        .filter(|ratio| ratio.is_finite() && *ratio > 0.0)
        .unwrap_or(safe_native_scale_factor);

    // 前端测量值是 CSS px；Tauri LogicalSize 是 native logical px。
    // 在 Windows WebView2 中 devicePixelRatio 可能与窗口 scale_factor 不完全相等。
    safe_device_pixel_ratio / safe_native_scale_factor
}

fn positive_or_one(value: f64) -> f64 {
    if value.is_finite() && value > 0.0 {
        value
    } else {
        1.0
    }
}

fn format_optional_f64(value: Option<f64>) -> String {
    value
        .map(|value| format!("{value:.3}"))
        .unwrap_or_else(|| "missing".to_owned())
}

#[tauri::command]
pub async fn helper_quick_report_layout_diagnostics(
    app_handle: tauri::AppHandle,
    input: HelperQuickLayoutDiagnosticsInput,
) -> Result<(), QuickCreateErrorPayload> {
    let native_metrics = app_handle
        .get_webview_window(QUICK_CREATE_LABEL)
        .map(|window| {
            let scale_factor = window.scale_factor().unwrap_or(1.0);
            let inner = window
                .inner_size()
                .map(|size| format!("{}×{}", size.width, size.height))
                .unwrap_or_else(|error| format!("err:{error}"));
            let outer = window
                .outer_size()
                .map(|size| format!("{}×{}", size.width, size.height))
                .unwrap_or_else(|error| format!("err:{error}"));
            let webview = window
                .as_ref()
                .size()
                .map(|size| format!("{}×{}", size.width, size.height))
                .unwrap_or_else(|error| format!("err:{error}"));

            format!("native(scale={scale_factor:.2} inner={inner} outer={outer} webview={webview})")
        })
        .unwrap_or_else(|| "native(window=missing)".to_owned());

    log::info!(
        "helper: quick create layout diagnostics phase={} target={:.1} viewport={:.1} dpr={:.3} visualViewport(width/height/scale)={:.1}/{:.1}/{:.3} document(client/scroll)={:.1}/{:.1} body(client/scroll)={:.1}/{:.1} root(client/scroll)={:.1}/{:.1} surface(offset/scroll)={:.1}/{:.1} content(offset/scroll)={:.1}/{:.1} footer(offset/scroll)={:.1}/{:.1} {}",
        input.phase,
        input.target_height,
        input.viewport_height,
        input.device_pixel_ratio,
        input.visual_viewport_width,
        input.visual_viewport_height,
        input.visual_viewport_scale,
        input.document_client_height,
        input.document_scroll_height,
        input.body_client_height,
        input.body_scroll_height,
        input.root_client_height,
        input.root_scroll_height,
        input.surface_offset_height,
        input.surface_scroll_height,
        input.content_offset_height,
        input.content_scroll_height,
        input.footer_offset_height,
        input.footer_scroll_height,
        native_metrics,
    );

    Ok(())
}

#[tauri::command]
pub async fn helper_quick_present_window(
    app_handle: tauri::AppHandle,
) -> Result<(), QuickCreateErrorPayload> {
    #[cfg(target_os = "macos")]
    panel::present_quick_create_panel(&app_handle).map_err(|message| QuickCreateErrorPayload {
        type_: "Internal",
        message,
    })?;

    #[cfg(target_os = "windows")]
    panel_windows::present_quick_create_window(&app_handle).map_err(|message| {
        QuickCreateErrorPayload {
            type_: "Internal",
            message,
        }
    })?;

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let Some(window) = app_handle.get_webview_window(QUICK_CREATE_LABEL) else {
            return Err(QuickCreateErrorPayload {
                type_: "Internal",
                message: "quick create 窗口未初始化".to_owned(),
            });
        };

        window.show().map_err(|error| QuickCreateErrorPayload {
            type_: "Internal",
            message: format!("显示 quick create 窗口失败: {error}"),
        })?;
        window
            .set_focus()
            .map_err(|error| QuickCreateErrorPayload {
                type_: "Internal",
                message: format!("聚焦 quick create 窗口失败: {error}"),
            })?;
    }

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
        projects: payload
            .projects
            .into_iter()
            .map(map_project_option)
            .collect(),
        recent_tasks: payload
            .recent_tasks
            .into_iter()
            .map(map_task_item)
            .collect(),
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
        projects: payload
            .projects
            .into_iter()
            .map(map_project_option)
            .collect(),
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

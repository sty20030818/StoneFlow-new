//! Quick Create 业务命令（直接调用 usecase，不经 IPC）。

use serde::Deserialize;
use stoneflow_usecase::quick_create::{
    QuickCreateInput, QuickCreatedDto, QuickListProjectsBySpaceInput, QuickPlacementDto,
    QuickPlacementKind, QuickSearchInput,
};
use tauri::{Emitter, State};
use stoneflow_storage::database::DatabaseRuntimeState;

use crate::composition::{build_quick_create_service, build_quick_create_session_bridge};
use crate::command_open::{dispatch_command_open, restore_main_window, CommandOpenPayload};
use crate::app::state::{ActiveScopeState, CommandOpenState};
use crate::services::QuickResolvedPlacement;

use super::error::{
    map_projects_by_space, map_search_response, QuickCreateErrorPayload,
    QuickCreateProjectsBySpaceResponse, QuickCreateSearchResponse,
};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickCreateListProjectsBySpaceInput {
    pub space_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickCreateSearchInput {
    pub query: String,
    #[serde(default = "default_search_limit")]
    pub limit: u64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickCreateCreateInput {
    pub space_id: Option<String>,
    pub placement: QuickCreatePlacementInput,
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
pub struct QuickCreatePlacementInput {
    #[serde(rename = "kind")]
    pub kind: QuickCreatePlacementKind,
    pub project_id: Option<String>,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum QuickCreatePlacementKind {
    Inbox,
    NoProject,
    Project,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickCreateOpenTargetInput {
    #[serde(rename = "kind")]
    pub kind: QuickCreateOpenTargetKind,
    pub id: String,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum QuickCreateOpenTargetKind {
    Task,
    Project,
}

const fn default_search_limit() -> u64 {
    5
}

#[tauri::command]
pub async fn quick_create_get_initial_state(
    database: State<'_, DatabaseRuntimeState>,
    active_scope: State<'_, ActiveScopeState>,
) -> Result<super::error::QuickCreateInitialStateResponse, QuickCreateErrorPayload> {
    let bridge = build_quick_create_session_bridge(database.inner());
    let payload = bridge
        .prepare_initial_state(active_scope.get().await)
        .await
        .map_err(QuickCreateErrorPayload::from)?;
    Ok(super::error::QuickCreateInitialStateResponse::from_dto(payload))
}

#[tauri::command]
pub async fn quick_create_list_projects_by_space(
    input: QuickCreateListProjectsBySpaceInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<QuickCreateProjectsBySpaceResponse, QuickCreateErrorPayload> {
    let service = build_quick_create_service(database.inner());
    let payload = service
        .list_projects_by_space(QuickListProjectsBySpaceInput {
            space_id: input.space_id,
        })
        .await
        .map_err(QuickCreateErrorPayload::from)?;
    Ok(map_projects_by_space(payload))
}

#[tauri::command]
pub async fn quick_create_search(
    input: QuickCreateSearchInput,
    database: State<'_, DatabaseRuntimeState>,
    active_scope: State<'_, ActiveScopeState>,
) -> Result<QuickCreateSearchResponse, QuickCreateErrorPayload> {
    let service = build_quick_create_service(database.inner());
    let payload = service
        .search(
            QuickSearchInput {
                query: input.query,
                limit: input.limit,
            },
            active_scope.get().await,
        )
        .await
        .map_err(QuickCreateErrorPayload::from)?;
    Ok(map_search_response(payload))
}

#[tauri::command]
pub async fn quick_create_create(
    input: QuickCreateCreateInput,
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
    active_scope: State<'_, ActiveScopeState>,
) -> Result<(), QuickCreateErrorPayload> {
    let service = build_quick_create_service(database.inner());
    let created = service
        .create(map_create_payload(input), active_scope.get().await)
        .await
        .map_err(QuickCreateErrorPayload::from)?;
    emit_task_changed(&app_handle, &created)?;
    Ok(())
}

#[tauri::command]
pub async fn quick_create_create_and_open(
    input: QuickCreateCreateInput,
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
    active_scope: State<'_, ActiveScopeState>,
    command_open_state: State<'_, CommandOpenState>,
) -> Result<(), QuickCreateErrorPayload> {
    let service = build_quick_create_service(database.inner());
    let created = service
        .create(map_create_payload(input), active_scope.get().await)
        .await
        .map_err(QuickCreateErrorPayload::from)?;
    emit_task_changed(&app_handle, &created)?;
    open_created_task(&app_handle, &service, command_open_state.inner(), &created).await?;
    Ok(())
}

#[tauri::command]
pub async fn quick_create_open_target(
    input: QuickCreateOpenTargetInput,
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
    command_open_state: State<'_, CommandOpenState>,
) -> Result<(), QuickCreateErrorPayload> {
    let service = build_quick_create_service(database.inner());
    open_existing_target(&app_handle, &service, command_open_state.inner(), input).await?;
    Ok(())
}

async fn open_created_task(
    app_handle: &tauri::AppHandle,
    service: &crate::services::QuickCreateService,
    command_open_state: &CommandOpenState,
    created: &QuickCreatedDto,
) -> Result<(), QuickCreateErrorPayload> {
    let target = service
        .resolve_task_open_target(&created.id)
        .await
        .map_err(QuickCreateErrorPayload::from)?;
    restore_main_window(app_handle)
        .await
        .map_err(QuickCreateErrorPayload::from)?;
    dispatch_command_open(
        app_handle,
        command_open_state,
        CommandOpenPayload {
            kind: target.kind,
            id: target.id,
            space_id: target.space_id,
            project_id: target.project_id,
            placement: match target.placement {
                QuickResolvedPlacement::Project => "project",
                QuickResolvedPlacement::Inbox => "inbox",
                QuickResolvedPlacement::NoProject => "no_project",
            },
        },
    )
    .await
    .map_err(QuickCreateErrorPayload::from)?;
    Ok(())
}

async fn open_existing_target(
    app_handle: &tauri::AppHandle,
    service: &crate::services::QuickCreateService,
    command_open_state: &CommandOpenState,
    input: QuickCreateOpenTargetInput,
) -> Result<(), QuickCreateErrorPayload> {
    let target = match input.kind {
        QuickCreateOpenTargetKind::Task => service
            .resolve_task_open_target(&input.id)
            .await
            .map_err(QuickCreateErrorPayload::from)?,
        QuickCreateOpenTargetKind::Project => service
            .resolve_project_open_target(&input.id)
            .await
            .map_err(QuickCreateErrorPayload::from)?,
    };
    restore_main_window(app_handle)
        .await
        .map_err(QuickCreateErrorPayload::from)?;
    dispatch_command_open(
        app_handle,
        command_open_state,
        CommandOpenPayload {
            kind: target.kind,
            id: target.id,
            space_id: target.space_id,
            project_id: target.project_id,
            placement: match target.placement {
                QuickResolvedPlacement::Project => "project",
                QuickResolvedPlacement::Inbox => "inbox",
                QuickResolvedPlacement::NoProject => "no_project",
            },
        },
    )
    .await
    .map_err(QuickCreateErrorPayload::from)?;
    Ok(())
}

fn map_create_payload(input: QuickCreateCreateInput) -> QuickCreateInput {
    QuickCreateInput {
        space_id: input.space_id,
        placement: QuickPlacementDto {
            kind: match input.placement.kind {
                QuickCreatePlacementKind::Inbox => QuickPlacementKind::Inbox,
                QuickCreatePlacementKind::NoProject => QuickPlacementKind::NoProject,
                QuickCreatePlacementKind::Project => QuickPlacementKind::Project,
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

fn emit_task_changed(
    app_handle: &tauri::AppHandle,
    created: &QuickCreatedDto,
) -> Result<(), QuickCreateErrorPayload> {
    app_handle
        .emit(
            "stoneflow://tasks/changed",
            serde_json::json!({
                "spaceId": created.space_id,
                "spaceSlug": created.space_id,
                "taskId": created.id,
                "source": "quick_create",
                "spaceFallback": created.space_fallback,
            }),
        )
        .map_err(|error| QuickCreateErrorPayload {
            type_: "Internal",
            message: format!("tasks changed 事件发送失败: {error}"),
        })
}

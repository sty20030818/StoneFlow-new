//! Quick Create 业务命令（直接调用 usecase，不经 IPC）。

use serde::Deserialize;
use stoneflow_storage::database::DatabaseRuntimeState;
use stoneflow_usecase::quick_create::QuickListProjectsBySpaceInput;
use tauri::State;

use crate::app::state::CommandOpenState;
use crate::command_open::{dispatch_command_open, restore_main_window, CommandOpenPayload};
use crate::composition::{build_quick_create_service, build_quick_create_session_bridge};
use crate::services::QuickResolvedPlacement;

use super::error::{
    map_projects_by_space, QuickCreateErrorPayload, QuickCreateProjectsBySpaceResponse,
};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickCreateListProjectsBySpaceInput {
    pub space_id: String,
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

#[tauri::command]
pub async fn quick_create_get_initial_state(
    database: State<'_, DatabaseRuntimeState>,
    active_scope: State<'_, crate::app::state::ActiveScopeState>,
) -> Result<super::error::QuickCreateInitialStateResponse, QuickCreateErrorPayload> {
    let bridge = build_quick_create_session_bridge(database.inner());
    let payload = bridge
        .prepare_initial_state(active_scope.get().await)
        .await
        .map_err(QuickCreateErrorPayload::from)?;
    Ok(super::error::QuickCreateInitialStateResponse::from_dto(
        payload,
    ))
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

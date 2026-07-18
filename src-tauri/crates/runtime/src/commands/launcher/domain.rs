//! Launcher 业务命令（直接调用 usecase，不经 IPC）。

use serde::Deserialize;
use stoneflow_storage::database::DatabaseRuntimeState;
use stoneflow_usecase::launcher::LauncherListProjectsBySpaceInput as UsecaseListProjectsBySpaceInput;
use tauri::State;

use crate::app::state::CommandOpenState;
use crate::command_open::{dispatch_command_open, restore_main_window, CommandOpenPayload};
use crate::composition::{build_launcher_service, build_launcher_session_bridge};
use crate::services::LauncherResolvedPlacement;

use super::error::{
    map_projects_by_space, LauncherErrorPayload, LauncherProjectsBySpaceResponse,
};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherListProjectsBySpaceInput {
    pub space_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherOpenTargetInput {
    #[serde(rename = "kind")]
    pub kind: LauncherOpenTargetKind,
    pub id: String,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum LauncherOpenTargetKind {
    Task,
    Project,
}

#[tauri::command]
pub async fn launcher_get_initial_state(
    database: State<'_, DatabaseRuntimeState>,
    active_scope: State<'_, crate::app::state::ActiveScopeState>,
) -> Result<super::error::LauncherInitialStateResponse, LauncherErrorPayload> {
    let bridge = build_launcher_session_bridge(database.inner());
    let payload = bridge
        .prepare_initial_state(active_scope.get().await)
        .await
        .map_err(LauncherErrorPayload::from)?;
    Ok(super::error::LauncherInitialStateResponse::from_dto(
        payload,
    ))
}

#[tauri::command]
pub async fn launcher_list_projects_by_space(
    input: LauncherListProjectsBySpaceInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<LauncherProjectsBySpaceResponse, LauncherErrorPayload> {
    let service = build_launcher_service(database.inner());
    let payload = service
        .list_projects_by_space(UsecaseListProjectsBySpaceInput {
            space_id: input.space_id,
        })
        .await
        .map_err(LauncherErrorPayload::from)?;
    Ok(map_projects_by_space(payload))
}

#[tauri::command]
pub async fn launcher_open_target(
    input: LauncherOpenTargetInput,
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
    command_open_state: State<'_, CommandOpenState>,
) -> Result<(), LauncherErrorPayload> {
    let service = build_launcher_service(database.inner());
    open_existing_target(&app_handle, &service, command_open_state.inner(), input).await?;
    Ok(())
}

async fn open_existing_target(
    app_handle: &tauri::AppHandle,
    service: &crate::services::LauncherService,
    command_open_state: &CommandOpenState,
    input: LauncherOpenTargetInput,
) -> Result<(), LauncherErrorPayload> {
    let target = match input.kind {
        LauncherOpenTargetKind::Task => service
            .resolve_task_open_target(&input.id)
            .await
            .map_err(LauncherErrorPayload::from)?,
        LauncherOpenTargetKind::Project => service
            .resolve_project_open_target(&input.id)
            .await
            .map_err(LauncherErrorPayload::from)?,
    };
    restore_main_window(app_handle)
        .await
        .map_err(LauncherErrorPayload::from)?;
    dispatch_command_open(
        app_handle,
        command_open_state,
        CommandOpenPayload {
            kind: target.kind,
            id: target.id,
            space_id: target.space_id,
            project_id: target.project_id,
            placement: match target.placement {
                LauncherResolvedPlacement::Project => "project",
                LauncherResolvedPlacement::Inbox => "inbox",
                LauncherResolvedPlacement::NoProject => "no_project",
            },
        },
    )
    .await
    .map_err(LauncherErrorPayload::from)?;
    Ok(())
}

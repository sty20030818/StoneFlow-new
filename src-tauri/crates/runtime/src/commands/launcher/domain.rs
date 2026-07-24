//! Launcher 业务命令：薄 transport，业务在 AppState.launcher / launcher_context。

use serde::Deserialize;
use stoneflow_application::launcher::{
    LauncherListProjectsBySpaceInput as UsecaseListProjectsBySpaceInput, LauncherPlacementKind,
};
use tauri::State;

use crate::app::state::{map_active_scope, AppState, CommandOpenState};
use crate::command_open::{dispatch_command_open, restore_main_window, CommandOpenPayload};
use stoneflow_application::launcher::LauncherProjectsBySpaceDto;

use super::error::{LauncherErrorPayload, LauncherInitialStateResponse};

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
    state: State<'_, AppState>,
    active_scope: State<'_, crate::app::state::ActiveScopeState>,
) -> Result<LauncherInitialStateResponse, LauncherErrorPayload> {
    state
        .launcher_context
        .get_initial_state(map_active_scope(active_scope.get().await))
        .await
        .map_err(|error| LauncherErrorPayload::from(crate::app::error::AppError::from(error)))
}

#[tauri::command]
pub async fn launcher_list_projects_by_space(
    input: LauncherListProjectsBySpaceInput,
    state: State<'_, AppState>,
) -> Result<LauncherProjectsBySpaceDto, LauncherErrorPayload> {
    state
        .launcher
        .list_projects_by_space(UsecaseListProjectsBySpaceInput {
            space_id: input.space_id,
        })
        .await
        .map_err(|error| LauncherErrorPayload::from(crate::app::error::AppError::from(error)))
}

#[tauri::command]
pub async fn launcher_open_target(
    input: LauncherOpenTargetInput,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    command_open_state: State<'_, CommandOpenState>,
) -> Result<(), LauncherErrorPayload> {
    open_existing_target(
        &app_handle,
        state.inner(),
        command_open_state.inner(),
        input,
    )
    .await?;
    Ok(())
}

async fn open_existing_target(
    app_handle: &tauri::AppHandle,
    state: &AppState,
    command_open_state: &CommandOpenState,
    input: LauncherOpenTargetInput,
) -> Result<(), LauncherErrorPayload> {
    let target = match input.kind {
        LauncherOpenTargetKind::Task => state
            .launcher
            .resolve_task_open_target(&input.id)
            .await
            .map_err(|error| {
                LauncherErrorPayload::from(crate::app::error::AppError::from(error))
            })?,
        LauncherOpenTargetKind::Project => state
            .launcher
            .resolve_project_open_target(&input.id)
            .await
            .map_err(|error| {
                LauncherErrorPayload::from(crate::app::error::AppError::from(error))
            })?,
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
                LauncherPlacementKind::Project => "project",
                LauncherPlacementKind::Standalone => "standalone",
            },
        },
    )
    .await
    .map_err(LauncherErrorPayload::from)?;
    Ok(())
}

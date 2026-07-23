//! Launcher 命令错误与 usecase DTO 响应映射。

use crate::app::error::AppError;
use serde::Serialize;
use stoneflow_application::launcher::{
    LauncherPlacementDto, LauncherPlacementKind, LauncherProjectItemDto, LauncherProjectOptionDto,
    LauncherProjectOptionKind, LauncherProjectsBySpaceDto, LauncherScopeDto, LauncherScopeKind,
    LauncherSpaceSummaryDto, LauncherTaskItemDto,
};
use stoneflow_application::launcher_context::LauncherInitialStateDto;

#[derive(Debug, Clone, Serialize)]
pub struct LauncherErrorPayload {
    #[serde(rename = "type")]
    pub type_: &'static str,
    pub message: String,
}

impl From<AppError> for LauncherErrorPayload {
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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherOpenSessionResponse {
    pub session_id: String,
    pub opened_at: String,
    #[serde(flatten)]
    pub open_context: LauncherInitialStateResponse,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherInitialStateResponse {
    pub current_scope: LauncherScopeResponse,
    pub default_space_id: String,
    pub default_placement: LauncherPlacementResponse,
    pub spaces: Vec<LauncherSpaceSummaryResponse>,
    pub projects: Vec<LauncherProjectOptionResponse>,
    pub recent_tasks: Vec<LauncherTaskItemResponse>,
    pub recent_projects: Vec<LauncherProjectItemResponse>,
}

impl LauncherInitialStateResponse {
    pub fn from_dto(payload: LauncherInitialStateDto) -> Self {
        Self {
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
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherScopeResponse {
    #[serde(rename = "type")]
    pub kind: &'static str,
    pub space_id: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherPlacementResponse {
    #[serde(rename = "kind")]
    pub kind: &'static str,
    pub project_id: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherSpaceSummaryResponse {
    pub id: String,
    pub name: String,
    pub icon_key: String,
    pub color_key: String,
    pub is_default: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherProjectOptionResponse {
    #[serde(rename = "kind")]
    pub kind: &'static str,
    pub id: Option<String>,
    pub space_id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherTaskItemResponse {
    pub id: String,
    pub space_id: String,
    pub space_name: String,
    pub project_id: Option<String>,
    pub project_name: Option<String>,
    pub title: String,
    pub note: Option<String>,
    pub priority: i32,
    pub status: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherProjectItemResponse {
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
pub struct LauncherProjectsBySpaceResponse {
    pub space_id: String,
    pub standalone_option: LauncherProjectOptionResponse,
    pub projects: Vec<LauncherProjectOptionResponse>,
}

fn map_scope(payload: LauncherScopeDto) -> LauncherScopeResponse {
    LauncherScopeResponse {
        kind: match payload.kind {
            LauncherScopeKind::All => "all",
            LauncherScopeKind::Space => "space",
        },
        space_id: payload.space_id,
    }
}

fn map_placement(payload: LauncherPlacementDto) -> LauncherPlacementResponse {
    LauncherPlacementResponse {
        kind: match payload.kind {
            LauncherPlacementKind::Standalone => "standalone",
            LauncherPlacementKind::Project => "project",
        },
        project_id: payload.project_id,
    }
}

fn map_space(payload: LauncherSpaceSummaryDto) -> LauncherSpaceSummaryResponse {
    LauncherSpaceSummaryResponse {
        id: payload.id,
        name: payload.name,
        icon_key: payload.icon_key,
        color_key: payload.color_key,
        is_default: payload.is_default,
    }
}

fn map_project_option(payload: LauncherProjectOptionDto) -> LauncherProjectOptionResponse {
    LauncherProjectOptionResponse {
        kind: match payload.kind {
            LauncherProjectOptionKind::Standalone => "standalone",
            LauncherProjectOptionKind::Project => "project",
        },
        id: payload.id,
        space_id: payload.space_id,
        name: payload.name,
    }
}

fn map_task_item(payload: LauncherTaskItemDto) -> LauncherTaskItemResponse {
    LauncherTaskItemResponse {
        id: payload.id,
        space_id: payload.space_id,
        space_name: payload.space_name,
        project_id: payload.project_id,
        project_name: payload.project_name,
        title: payload.title,
        note: payload.note,
        priority: payload.priority,
        status: payload.status,
        updated_at: payload.updated_at,
        completed_at: payload.completed_at,
    }
}

fn map_project_item(payload: LauncherProjectItemDto) -> LauncherProjectItemResponse {
    LauncherProjectItemResponse {
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
    payload: LauncherProjectsBySpaceDto,
) -> LauncherProjectsBySpaceResponse {
    LauncherProjectsBySpaceResponse {
        space_id: payload.space_id,
        standalone_option: map_project_option(payload.standalone_option),
        projects: payload
            .projects
            .into_iter()
            .map(map_project_option)
            .collect(),
    }
}

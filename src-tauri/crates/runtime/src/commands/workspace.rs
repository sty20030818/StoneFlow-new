//! 与工作区基座相关的最小命令。

use serde::{Deserialize, Serialize};
use tauri::State;
use uuid::Uuid;

use desktop_app::app::error::AppError;
use desktop_app::app::state::{ActiveScopeKind, ActiveScopeSnapshot, ActiveScopeState};
use stoneflow_domain::next_runtime_id;
use stoneflow_storage::database::{DatabaseRuntimeSnapshot, DatabaseRuntimeState};

/// 当前基座的健康检查响应。
#[derive(Debug, Clone, Serialize)]
pub struct RuntimeHealthcheckPayload {
    pub status: &'static str,
    pub app: &'static str,
    pub architecture_stage: &'static str,
    pub database_path: String,
    pub database_ready: bool,
}

fn healthcheck_payload(database: DatabaseRuntimeSnapshot) -> RuntimeHealthcheckPayload {
    RuntimeHealthcheckPayload {
        status: if database.database_ready {
            "ok"
        } else {
            "degraded"
        },
        app: "desktop-app",
        architecture_stage: "stage_0_infra",
        database_path: database.database_path,
        database_ready: database.database_ready,
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ScopeType {
    All,
    Space,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SetActiveScopeInput {
    pub scope_type: ScopeType,
    pub space_id: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActiveScopePayload {
    pub active_scope_id: String,
    pub scope_type: ScopeType,
    pub space_id: Option<String>,
}

#[tauri::command]
pub fn healthcheck(database: State<'_, DatabaseRuntimeState>) -> RuntimeHealthcheckPayload {
    healthcheck_payload(database.snapshot())
}

#[tauri::command]
pub async fn set_active_scope(
    input: SetActiveScopeInput,
    active_scope: State<'_, ActiveScopeState>,
) -> Result<ActiveScopePayload, AppError> {
    let (kind, space_id) = match input.scope_type {
        ScopeType::All => (ActiveScopeKind::All, None),
        ScopeType::Space => {
            let raw_space_id = input
                .space_id
                .as_deref()
                .ok_or_else(|| AppError::validation("scopeType=space 时必须提供 spaceId"))?;
            let space_id = Uuid::parse_str(raw_space_id)
                .map_err(|_| AppError::validation("spaceId 必须是合法 UUID"))?;
            (ActiveScopeKind::Space, Some(space_id))
        }
    };

    let snapshot = ActiveScopeSnapshot {
        id: next_runtime_id(),
        kind,
        space_id,
    };
    active_scope.set(snapshot.clone()).await;

    Ok(ActiveScopePayload {
        active_scope_id: snapshot.id.to_string(),
        scope_type: match snapshot.kind {
            ActiveScopeKind::All => ScopeType::All,
            ActiveScopeKind::Space => ScopeType::Space,
        },
        space_id: snapshot.space_id.map(|value| value.to_string()),
    })
}

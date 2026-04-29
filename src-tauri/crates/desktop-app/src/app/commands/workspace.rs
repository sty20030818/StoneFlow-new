//! 与工作区基座相关的最小命令。

use serde::{Deserialize, Serialize};
use tauri::State;

use crate::app::error::AppError;
use crate::app::state::{ActiveSpaceSnapshot, ActiveSpaceState};
use crate::domain::{next_runtime_id, normalize_required_text, normalize_slug, DEFAULT_SPACE_NAME, DEFAULT_SPACE_SLUG};
use crate::infrastructure::runtime::{healthcheck_payload, RuntimeHealthcheckPayload};

#[derive(Debug, Clone, Deserialize)]
pub struct CreateSpaceInput {
    pub name: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SetActiveSpaceInput {
    pub space_slug: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct CreatedSpacePayload {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ActiveSpacePayload {
    pub active_space_id: String,
    pub space_slug: String,
}

#[tauri::command]
pub fn healthcheck() -> RuntimeHealthcheckPayload {
    healthcheck_payload()
}

#[tauri::command]
pub async fn create_space(input: CreateSpaceInput) -> Result<CreatedSpacePayload, AppError> {
    let name = normalize_required_text(&input.name, "space name")?;
    let slug = normalize_slug(&name);
    if slug.is_empty() {
        return Err(AppError::validation("space slug 不能为空"));
    }

    let timestamp = chrono::Utc::now().to_rfc3339();
    Ok(CreatedSpacePayload {
        id: next_runtime_id().to_string(),
        name,
        slug,
        sort_order: 0,
        created_at: timestamp.clone(),
        updated_at: timestamp,
    })
}

#[tauri::command]
pub async fn set_active_space(
    input: SetActiveSpaceInput,
    active_space: State<'_, ActiveSpaceState>,
) -> Result<ActiveSpacePayload, AppError> {
    let resolved_slug = {
        let slug = normalize_slug(&input.space_slug);
        if slug.is_empty() {
            DEFAULT_SPACE_SLUG.to_owned()
        } else {
            slug
        }
    };

    let snapshot = ActiveSpaceSnapshot {
        id: next_runtime_id(),
        slug: resolved_slug.clone(),
    };
    active_space.set(snapshot.clone()).await;

    Ok(ActiveSpacePayload {
        active_space_id: snapshot.id.to_string(),
        space_slug: if snapshot.slug.is_empty() {
            DEFAULT_SPACE_NAME.to_owned()
        } else {
            snapshot.slug
        },
    })
}

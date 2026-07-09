//! 更新相关全局事件：仅发送统一 `update-phase`。

use serde::Serialize;
use tauri::{AppHandle, Emitter};

use stoneflow_usecase::update::UpdateInfo;

/// 统一更新阶段事件名。
pub const UPDATE_PHASE_EVENT: &str = "update-phase";

/// 统一阶段 payload（camelCase）。
/// 全局 `update-phase` 与 IPC Channel 共用此形状。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePhasePayload {
    pub phase: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pub_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub downloaded: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub total: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

pub fn emit_available(app: &AppHandle, info: &UpdateInfo) {
    let _ = app.emit(
        UPDATE_PHASE_EVENT,
        &UpdatePhasePayload {
            phase: "available",
            version: Some(info.version.clone()),
            body: info.body.clone(),
            pub_date: info.pub_date.clone(),
            downloaded: None,
            total: None,
            message: None,
        },
    );
}

pub fn emit_downloading(app: &AppHandle, version: &str, downloaded: u64, total: Option<u64>) {
    let _ = app.emit(
        UPDATE_PHASE_EVENT,
        &UpdatePhasePayload {
            phase: "downloading",
            version: Some(version.to_owned()),
            body: None,
            pub_date: None,
            downloaded: Some(downloaded),
            total,
            message: None,
        },
    );
}

pub fn emit_ready(app: &AppHandle, version: &str) {
    let _ = app.emit(
        UPDATE_PHASE_EVENT,
        &UpdatePhasePayload {
            phase: "ready",
            version: Some(version.to_owned()),
            body: None,
            pub_date: None,
            downloaded: None,
            total: None,
            message: None,
        },
    );
}

pub fn emit_error(app: &AppHandle, message: impl Into<String>) {
    let message = message.into();
    let _ = app.emit(
        UPDATE_PHASE_EVENT,
        &UpdatePhasePayload {
            phase: "error",
            version: None,
            body: None,
            pub_date: None,
            downloaded: None,
            total: None,
            message: Some(message),
        },
    );
}

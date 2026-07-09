//! 更新相关全局事件：统一 `update-phase`，并双发旧事件以兼容过渡期。

use serde::Serialize;
use tauri::{AppHandle, Emitter};

use stoneflow_usecase::update::UpdateInfo;

/// 统一更新阶段事件名。
pub const UPDATE_PHASE_EVENT: &str = "update-phase";

/// 兼容旧事件名（过渡期双发）。
pub const UPDATE_AVAILABLE_EVENT: &str = "update-available";
pub const UPDATE_DOWNLOAD_PROGRESS_EVENT: &str = "update-download-progress";
pub const UPDATE_DOWNLOADED_EVENT: &str = "update-downloaded";
pub const UPDATE_ERROR_EVENT: &str = "update-error";

/// 统一阶段 payload（camelCase）。
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
    let phase = UpdatePhasePayload {
        phase: "available",
        version: Some(info.version.clone()),
        body: info.body.clone(),
        pub_date: info.pub_date.clone(),
        downloaded: None,
        total: None,
        message: None,
    };
    let _ = app.emit(UPDATE_PHASE_EVENT, &phase);
    let _ = app.emit(UPDATE_AVAILABLE_EVENT, info);
}

pub fn emit_downloading(app: &AppHandle, version: &str, downloaded: u64, total: Option<u64>) {
    let phase = UpdatePhasePayload {
        phase: "downloading",
        version: Some(version.to_owned()),
        body: None,
        pub_date: None,
        downloaded: Some(downloaded),
        total,
        message: None,
    };
    let _ = app.emit(UPDATE_PHASE_EVENT, &phase);
    let _ = app.emit(
        UPDATE_DOWNLOAD_PROGRESS_EVENT,
        serde_json::json!({
            "version": version,
            "downloaded": downloaded,
            "total": total,
        }),
    );
}

pub fn emit_ready(app: &AppHandle, version: &str) {
    let phase = UpdatePhasePayload {
        phase: "ready",
        version: Some(version.to_owned()),
        body: None,
        pub_date: None,
        downloaded: None,
        total: None,
        message: None,
    };
    let _ = app.emit(UPDATE_PHASE_EVENT, &phase);
    let _ = app.emit(
        UPDATE_DOWNLOADED_EVENT,
        serde_json::json!({ "version": version }),
    );
}

pub fn emit_error(app: &AppHandle, message: impl Into<String>) {
    let message = message.into();
    let phase = UpdatePhasePayload {
        phase: "error",
        version: None,
        body: None,
        pub_date: None,
        downloaded: None,
        total: None,
        message: Some(message.clone()),
    };
    let _ = app.emit(UPDATE_PHASE_EVENT, &phase);
    let _ = app.emit(UPDATE_ERROR_EVENT, serde_json::json!({ "message": message }));
}

//! 应用更新相关 Tauri IPC 命令。

use serde::Serialize;
use tauri::{AppHandle, State};

use crate::app::error::AppError;
use crate::update::events::{emit_current_session, emit_session_changed};
use crate::update::RuntimeUpdateService;
use crate::update_schedule::UpdateScheduleWake;
use stoneflow_application::update::{UpdateCheckOutcome, UpdateSessionSnapshot};
use stoneflow_application::ApplicationError;
use stoneflow_domain::{UpdateChannel, UpdateCheckMode, UpdateSettings};

/// manual check 的交互结果；生命周期事实只存在于 snapshot。
#[derive(Debug, Serialize)]
#[serde(tag = "status", rename_all = "camelCase")]
pub enum ManualUpdateCheckResponse {
    Ok {
        snapshot: UpdateSessionSnapshot,
        #[serde(rename = "noUpdate")]
        no_update: bool,
    },
    Failed {
        message: String,
        snapshot: UpdateSessionSnapshot,
    },
}

/// 身份型生命周期命令的唯一响应。
#[derive(Debug, Serialize)]
#[serde(tag = "status", rename_all = "camelCase")]
pub enum UpdateLifecycleResponse {
    Ok {
        snapshot: UpdateSessionSnapshot,
    },
    Conflict {
        message: String,
        snapshot: UpdateSessionSnapshot,
    },
    Failed {
        message: String,
        snapshot: UpdateSessionSnapshot,
    },
}

fn lifecycle_response<T>(
    result: Result<T, ApplicationError>,
    snapshot: UpdateSessionSnapshot,
) -> UpdateLifecycleResponse {
    match result {
        Ok(_) => UpdateLifecycleResponse::Ok { snapshot },
        Err(ApplicationError::Conflict(message)) => {
            UpdateLifecycleResponse::Conflict { message, snapshot }
        }
        Err(error) => UpdateLifecycleResponse::Failed {
            message: error.to_string(),
            snapshot,
        },
    }
}

fn manual_check_response(
    result: Result<UpdateCheckOutcome, ApplicationError>,
    snapshot: UpdateSessionSnapshot,
) -> ManualUpdateCheckResponse {
    match result {
        Ok(outcome) => ManualUpdateCheckResponse::Ok {
            no_update: matches!(outcome, UpdateCheckOutcome::NoUpdate),
            snapshot,
        },
        Err(error) => ManualUpdateCheckResponse::Failed {
            message: error.to_string(),
            snapshot,
        },
    }
}

#[tauri::command]
pub async fn check_update(
    app: AppHandle,
    service: State<'_, RuntimeUpdateService>,
) -> Result<ManualUpdateCheckResponse, AppError> {
    let result = service.check_update().await;
    let snapshot = service.session_snapshot();
    emit_session_changed(&app, &snapshot);
    Ok(manual_check_response(result, snapshot))
}

/// 下载并暂存指定身份的更新；不会启动安装器。
#[tauri::command]
pub async fn download_update(
    expected_version: String,
    expected_channel: UpdateChannel,
    app: AppHandle,
    service: State<'_, RuntimeUpdateService>,
) -> Result<UpdateLifecycleResponse, AppError> {
    let progress_app = app.clone();
    let result = service
        .download_update(&expected_version, expected_channel, move |_, _| {
            emit_current_session(&progress_app)
        })
        .await;
    let snapshot = service.session_snapshot();
    emit_session_changed(&app, &snapshot);
    Ok(lifecycle_response(result, snapshot))
}

/// 安装指定版本的已暂存更新并重启。
#[tauri::command]
pub async fn install_staged_update(
    expected_version: String,
    confirmed_source_channel: Option<UpdateChannel>,
    app: AppHandle,
    service: State<'_, RuntimeUpdateService>,
) -> Result<UpdateLifecycleResponse, AppError> {
    let installing_app = app.clone();
    let result = service
        .install_staged_update(&expected_version, confirmed_source_channel, move || {
            emit_current_session(&installing_app)
        })
        .await;
    let snapshot = service.session_snapshot();
    emit_session_changed(&app, &snapshot);
    Ok(lifecycle_response(result, snapshot))
}

#[tauri::command]
pub async fn consume_completed_update(
    current_version: String,
    service: State<'_, RuntimeUpdateService>,
) -> Result<Option<String>, AppError> {
    Ok(service.consume_completed_update(&current_version).await?)
}

#[tauri::command]
pub async fn skip_version(
    expected_version: String,
    expected_channel: UpdateChannel,
    app: AppHandle,
    service: State<'_, RuntimeUpdateService>,
) -> Result<UpdateLifecycleResponse, AppError> {
    let result = service
        .skip_version(&expected_version, expected_channel)
        .await;
    let snapshot = service.session_snapshot();
    emit_session_changed(&app, &snapshot);
    Ok(lifecycle_response(result, snapshot))
}

#[tauri::command]
pub async fn set_check_mode(
    mode: UpdateCheckMode,
    service: State<'_, RuntimeUpdateService>,
    wake: State<'_, UpdateScheduleWake>,
) -> Result<(), AppError> {
    service.set_check_mode(mode).await?;
    wake.notify();
    Ok(())
}

#[tauri::command]
pub async fn set_channel(
    channel: UpdateChannel,
    app: AppHandle,
    service: State<'_, RuntimeUpdateService>,
) -> Result<(), AppError> {
    service.set_channel(channel).await?;
    emit_current_session(&app);
    Ok(())
}

#[tauri::command]
pub async fn set_check_interval_secs(
    interval_secs: i64,
    service: State<'_, RuntimeUpdateService>,
    wake: State<'_, UpdateScheduleWake>,
) -> Result<(), AppError> {
    service.set_check_interval_secs(interval_secs).await?;
    wake.notify();
    Ok(())
}

#[tauri::command]
pub async fn get_update_settings(
    service: State<'_, RuntimeUpdateService>,
) -> Result<UpdateSettings, AppError> {
    Ok(service.get_settings().await?)
}

#[tauri::command]
pub async fn get_update_session(
    service: State<'_, RuntimeUpdateService>,
) -> Result<UpdateSessionSnapshot, AppError> {
    Ok(service.session_snapshot())
}

#[tauri::command]
pub async fn cancel_update_download(
    app: AppHandle,
    service: State<'_, RuntimeUpdateService>,
) -> Result<UpdateSessionSnapshot, AppError> {
    service.cancel_download();
    let snapshot = service.session_snapshot();
    emit_session_changed(&app, &snapshot);
    Ok(snapshot)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use stoneflow_application::update::UpdateSessionPhase;

    fn idle_snapshot() -> UpdateSessionSnapshot {
        UpdateSessionSnapshot {
            revision: 7,
            phase: UpdateSessionPhase::Idle,
            update: None,
            progress: None,
            error_message: None,
        }
    }

    #[test]
    fn lifecycle_response_has_one_discriminated_json_shape() {
        let ok = lifecycle_response(Ok::<_, ApplicationError>(()), idle_snapshot());
        assert_eq!(
            serde_json::to_value(ok).unwrap(),
            json!({
                "status": "ok",
                "snapshot": {
                    "revision": 7,
                    "phase": "idle",
                    "update": null,
                    "progress": null,
                    "errorMessage": null
                }
            })
        );

        let conflict = lifecycle_response::<()>(
            Err(ApplicationError::conflict("stale identity")),
            idle_snapshot(),
        );
        assert_eq!(
            serde_json::to_value(conflict).unwrap(),
            json!({
                "status": "conflict",
                "message": "stale identity",
                "snapshot": {
                    "revision": 7,
                    "phase": "idle",
                    "update": null,
                    "progress": null,
                    "errorMessage": null
                }
            })
        );

        let failed = lifecycle_response::<()>(
            Err(ApplicationError::update("network unavailable")),
            idle_snapshot(),
        );
        assert_eq!(
            serde_json::to_value(failed).unwrap(),
            json!({
                "status": "failed",
                "message": "更新失败: network unavailable",
                "snapshot": {
                    "revision": 7,
                    "phase": "idle",
                    "update": null,
                    "progress": null,
                    "errorMessage": null
                }
            })
        );
    }

    #[test]
    fn manual_failure_response_keeps_the_authoritative_snapshot() {
        let mut snapshot = idle_snapshot();
        snapshot.error_message = Some("更新失败: network unavailable".to_string());

        let response = manual_check_response(
            Err(ApplicationError::update("network unavailable")),
            snapshot,
        );

        assert_eq!(
            serde_json::to_value(response).unwrap(),
            json!({
                "status": "failed",
                "message": "更新失败: network unavailable",
                "snapshot": {
                    "revision": 7,
                    "phase": "idle",
                    "update": null,
                    "progress": null,
                    "errorMessage": "更新失败: network unavailable"
                }
            })
        );
    }

    #[test]
    fn manual_success_response_uses_the_discriminated_frontend_contract() {
        let response = manual_check_response(Ok(UpdateCheckOutcome::NoUpdate), idle_snapshot());

        assert_eq!(
            serde_json::to_value(response).unwrap(),
            json!({
                "status": "ok",
                "snapshot": {
                    "revision": 7,
                    "phase": "idle",
                    "update": null,
                    "progress": null,
                    "errorMessage": null
                },
                "noUpdate": true
            })
        );
    }

    #[test]
    fn skipped_or_superseded_check_is_not_reported_as_no_update() {
        for outcome in [UpdateCheckOutcome::Skipped, UpdateCheckOutcome::Superseded] {
            let response = manual_check_response(Ok(outcome), idle_snapshot());
            assert_eq!(serde_json::to_value(response).unwrap()["noUpdate"], false);
        }
    }
}

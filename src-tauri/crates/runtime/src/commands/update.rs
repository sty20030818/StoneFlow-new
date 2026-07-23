//! 应用更新相关 Tauri IPC 命令。

use tauri::{ipc::Channel, State};

use crate::app::error::AppError;
use crate::update::events::UpdatePhasePayload;
use crate::update::RuntimeUpdateService;
use crate::update_schedule::UpdateScheduleWake;
use stoneflow_application::update::{DownloadOutcome, UpdateInfo, UpdateSessionSnapshot};
use stoneflow_domain::{UpdateChannel, UpdateCheckMode, UpdateSettings};

#[tauri::command]
pub async fn check_update(
    manual: bool,
    service: State<'_, RuntimeUpdateService>,
) -> Result<Option<UpdateInfo>, AppError> {
    let info = service.check_update(manual).await?;
    Ok(info)
}

/// 下载并**暂存**安装包（不安装）；通过 Channel 推送 phase 事件。
///
/// 真正安装在 [`restart_and_install`]：用户确认后才 install（Windows 会退出进程）。
#[tauri::command]
pub async fn download_and_install(
    on_event: Channel<UpdatePhasePayload>,
    service: State<'_, RuntimeUpdateService>,
) -> Result<(), AppError> {
    let version = service.pending_version().unwrap_or_default();

    let _ = on_event.send(UpdatePhasePayload {
        phase: "downloading",
        version: Some(version.clone()),
        body: None,
        pub_date: None,
        downloaded: Some(0),
        total: None,
        message: None,
    });

    let on_event_clone = on_event.clone();
    let version_for_progress = version.clone();
    let result = service
        .download_and_install(move |downloaded, total| {
            let _ = on_event_clone.send(UpdatePhasePayload {
                phase: "downloading",
                version: Some(version_for_progress.clone()),
                body: None,
                pub_date: None,
                downloaded: Some(downloaded),
                total,
                message: None,
            });
        })
        .await;

    match result {
        Ok(DownloadOutcome::Completed { version }) => {
            let _ = on_event.send(UpdatePhasePayload {
                phase: "ready",
                version: Some(version),
                body: None,
                pub_date: None,
                downloaded: None,
                total: None,
                message: None,
            });
            Ok(())
        }
        Ok(DownloadOutcome::Cancelled) => Ok(()),
        Err(e) => {
            let _ = on_event.send(UpdatePhasePayload {
                phase: "error",
                version: None,
                body: None,
                pub_date: None,
                downloaded: None,
                total: None,
                message: Some(e.to_string()),
            });
            Err(AppError::from(e))
        }
    }
}

/// 安装已暂存的更新并重启（用户点击「立即重启」）。
#[tauri::command]
pub async fn restart_and_install(service: State<'_, RuntimeUpdateService>) -> Result<(), AppError> {
    service.apply_and_restart().await?;
    Ok(())
}

#[tauri::command]
pub async fn skip_version(
    version: String,
    service: State<'_, RuntimeUpdateService>,
) -> Result<(), AppError> {
    service.skip_version(version).await?;
    Ok(())
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
    service: State<'_, RuntimeUpdateService>,
) -> Result<(), AppError> {
    service.set_channel(channel).await?;
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
    let settings = service.get_settings().await?;
    Ok(settings)
}

#[tauri::command]
pub async fn get_update_session(
    service: State<'_, RuntimeUpdateService>,
) -> Result<UpdateSessionSnapshot, AppError> {
    Ok(service.session_snapshot())
}

#[tauri::command]
pub async fn cancel_update_download(
    service: State<'_, RuntimeUpdateService>,
) -> Result<(), AppError> {
    service.cancel_download();
    Ok(())
}

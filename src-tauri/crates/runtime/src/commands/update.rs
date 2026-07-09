//! 应用更新相关 Tauri IPC 命令。

use serde::Serialize;
use tauri::{ipc::Channel, AppHandle, State};

use crate::app::error::AppError;
use crate::services::RuntimeUpdateService;
use stoneflow_domain::{UpdateChannel, UpdateCheckMode, UpdateSettings, UpdateStatus};
use stoneflow_usecase::update::{DownloadOutcome, UpdateInfo, UpdateSessionSnapshot};

/// 推送到前端的更新事件。
#[derive(Clone, Serialize)]
#[serde(tag = "event", content = "data", rename_all = "camelCase")]
pub enum UpdateEvent {
    /// 状态变更。
    StatusChanged { status: UpdateStatus },
}

#[tauri::command]
pub async fn check_update(
    manual: bool,
    service: State<'_, RuntimeUpdateService>,
) -> Result<Option<UpdateInfo>, AppError> {
    let info = service.check_update(manual).await?;
    Ok(info)
}

#[tauri::command]
pub async fn download_and_install(
    on_event: Channel<UpdateEvent>,
    service: State<'_, RuntimeUpdateService>,
) -> Result<(), AppError> {
    // 先检查更新，获取版本号
    let update_info = service.check_update(true).await?;
    let version = update_info
        .as_ref()
        .map(|i| i.version.clone())
        .unwrap_or_default();

    // 通知前端进入下载中状态
    let _ = on_event.send(UpdateEvent::StatusChanged {
        status: UpdateStatus::Downloading {
            downloaded: 0,
            total: None,
        },
    });

    let on_event_clone = on_event.clone();
    let result = service
        .download_and_install(move |downloaded, total| {
            let _ = on_event_clone.send(UpdateEvent::StatusChanged {
                status: UpdateStatus::Downloading { downloaded, total },
            });
        })
        .await;

    match result {
        Ok(DownloadOutcome::Completed) => {
            let _ = on_event.send(UpdateEvent::StatusChanged {
                status: UpdateStatus::Downloaded { version },
            });
            Ok(())
        }
        Ok(DownloadOutcome::Cancelled) => {
            // 前端已 abandon UI；不推送 ready，避免误提示重启
            Ok(())
        }
        Err(e) => {
            let _ = on_event.send(UpdateEvent::StatusChanged {
                status: UpdateStatus::Error {
                    message: e.to_string(),
                },
            });
            Err(AppError::from(e))
        }
    }
}

#[tauri::command]
pub async fn restart_and_install(app: AppHandle) -> Result<(), AppError> {
    app.restart();
    #[allow(unreachable_code)]
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
) -> Result<(), AppError> {
    service.set_check_mode(mode).await?;
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
) -> Result<(), AppError> {
    service.set_check_interval_secs(interval_secs).await?;
    Ok(())
}

#[tauri::command]
pub async fn get_update_settings(
    service: State<'_, RuntimeUpdateService>,
) -> Result<UpdateSettings, AppError> {
    let settings = service.get_settings().await?;
    Ok(settings)
}

/// 读取进程内更新会话快照，供前端挂载时 hydrate。
#[tauri::command]
pub async fn get_update_session(
    service: State<'_, RuntimeUpdateService>,
) -> Result<UpdateSessionSnapshot, AppError> {
    Ok(service.session_snapshot())
}

/// 取消进行中的下载（abort 下载 task，断开 HTTP 流）。
#[tauri::command]
pub async fn cancel_update_download(
    service: State<'_, RuntimeUpdateService>,
) -> Result<(), AppError> {
    service.cancel_download();
    Ok(())
}

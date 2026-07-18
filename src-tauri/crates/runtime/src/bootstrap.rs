//! Tauri setup：状态注册、窗口初始化与 Launcher 基座。

use std::future::Future;

use tauri::Manager;

use crate::app::state::{ActiveScopeState, CommandOpenState};
use crate::services::update_events::{
    emit_available, emit_downloading, emit_error, emit_ready,
};
use crate::services::{build_update_service, RuntimeUpdateService};
use stoneflow_usecase::{DownloadOutcome, UpdateCheckKind};
use crate::sync::{self, SyncRuntimeState};
use stoneflow_domain::{
    normalize_check_interval_secs, UpdateCheckMode, AUTO_CHECK_INTERVAL_SECS,
    STARTUP_CHECK_DELAY_SECS,
};
use stoneflow_storage::database::bootstrap_database;
use stoneflow_storage::database::DatabaseRuntimeState;

use crate::exit_coordinator;
use crate::shortcuts;
use crate::tray;
use crate::update_schedule::UpdateScheduleWake;
use crate::window::main::build_main_window;
use crate::window::launcher::frontend::LauncherFrontendState;
use crate::window::LauncherWindowRuntimeState;

pub fn setup_app(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    app.handle().plugin(
        tauri_plugin_log::Builder::default()
            .level(if cfg!(debug_assertions) {
                log::LevelFilter::Info
            } else {
                log::LevelFilter::Warn
            })
            .build(),
    )?;

    let active_scope_state = ActiveScopeState::default();
    let command_open_state = CommandOpenState::default();
    let quick_frontend_state = LauncherFrontendState::default();
    let launcher_runtime_state = LauncherWindowRuntimeState::default();

    app.manage(active_scope_state);
    app.manage(command_open_state);
    app.manage(quick_frontend_state);
    app.manage(launcher_runtime_state);

    let database_state = tauri::async_runtime::block_on(async {
        let app_data_dir = app
            .path()
            .app_data_dir()
            .map_err(|error| error.to_string())?;
        bootstrap_database(&app_data_dir)
            .await
            .map_err(|error| error.to_string())
    })?;
    app.manage(database_state);

    let sync_state = SyncRuntimeState::default();
    app.manage(sync_state);

    build_main_window(app)?;

    shortcuts::register_global_shortcut(app.handle());

    app.manage(exit_coordinator::ExitCoordinator::default());
    tray::setup_tray(app)?;

    // 构建并注册更新服务
    let update_service = build_update_service(&app.handle());
    app.manage(update_service);

    let update_wake = UpdateScheduleWake::new();
    app.manage(update_wake.clone());

    schedule_post_startup_jobs(app.handle().clone());
    schedule_update_checker(app.handle().clone(), update_wake);
    Ok(())
}

fn schedule_post_startup_jobs(app_handle: tauri::AppHandle) {
    spawn_detached_job(move || async move {
        let Some(database) = app_handle
            .try_state::<DatabaseRuntimeState>()
            .map(|state| state.inner().clone())
        else {
            log::warn!("runtime: startup async init missing database state");
            return;
        };
        let Some(sync_state) = app_handle
            .try_state::<SyncRuntimeState>()
            .map(|state| state.inner().clone())
        else {
            log::warn!("runtime: startup async init missing sync state");
            return;
        };

        if let Err(error) = sync::initialize_state(&sync_state, &database).await {
            log::warn!("runtime: startup async sync init failed: {error}");
            return;
        }

        sync::start_scheduler(app_handle.clone());
        sync::trigger_startup_sync(&app_handle);
    });
}

fn spawn_detached_job<F, Fut>(job: F)
where
    F: FnOnce() -> Fut + Send + 'static,
    Fut: Future<Output = ()> + Send + 'static,
{
    tauri::async_runtime::spawn(async move {
        job().await;
    });
}

/// 调度自动更新检查：启动延迟后首次检查，之后按用户配置的间隔循环。
/// 间隔/模式变更时 `UpdateScheduleWake` 会打断 sleep，使新间隔立即生效。
fn schedule_update_checker(app_handle: tauri::AppHandle, wake: UpdateScheduleWake) {
    use std::time::Duration;

    let notify = wake.clone_notify();

    spawn_detached_job(move || async move {
        // 启动延迟，避免影响应用启动速度
        tokio::time::sleep(Duration::from_secs(STARTUP_CHECK_DELAY_SECS)).await;

        // 首次为启动检查（绕过间隔节流）；之后按配置间隔循环
        let mut is_startup = true;

        loop {
            let Some(service) = app_handle.try_state::<RuntimeUpdateService>() else {
                break;
            };

            let kind = if is_startup {
                UpdateCheckKind::Startup
            } else {
                UpdateCheckKind::Scheduled
            };
            is_startup = false;

            match service.check_update_with(kind).await {
                Ok(Some(info)) => {
                    let settings = match service.get_settings().await {
                        Ok(s) => s,
                        Err(_) => {
                            sleep_or_wake(&notify, AUTO_CHECK_INTERVAL_SECS as u64).await;
                            continue;
                        }
                    };

                    match settings.check_mode {
                        UpdateCheckMode::Manual => {}
                        UpdateCheckMode::NotifyOnly => {
                            log::info!(
                                target: "updater",
                                "自动检查发现更新 v{}（仅提醒，等待用户确认）",
                                info.version
                            );
                            emit_available(&app_handle, &info);
                        }
                        UpdateCheckMode::AutoDownload => {
                            log::info!(
                                target: "updater",
                                "自动检查发现更新 v{}，开始静默下载",
                                info.version
                            );

                            let app = app_handle.clone();
                            let version = info.version.clone();
                            tauri::async_runtime::spawn(async move {
                                let Some(download_service) =
                                    app.try_state::<RuntimeUpdateService>()
                                else {
                                    return;
                                };

                                let app_for_progress = app.clone();
                                let version_for_progress = version.clone();
                                let app_for_done = app.clone();
                                let app_for_error = app.clone();
                                let app_check = app.clone();
                                let result = download_service
                                    .download_and_install(move |downloaded, total| {
                                        let Some(svc) =
                                            app_check.try_state::<RuntimeUpdateService>()
                                        else {
                                            return;
                                        };
                                        if !svc.should_emit_progress() {
                                            return;
                                        }
                                        emit_downloading(
                                            &app_for_progress,
                                            &version_for_progress,
                                            downloaded,
                                            total,
                                        );
                                    })
                                    .await;

                                match result {
                                    Ok(DownloadOutcome::Completed { version }) => {
                                        log::info!(
                                            target: "updater",
                                            "静默下载完成 v{version}，等待用户重启"
                                        );
                                        emit_ready(&app_for_done, &version);
                                    }
                                    Ok(DownloadOutcome::Cancelled) => {
                                        log::info!(
                                            target: "updater",
                                            "静默下载已取消"
                                        );
                                    }
                                    Err(e) => {
                                        log::warn!(
                                            target: "updater",
                                            "静默下载失败: {e}"
                                        );
                                        emit_error(&app_for_error, e.to_string());
                                    }
                                }
                            });
                        }
                    }
                }
                Ok(None) => {}
                Err(e) => {
                    log::warn!("runtime: auto check update failed: {e}");
                }
            }

            let sleep_secs = match service.get_settings().await {
                Ok(s) => normalize_check_interval_secs(s.check_interval_secs) as u64,
                Err(_) => AUTO_CHECK_INTERVAL_SECS as u64,
            };
            // 被 wake 打断时不立刻再 check，只按新间隔重新计时
            sleep_or_wake(&notify, sleep_secs).await;
        }
    });
}

async fn sleep_or_wake(notify: &std::sync::Arc<tokio::sync::Notify>, secs: u64) {
    use std::time::Duration;
    tokio::select! {
        _ = tokio::time::sleep(Duration::from_secs(secs)) => {}
        _ = notify.notified() => {
            log::info!(target: "updater", "更新检查调度被设置变更唤醒，将按新间隔重新计时");
        }
    }
}

#[cfg(test)]
mod tests {
    use super::spawn_detached_job;
    use std::sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    };
    use std::time::Duration;

    #[tokio::test(flavor = "multi_thread")]
    async fn spawn_detached_job_returns_before_task_finishes() {
        let finished = Arc::new(AtomicBool::new(false));
        let finished_for_task = Arc::clone(&finished);

        spawn_detached_job(move || async move {
            tokio::time::sleep(Duration::from_millis(50)).await;
            finished_for_task.store(true, Ordering::SeqCst);
        });

        assert!(!finished.load(Ordering::SeqCst));
        tokio::time::sleep(Duration::from_millis(10)).await;
        assert!(!finished.load(Ordering::SeqCst));
    }
}

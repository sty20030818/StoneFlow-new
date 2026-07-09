//! Tauri setup：状态注册、窗口初始化与 Quick Create 基座。

use std::future::Future;

use tauri::Manager;

use crate::app::state::{ActiveScopeState, CommandOpenState};
use crate::services::update_events::{
    emit_available, emit_downloading, emit_error, emit_ready,
};
use crate::services::{build_update_service, RuntimeUpdateService};
use stoneflow_usecase::DownloadOutcome;
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
use crate::window::main::build_main_window;
use crate::window::quick_create::frontend::QuickCreateFrontendState;
use crate::window::QuickPopupRuntimeState;

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
    let quick_frontend_state = QuickCreateFrontendState::default();
    let quick_runtime_state = QuickPopupRuntimeState::default();

    app.manage(active_scope_state);
    app.manage(command_open_state);
    app.manage(quick_frontend_state);
    app.manage(quick_runtime_state);

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

    schedule_post_startup_jobs(app.handle().clone());
    schedule_update_checker(app.handle().clone());
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
fn schedule_update_checker(app_handle: tauri::AppHandle) {
    use std::time::Duration;

    spawn_detached_job(move || async move {
        // 启动延迟，避免影响应用启动速度
        tokio::time::sleep(Duration::from_secs(STARTUP_CHECK_DELAY_SECS)).await;

        loop {
            let Some(service) = app_handle.try_state::<RuntimeUpdateService>() else {
                break;
            };

            let sleep_secs = match service.get_settings().await {
                Ok(s) => normalize_check_interval_secs(s.check_interval_secs) as u64,
                Err(_) => AUTO_CHECK_INTERVAL_SECS as u64,
            };

            match service.check_update(false).await {
                Ok(Some(info)) => {
                    let settings = match service.get_settings().await {
                        Ok(s) => s,
                        Err(_) => {
                            tokio::time::sleep(Duration::from_secs(sleep_secs)).await;
                            continue;
                        }
                    };

                    match settings.check_mode {
                        // check_update(false) 在 Manual 下已提前返回 None；此处防御性忽略。
                        UpdateCheckMode::Manual => {}
                        // 仅提醒：只通知前端弹窗，由用户决定是否下载。
                        UpdateCheckMode::NotifyOnly => {
                            log::info!(
                                target: "updater",
                                "自动检查发现更新 v{}（仅提醒，等待用户确认）",
                                info.version
                            );
                            emit_available(&app_handle, &info);
                        }
                        // 自动下载：静默后台下载，不发 available 开窗路径。
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
                                let version_for_done = version.clone();
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
                                    Ok(DownloadOutcome::Completed) => {
                                        log::info!(
                                            target: "updater",
                                            "静默下载完成 v{version_for_done}，等待用户重启"
                                        );
                                        emit_ready(&app_for_done, &version_for_done);
                                    }
                                    Ok(DownloadOutcome::Cancelled) => {
                                        log::info!(
                                            target: "updater",
                                            "静默下载已取消 v{version_for_done}"
                                        );
                                    }
                                    Err(e) => {
                                        log::warn!(
                                            target: "updater",
                                            "静默下载失败 v{version}: {e}"
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

            tokio::time::sleep(Duration::from_secs(sleep_secs)).await;
        }
    });
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

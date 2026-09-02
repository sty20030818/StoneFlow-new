//! Tauri setup：状态注册、窗口初始化与 Launcher 基座。

use std::future::Future;

use tauri::Manager;

use crate::app::state::{ActiveScopeState, AppState, CommandOpenState};
use crate::composition::build_app_state;
use crate::sync;
use crate::update::events::emit_current_session;
use crate::update::{build_update_service, RuntimeUpdateService};
use stoneflow_application::{DownloadOutcome, UpdateCheckKind, UpdateCheckOutcome};
use stoneflow_domain::{
    normalize_check_interval_secs, UpdateCheckMode, AUTO_CHECK_INTERVAL_SECS,
    STARTUP_CHECK_DELAY_SECS,
};
use stoneflow_storage::database::bootstrap_database;

use crate::exit_coordinator;
use crate::shortcuts;
use crate::tray;
use crate::update_schedule::UpdateScheduleWake;
use crate::window::launcher::warmup::LauncherWarmupState;
use crate::window::main::build_main_window;
use crate::window::LauncherWindowRuntimeState;

const TASK_BOARD_BENCHMARK_IDENTIFIER: &str = "com.stonefish.stoneflow.task-board-benchmark";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum SetupMode {
    Production,
    TaskBoardBenchmark,
}

fn resolve_setup_mode(
    task_board_benchmark_feature: bool,
    identifier: &str,
) -> Result<SetupMode, &'static str> {
    match (
        task_board_benchmark_feature,
        identifier == TASK_BOARD_BENCHMARK_IDENTIFIER,
    ) {
        (false, false) => Ok(SetupMode::Production),
        (true, true) => Ok(SetupMode::TaskBoardBenchmark),
        (true, false) => Err("task-board-benchmark feature 必须配套 benchmark Tauri 配置"),
        (false, true) => Err("benchmark Tauri 配置必须配套 task-board-benchmark feature"),
    }
}

pub fn setup_app(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let setup_mode = resolve_setup_mode(
        cfg!(feature = "task-board-benchmark"),
        &app.config().identifier,
    )
    .map_err(|message| std::io::Error::new(std::io::ErrorKind::InvalidInput, message))?;

    match setup_mode {
        SetupMode::Production => setup_production_app(app),
        SetupMode::TaskBoardBenchmark => setup_task_board_benchmark(app),
    }
}

fn setup_task_board_benchmark(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    build_main_window(app)?;
    Ok(())
}

fn setup_production_app(app: &mut tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    app.handle().plugin(
        tauri_plugin_log::Builder::default()
            .level(if cfg!(debug_assertions) {
                log::LevelFilter::Info
            } else {
                log::LevelFilter::Warn
            })
            // sqlx / 驱动的英文 NOTICE（如 relation already exists）降到 Warn 以下，避免刷屏。
            .level_for("sqlx", log::LevelFilter::Warn)
            .level_for("sqlx_postgres", log::LevelFilter::Warn)
            .level_for("sqlx_core", log::LevelFilter::Warn)
            .level_for("sea_orm_migration", log::LevelFilter::Warn)
            // 本地滚动：单文件 20MB；保留约 14 份归档（约 14 天量级，视写入量而定）。
            .max_file_size(20 * 1024 * 1024)
            .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepSome(14))
            .build(),
    )?;

    let active_scope_state = ActiveScopeState::default();
    let command_open_state = CommandOpenState::default();
    let launcher_warmup_state = LauncherWarmupState::default();
    let launcher_runtime_state = LauncherWindowRuntimeState::default();

    app.manage(active_scope_state);
    app.manage(command_open_state);
    app.manage(launcher_warmup_state);
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

    // 唯一业务 composition root：数据库与同步句柄只经 AppState 访问。
    let app_state = build_app_state(database_state);
    app.manage(app_state);

    // renderer 启动前完成更新持久化边界的构造与注册。
    let update_service = build_update_service(app.handle())?;
    app.manage(update_service);

    build_main_window(app)?;

    shortcuts::register_global_shortcut(app.handle());

    app.manage(exit_coordinator::ExitCoordinator::default());
    tray::setup_tray(app)?;

    let update_wake = UpdateScheduleWake::new();
    app.manage(update_wake.clone());

    schedule_post_startup_jobs(app.handle().clone());
    schedule_update_checker(app.handle().clone(), update_wake);
    Ok(())
}

fn schedule_post_startup_jobs(app_handle: tauri::AppHandle) {
    spawn_detached_job(move || async move {
        let Some(app_state) = app_handle
            .try_state::<AppState>()
            .map(|state| state.inner().clone())
        else {
            log::warn!("runtime: startup async init missing AppState");
            return;
        };

        if let Err(error) = sync::initialize_state(&app_state.sync, &app_state.database).await {
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

        // 循环体含 continue/复杂分支，保持 loop + break 更清晰。
        #[expect(clippy::while_let_loop)]
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

            let check_result = service.check_update_with(kind).await;
            emit_current_session(&app_handle);

            match check_result {
                Ok(UpdateCheckOutcome::Found(info)) => {
                    let checked_update = service.session_snapshot().update;
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
                        }
                        UpdateCheckMode::AutoDownload => {
                            log::info!(
                                target: "updater",
                                "自动检查发现更新 v{}，开始静默下载",
                                info.version
                            );
                            if let Some(update) = checked_update {
                                let app = app_handle.clone();
                                tauri::async_runtime::spawn(async move {
                                    let Some(download_service) =
                                        app.try_state::<RuntimeUpdateService>()
                                    else {
                                        return;
                                    };

                                    let progress_app = app.clone();
                                    let result = download_service
                                        .download_update(
                                            &update.version,
                                            update.channel,
                                            move |_, _| emit_current_session(&progress_app),
                                        )
                                        .await;
                                    emit_current_session(&app);

                                    match result {
                                        Ok(DownloadOutcome::Completed { version }) => {
                                            log::info!(
                                                target: "updater",
                                                "静默下载完成 v{version}，等待用户重启"
                                            );
                                        }
                                        Ok(DownloadOutcome::InProgress) => {
                                            log::info!(target: "updater", "静默下载已在进行");
                                        }
                                        Ok(DownloadOutcome::Cancelled) => {
                                            log::info!(target: "updater", "静默下载已取消");
                                        }
                                        Err(e) => {
                                            log::warn!(target: "updater", "静默下载失败: {e}");
                                        }
                                    }
                                });
                            }
                        }
                    }
                }
                Ok(
                    UpdateCheckOutcome::NoUpdate
                    | UpdateCheckOutcome::Skipped
                    | UpdateCheckOutcome::Superseded,
                ) => {}
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
    use super::{
        resolve_setup_mode, spawn_detached_job, SetupMode, TASK_BOARD_BENCHMARK_IDENTIFIER,
    };
    use std::sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    };
    use std::time::Duration;

    #[test]
    fn task_board_benchmark_requires_matching_feature_and_identifier() {
        assert_eq!(
            resolve_setup_mode(false, "com.stonefish.stoneflow").unwrap(),
            SetupMode::Production
        );
        assert_eq!(
            resolve_setup_mode(true, TASK_BOARD_BENCHMARK_IDENTIFIER).unwrap(),
            SetupMode::TaskBoardBenchmark
        );
        assert!(resolve_setup_mode(true, "com.stonefish.stoneflow").is_err());
        assert!(resolve_setup_mode(false, TASK_BOARD_BENCHMARK_IDENTIFIER).is_err());
    }

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

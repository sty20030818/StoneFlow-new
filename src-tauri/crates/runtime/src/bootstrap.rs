//! Tauri setup：状态注册、窗口初始化与 Quick Create 基座。

use std::future::Future;

use tauri::Manager;

use crate::app::state::{ActiveScopeState, CommandOpenState};
use crate::sync::{self, SyncRuntimeState};
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
    schedule_post_startup_jobs(app.handle().clone());
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

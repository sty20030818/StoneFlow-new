//! Tauri setup：状态注册、窗口初始化与 Quick Create 基座。

use tauri::Manager;

use crate::app::state::{ActiveScopeState, CommandOpenState};
use crate::sync::{self, SyncRuntimeState};
use stoneflow_storage::database::bootstrap_database;

use crate::exit_coordinator;
use crate::shortcuts;
use crate::tray;
use crate::window::{
    main::build_main_window,
    quick_create::{
        callbacks, frontend::QuickCreateFrontendState, runtime::QuickPopupRuntimeState,
    },
};

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
    tauri::async_runtime::block_on(async {
        let database = app
            .handle()
            .state::<stoneflow_storage::database::DatabaseRuntimeState>();
        sync::initialize_state(&sync_state, database.inner())
            .await
            .map_err(|error| error.to_string())
    })?;
    app.manage(sync_state);

    init_quick_create_panel(app.handle());

    build_main_window(app)?;

    shortcuts::register_global_shortcut(app.handle());

    app.manage(exit_coordinator::ExitCoordinator::default());
    tray::setup_tray(app)?;
    sync::trigger_startup_pull(app.handle());
    Ok(())
}

fn init_quick_create_panel(app_handle: &tauri::AppHandle) {
    let callbacks = callbacks::runtime_quick_window_callbacks();

    #[cfg(target_os = "macos")]
    stoneflow_platform::macos::panel::init_quick_create_panel(app_handle, callbacks);

    #[cfg(target_os = "windows")]
    stoneflow_platform::windows::panel::init_quick_create_panel(app_handle, callbacks);

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let _ = (app_handle, callbacks);
        log::warn!("runtime: 当前平台尚未实现 Quick Create 浮窗");
    }
}

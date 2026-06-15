//! Tauri setup：状态注册、窗口初始化与 helper / 单 Binary 分支。

use tauri::Manager;

use desktop_app::app::state::{ActiveScopeState, CommandHelperState};
use stoneflow_storage::database::bootstrap_database;

use crate::exit_coordinator;
use crate::helper_runtime;
use crate::supervisor;
use crate::tray;
use crate::windows::{
    main::build_main_window,
    quick_callbacks,
    quick_frontend::QuickCreateFrontendState,
    quick_runtime::QuickPopupRuntimeState,
};

#[cfg(feature = "single-binary-quick")]
use crate::shortcuts;

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
    let helper_state = CommandHelperState::default();
    let quick_frontend_state = QuickCreateFrontendState::default();
    let quick_runtime_state = QuickPopupRuntimeState::default();

    app.manage(active_scope_state.clone());
    app.manage(helper_state.clone());
    app.manage(quick_frontend_state);
    app.manage(quick_runtime_state);

    let database_state = tauri::async_runtime::block_on(async {
        let app_data_dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
        bootstrap_database(&app_data_dir)
            .await
            .map_err(|error| error.to_string())
    })?;
    app.manage(database_state.clone());

    init_quick_create_panel(app.handle());

    build_main_window(app)?;

    #[cfg(feature = "single-binary-quick")]
    {
        shortcuts::register_global_shortcut(app.handle());
    }

    #[cfg(not(feature = "single-binary-quick"))]
    {
        let supervisor_handle =
            supervisor::spawn_supervisor(app.handle().clone(), helper_state.clone());
        tauri::async_runtime::block_on(supervisor_handle.start())?;

        tauri::async_runtime::block_on(helper_runtime::start_ipc_server(
            app.handle().clone(),
            database_state,
            active_scope_state,
            helper_state.clone(),
            supervisor_handle.clone(),
        ))?;

        app.manage(supervisor_handle);
    }

    app.manage(exit_coordinator::ExitCoordinator::default());
    tray::setup_tray(app)?;
    Ok(())
}

fn init_quick_create_panel(app_handle: &tauri::AppHandle) {
    let callbacks = quick_callbacks::runtime_quick_window_callbacks();

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

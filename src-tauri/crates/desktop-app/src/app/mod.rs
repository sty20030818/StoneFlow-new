//! Tauri 宿主层：负责窗口、插件、命令注册与主运行时编排。

#[cfg(target_os = "macos")]
use tauri::{LogicalPosition, TitleBarStyle};
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

use crate::app::state::{ActiveScopeState, CommandHelperState};
use crate::infrastructure::database::bootstrap_database;

pub mod commands;
pub mod error;
pub mod helper_runtime;
pub mod state;
pub mod supervisor;

pub(crate) const MAIN_WINDOW_LABEL: &str = "main";
const MAIN_WINDOW_WIDTH: f64 = 1360.0;
const MAIN_WINDOW_HEIGHT: f64 = 900.0;
const MAIN_WINDOW_MIN_WIDTH: f64 = 500.0;
const MAIN_WINDOW_MIN_HEIGHT: f64 = 520.0;

fn build_main_window(app: &tauri::App) -> tauri::Result<()> {
    if app.get_webview_window(MAIN_WINDOW_LABEL).is_some() {
        return Ok(());
    }

    let window_builder = WebviewWindowBuilder::new(app, MAIN_WINDOW_LABEL, WebviewUrl::default())
        .title("StoneFlow")
        .inner_size(MAIN_WINDOW_WIDTH, MAIN_WINDOW_HEIGHT)
        .min_inner_size(MAIN_WINDOW_MIN_WIDTH, MAIN_WINDOW_MIN_HEIGHT)
        .resizable(true)
        .fullscreen(false)
        .visible(true);

    #[cfg(target_os = "macos")]
    let window_builder = window_builder
        .decorations(true)
        .title_bar_style(TitleBarStyle::Overlay)
        .hidden_title(true)
        .traffic_light_position(LogicalPosition::new(14.0, 25.0));

    #[cfg(not(target_os = "macos"))]
    let window_builder = window_builder.decorations(false);

    let window = window_builder.build()?;
    if let Err(error) = window.center() {
        log::warn!("主窗口启动时居中失败: {error}");
    }
    window.show()?;
    window.set_focus()?;
    Ok(())
}

/// 组装主应用 Builder。
pub fn builder() -> tauri::Builder<tauri::Wry> {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
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
            app.manage(active_scope_state.clone());
            app.manage(helper_state.clone());
            let database_state = tauri::async_runtime::block_on(async {
                let app_data_dir = app
                    .path()
                    .app_data_dir()
                    .map_err(|error| error.to_string())?;
                bootstrap_database(&app_data_dir)
                    .await
                    .map_err(|error| error.to_string())
            })
            .map_err(anyhow::Error::msg)?;
            app.manage(database_state.clone());

            build_main_window(app)?;

            // 启动 IPC server
            let ipc_handle = tauri::async_runtime::block_on(helper_runtime::start_ipc_server(
                app.handle().clone(),
                database_state,
                active_scope_state,
                helper_state.clone(),
            ))?;

            // 启动 supervisor
            let supervisor = supervisor::HelperSupervisor::new(
                app.handle().clone(),
                helper_state.clone(),
                ipc_handle.handshake_notify,
            );
            let supervisor_handle = supervisor.handle();
            app.manage(supervisor_handle);
            tauri::async_runtime::spawn(supervisor.run());
            Ok(())
        })
        .invoke_handler(commands::handler())
}

/// 启动主应用。
pub fn run(context: tauri::Context<tauri::Wry>) {
    let app = builder()
        .build(context)
        .expect("failed to build StoneFlow Tauri application");
    app.run(|app_handle, event| {
        if matches!(event, tauri::RunEvent::ExitRequested { .. } | tauri::RunEvent::Exit) {
            if let Some(handle) = app_handle.try_state::<supervisor::SupervisorHandle>() {
                handle.request_shutdown();
            }
        }
    });
}

//! Tauri 宿主层：负责窗口、插件、命令注册与主运行时编排。

use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent,
};
#[cfg(target_os = "macos")]
use tauri::{LogicalPosition, TitleBarStyle};

use crate::app::state::{ActiveScopeState, CommandHelperState};
use crate::infrastructure::database::bootstrap_database;

pub mod commands;
pub mod error;
pub mod helper_runtime;
pub mod state;
pub mod supervisor;

pub(crate) const MAIN_WINDOW_LABEL: &str = "main";
const MAIN_TRAY_SHOW_ID: &str = "tray-show-main";
const MAIN_TRAY_QUIT_ID: &str = "tray-quit";
const MAIN_WINDOW_WIDTH: f64 = 1360.0;
const MAIN_WINDOW_HEIGHT: f64 = 980.0;
const MAIN_WINDOW_MIN_WIDTH: f64 = 500.0;
const MAIN_WINDOW_MIN_HEIGHT: f64 = 520.0;

#[derive(Default)]
struct ExitControl {
    allow_exit: AtomicBool,
}

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

fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    let show = MenuItem::with_id(
        app,
        MAIN_TRAY_SHOW_ID,
        "显示/隐藏主窗口",
        true,
        None::<&str>,
    )?;
    let quit = MenuItem::with_id(app, MAIN_TRAY_QUIT_ID, "退出 StoneFlow", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &quit])?;
    TrayIconBuilder::new()
        .icon(
            app.default_window_icon()
                .cloned()
                .expect("missing default app icon"),
        )
        .show_menu_on_left_click(false)
        .menu(&menu)
        .on_menu_event(
            move |app_handle: &tauri::AppHandle<tauri::Wry>, event: tauri::menu::MenuEvent| {
                match event.id.as_ref() {
                    MAIN_TRAY_SHOW_ID => {
                        if let Some(window) = app_handle.get_webview_window(MAIN_WINDOW_LABEL) {
                            toggle_main_window(&window);
                        }
                    }
                    MAIN_TRAY_QUIT_ID => {
                        if let Some(exit_control) = app_handle.try_state::<ExitControl>() {
                            exit_control.allow_exit.store(true, Ordering::SeqCst);
                        }
                        if let Some(handle) = app_handle.try_state::<supervisor::SupervisorHandle>()
                        {
                            handle.request_shutdown();
                            handle.wait_stopped();
                            app_handle.exit(0);
                        } else {
                            app_handle.exit(0);
                        }
                    }
                    _ => {}
                }
            },
        )
        .on_tray_icon_event(
            move |tray: &tauri::tray::TrayIcon<tauri::Wry>, event: tauri::tray::TrayIconEvent| {
                if let tauri::tray::TrayIconEvent::Click {
                    button,
                    button_state,
                    ..
                } = event
                {
                    if button == tauri::tray::MouseButton::Left
                        && button_state == tauri::tray::MouseButtonState::Up
                    {
                        if let Some(window) =
                            tray.app_handle().get_webview_window(MAIN_WINDOW_LABEL)
                        {
                            toggle_main_window(&window);
                        }
                    }
                }
            },
        )
        .build(app)?;

    Ok(())
}

fn toggle_main_window(window: &tauri::WebviewWindow) {
    match window.is_visible() {
        Ok(true) => {
            let _ = window.hide();
        }
        Ok(false) => {
            let _ = window.show();
            let _ = window.unminimize();
            let _ = window.set_focus();
        }
        Err(_) => {
            let _ = window.show();
            let _ = window.unminimize();
            let _ = window.set_focus();
        }
    }
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
            app.manage(ExitControl::default());
            tauri::async_runtime::spawn(supervisor.run());
            setup_tray(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == MAIN_WINDOW_LABEL {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .invoke_handler(commands::handler())
}

/// 启动主应用。
pub fn run(context: tauri::Context<tauri::Wry>) {
    let app = builder()
        .build(context)
        .expect("failed to build StoneFlow Tauri application");
    app.run(|app_handle, event| match event {
        tauri::RunEvent::ExitRequested { ref api, .. } => {
            let should_allow_exit = app_handle
                .try_state::<ExitControl>()
                .map(|state| state.allow_exit.load(Ordering::SeqCst))
                .unwrap_or(false);

            if !should_allow_exit {
                api.prevent_exit();
                if let Some(window) = app_handle.get_webview_window(MAIN_WINDOW_LABEL) {
                    let _ = window.hide();
                }
            }
        }
        tauri::RunEvent::Exit => {
            if let Some(handle) = app_handle.try_state::<supervisor::SupervisorHandle>() {
                handle.request_shutdown();
            }
        }
        _ => {}
    });
}

//! StoneFlow 的 Tauri runtime 外壳：窗口、插件、命令注册与主运行时编排。

use tauri::{Manager, WindowEvent};

pub mod bootstrap;
pub mod command_open;
pub mod commands;
pub mod exit_coordinator;
pub mod quick_services;
pub mod shortcuts;
pub mod tray;
pub mod windows;

pub use windows::main::MAIN_WINDOW_LABEL;

/// 组装主应用 Builder。
pub fn builder() -> tauri::Builder<tauri::Wry> {
    let mut builder = tauri::Builder::default()
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
        .plugin(tauri_plugin_global_shortcut::Builder::new().build());

    #[cfg(target_os = "macos")]
    {
        builder = builder.plugin(tauri_nspanel::init());
    }

    builder
        .setup(|app| bootstrap::setup_app(app))
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

/// 通过 runtime 边界启动 StoneFlow。
pub fn run(context: tauri::Context<tauri::Wry>) {
    let app = builder()
        .build(context)
        .expect("failed to build StoneFlow Tauri application");
    app.run(|app_handle, event| match event {
        tauri::RunEvent::ExitRequested { ref api, .. } => {
            let should_allow_exit = if let Some(exit_coordinator) =
                app_handle.try_state::<exit_coordinator::ExitCoordinator>()
            {
                tauri::async_runtime::block_on(exit_coordinator.should_allow_process_exit())
            } else {
                false
            };

            if should_allow_exit {
                return;
            }

            api.prevent_exit();
            let app_handle = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                tray::request_exit_and_quit(&app_handle).await;
            });
        }
        tauri::RunEvent::Exit => {}
        _ => {}
    });
}

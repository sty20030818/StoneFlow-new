//! StoneFlow 的 Tauri runtime 外壳：窗口、插件、命令注册与主运行时编排。

use tauri::{Manager, WindowEvent};

pub mod app;
pub mod bootstrap;
pub mod command_open;
pub mod commands;
pub mod composition;
pub mod exit_coordinator;
pub mod shortcuts;
pub mod sync;
pub mod tray;
pub mod update;
pub mod update_schedule;
pub mod window;

pub use window::main::MAIN_WINDOW_LABEL;
#[cfg(target_os = "windows")]
use window::main::{persist_windows_main_window_state, WINDOWS_MAIN_WINDOW_STATE};

/// 组装主应用 Builder。
pub fn builder() -> tauri::Builder<tauri::Wry> {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // 热唤起：只恢复可见性，不改几何、不 center。
            if let Some(window) = app.get_webview_window(MAIN_WINDOW_LABEL) {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build());

    // Windows 的官方插件会先恢复位置再恢复物理尺寸，避免跨 DPI 显示器时尺寸换算错误。
    #[cfg(target_os = "windows")]
    let builder = builder.plugin(
        tauri_plugin_window_state::Builder::new()
            .with_state_flags(WINDOWS_MAIN_WINDOW_STATE)
            .with_filename(".main-window-state.json")
            .with_filter(|label| label == MAIN_WINDOW_LABEL)
            .skip_initial_state(MAIN_WINDOW_LABEL)
            .build(),
    );

    #[cfg(target_os = "macos")]
    let builder = builder.plugin(tauri_nspanel::init());

    builder
        .setup(bootstrap::setup_app)
        .on_window_event(|window, event| {
            if window.label() == MAIN_WINDOW_LABEL {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                    // Windows 用户关窗 = hide，不会走 Exit；此处落盘保存窗口状态。
                    #[cfg(target_os = "windows")]
                    persist_windows_main_window_state(window.app_handle());
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
                exit_coordinator::request_exit_and_quit(
                    &app_handle,
                    exit_coordinator::ExitReason::RunEventExitRequested,
                )
                .await;
            });
        }
        tauri::RunEvent::Resumed => {
            sync::trigger_resume_sync(app_handle);
        }
        tauri::RunEvent::Exit => {}
        _ => {}
    });
}

#[cfg(test)]
mod integration_tests;

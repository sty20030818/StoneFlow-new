//! StoneFlow Tauri 应用入口。

#[cfg(target_os = "macos")]
use tauri::LogicalPosition;
#[cfg(target_os = "macos")]
use tauri::TitleBarStyle;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};

use crate::app::command_helper::{handle_main_window_close_requested, CommandHelperState};
use crate::application::create::ActiveSpaceState;
use crate::infrastructure::database::initialize_database;

pub mod command_helper;
pub mod commands;
pub mod error;
pub(crate) mod events;
pub(crate) mod helper_process;

pub(crate) const MAIN_WINDOW_LABEL: &str = "main";

fn build_main_window(app: &tauri::App) -> tauri::Result<()> {
    if app.get_webview_window(MAIN_WINDOW_LABEL).is_some() {
        return Ok(());
    }

    let window_builder = WebviewWindowBuilder::new(app, MAIN_WINDOW_LABEL, WebviewUrl::default())
        .title("StoneFlow")
        .inner_size(1440.0, 920.0)
        .min_inner_size(500.0, 520.0)
        .resizable(true)
        .fullscreen(false);

    #[cfg(target_os = "macos")]
    let window_builder = window_builder
        .decorations(true)
        .title_bar_style(TitleBarStyle::Overlay)
        .hidden_title(true)
        // 自绘 header 高度为 h-12=48px；traffic light 的 y 需略大于「一半高度」才能在视觉上居中（截图上 18 仍偏上）
        .traffic_light_position(LogicalPosition::new(14.0, 25.0));

    #[cfg(not(target_os = "macos"))]
    let window_builder = window_builder.decorations(false);

    window_builder.build()?;
    Ok(())
}

/// 启动 StoneFlow 的 Tauri 宿主。
pub fn builder() -> tauri::Builder<tauri::Wry> {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let helper_state = window.state::<CommandHelperState>();
                match handle_main_window_close_requested(window, &helper_state) {
                    Ok(true) => {
                        api.prevent_close();
                    }
                    Ok(false) => {}
                    Err(error) => {
                        log::warn!("failed to handle main window close request: {error}");
                    }
                }
            }
        })
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let database_state = tauri::async_runtime::block_on(initialize_database(app))
                .map_err(tauri::Error::Anyhow)?;
            app.manage(database_state);
            app.manage(ActiveSpaceState::default());
            app.manage(CommandHelperState::new_initialized());
            app.manage(helper_process::HelperProcessState::default());

            build_main_window(app)?;

            // 启动 IPC Server：监听 Helper 进程的 Quick Capture 请求。
            // 放在 setup 末尾是为了确保 DatabaseState / ActiveSpaceState 已 manage 入容器。
            crate::ipc::start_ipc_server(app.handle());

            // 拉起 Helper 子进程（Accessory App），承载全局快捷键与 Quick Capture。
            // 必须发生在 IPC Server 就绪之后，Helper 启动自检 Ping 才能连通。
            let helper_state = app.state::<helper_process::HelperProcessState>();
            if let Err(error) = helper_process::spawn_helper(helper_state.inner()) {
                log::warn!("Helper 启动失败（Quick Capture 将不可用）: {error:#}");
            }

            Ok(())
        })
        .invoke_handler(commands::handler())
}

/// 以给定 Tauri Context 启动主 App；承担 `RunEvent::Exit` 回收 Helper 子进程。
///
/// `generate_context!()` 宏必须由根 bin crate 调用，因此本函数接受 Context 作为入参，
/// 让主 bin 继续掌握 Context 的生成，同时把 RunEvent 处理下沉到 lib 统一维护。
pub fn run(context: tauri::Context<tauri::Wry>) {
    let app = builder()
        .build(context)
        .expect("failed to build StoneFlow Tauri application");

    app.run(|app_handle, event| {
        if let tauri::RunEvent::Exit = event {
            if let Some(state) = app_handle.try_state::<helper_process::HelperProcessState>() {
                state.shutdown();
            }
        }
    });
}

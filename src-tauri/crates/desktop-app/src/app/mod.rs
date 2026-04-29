//! Tauri 宿主层：负责窗口、插件、命令注册与最小运行时状态。

use tauri::{LogicalPosition, Manager, TitleBarStyle, WebviewUrl, WebviewWindowBuilder};

use crate::app::state::{ActiveSpaceState, CommandHelperState};
use crate::infrastructure::database::bootstrap_database;

pub mod commands;
pub mod error;
pub mod state;

pub(crate) const MAIN_WINDOW_LABEL: &str = "main";

fn build_main_window(app: &tauri::App) -> tauri::Result<()> {
    if app.get_webview_window(MAIN_WINDOW_LABEL).is_some() {
        return Ok(());
    }

    let window_builder = WebviewWindowBuilder::new(app, MAIN_WINDOW_LABEL, WebviewUrl::default())
        .title("StoneFlow")
        .inner_size(1360.0, 900.0)
        .min_inner_size(1080.0, 720.0)
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
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            app.manage(ActiveSpaceState::default());
            app.manage(CommandHelperState::default());
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
            app.manage(database_state);

            build_main_window(app)?;
            Ok(())
        })
        .invoke_handler(commands::handler())
}

/// 启动主应用。
pub fn run(context: tauri::Context<tauri::Wry>) {
    let app = builder()
        .build(context)
        .expect("failed to build StoneFlow Tauri application");
    app.run(|_, _| {});
}

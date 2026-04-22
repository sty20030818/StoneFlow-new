//! StoneFlow Tauri 应用入口。

#[cfg(target_os = "macos")]
use tauri::TitleBarStyle;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};

use crate::app::command_helper::{handle_main_window_close_requested, CommandHelperState};
use crate::application::create::ActiveSpaceState;
use crate::infrastructure::database::initialize_database;

pub mod command_helper;
pub mod commands;
pub mod error;

pub(crate) const MAIN_WINDOW_LABEL: &str = "main";
pub(crate) const QUICK_CAPTURE_WINDOW_LABEL: &str = "quick-capture";

const QUICK_CAPTURE_WINDOW_TITLE: &str = "Quick Capture";
const QUICK_CAPTURE_WINDOW_URL: &str = "index.html#/quick-capture";
const QUICK_CAPTURE_WINDOW_WIDTH: f64 = 660.0;
const QUICK_CAPTURE_WINDOW_HEIGHT: f64 = 196.0;

/// Quick Capture 浮窗的稳定规格。
///
/// 规格集中在 Rust 侧，后续 Helper 或全局快捷键复用时不需要复制窗口参数。
#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) struct QuickCaptureWindowSpec {
    pub(crate) label: &'static str,
    pub(crate) title: &'static str,
    pub(crate) url: &'static str,
    pub(crate) width: f64,
    pub(crate) height: f64,
}

pub(crate) const QUICK_CAPTURE_WINDOW_SPEC: QuickCaptureWindowSpec = QuickCaptureWindowSpec {
    label: QUICK_CAPTURE_WINDOW_LABEL,
    title: QUICK_CAPTURE_WINDOW_TITLE,
    url: QUICK_CAPTURE_WINDOW_URL,
    width: QUICK_CAPTURE_WINDOW_WIDTH,
    height: QUICK_CAPTURE_WINDOW_HEIGHT,
};

fn build_main_window(app: &tauri::App) -> tauri::Result<()> {
    if app.get_webview_window(MAIN_WINDOW_LABEL).is_some() {
        return Ok(());
    }

    let window_builder = WebviewWindowBuilder::new(app, MAIN_WINDOW_LABEL, WebviewUrl::default())
        .title("StoneFlow")
        .inner_size(1440.0, 920.0)
        .min_inner_size(960.0, 720.0)
        .resizable(true)
        .fullscreen(false);

    #[cfg(target_os = "macos")]
    let window_builder = window_builder
        .decorations(true)
        .title_bar_style(TitleBarStyle::Overlay)
        .hidden_title(true);

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

            build_main_window(app)?;
            Ok(())
        })
        .invoke_handler(commands::handler())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn quick_capture_window_spec_is_stable_and_lightweight() {
        assert_eq!(QUICK_CAPTURE_WINDOW_SPEC.label, "quick-capture");
        assert_eq!(QUICK_CAPTURE_WINDOW_SPEC.url, "index.html#/quick-capture");
        assert!(QUICK_CAPTURE_WINDOW_SPEC.width >= 620.0);
        assert!(QUICK_CAPTURE_WINDOW_SPEC.width <= 680.0);
        assert!(QUICK_CAPTURE_WINDOW_SPEC.height >= 172.0);
        assert!(QUICK_CAPTURE_WINDOW_SPEC.height <= 220.0);
    }
}

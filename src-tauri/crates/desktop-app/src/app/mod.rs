//! StoneFlow Tauri 应用入口。

#[cfg(target_os = "macos")]
use tauri::TitleBarStyle;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use crate::app::command_helper::{
    handle_main_window_close_requested, CommandHelperInvokeSource, CommandHelperState,
};
use crate::application::create::ActiveSpaceState;
use crate::infrastructure::database::initialize_database;

/// 系统级全局快捷键：唤起 Quick Capture。
const QUICK_CAPTURE_SHORTCUT: &str = "Option+Space";

pub mod command_helper;
pub mod commands;
pub mod error;

pub(crate) const MAIN_WINDOW_LABEL: &str = "main";
pub(crate) const QUICK_CAPTURE_WINDOW_LABEL: &str = "quick-capture";

const QUICK_CAPTURE_WINDOW_TITLE: &str = "Quick Capture";
const QUICK_CAPTURE_WINDOW_URL: &str = "index.html#/quick-capture";
// section 已无阴影，窗口只需略大于卡片本体（留 ~4px 给 ring + 抗锯齿）。
const QUICK_CAPTURE_WINDOW_WIDTH: f64 = 660.0;
const QUICK_CAPTURE_WINDOW_HEIGHT: f64 = 200.0;

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
    // 先组装基础插件链，再按平台追加 macOS 专用插件。
    let b = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build());

    // macOS：注册 tauri-nspanel 插件，管理 NSPanel 实例的生命周期。
    #[cfg(target_os = "macos")]
    let b = b.plugin(tauri_nspanel::init());

    b.on_window_event(|window, event| {
        match event {
            WindowEvent::CloseRequested { api, .. } => {
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
            // Quick Capture 失焦时隐藏（而非关闭），保留面板实例供 toggle 复用。
            // 前端在窗口重新聚焦时重置输入状态，保证每次呼出都是空白状态。
            WindowEvent::Focused(false) if window.label() == QUICK_CAPTURE_WINDOW_LABEL => {
                log::info!("[QC] Focused(false) 触发 → 隐藏面板");
                if let Err(error) = window.hide() {
                    log::warn!("[QC] 失焦隐藏失败: {error}");
                }
            }
            WindowEvent::Focused(true) if window.label() == QUICK_CAPTURE_WINDOW_LABEL => {
                log::info!("[QC] Focused(true) 触发");
            }
            _ => {}
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

        // macOS：在 setup 主线程上预创建 Quick Capture NSPanel 并配置 collection behavior。
        // 必须在 register_global_shortcut 之前执行，确保快捷键触发时面板已就绪。
        // 原因：set_collection_behavior 等 AppKit 调用必须在主线程执行；
        //       若在快捷键回调（后台线程）中创建，则 CanJoinAllSpaces 等配置不会生效，
        //       导致面板在全屏/多屏场景不可见。
        #[cfg(target_os = "macos")]
        crate::app::command_helper::init_quick_capture_panel(app.handle());

        register_global_shortcut(app);
        Ok(())
    })
    .invoke_handler(commands::handler())
}

/// 注册系统级全局快捷键，失败时降级处理，不阻塞应用启动。
fn register_global_shortcut(app: &tauri::App) {
    let app_handle = app.handle().clone();

    let result = app_handle.global_shortcut().on_shortcut(
        QUICK_CAPTURE_SHORTCUT,
        move |handle, _shortcut, event| {
            // 只在按下时触发，避免 key-up 事件重复唤起。
            if event.state != ShortcutState::Pressed {
                return;
            }

            let helper_state = handle.state::<CommandHelperState>();
            if let Err(error) = crate::app::command_helper::open_quick_capture_from_helper(
                handle,
                helper_state.inner(),
                CommandHelperInvokeSource::GlobalShortcut,
            ) {
                log::warn!("全局快捷键唤起 Quick Capture 失败: {error}");
            }
        },
    );

    match result {
        Ok(()) => log::info!("全局快捷键 {QUICK_CAPTURE_SHORTCUT} 注册成功"),
        Err(error) => log::warn!(
            "全局快捷键 {QUICK_CAPTURE_SHORTCUT} 注册失败（将降级为应用内入口）: {error}"
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn quick_capture_window_spec_is_stable_and_lightweight() {
        assert_eq!(QUICK_CAPTURE_WINDOW_SPEC.label, "quick-capture");
        assert_eq!(QUICK_CAPTURE_WINDOW_SPEC.url, "index.html#/quick-capture");
        // 无阴影方案：窗口仅略大于卡片本体
        assert!(QUICK_CAPTURE_WINDOW_SPEC.width >= 620.0);
        assert!(QUICK_CAPTURE_WINDOW_SPEC.width <= 720.0);
        assert!(QUICK_CAPTURE_WINDOW_SPEC.height >= 180.0);
        assert!(QUICK_CAPTURE_WINDOW_SPEC.height <= 240.0);
    }
}

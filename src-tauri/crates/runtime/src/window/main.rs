//! 主窗口创建与切换。
//!
//! 冷启动几何编排（W0）：
//! 1. `visible(false)` 创建，避免用户看到默认落点；
//! 2. 隐藏态 `center()` 作为无记忆时的回退；
//! 3. `restore_state(SIZE|POSITION|MAXIMIZED)` 覆盖 center（有记忆时）；
//! 4. 再 `show` —— 禁止「可见后再 center」。
//!
//! 可见性由 tray / single-instance / `toggle_main_window` 负责，不改 bounds。
//! `VISIBLE` 故意不入 window-state：关窗 = hide，持久化可见性会搞乱冷启动。
//!
//! 落盘：用户关窗 hide 时写一次；进程 `Exit` 由插件默认再写。
//! 不为开发态 Ctrl+C 单独加防抖写盘。

#[cfg(target_os = "macos")]
use tauri::{LogicalPosition, TitleBarStyle};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_window_state::{AppHandleExt, StateFlags, WindowExt};

pub const MAIN_WINDOW_LABEL: &str = "main";

/// 主窗几何持久化 flags：不含 VISIBLE / FULLSCREEN / DECORATIONS。
pub const MAIN_WINDOW_STATE_FLAGS: StateFlags =
    StateFlags::SIZE.union(StateFlags::POSITION).union(StateFlags::MAXIMIZED);

const MAIN_WINDOW_WIDTH: f64 = 1280.0;
const MAIN_WINDOW_HEIGHT: f64 = 900.0;
const MAIN_WINDOW_MIN_WIDTH: f64 = 500.0;
const MAIN_WINDOW_MIN_HEIGHT: f64 = 520.0;

pub fn build_main_window(app: &tauri::App) -> tauri::Result<()> {
    if app.get_webview_window(MAIN_WINDOW_LABEL).is_some() {
        return Ok(());
    }

    let window_builder = WebviewWindowBuilder::new(app, MAIN_WINDOW_LABEL, WebviewUrl::default())
        .title("StoneFlow")
        .inner_size(MAIN_WINDOW_WIDTH, MAIN_WINDOW_HEIGHT)
        .min_inner_size(MAIN_WINDOW_MIN_WIDTH, MAIN_WINDOW_MIN_HEIGHT)
        .resizable(true)
        .fullscreen(false)
        // 隐藏创建：几何就绪前不对用户可见，避免白闪后跳动。
        .visible(false);

    #[cfg(target_os = "macos")]
    let window_builder = window_builder
        .decorations(true)
        .title_bar_style(TitleBarStyle::Overlay)
        .hidden_title(true)
        .traffic_light_position(LogicalPosition::new(14.0, 25.0));

    #[cfg(not(target_os = "macos"))]
    let window_builder = window_builder.decorations(false);

    let window = window_builder.build()?;

    // 无记忆时的回退：仍在隐藏态居中，用户看不到位移。
    if let Err(error) = window.center() {
        log::warn!("主窗口启动时居中失败: {error}");
    }

    // 有记忆则覆盖 center；插件已 skip_initial_state(main)，由此处唯一 restore。
    if let Err(error) = window.restore_state(MAIN_WINDOW_STATE_FLAGS) {
        log::warn!("主窗口启动时恢复几何失败: {error}");
    }

    window.show()?;
    window.set_focus()?;
    Ok(())
}

pub fn toggle_main_window(window: &tauri::WebviewWindow) {
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

/// 用户关窗 hide 时落盘：hide 不等于 Exit，只靠插件 Exit 会丢几何。
pub fn persist_main_window_geometry(app: &AppHandle) {
    if app.get_webview_window(MAIN_WINDOW_LABEL).is_none() {
        return;
    }
    if let Err(error) = app.save_window_state(MAIN_WINDOW_STATE_FLAGS) {
        log::warn!("主窗口几何落盘失败: {error}");
    }
}

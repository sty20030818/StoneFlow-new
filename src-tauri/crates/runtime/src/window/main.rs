//! 主窗口创建与切换。
//!
//! 冷启动尺寸编排（W0）：
//! 1. `visible(false)` 创建，避免用户看到默认落点；
//! 2. 隐藏态 `center()`，每次启动都使用系统当前屏幕的居中位置；
//! 3. `restore_state(SIZE)` 只恢复用户上次的窗口大小；
//! 4. 再 `show` —— 禁止「可见后再 center」。
//!
//! 首帧壳色（W1）：原生窗 + WebView `background_color` 与 `index.html` / `--sf-neutral-100` 对齐。
//!
//! 可见性由 tray / single-instance / `toggle_main_window` 负责；位置和最大化状态不持久化。
//!
//! 落盘：用户关窗 hide 时写一次；进程 `Exit` 由插件默认再写。
//! 不为开发态 Ctrl+C 单独加防抖写盘。

use tauri::window::Color;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
#[cfg(target_os = "macos")]
use tauri::{LogicalPosition, TitleBarStyle};
use tauri_plugin_window_state::{AppHandleExt, StateFlags, WindowExt};

pub const MAIN_WINDOW_LABEL: &str = "main";

/// 主窗口只持久化尺寸，位置和显示状态始终交给操作系统。
pub const MAIN_WINDOW_SIZE_STATE: StateFlags = StateFlags::SIZE;

/// 与 `--sf-neutral-100` / `index.html` inline 背景同步；改 token 时请三处一起改。
const MAIN_WINDOW_SHELL_BG: Color = Color(0xf3, 0xf3, 0xf4, 0xff);

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
        .visible(false)
        // 窗层 + WebView 底色对齐壳色，show 瞬间不是系统白。
        .background_color(MAIN_WINDOW_SHELL_BG);

    #[cfg(target_os = "macos")]
    let window_builder = window_builder
        .decorations(true)
        .title_bar_style(TitleBarStyle::Overlay)
        .hidden_title(true)
        .traffic_light_position(LogicalPosition::new(14.0, 25.0));

    #[cfg(not(target_os = "macos"))]
    let window_builder = window_builder.decorations(false);

    let window = window_builder.build()?;

    // 每次启动都先居中；尺寸恢复不会覆盖系统选择的位置。
    if let Err(error) = window.center() {
        log::warn!("主窗口启动时居中失败: {error}");
    }

    // 插件已 skip_initial_state(main)，由此处在 show 前唯一恢复尺寸。
    if let Err(error) = window.restore_state(MAIN_WINDOW_SIZE_STATE) {
        log::warn!("主窗口启动时恢复尺寸失败: {error}");
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

/// 用户关窗 hide 时落盘：hide 不等于 Exit，只靠插件 Exit 会丢失最新尺寸。
pub fn persist_main_window_size(app: &AppHandle) {
    if app.get_webview_window(MAIN_WINDOW_LABEL).is_none() {
        return;
    }
    if let Err(error) = app.save_window_state(MAIN_WINDOW_SIZE_STATE) {
        log::warn!("主窗口尺寸落盘失败: {error}");
    }
}

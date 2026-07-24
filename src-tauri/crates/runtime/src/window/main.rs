//! 主窗口创建与切换。
//!
//! 冷启动窗口编排（W0）：
//! 1. `visible(false)` 创建，避免用户看到默认落点；
//! 2. 隐藏态 `center()`，使用系统当前屏幕的居中位置；
//! 3. Windows 再恢复位置和尺寸；macOS / Linux 不持久化窗口状态；
//! 4. 再 `show` —— 禁止「可见后再 center」。
//!
//! 首帧壳色（W1）：原生窗 + WebView `background_color` 与 `index.html` / `--sf-neutral-100` 对齐。
//!
//! Windows 只保存位置和尺寸，不保存最大化或可见状态；关闭时主动落盘。

use tauri::window::Color;
#[cfg(target_os = "windows")]
use tauri::AppHandle;
#[cfg(target_os = "macos")]
use tauri::{LogicalPosition, TitleBarStyle};
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
#[cfg(target_os = "windows")]
use tauri_plugin_window_state::{AppHandleExt, StateFlags, WindowExt};

pub const MAIN_WINDOW_LABEL: &str = "main";

/// Windows 只持久化位置和尺寸；先恢复位置使插件按目标显示器的 DPI 恢复尺寸。
#[cfg(target_os = "windows")]
pub const WINDOWS_MAIN_WINDOW_STATE: StateFlags = StateFlags::SIZE.union(StateFlags::POSITION);

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

    // 所有平台都先居中；Windows 有状态时再覆盖为上次的位置。
    if let Err(error) = window.center() {
        log::warn!("主窗口启动时居中失败: {error}");
    }

    #[cfg(target_os = "windows")]
    if let Err(error) = window.restore_state(WINDOWS_MAIN_WINDOW_STATE) {
        log::warn!("主窗口启动时恢复位置和尺寸失败: {error}");
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

/// Windows 用户关窗 hide 时落盘：hide 不等于 Exit，只靠插件 Exit 会丢失窗口状态。
#[cfg(target_os = "windows")]
pub fn persist_windows_main_window_state(app: &AppHandle) {
    if app.get_webview_window(MAIN_WINDOW_LABEL).is_none() {
        return;
    }
    if let Err(error) = app.save_window_state(WINDOWS_MAIN_WINDOW_STATE) {
        log::warn!("主窗口位置和尺寸落盘失败: {error}");
    }
}

//! Quick Create Windows 浮窗生命周期。
//!
//! Windows 没有 macOS `NSPanel` 等价物；这里使用标准 `WebviewWindow`
//! 承载透明 WebView，阴影由前端 CSS 在安全区内绘制。

use tauri::{
    AppHandle, Emitter, Manager, Monitor, PhysicalPosition, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder, WindowEvent, Wry,
};

use crate::window_spec::{
    QUICK_CREATE_LABEL, QUICK_CREATE_TITLE, QUICK_CREATE_URL, QUICK_CREATE_WINDOW_HEIGHT,
    QUICK_CREATE_WINDOW_WIDTH,
};

/// 在 Tauri `setup()` 阶段预创建 Quick Create 浮窗，默认隐藏等待快捷键唤起。
pub fn init_quick_create_panel(app_handle: &AppHandle<Wry>) {
    if app_handle.get_webview_window(QUICK_CREATE_LABEL).is_some() {
        return;
    }

    let window = match WebviewWindowBuilder::new(
        app_handle,
        QUICK_CREATE_LABEL,
        WebviewUrl::App(QUICK_CREATE_URL.into()),
    )
    .title(QUICK_CREATE_TITLE)
    .inner_size(QUICK_CREATE_WINDOW_WIDTH, QUICK_CREATE_WINDOW_HEIGHT)
    .auto_resize()
    .resizable(false)
    .fullscreen(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .decorations(false)
    .shadow(false)
    .transparent(true)
    .zoom_hotkeys_enabled(false)
    .center()
    .visible(false)
    .build()
    {
        Ok(window) => window,
        Err(error) => {
            log::error!("helper: windows quick create 窗口创建失败: {error}");
            return;
        }
    };

    install_focus_auto_hide(&window);
    if let Err(error) = window.set_shadow(false) {
        log::warn!("helper: 关闭 windows quick create 原生阴影失败: {error}");
    }
    reset_webview_zoom(&window);
    log::info!("helper: windows quick create 浮窗初始化完成 [Tauri WebviewWindow]");
}

/// Toggle 浮窗：可见则隐藏，不可见则先通知前端准备布局。
pub fn toggle_quick_create_panel(app_handle: &AppHandle<Wry>) {
    let Some(window) = app_handle.get_webview_window(QUICK_CREATE_LABEL) else {
        log::error!("helper: Option+Space 触发，但 windows quick create 窗口未初始化");
        return;
    };

    let visible = match window.is_visible() {
        Ok(visible) => visible,
        Err(error) => {
            log::warn!("helper: 读取 windows quick create 可见状态失败: {error}");
            false
        }
    };

    log::info!("helper: Option+Space 触发 → windows window.is_visible()={visible}");

    if visible {
        if let Err(error) = window.hide() {
            log::warn!("helper: 隐藏 windows quick create 失败: {error}");
        }
        return;
    }

    if let Err(error) = window.emit("quick-create:prepare", ()) {
        log::warn!("helper: quick-create:prepare 事件发送失败: {error}");
    }
}

/// 前端完成刷新与 resize 后调用，真正显示并聚焦窗口。
pub fn present_quick_create_window(app_handle: &AppHandle<Wry>) -> Result<(), String> {
    let Some(window) = app_handle.get_webview_window(QUICK_CREATE_LABEL) else {
        return Err("quick create 窗口未初始化".to_owned());
    };

    reset_webview_zoom(&window);
    position_window_on_active_monitor(&window);

    window
        .show()
        .map_err(|error| format!("显示 windows quick create 失败: {error}"))?;

    if let Err(error) = window.set_focus() {
        log::warn!("helper: 聚焦 windows quick create 失败: {error}");
    }

    if let Err(error) = window.emit("quick-create:presented", ()) {
        log::warn!("helper: quick-create:presented 事件发送失败: {error}");
    }

    Ok(())
}

fn reset_webview_zoom(window: &WebviewWindow<Wry>) {
    if let Err(error) = window.set_zoom(1.0) {
        log::warn!("helper: 重置 windows quick create WebView zoom 失败: {error}");
    }
}

/// Windows 标准窗口可以可靠收到 Tauri focus 事件；失焦即隐藏，贴近面板语义。
fn install_focus_auto_hide(window: &WebviewWindow<Wry>) {
    let window_for_hide = window.clone();
    window.on_window_event(move |event| {
        if !matches!(event, WindowEvent::Focused(false)) {
            return;
        }

        match window_for_hide.is_visible() {
            Ok(true) => {
                log::info!("helper: windows quick create 失焦 → hide window");
                if let Err(error) = window_for_hide.hide() {
                    log::warn!("helper: 失焦隐藏 windows quick create 失败: {error}");
                }
            }
            Ok(false) => {}
            Err(error) => log::warn!("helper: 读取 windows quick create 可见状态失败: {error}"),
        }
    });
}

/// 将窗口定位到鼠标所在屏幕的工作区中央，与 macOS helper 的居中语义保持一致。
fn position_window_on_active_monitor(window: &WebviewWindow<Wry>) {
    let (monitor, cursor_position) = match active_monitor_from_cursor(window) {
        Some(result) => result,
        None => {
            log::warn!("helper: 未识别鼠标所在屏幕，退回窗口 center()");
            if let Err(error) = window.center() {
                log::warn!("helper: windows quick create center 失败: {error}");
            }
            return;
        }
    };

    let work_area = monitor.work_area();
    let scale_factor = monitor.scale_factor();
    let (window_width, window_height) = match window.inner_size() {
        Ok(size) => (size.width as f64, size.height as f64),
        Err(error) => {
            log::warn!(
                "helper: 读取 windows quick create 当前 inner_size 失败，回退默认尺寸: {error}"
            );
            (
                QUICK_CREATE_WINDOW_WIDTH * scale_factor,
                QUICK_CREATE_WINDOW_HEIGHT * scale_factor,
            )
        }
    };
    let x = work_area.position.x as f64 + (work_area.size.width as f64 - window_width) / 2.0;
    let y = work_area.position.y as f64 + (work_area.size.height as f64 - window_height) / 2.0;

    let position = PhysicalPosition::new(x.round() as i32, y.round() as i32);
    if let Err(error) = window.set_position(position) {
        log::warn!("helper: 定位 windows quick create 失败: {error}");
        if let Err(error) = window.center() {
            log::warn!("helper: windows quick create center 失败: {error}");
        }
        return;
    }

    log::info!(
        "helper: windows quick create 居中到鼠标所在屏 cursor=({},{}) work_area=({},{},{}×{}) scale={} window=({}×{}) → origin=({},{})",
        cursor_position
            .as_ref()
            .map(|position| position.x.round() as i32)
            .unwrap_or(-1),
        cursor_position
            .as_ref()
            .map(|position| position.y.round() as i32)
            .unwrap_or(-1),
        work_area.position.x,
        work_area.position.y,
        work_area.size.width,
        work_area.size.height,
        scale_factor,
        window_width.round() as i32,
        window_height.round() as i32,
        position.x,
        position.y
    );
}

fn active_monitor_from_cursor(
    window: &WebviewWindow<Wry>,
) -> Option<(Monitor, Option<PhysicalPosition<f64>>)> {
    match window.cursor_position() {
        Ok(position) => match window.monitor_from_point(position.x, position.y) {
            Ok(Some(monitor)) => return Some((monitor, Some(position))),
            Ok(None) => log::warn!(
                "helper: 鼠标坐标未匹配到屏幕 cursor=({},{})",
                position.x,
                position.y
            ),
            Err(error) => log::warn!("helper: 按鼠标坐标获取屏幕失败: {error}"),
        },
        Err(error) => log::warn!("helper: 获取鼠标坐标失败: {error}"),
    }

    match window.current_monitor() {
        Ok(Some(monitor)) => Some((monitor, None)),
        Ok(None) => match window.primary_monitor() {
            Ok(Some(monitor)) => Some((monitor, None)),
            Ok(None) => None,
            Err(error) => {
                log::warn!("helper: 获取主屏幕失败: {error}");
                None
            }
        },
        Err(error) => {
            log::warn!("helper: 获取当前屏幕失败: {error}");
            match window.primary_monitor() {
                Ok(Some(monitor)) => Some((monitor, None)),
                Ok(None) => None,
                Err(error) => {
                    log::warn!("helper: 获取主屏幕失败: {error}");
                    None
                }
            }
        }
    }
}

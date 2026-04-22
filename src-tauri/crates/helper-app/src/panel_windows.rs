//! Quick Capture Windows 浮窗生命周期。
//!
//! Windows 没有 macOS `NSPanel` 等价物；v1 先使用 Tauri 标准 `WebviewWindow`
//! 补齐可用体验，后续如需更接近原生工具窗，可在本模块追加 HWND 扩展样式。

use tauri::{
    webview::Color, AppHandle, Emitter, Manager, Monitor, PhysicalPosition, WebviewUrl,
    WebviewWindow, WebviewWindowBuilder, WindowEvent, Wry,
};

use crate::window_spec::{
    QUICK_CAPTURE_LABEL, QUICK_CAPTURE_TITLE, QUICK_CAPTURE_URL, QUICK_CAPTURE_WINDOW_HEIGHT,
    QUICK_CAPTURE_WINDOW_WIDTH,
};

/// 在 Tauri `setup()` 阶段预创建 Quick Capture 浮窗，默认隐藏等待快捷键唤起。
pub fn init_quick_capture_panel(app_handle: &AppHandle<Wry>) {
    if app_handle.get_webview_window(QUICK_CAPTURE_LABEL).is_some() {
        return;
    }

    let window = match WebviewWindowBuilder::new(
        app_handle,
        QUICK_CAPTURE_LABEL,
        WebviewUrl::App(QUICK_CAPTURE_URL.into()),
    )
    .title(QUICK_CAPTURE_TITLE)
    .inner_size(QUICK_CAPTURE_WINDOW_WIDTH, QUICK_CAPTURE_WINDOW_HEIGHT)
    .min_inner_size(QUICK_CAPTURE_WINDOW_WIDTH, QUICK_CAPTURE_WINDOW_HEIGHT)
    .max_inner_size(QUICK_CAPTURE_WINDOW_WIDTH, QUICK_CAPTURE_WINDOW_HEIGHT)
    .resizable(false)
    .fullscreen(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .decorations(false)
    .shadow(false)
    .transparent(true)
    .background_color(Color(0, 0, 0, 0))
    .center()
    .visible(false)
    .build()
    {
        Ok(window) => window,
        Err(error) => {
            log::error!("helper: windows quick capture 窗口创建失败: {error}");
            return;
        }
    };

    install_focus_auto_hide(&window);
    if let Err(error) = window.set_shadow(false) {
        log::warn!("helper: 关闭 windows quick capture 窗口阴影失败: {error}");
    }
    if let Err(error) = window.set_background_color(Some(Color(0, 0, 0, 0))) {
        log::warn!("helper: 设置 windows quick capture 透明背景失败: {error}");
    }
    log::info!("helper: windows quick capture 浮窗初始化完成 [Tauri WebviewWindow]");
}

/// Toggle 浮窗：可见则隐藏，不可见则定位、显示、聚焦并通知前端重置输入框。
pub fn toggle_quick_capture_panel(app_handle: &AppHandle<Wry>) {
    let Some(window) = app_handle.get_webview_window(QUICK_CAPTURE_LABEL) else {
        log::error!("helper: Option+Space 触发，但 windows quick capture 窗口未初始化");
        return;
    };

    let visible = match window.is_visible() {
        Ok(visible) => visible,
        Err(error) => {
            log::warn!("helper: 读取 windows quick capture 可见状态失败: {error}");
            false
        }
    };

    log::info!("helper: Option+Space 触发 → windows window.is_visible()={visible}");

    if visible {
        if let Err(error) = window.hide() {
            log::warn!("helper: 隐藏 windows quick capture 失败: {error}");
        }
        return;
    }

    center_window_on_active_monitor(&window);

    if let Err(error) = window.show() {
        log::warn!("helper: 显示 windows quick capture 失败: {error}");
        return;
    }

    if let Err(error) = window.set_focus() {
        log::warn!("helper: 聚焦 windows quick capture 失败: {error}");
    }

    if let Err(error) = window.emit("quick-capture:shown", ()) {
        log::warn!("helper: quick-capture:shown 事件发送失败: {error}");
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
                log::info!("helper: windows quick capture 失焦 → hide window");
                if let Err(error) = window_for_hide.hide() {
                    log::warn!("helper: 失焦隐藏 windows quick capture 失败: {error}");
                }
            }
            Ok(false) => {}
            Err(error) => log::warn!("helper: 读取 windows quick capture 可见状态失败: {error}"),
        }
    });
}

/// 将窗口居中到鼠标所在屏幕；隐藏窗口的 `current_monitor()` 容易停留在旧屏，所以优先跟随鼠标。
fn center_window_on_active_monitor(window: &WebviewWindow<Wry>) {
    let (monitor, cursor_position) = match active_monitor_from_cursor(window) {
        Some(result) => result,
        None => {
            log::warn!("helper: 未识别鼠标所在屏幕，退回窗口 center()");
            if let Err(error) = window.center() {
                log::warn!("helper: windows quick capture center 失败: {error}");
            }
            return;
        }
    };

    let work_area = monitor.work_area();
    let scale_factor = monitor.scale_factor();
    let width = QUICK_CAPTURE_WINDOW_WIDTH * scale_factor;
    let height = QUICK_CAPTURE_WINDOW_HEIGHT * scale_factor;
    let x = work_area.position.x as f64 + (work_area.size.width as f64 - width) / 2.0;
    let y = work_area.position.y as f64 + (work_area.size.height as f64 - height) / 2.0;

    let position = PhysicalPosition::new(x.round() as i32, y.round() as i32);
    if let Err(error) = window.set_position(position) {
        log::warn!("helper: 定位 windows quick capture 失败: {error}");
        if let Err(error) = window.center() {
            log::warn!("helper: windows quick capture center 失败: {error}");
        }
        return;
    }

    log::info!(
        "helper: windows quick capture 定位到鼠标所在屏 cursor=({},{}) work_area=({},{},{}×{}) scale={} → origin=({},{})",
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

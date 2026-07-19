//! 主窗口创建与切换。
//!
//! 冷启动几何编排（W0）：
//! 1. `visible(false)` 创建，避免用户看到默认落点；
//! 2. 隐藏态 `center()` 作为无记忆时的回退；
//! 3. `restore_state(SIZE|POSITION|MAXIMIZED)` 覆盖 center（有记忆时）；
//! 4. W3：离屏回退 + 尺寸下限钳制；
//! 5. 再 `show` —— 禁止「可见后再 center」。
//!
//! 首帧壳色（W1）：原生窗 + WebView `background_color` 与 `index.html` / `--sf-neutral-100` 对齐。
//!
//! 可见性由 tray / single-instance / `toggle_main_window` 负责，不改 bounds。
//! `VISIBLE` 故意不入 window-state：关窗 = hide，持久化可见性会搞乱冷启动。
//!
//! 落盘：用户关窗 hide 时写一次；进程 `Exit` 由插件默认再写。
//! 不为开发态 Ctrl+C 单独加防抖写盘。

use tauri::window::Color;
use tauri::{
    AppHandle, Manager, PhysicalPosition, PhysicalSize, Size, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder,
};
#[cfg(target_os = "macos")]
use tauri::{LogicalPosition, TitleBarStyle};
use tauri_plugin_window_state::{AppHandleExt, StateFlags, WindowExt};

pub const MAIN_WINDOW_LABEL: &str = "main";

/// 主窗几何持久化 flags：不含 VISIBLE / FULLSCREEN / DECORATIONS。
pub const MAIN_WINDOW_STATE_FLAGS: StateFlags = StateFlags::SIZE
    .union(StateFlags::POSITION)
    .union(StateFlags::MAXIMIZED);

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

    // 无记忆时的回退：仍在隐藏态居中，用户看不到位移。
    if let Err(error) = window.center() {
        log::warn!("主窗口启动时居中失败: {error}");
    }

    // 有记忆则覆盖 center；插件已 skip_initial_state(main)，由此处唯一 restore。
    if let Err(error) = window.restore_state(MAIN_WINDOW_STATE_FLAGS) {
        log::warn!("主窗口启动时恢复几何失败: {error}");
    }

    // W3：外接屏断开 / DPI 剧变后，保证仍可见且不低于最小尺寸。
    sanitize_main_window_geometry(&window);

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

/// restore 之后、show 之前：钳制最小尺寸，离屏则隐藏态居中回退。
fn sanitize_main_window_geometry(window: &WebviewWindow) {
    let maximized = window.is_maximized().unwrap_or(false);

    if !maximized {
        clamp_main_window_min_size(window);
    }

    let (Ok(position), Ok(size), Ok(monitors)) = (
        window.outer_position(),
        window.outer_size(),
        window.available_monitors(),
    ) else {
        return;
    };

    if monitors.is_empty() {
        return;
    }

    let window_rect = PhysRect::from_outer(position, size);
    let work_areas: Vec<PhysRect> = monitors
        .iter()
        .map(|monitor| {
            let area = monitor.work_area();
            PhysRect::from_outer(area.position, area.size)
        })
        .collect();

    if window_intersects_any_work_area(window_rect, &work_areas) {
        return;
    }

    log::warn!(
        "主窗口恢复后离屏 pos=({},{}) size={}×{}，回退居中",
        position.x,
        position.y,
        size.width,
        size.height
    );

    if maximized {
        if let Err(error) = window.unmaximize() {
            log::warn!("主窗口离屏回退时取消最大化失败: {error}");
        }
        clamp_main_window_min_size(window);
    }

    if let Err(error) = window.center() {
        log::warn!("主窗口离屏回退居中失败: {error}");
    }
}

fn clamp_main_window_min_size(window: &WebviewWindow) {
    let (Ok(inner), Ok(scale)) = (window.inner_size(), window.scale_factor()) else {
        return;
    };

    let min_w = logical_to_physical_u32(MAIN_WINDOW_MIN_WIDTH, scale);
    let min_h = logical_to_physical_u32(MAIN_WINDOW_MIN_HEIGHT, scale);
    let (width, height) = clamp_physical_size(inner.width, inner.height, min_w, min_h);

    if width == inner.width && height == inner.height {
        return;
    }

    if let Err(error) = window.set_size(Size::Physical(PhysicalSize::new(width, height))) {
        log::warn!("主窗口最小尺寸钳制失败: {error}");
    }
}

fn logical_to_physical_u32(logical: f64, scale: f64) -> u32 {
    (logical * scale).round().clamp(1.0, u32::MAX as f64) as u32
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct PhysRect {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
}

impl PhysRect {
    fn from_outer(position: PhysicalPosition<i32>, size: PhysicalSize<u32>) -> Self {
        Self {
            x: position.x,
            y: position.y,
            width: size.width,
            height: size.height,
        }
    }
}

fn clamp_physical_size(width: u32, height: u32, min_width: u32, min_height: u32) -> (u32, u32) {
    (width.max(min_width), height.max(min_height))
}

/// 与任一显示器 work_area 有非空相交即视为在屏上（外接屏断开时整窗通常完全落在死区）。
fn window_intersects_any_work_area(window: PhysRect, work_areas: &[PhysRect]) -> bool {
    work_areas
        .iter()
        .copied()
        .any(|area| phys_rects_intersect(window, area))
}

fn phys_rects_intersect(a: PhysRect, b: PhysRect) -> bool {
    let ax2 = a.x as i64 + a.width as i64;
    let ay2 = a.y as i64 + a.height as i64;
    let bx2 = b.x as i64 + b.width as i64;
    let by2 = b.y as i64 + b.height as i64;

    (a.x as i64) < bx2 && ax2 > (b.x as i64) && (a.y as i64) < by2 && ay2 > (b.y as i64)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn clamp_raises_below_minimum() {
        assert_eq!(clamp_physical_size(400, 300, 500, 520), (500, 520));
    }

    #[test]
    fn clamp_keeps_valid_size() {
        assert_eq!(clamp_physical_size(1280, 900, 500, 520), (1280, 900));
    }

    #[test]
    fn intersect_detects_overlap() {
        let window = PhysRect {
            x: 100,
            y: 100,
            width: 800,
            height: 600,
        };
        let area = PhysRect {
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
        };
        assert!(phys_rects_intersect(window, area));
    }

    #[test]
    fn intersect_detects_offscreen() {
        let window = PhysRect {
            x: 3000,
            y: 100,
            width: 800,
            height: 600,
        };
        let area = PhysRect {
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
        };
        assert!(!phys_rects_intersect(window, area));
    }

    #[test]
    fn on_screen_if_any_monitor_overlaps() {
        let window = PhysRect {
            x: 2000,
            y: 100,
            width: 800,
            height: 600,
        };
        let primary = PhysRect {
            x: 0,
            y: 0,
            width: 1920,
            height: 1080,
        };
        let secondary = PhysRect {
            x: 1920,
            y: 0,
            width: 1920,
            height: 1080,
        };
        assert!(window_intersects_any_work_area(
            window,
            &[primary, secondary]
        ));
        assert!(!window_intersects_any_work_area(window, &[primary]));
    }
}

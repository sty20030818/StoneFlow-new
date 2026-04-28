//! 主窗口尺寸持久化。
//!
//! 目标是避开 `window-state` 在 macOS 多屏 / 缩放下保存物理像素窗口几何造成的漂移：
//! - 仅保存逻辑宽高；
//! - 不持久化位置；
//! - 重新展示隐藏窗口时，只在窗口已离开所有屏幕时执行居中兜底。

use std::{fs::File, io::BufReader};

use serde::{Deserialize, Serialize};
use tauri::{LogicalSize, Manager, Monitor, Runtime, WebviewWindow};

pub(crate) const MAIN_WINDOW_DEFAULT_WIDTH: f64 = 1440.0;
pub(crate) const MAIN_WINDOW_DEFAULT_HEIGHT: f64 = 920.0;
pub(crate) const MAIN_WINDOW_MIN_WIDTH: f64 = 500.0;
pub(crate) const MAIN_WINDOW_MIN_HEIGHT: f64 = 520.0;

const MAIN_WINDOW_STATE_FILENAME: &str = "main-window-state.json";

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub(crate) struct SavedMainWindowState {
    pub(crate) width: f64,
    pub(crate) height: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct WindowRect {
    pub(crate) x: i32,
    pub(crate) y: i32,
    pub(crate) width: u32,
    pub(crate) height: u32,
}

pub(crate) fn restore_main_window_size<R: Runtime>(
    window: &WebviewWindow<R>,
) -> anyhow::Result<()> {
    let Some(saved_state) = load_main_window_state(window)? else {
        return Ok(());
    };

    let size = clamp_saved_size(saved_state);
    window.set_size(LogicalSize::new(size.width, size.height))?;
    Ok(())
}

pub(crate) fn save_main_window_size<R: Runtime>(window: &WebviewWindow<R>) -> anyhow::Result<()> {
    if window.is_minimized()? || window.is_maximized()? || window.is_fullscreen()? {
        return Ok(());
    }

    let logical_size = current_logical_inner_size(window)?;
    let saved_state = clamp_saved_size(SavedMainWindowState {
        width: logical_size.width,
        height: logical_size.height,
    });

    let state_path = window
        .app_handle()
        .path()
        .app_config_dir()?
        .join(MAIN_WINDOW_STATE_FILENAME);
    std::fs::create_dir_all(
        state_path
            .parent()
            .ok_or_else(|| anyhow::anyhow!("main window state path missing parent directory"))?,
    )?;
    std::fs::write(state_path, serde_json::to_vec_pretty(&saved_state)?)?;
    Ok(())
}

pub(crate) fn ensure_main_window_is_visible<R: Runtime>(
    window: &WebviewWindow<R>,
) -> anyhow::Result<()> {
    let window_rect = current_outer_rect(window)?;
    let monitors = window.available_monitors()?;
    if monitors
        .iter()
        .any(|monitor| rect_intersects_monitor(window_rect, monitor))
    {
        return Ok(());
    }

    window.center()?;
    Ok(())
}

fn load_main_window_state<R: Runtime>(
    window: &WebviewWindow<R>,
) -> anyhow::Result<Option<SavedMainWindowState>> {
    let state_path = window
        .app_handle()
        .path()
        .app_config_dir()?
        .join(MAIN_WINDOW_STATE_FILENAME);
    let file = match File::open(state_path) {
        Ok(file) => file,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(error.into()),
    };

    Ok(Some(serde_json::from_reader(BufReader::new(file))?))
}

fn current_logical_inner_size<R: Runtime>(
    window: &WebviewWindow<R>,
) -> anyhow::Result<LogicalSize<f64>> {
    let physical_size = window.inner_size()?;
    let scale_factor = window.scale_factor()?;
    Ok(physical_size.to_logical(scale_factor))
}

fn current_outer_rect<R: Runtime>(window: &WebviewWindow<R>) -> anyhow::Result<WindowRect> {
    let position = window.outer_position()?;
    let size = window.outer_size()?;
    Ok(WindowRect {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
    })
}

pub(crate) fn clamp_saved_size(saved_state: SavedMainWindowState) -> SavedMainWindowState {
    SavedMainWindowState {
        width: saved_state
            .width
            .round()
            .clamp(MAIN_WINDOW_MIN_WIDTH, MAIN_WINDOW_DEFAULT_WIDTH),
        height: saved_state
            .height
            .round()
            .clamp(MAIN_WINDOW_MIN_HEIGHT, MAIN_WINDOW_DEFAULT_HEIGHT),
    }
}

pub(crate) fn rect_intersects_monitor(window_rect: WindowRect, monitor: &Monitor) -> bool {
    let work_area = monitor.work_area();
    rect_intersects_work_area(
        window_rect,
        WindowRect {
            x: work_area.position.x,
            y: work_area.position.y,
            width: work_area.size.width,
            height: work_area.size.height,
        },
    )
}

pub(crate) fn rect_intersects_work_area(window_rect: WindowRect, work_area: WindowRect) -> bool {
    let window_left = window_rect.x;
    let window_right = window_rect.x + window_rect.width as i32;
    let window_top = window_rect.y;
    let window_bottom = window_rect.y + window_rect.height as i32;

    let work_left = work_area.x;
    let work_right = work_area.x + work_area.width as i32;
    let work_top = work_area.y;
    let work_bottom = work_area.y + work_area.height as i32;

    window_left < work_right
        && window_right > work_left
        && window_top < work_bottom
        && window_bottom > work_top
}

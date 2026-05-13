#[cfg(target_os = "macos")]
pub mod macos;

#[cfg(target_os = "windows")]
pub mod windows;

use tauri::{AppHandle, Wry};

pub trait QuickPopupWindowController {
    fn is_visible(&self) -> Result<bool, String>;
    fn hide(&self) -> Result<(), String>;
    fn prepare_hidden(&self) -> Result<(), String>;
    fn apply_height(&self, target_window_height: f64) -> Result<(), String>;
    fn present(&self) -> Result<(), String>;
}

#[cfg(target_os = "macos")]
pub fn build_controller(app_handle: AppHandle<Wry>) -> Box<dyn QuickPopupWindowController + Send> {
    Box::new(macos::MacosQuickPopupWindowController::new(app_handle))
}

#[cfg(target_os = "windows")]
pub fn build_controller(app_handle: AppHandle<Wry>) -> Box<dyn QuickPopupWindowController + Send> {
    Box::new(windows::WindowsQuickPopupWindowController::new(app_handle))
}

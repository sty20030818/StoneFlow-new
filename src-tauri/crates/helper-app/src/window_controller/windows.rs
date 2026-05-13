use tauri::{AppHandle, Wry};

use crate::panel_windows;

pub struct WindowsQuickPopupWindowController {
    app_handle: AppHandle<Wry>,
}

impl WindowsQuickPopupWindowController {
    pub fn new(app_handle: AppHandle<Wry>) -> Self {
        Self { app_handle }
    }
}

impl super::QuickPopupWindowController for WindowsQuickPopupWindowController {
    fn is_visible(&self) -> Result<bool, String> {
        panel_windows::is_quick_create_window_visible(&self.app_handle)
    }

    fn hide(&self) -> Result<(), String> {
        panel_windows::hide_quick_create_window(&self.app_handle)
    }

    fn prepare_hidden(&self) -> Result<(), String> {
        panel_windows::prepare_hidden_quick_create_window(&self.app_handle)
    }

    fn apply_height(&self, target_window_height: f64) -> Result<(), String> {
        panel_windows::apply_quick_create_window_height(&self.app_handle, target_window_height)
    }

    fn present(&self) -> Result<(), String> {
        panel_windows::present_quick_create_window(&self.app_handle)
    }
}

use tauri::{AppHandle, Wry};

use crate::panel;

pub struct MacosQuickPopupWindowController {
    app_handle: AppHandle<Wry>,
}

impl MacosQuickPopupWindowController {
    pub fn new(app_handle: AppHandle<Wry>) -> Self {
        Self { app_handle }
    }
}

impl super::QuickPopupWindowController for MacosQuickPopupWindowController {
    fn is_visible(&self) -> Result<bool, String> {
        panel::is_quick_create_panel_visible(&self.app_handle)
    }

    fn hide(&self) -> Result<(), String> {
        panel::hide_quick_create_panel(&self.app_handle)
    }

    fn prepare_hidden(&self) -> Result<(), String> {
        panel::prepare_hidden_quick_create_panel(&self.app_handle)
    }

    fn apply_height(&self, target_window_height: f64) -> Result<(), String> {
        panel::resize_quick_create_panel_preserving_top(&self.app_handle, target_window_height)
    }

    fn present(&self) -> Result<(), String> {
        panel::present_quick_create_panel(&self.app_handle)
    }
}

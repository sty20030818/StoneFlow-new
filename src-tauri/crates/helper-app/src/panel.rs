//! macOS Quick Create 面板：薄封装，将 Helper 回调注入 platform。

use tauri::{AppHandle, Wry};

pub use stoneflow_platform::macos::panel::{
    hide_quick_create_panel, is_quick_create_panel_visible, prepare_hidden_quick_create_panel,
    present_quick_create_panel, resize_quick_create_panel_preserving_top,
};

pub fn init_quick_create_panel(app_handle: &AppHandle<Wry>) {
    stoneflow_platform::macos::panel::init_quick_create_panel(
        app_handle,
        crate::quick_callbacks::helper_quick_window_callbacks(),
    );
}

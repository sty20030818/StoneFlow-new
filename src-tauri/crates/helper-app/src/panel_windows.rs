//! Windows Quick Create 浮窗：薄封装，将 Helper 回调注入 platform。

use tauri::{AppHandle, Wry};

pub use stoneflow_platform::windows::panel::{
    apply_quick_create_window_height, hide_quick_create_window,
    is_quick_create_window_visible, prepare_hidden_quick_create_window,
};

pub fn init_quick_create_panel(app_handle: &AppHandle<Wry>) {
    stoneflow_platform::windows::panel::init_quick_create_panel(
        app_handle,
        crate::quick_callbacks::helper_quick_window_callbacks(),
    );
}

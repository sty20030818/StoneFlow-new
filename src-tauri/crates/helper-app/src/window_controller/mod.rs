use tauri::{AppHandle, Wry};

pub use stoneflow_platform::quick_window::QuickPopupWindowController;

#[cfg(target_os = "macos")]
pub fn build_controller(app_handle: AppHandle<Wry>) -> Box<dyn QuickPopupWindowController + Send> {
    stoneflow_platform::quick_window::build_controller(app_handle)
}

#[cfg(target_os = "windows")]
pub fn build_controller(app_handle: AppHandle<Wry>) -> Box<dyn QuickPopupWindowController + Send> {
    stoneflow_platform::quick_window::build_controller(
        app_handle,
        crate::quick_callbacks::helper_quick_window_callbacks(),
    )
}

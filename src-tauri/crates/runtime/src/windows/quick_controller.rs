//! Quick Create 窗口 controller 组装（平台 API 差异收口）。

use tauri::{AppHandle, Wry};

use stoneflow_platform::quick_window::controller::build_controller;

use super::quick_callbacks;

pub fn build_quick_controller(app_handle: AppHandle<Wry>) -> Box<dyn stoneflow_platform::quick_window::controller::QuickPopupWindowController + Send> {
    #[cfg(target_os = "windows")]
    {
        build_controller(app_handle, quick_callbacks::runtime_quick_window_callbacks())
    }

    #[cfg(target_os = "macos")]
    {
        build_controller(app_handle)
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let _ = app_handle;
        panic!("quick create controller is not supported on this platform");
    }
}

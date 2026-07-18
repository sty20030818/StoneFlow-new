//! Launcher 窗口 controller 组装（平台 API 差异收口）。

use tauri::{AppHandle, Wry};

use stoneflow_platform::launcher_window::controller::build_controller;

#[cfg(target_os = "windows")]
use super::callbacks;

pub fn build_quick_controller(
    app_handle: AppHandle<Wry>,
) -> Box<dyn stoneflow_platform::launcher_window::controller::LauncherWindowController + Send> {
    #[cfg(target_os = "windows")]
    {
        build_controller(app_handle, callbacks::runtime_launcher_window_callbacks())
    }

    #[cfg(target_os = "macos")]
    {
        build_controller(app_handle)
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        let _ = app_handle;
        panic!("launcher controller is not supported on this platform");
    }
}

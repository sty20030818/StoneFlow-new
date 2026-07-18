use tauri::{AppHandle, Wry};

#[cfg(target_os = "windows")]
use crate::launcher_window::LauncherWindowCallbacks;

pub trait LauncherWindowController {
    fn is_visible(&self) -> Result<bool, String>;
    fn hide(&self) -> Result<(), String>;
    fn prepare_hidden(&self) -> Result<(), String>;
    fn present(&self) -> Result<(), String>;
}

#[cfg(target_os = "macos")]
pub fn build_controller(app_handle: AppHandle<Wry>) -> Box<dyn LauncherWindowController + Send> {
    Box::new(macos::MacosLauncherWindowController::new(app_handle))
}

#[cfg(target_os = "windows")]
pub fn build_controller(
    app_handle: AppHandle<Wry>,
    callbacks: LauncherWindowCallbacks,
) -> Box<dyn LauncherWindowController + Send> {
    Box::new(windows::WindowsLauncherWindowController::new(
        app_handle, callbacks,
    ))
}

#[cfg(target_os = "macos")]
mod macos {
    use tauri::{AppHandle, Wry};

    use crate::macos::panel;

    pub struct MacosLauncherWindowController {
        app_handle: AppHandle<Wry>,
    }

    impl MacosLauncherWindowController {
        pub fn new(app_handle: AppHandle<Wry>) -> Self {
            Self { app_handle }
        }
    }

    impl super::LauncherWindowController for MacosLauncherWindowController {
        fn is_visible(&self) -> Result<bool, String> {
            panel::is_launcher_panel_visible(&self.app_handle)
        }

        fn hide(&self) -> Result<(), String> {
            panel::hide_launcher_panel(&self.app_handle)
        }

        fn prepare_hidden(&self) -> Result<(), String> {
            panel::prepare_hidden_launcher_panel(&self.app_handle)
        }

        fn present(&self) -> Result<(), String> {
            panel::present_launcher_panel(&self.app_handle)
        }
    }
}

#[cfg(target_os = "windows")]
mod windows {
    use tauri::{AppHandle, Wry};

    use crate::launcher_window::LauncherWindowCallbacks;
    use crate::windows::panel;

    pub struct WindowsLauncherWindowController {
        app_handle: AppHandle<Wry>,
        callbacks: LauncherWindowCallbacks,
    }

    impl WindowsLauncherWindowController {
        pub fn new(app_handle: AppHandle<Wry>, callbacks: LauncherWindowCallbacks) -> Self {
            Self {
                app_handle,
                callbacks,
            }
        }
    }

    impl super::LauncherWindowController for WindowsLauncherWindowController {
        fn is_visible(&self) -> Result<bool, String> {
            panel::is_launcher_window_visible(&self.app_handle)
        }

        fn hide(&self) -> Result<(), String> {
            panel::hide_launcher_window(&self.app_handle)
        }

        fn prepare_hidden(&self) -> Result<(), String> {
            panel::prepare_hidden_launcher_window(&self.app_handle)
        }

        fn present(&self) -> Result<(), String> {
            panel::present_launcher_window(&self.app_handle, self.callbacks.clone())
        }
    }
}

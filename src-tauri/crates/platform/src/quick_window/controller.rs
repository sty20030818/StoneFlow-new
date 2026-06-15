use tauri::{AppHandle, Wry};

#[cfg(target_os = "windows")]
use crate::quick_window::QuickWindowCallbacks;

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
pub fn build_controller(
    app_handle: AppHandle<Wry>,
    callbacks: QuickWindowCallbacks,
) -> Box<dyn QuickPopupWindowController + Send> {
    Box::new(windows::WindowsQuickPopupWindowController::new(
        app_handle, callbacks,
    ))
}

#[cfg(target_os = "macos")]
mod macos {
    use tauri::{AppHandle, Wry};

    use crate::macos::panel;

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
}

#[cfg(target_os = "windows")]
mod windows {
    use tauri::{AppHandle, Wry};

    use crate::quick_window::QuickWindowCallbacks;
    use crate::windows::panel;

    pub struct WindowsQuickPopupWindowController {
        app_handle: AppHandle<Wry>,
        callbacks: QuickWindowCallbacks,
    }

    impl WindowsQuickPopupWindowController {
        pub fn new(app_handle: AppHandle<Wry>, callbacks: QuickWindowCallbacks) -> Self {
            Self {
                app_handle,
                callbacks,
            }
        }
    }

    impl super::QuickPopupWindowController for WindowsQuickPopupWindowController {
        fn is_visible(&self) -> Result<bool, String> {
            panel::is_quick_create_window_visible(&self.app_handle)
        }

        fn hide(&self) -> Result<(), String> {
            panel::hide_quick_create_window(&self.app_handle)
        }

        fn prepare_hidden(&self) -> Result<(), String> {
            panel::prepare_hidden_quick_create_window(&self.app_handle)
        }

        fn apply_height(&self, target_window_height: f64) -> Result<(), String> {
            panel::apply_quick_create_window_height(&self.app_handle, target_window_height)
        }

        fn present(&self) -> Result<(), String> {
            panel::present_quick_create_window(&self.app_handle, self.callbacks.clone())
        }
    }
}

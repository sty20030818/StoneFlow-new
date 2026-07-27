//! 主应用表面生命周期命令。

use tauri::{AppHandle, State, WebviewWindow, Wry};

use crate::window::{
    launcher::warmup::{schedule_launcher_warmup, LauncherWarmupState},
    main::MAIN_WINDOW_LABEL,
};

/// 主窗口完成首次可交互渲染后触发 Launcher 后台预热。
#[tauri::command]
pub fn app_main_surface_ready(
    window: WebviewWindow<Wry>,
    app_handle: AppHandle<Wry>,
    warmup: State<'_, LauncherWarmupState>,
) -> Result<(), String> {
    if window.label() != MAIN_WINDOW_LABEL {
        return Err("只有主窗口可以触发应用表面就绪".to_owned());
    }

    schedule_launcher_warmup(app_handle, warmup.inner().clone());
    Ok(())
}

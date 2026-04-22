//! Quick Capture 相关 Tauri Commands。
//!
//! Quick Capture 面板已迁到独立 Helper 进程（`crates/helper-app`）。
//! 主 App 保留 4 个 Command 的动机：
//! - `open_quick_capture`：保持前端既有调用点不中断；真正的唤起通过 Helper 的
//!   全局快捷键或 Helper 进程自身的 IPC 路径完成。主 App 侧已无直接 `show()` 能力。
//! - `restore_main_window` / `quit_stoneflow`：Helper UI 仍可能调用这些命令来
//!   控制主 App 的窗口；现阶段保留作为面向未来的公共接口。
//! - `get_command_helper_status`：诊断面板用于观察主 App 侧的运行态快照。

use tauri::{AppHandle, State};

use crate::app::command_helper::{
    quit_from_helper, restore_main_window_from_helper, CommandHelperSnapshot, CommandHelperState,
};
use crate::app::error::AppError;

#[tauri::command]
pub async fn open_quick_capture() -> Result<(), AppError> {
    // Quick Capture 已由 Helper 独立进程承载（通过 Option+Space 快捷键拉起）。
    // 主 App 不再拥有 NSPanel，因此本命令退化为一个 no-op；保留实现只为不破坏前端调用约定。
    log::info!("open_quick_capture: 已由 Helper 进程承载，请使用 Option+Space 唤起面板");
    Ok(())
}

#[tauri::command]
pub async fn restore_main_window(
    app_handle: AppHandle,
    helper_state: State<'_, CommandHelperState>,
) -> Result<(), AppError> {
    restore_main_window_from_helper(&app_handle, helper_state.inner())
        .map_err(|error| AppError::Internal(error.to_string()))
}

#[tauri::command]
pub async fn quit_stoneflow(
    app_handle: AppHandle,
    helper_state: State<'_, CommandHelperState>,
) -> Result<(), AppError> {
    quit_from_helper(&app_handle, helper_state.inner())
        .map_err(|error| AppError::Internal(error.to_string()))
}

#[tauri::command]
pub async fn get_command_helper_status(
    helper_state: State<'_, CommandHelperState>,
) -> Result<CommandHelperSnapshot, AppError> {
    helper_state
        .snapshot()
        .map_err(|error| AppError::Internal(error.to_string()))
}

//! Tauri 命令注册。

use tauri::ipc::Invoke;

pub(crate) mod activity;
pub(crate) mod quick_capture;
pub(crate) mod workspace;

/// 生成命令处理器。
pub fn handler() -> impl Fn(Invoke) -> bool + Send + Sync + 'static {
    tauri::generate_handler![
        activity::get_entity_activities,
        workspace::healthcheck,
        workspace::set_active_space,
        quick_capture::restore_main_window,
        quick_capture::quit_stoneflow,
        quick_capture::get_command_helper_status
    ]
}

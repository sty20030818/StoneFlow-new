use crate::{
    commands::window::shutdown_quick_create,
    runtime::QuickPopupRuntimeState,
    window_controller,
};

pub async fn execute_shutdown(
    app_handle: &tauri::AppHandle,
    runtime: &QuickPopupRuntimeState,
) {
    shutdown_quick_create(app_handle, runtime).await;

    let controller = window_controller::build_controller(app_handle.clone());
    if let Err(error) = controller.hide() {
        log::warn!("helper: shutdown 隐藏 quick create 失败: {error}");
    }
}


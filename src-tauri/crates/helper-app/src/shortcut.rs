//! 全局快捷键注册：Option+Space 触发 Quick Capture 面板 toggle。

use tauri::AppHandle;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use crate::window_spec::QUICK_CAPTURE_SHORTCUT;

/// 注册全局快捷键，失败时只记录 warn，不阻塞 Helper 启动。
///
/// macOS 上 Helper 以 Accessory 启动，无需用户"聚焦到 App"即可捕获全局按键。
pub fn register_global_shortcut(app_handle: &AppHandle<tauri::Wry>) {
    let handle = app_handle.clone();

    let result = app_handle.global_shortcut().on_shortcut(
        QUICK_CAPTURE_SHORTCUT,
        move |_app, _shortcut, event| {
            // 只响应 key-down，避免 key-up 重复唤起。
            if event.state != ShortcutState::Pressed {
                return;
            }

            #[cfg(target_os = "macos")]
            crate::panel::toggle_quick_capture_panel(&handle);

            // 非 macOS 平台暂未实现 NSPanel 等价物；第一版不支持。
            #[cfg(not(target_os = "macos"))]
            {
                let _ = &handle; // 消除未使用警告
                log::warn!("helper: 非 macOS 平台暂不支持 Quick Capture NSPanel");
            }
        },
    );

    match result {
        Ok(()) => log::info!("helper: 全局快捷键 {QUICK_CAPTURE_SHORTCUT} 注册成功"),
        Err(error) => log::warn!("helper: 全局快捷键 {QUICK_CAPTURE_SHORTCUT} 注册失败: {error}"),
    }
}

//! StoneFlow Command Helper：独立 Accessory 进程，仅承担全局快捷键与 Quick Capture 浮窗。
//!
//! 与主 App 的关系：
//! - Helper 不拥有数据库；所有写入动作经 IPC 下发到主 App 的 `ipc::server`；
//! - Helper 随主 App 生命周期启动/退出（主 App 侧负责 spawn/kill）；
//! - 前端资源复用主 App 的 `dist/`，Quick Capture 仍走 `#/quick-capture` 路由。

pub mod commands;
pub mod ipc_client;
pub mod shortcut;
pub mod window_spec;

#[cfg(target_os = "macos")]
pub mod panel;

#[cfg(target_os = "windows")]
pub mod panel_windows;

/// 组装 Helper 的 Tauri Builder。调用方（`src-tauri/helper-bin` 宿主）
/// 负责调用 `.run(tauri::generate_context!())` 并处理 panic。
pub fn builder() -> tauri::Builder<tauri::Wry> {
    let b = tauri::Builder::default().plugin(tauri_plugin_global_shortcut::Builder::new().build());

    // macOS：为 NSPanel 装配 tauri-nspanel 插件。
    #[cfg(target_os = "macos")]
    let b = b.plugin(tauri_nspanel::init());

    // 说明：Quick Capture 面板的「点外面自动隐藏」不在这里处理。
    // NonActivatingPanel 不会让 owning app 激活，Tauri 的 `WindowEvent::Focused(false)`
    // 对它并不稳定派发。正确做法是在 `panel.rs` 里通过 tauri-nspanel 的
    // `panel_event!` 监听 NSWindowDelegate 原生 `windowDidResignKey:` 通知——
    // 那是 AppKit 层面唯一权威的失焦信号。

    b.setup(|app| {
        // 开发构建下注入日志插件；发布构建由打包层统一接管。
        if cfg!(debug_assertions) {
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .level(log::LevelFilter::Info)
                    .build(),
            )?;
        }

        // macOS：Helper 以 Accessory 身份运行，不在 Dock 显示图标、不抢主 App 激活。
        #[cfg(target_os = "macos")]
        app.set_activation_policy(tauri::ActivationPolicy::Accessory);

        // macOS：在 setup（主线程）创建 NSPanel。
        #[cfg(target_os = "macos")]
        panel::init_quick_capture_panel(app.handle());

        // Windows：预创建标准 Tauri 浮窗，后续快捷键只负责 toggle。
        #[cfg(target_os = "windows")]
        panel_windows::init_quick_capture_panel(app.handle());

        shortcut::register_global_shortcut(app.handle());

        // 启动时做一次 Ping 自检，失败仅告警：主 App 还在启动可能晚于 Helper 连通，
        // 用户真正按下快捷键时重试连接即可。
        tauri::async_runtime::spawn(async {
            match ipc_client::ping().await {
                Ok(version) => log::info!("helper: 与主 App IPC 连通，协议版本={version}"),
                Err(error) => log::warn!(
                    "helper: IPC 自检失败（主 App 可能未就绪）：{error}。\
                         稍后用户触发 Quick Capture 时会重试。"
                ),
            }
        });

        Ok(())
    })
    .invoke_handler(tauri::generate_handler![commands::helper_create_task])
}

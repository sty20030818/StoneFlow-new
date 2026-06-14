//! S1 的短期兼容层。
//!
//! 这里唯一职责是把新的 `runtime` 入口安全地转接到旧 `desktop-app`。
//! 后续阶段会逐步被真实 runtime 实现替换。

/// 暂时复用旧桌面应用启动链路，保证 S1 不改变现有行为。
pub fn run(context: tauri::Context<tauri::Wry>) {
    desktop_app::run(context);
}

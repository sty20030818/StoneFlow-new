//! StoneFlow 桌面应用编排入口。

pub mod app;
mod application;
mod infrastructure;
mod ipc;
#[cfg(test)]
#[path = "tests/m3_e_project_hierarchy_tests.rs"]
mod m3_e_project_hierarchy_tests;
#[cfg(test)]
#[path = "tests/m4_a_capture_tests.rs"]
mod m4_a_capture_tests;

pub fn builder() -> tauri::Builder<tauri::Wry> {
    app::builder()
}

/// 以给定 Tauri Context 启动主 App（含 Helper 子进程生命周期管理）。
pub fn run(context: tauri::Context<tauri::Wry>) {
    app::run(context);
}

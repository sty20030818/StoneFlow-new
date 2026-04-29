//! StoneFlow 桌面主应用 crate。
//!
//! 前置阶段 A 的目标不是补旧模型，而是把主应用重置成可持续演进的干净骨架。

pub mod app;
pub mod domain;
mod application;
mod infrastructure;

#[cfg(test)]
mod tests;

/// 以给定的 Tauri Context 启动主应用。
pub fn run(context: tauri::Context<tauri::Wry>) {
    app::run(context);
}

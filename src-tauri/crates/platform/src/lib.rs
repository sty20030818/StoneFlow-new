//! StoneFlow 的桌面平台适配层。
//!
//! 目标职责是隔离窗口平台差异，例如：
//! - macOS NSPanel / AppKit bridge；
//! - Windows 浮层窗口行为；
//! - Quick Create 的 prepare / present / hide / resize。

pub mod quick_window;

#[cfg(target_os = "macos")]
pub mod macos;

#[cfg(target_os = "windows")]
pub mod windows;

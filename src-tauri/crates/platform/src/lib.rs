//! StoneFlow 的桌面平台适配层。
//!
//! 目标职责是隔离窗口平台差异，例如：
//! - macOS NSPanel / AppKit bridge；
//! - Windows 浮层窗口行为；
//! - Launcher 的 prepare / present / hide / resize。

pub mod credentials;
pub mod launcher_window;

pub use credentials::SyncTokenStore;

#[cfg(target_os = "macos")]
pub mod macos;

#[cfg(target_os = "windows")]
pub mod windows;

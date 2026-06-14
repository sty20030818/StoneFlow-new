//! StoneFlow 的桌面平台适配层。
//!
//! 目标职责是隔离窗口平台差异，例如：
//! - macOS NSPanel / AppKit bridge；
//! - Windows 浮层窗口行为；
//! - Quick Create 的 prepare / present / hide / resize。
//!
//! S1 只建立 crate 边界，不承载任何运行时逻辑。

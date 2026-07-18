//! 主窗口与应用级窗口编排。

pub mod main;
pub mod launcher;

pub use launcher::runtime::{
    LauncherWindowCloseReason, LauncherWindowOpenReason, LauncherWindowPhase, LauncherWindowRuntimeState,
    LauncherWindowSession,
};

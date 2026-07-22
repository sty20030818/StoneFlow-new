//! 主窗口与应用级窗口编排。

pub mod launcher;
pub mod main;

pub use launcher::runtime::{
    LauncherWindowCloseReason, LauncherWindowOpenReason, LauncherWindowPhase,
    LauncherWindowRuntimeState, LauncherWindowSession,
};

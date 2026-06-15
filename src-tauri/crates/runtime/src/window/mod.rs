//! 主窗口与应用级窗口编排。

pub mod main;
pub mod quick_create;

pub use quick_create::runtime::{
    QuickPopupCloseReason, QuickPopupOpenReason, QuickPopupPhase, QuickPopupRuntimeState,
    QuickPopupSession,
};

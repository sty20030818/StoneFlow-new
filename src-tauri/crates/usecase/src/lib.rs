//! StoneFlow 的用例编排层。
//!
//! 这里负责：
//! - 业务用例编排；
//! - DTO 与边界错误；
//! - repository / transaction ports；
//! - 跨聚合流程协调。

pub mod activity;
pub mod error;
pub mod lifecycle;
pub mod ports;
pub mod project;
pub mod launcher;
pub mod launcher_context;
pub mod search;
pub mod settings;
pub mod space;
pub mod task;
pub mod task_link;
pub mod update;
pub mod view;

pub use error::UsecaseError;
pub use update::{
    DownloadOutcome, UpdateCheckKind, UpdateInfo, UpdatePort, UpdateService, UpdateSessionPhase,
    UpdateSessionSnapshot, UpdateSettingsPort,
};

//! Lifecycle 用例：Archive / Trash 编排。

pub mod executor;
pub mod service;
pub mod types;

pub use service::*;
pub use stoneflow_domain::{LifecycleEntityType, LifecycleMode};
pub use types::*;

//! Lifecycle 用例：归档 / 回收站列表与生命周期编排。
//!
//! 完整业务编排留给 后续；本模块仅保留可编译的端口与空列表 stub，
//! 避免旧 soft-delete 路径继续耦合新 schema。

pub mod executor;
pub mod service;
pub mod types;

pub use service::*;
pub use stoneflow_domain::{LifecycleEntityType, LifecycleMode};
pub use types::*;

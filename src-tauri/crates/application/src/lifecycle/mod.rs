//! Lifecycle 用例（R2 硬切）：物理删除 + Space/Project 归档；无软删 trash。
//!
//! 完整业务编排留给 R3+；本模块仅保留可编译的端口与空列表 stub，
//! 避免旧 soft-delete 路径继续耦合新 schema。

pub mod executor;
pub mod service;
pub mod types;

pub use service::*;
pub use stoneflow_domain::{LifecycleEntityType, LifecycleMode};
pub use types::*;

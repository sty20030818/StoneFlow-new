//! Lifecycle 用例：统一读取归档与回收站列表。
//!
//! Task、Project 与 Space 的写路径由各实体 application service 持有。

pub mod executor;
pub mod service;
pub mod types;

pub use service::*;
pub use stoneflow_domain::{LifecycleEntityType, LifecycleMode};
pub use types::*;

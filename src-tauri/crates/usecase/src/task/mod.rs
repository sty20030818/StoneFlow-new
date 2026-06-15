//! Task 用例：CRUD、列表视图预设与 Activity 编排（生命周期由 runtime adapter 委托 lifecycle）。

pub mod executor;
pub mod service;
pub mod types;

pub use service::*;
pub use types::*;

//! Task 用例：CRUD 与 Activity 编排（查询由 view 模块统一执行）。

pub mod executor;
pub mod service;
pub mod types;

pub use service::*;
pub use types::*;

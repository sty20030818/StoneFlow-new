//! Task 用例：CRUD 与 Activity 编排（查询由 view 模块统一执行）。

pub mod executor;
pub mod group;
pub mod order;
pub mod service;
pub mod types;

pub use group::*;
pub use order::*;
pub use service::*;
pub use types::*;

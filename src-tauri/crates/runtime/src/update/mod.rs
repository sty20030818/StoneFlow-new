//! 应用更新：platform/runtime 边界适配（不依赖业务实体与同步协议）。

mod adapter;
pub mod events;
mod service;
mod settings_store;

pub use service::{build_update_service, RuntimeUpdateService};

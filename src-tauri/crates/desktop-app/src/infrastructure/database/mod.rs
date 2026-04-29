//! 数据库基础设施入口。

mod bootstrap;
mod connection;

pub use bootstrap::{bootstrap_database, DatabaseRuntimeSnapshot, DatabaseRuntimeState};

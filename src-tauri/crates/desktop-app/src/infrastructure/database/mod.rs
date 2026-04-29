//! 数据库基础设施入口。

mod bootstrap;
mod connection;
mod seed;

pub use bootstrap::{bootstrap_database, DatabaseRuntimeSnapshot, DatabaseRuntimeState};
#[cfg(test)]
pub(crate) use connection::{connect_sqlite, resolve_database_path};

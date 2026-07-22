//! StoneFlow 的持久化与外部存储适配层。
//!
//! 负责：
//! - SQLite 连接与 bootstrap；
//! - SeaORM entity 与 migration；
//! - repository 实现；
//! - entity 与 application record 映射。
//!
//! 仅本 crate 允许依赖 SeaORM。

pub mod database;
pub mod entities;
pub mod error;
pub mod mappers;
pub mod migration;
pub mod repositories;

pub use error::StorageError;

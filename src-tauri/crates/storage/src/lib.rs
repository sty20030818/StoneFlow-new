//! StoneFlow 的持久化与外部存储适配层。
//!
//! 负责：
//! - SQLite 连接与 bootstrap；
//! - SeaORM repository 实现；
//! - schema model 与 usecase record 映射。

pub mod database;
pub mod error;
pub mod mappers;
pub mod repositories;

pub use error::StorageError;

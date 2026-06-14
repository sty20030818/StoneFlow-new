//! StoneFlow 的持久化与外部存储适配层。
//!
//! 这里未来负责：
//! - SQLite 连接与 bootstrap；
//! - SeaORM repository 实现；
//! - migration runner；
//! - 领域对象与数据库模型映射。
//!
//! S1 只建立 crate 边界，不迁移旧 infrastructure 代码。

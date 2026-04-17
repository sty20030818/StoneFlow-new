//! StoneFlow 数据实体骨架。
//!
//! M1-A 阶段只先锁定 crate 位置，具体 SeaORM 实体会在后续里程碑接入。

/// 标记 entity crate 已经接通到 workspace。
pub fn stage_label() -> &'static str {
  "m1-a-entity-skeleton"
}

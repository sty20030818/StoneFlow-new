//! StoneFlow 迁移基础设施骨架。
//!
//! M1-A 阶段仅建立 workspace 成员，正式 migration 入口会在后续里程碑接入。

/// 标记 migration crate 已经接通到 workspace。
pub fn stage_label() -> &'static str {
  "m1-a-migration-skeleton"
}

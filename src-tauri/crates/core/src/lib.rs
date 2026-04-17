//! StoneFlow 纯领域规则骨架。
//!
//! M1-A 阶段先建立 crate 边界，后续里程碑再补充值对象、规则和服务。

/// 返回当前领域层阶段说明，供工程自检使用。
pub fn stage_label() -> &'static str {
  "m1-a-core-skeleton"
}

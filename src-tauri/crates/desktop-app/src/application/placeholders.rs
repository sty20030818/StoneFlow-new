//! 前置阶段 A 的占位实现。

use crate::app::error::AppError;

/// 统一的“下一阶段实现”错误。
pub fn stage_unavailable(command_name: &str) -> AppError {
    AppError::Internal(format!(
        "前置阶段 A 仅完成 Rust workspace 与宿主基座重构，`{command_name}` 将在阶段 0 实现"
    ))
}

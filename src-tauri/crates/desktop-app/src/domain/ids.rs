//! 统一 ID 工具。

use uuid::Uuid;

/// 生成新的业务 ID。
pub fn create_id() -> Uuid {
    stoneflow_core::new_uuid_v7()
}

/// 兼容当前运行时状态命名。
pub fn next_runtime_id() -> Uuid {
    create_id()
}

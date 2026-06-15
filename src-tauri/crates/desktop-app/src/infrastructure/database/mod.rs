//! 数据库基础设施：真源在 `stoneflow-storage`。

#[allow(unused_imports)] // 测试与外部调用方通过 `infrastructure::database::*` 消费
pub use stoneflow_storage::database::{
    bootstrap_database, connect_sqlite, resolve_database_path, DatabaseRuntimeSnapshot,
    DatabaseRuntimeState,
};

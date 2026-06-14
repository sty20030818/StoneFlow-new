//! 兼容壳：桌面应用仍从 `crate::domain::*` 读取，但真源已迁到 `stoneflow-domain`。

pub use stoneflow_domain::{
    ActivityActorKind, ActivityEntityKind, ActivitySourceKind, TaskStatus, *,
};

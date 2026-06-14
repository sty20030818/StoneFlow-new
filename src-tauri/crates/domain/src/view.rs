//! View 领域枚举。

use serde::{Deserialize, Serialize};

/// View 类型。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ViewKind {
    System,
    Custom,
}

/// View 作用对象。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ViewEntityKind {
    Task,
    Project,
}

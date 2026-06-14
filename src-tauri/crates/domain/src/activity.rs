//! Activity 领域枚举。

use serde::{Deserialize, Serialize};

/// Activity 作用对象。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ActivityEntityKind {
    Task,
    Project,
    Space,
    View,
    Setting,
}

/// Activity 执行主体。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ActivityActorKind {
    User,
    System,
    Ai,
}

/// Activity 触发来源。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ActivitySourceKind {
    App,
    Shortcut,
    Command,
    Import,
    Automation,
}

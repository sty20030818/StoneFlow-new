//! 阶段 1 共享类型：只承载数据库层仍然稳定的枚举和值对象。

use sea_orm::entity::prelude::*;

/// 任务状态。
#[derive(Debug, Clone, Copy, PartialEq, Eq, EnumIter, DeriveActiveEnum)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::None)")]
pub enum TaskStatus {
    #[sea_orm(string_value = "todo")]
    Todo,
    #[sea_orm(string_value = "doing")]
    Doing,
    #[sea_orm(string_value = "waiting")]
    Waiting,
    #[sea_orm(string_value = "done")]
    Done,
    #[sea_orm(string_value = "canceled")]
    Canceled,
}

/// View 类型。
#[derive(Debug, Clone, Copy, PartialEq, Eq, EnumIter, DeriveActiveEnum)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::None)")]
pub enum ViewKind {
    #[sea_orm(string_value = "system")]
    System,
    #[sea_orm(string_value = "custom")]
    Custom,
}

/// View 作用对象。
#[derive(Debug, Clone, Copy, PartialEq, Eq, EnumIter, DeriveActiveEnum)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::None)")]
pub enum ViewEntityKind {
    #[sea_orm(string_value = "task")]
    Task,
    #[sea_orm(string_value = "project")]
    Project,
}

/// Activity 作用对象。
#[derive(Debug, Clone, Copy, PartialEq, Eq, EnumIter, DeriveActiveEnum)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::None)")]
pub enum ActivityEntityKind {
    #[sea_orm(string_value = "task")]
    Task,
    #[sea_orm(string_value = "project")]
    Project,
    #[sea_orm(string_value = "space")]
    Space,
    #[sea_orm(string_value = "view")]
    View,
    #[sea_orm(string_value = "setting")]
    Setting,
}

/// Activity 执行主体。
#[derive(Debug, Clone, Copy, PartialEq, Eq, EnumIter, DeriveActiveEnum)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::None)")]
pub enum ActivityActorKind {
    #[sea_orm(string_value = "user")]
    User,
    #[sea_orm(string_value = "system")]
    System,
    #[sea_orm(string_value = "ai")]
    Ai,
}

/// Activity 触发来源。
#[derive(Debug, Clone, Copy, PartialEq, Eq, EnumIter, DeriveActiveEnum)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::None)")]
pub enum ActivitySourceKind {
    #[sea_orm(string_value = "app")]
    App,
    #[sea_orm(string_value = "shortcut")]
    Shortcut,
    #[sea_orm(string_value = "command")]
    Command,
    #[sea_orm(string_value = "import")]
    Import,
    #[sea_orm(string_value = "automation")]
    Automation,
}

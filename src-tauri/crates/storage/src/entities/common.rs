//! SeaORM 结构枚举与共享列类型。

use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

/// 工作项状态。
#[derive(Debug, Clone, Copy, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::None)")]
#[serde(rename_all = "snake_case")]
pub enum WorkStatus {
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

/// View 实体种类。
#[derive(Debug, Clone, Copy, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::None)")]
#[serde(rename_all = "snake_case")]
pub enum ViewEntityKind {
    #[sea_orm(string_value = "task")]
    Task,
    #[sea_orm(string_value = "project")]
    Project,
}

/// Outbox / sync 实体类型。
#[derive(Debug, Clone, Copy, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::None)")]
#[serde(rename_all = "snake_case")]
pub enum SyncEntityType {
    #[sea_orm(string_value = "space")]
    Space,
    #[sea_orm(string_value = "project")]
    Project,
    #[sea_orm(string_value = "task")]
    Task,
    #[sea_orm(string_value = "task_link")]
    TaskLink,
    #[sea_orm(string_value = "view")]
    View,
    #[sea_orm(string_value = "setting")]
    Setting,
    #[sea_orm(string_value = "activity")]
    Activity,
}

/// Outbox 操作类型。
#[derive(Debug, Clone, Copy, PartialEq, Eq, EnumIter, DeriveActiveEnum, Serialize, Deserialize)]
#[sea_orm(rs_type = "String", db_type = "String(StringLen::None)")]
#[serde(rename_all = "snake_case")]
pub enum OutboxOperationType {
    #[sea_orm(string_value = "upsert")]
    Upsert,
    #[sea_orm(string_value = "delete")]
    Delete,
    #[sea_orm(string_value = "restore")]
    Restore,
    #[sea_orm(string_value = "patch")]
    Patch,
}

//! View 读模型与 Task View 执行内部类型（R2：仅自定义 View）。

#![allow(dead_code)]

use serde::{Deserialize, Serialize};
use stoneflow_domain::{ViewEntityKind, WorkStatus};

/// View 持久化读模型（对齐 R2 schema）。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ViewRecord {
    pub id: String,
    pub name: String,
    pub entity_kind: ViewEntityKind,
    pub scope_json: String,
    pub filters_json: String,
    pub sort_json: String,
    pub group_by_json: Option<String>,
    pub position: i64,
    pub generation: i64,
    pub created_at: String,
    pub updated_at: String,
}

/// Task View 执行器所需的 Task 读模型。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ViewTaskRecord {
    pub id: String,
    pub space_id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub note: Option<String>,
    pub status: WorkStatus,
    pub status_changed_at: String,
    pub priority: i32,
    pub planned_at: Option<String>,
    pub due_at: Option<String>,
    pub remind_at: Option<String>,
    pub position: i64,
    pub completed_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Space 名称查找辅助读模型。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ViewSpaceLookupRecord {
    pub id: String,
    pub name: String,
}

/// Project 名称查找辅助读模型。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ViewProjectLookupRecord {
    pub id: String,
    pub name: String,
}

/// 创建 View 的持久化输入。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateViewPersistenceRecord {
    pub id: String,
    pub name: String,
    pub entity_kind: ViewEntityKind,
    pub scope_json: String,
    pub filters_json: String,
    pub sort_json: String,
    pub group_by_json: Option<String>,
    pub position: i64,
    pub created_at: String,
    pub updated_at: String,
}

/// 更新 View 基础字段 patch。
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct UpdateViewPatch {
    pub name: Option<String>,
    pub scope_json: Option<String>,
    pub filters_json: Option<String>,
    pub sort_json: Option<String>,
    pub group_by_json: Option<Option<String>>,
    pub position: Option<i64>,
    pub updated_at: Option<String>,
}

/// View 列表查询条件。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ViewListQuery {
    pub entity_kind: ViewEntityKind,
}

/// Task View 候选集 placement 查询。
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ViewTaskPlacementQuery {
    All,
    Project(String),
    NoProject,
}

/// Task View filters JSON 结构。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TaskViewFiltersValue {
    #[serde(default)]
    pub status: Vec<WorkStatus>,
    pub priority: Option<PriorityFilter>,
    pub project: Option<ProjectFilter>,
    pub due: Option<DateFilter>,
    pub planned: Option<DateFilter>,
    pub created: Option<DateFilter>,
    pub updated: Option<DateFilter>,
    pub completed: Option<DateFilter>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PriorityFilter {
    pub eq: Option<i32>,
    pub gte: Option<i32>,
    pub lte: Option<i32>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ProjectFilter {
    pub mode: String,
    #[serde(default)]
    pub ids: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub(crate) enum DateFilterMode {
    Today,
    Tomorrow,
    ThisWeek,
    NextWeek,
    Overdue,
    Future,
    Past,
    Between,
    None,
    NotNone,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DateFilter {
    pub mode: DateFilterMode,
    pub from: Option<String>,
    pub to: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum TaskSortField {
    Position,
    Priority,
    DueAt,
    PlannedAt,
    CreatedAt,
    UpdatedAt,
    CompletedAt,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum TaskGroupBy {
    None,
    Status,
    Priority,
    Project,
    Due,
    Planned,
}

//! View 读模型与 Task View 执行内部类型。

use serde::{Deserialize, Serialize};
use stoneflow_domain::{TaskStatus, ViewEntityKind, ViewKind};

/// View 持久化读模型。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ViewRecord {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub kind: ViewKind,
    pub entity_type: ViewEntityKind,
    pub key: Option<String>,
    pub filters: String,
    pub sort: String,
    pub group_by: Option<String>,
    pub is_visible: bool,
    pub sort_order: i32,
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
    pub status: TaskStatus,
    pub status_changed_at: String,
    pub priority: i32,
    pub inbox_at: Option<String>,
    pub due_at: Option<String>,
    pub scheduled_at: Option<String>,
    pub reminder_at: Option<String>,
    pub sort_order: i32,
    pub completed_at: Option<String>,
    pub canceled_at: Option<String>,
    pub archived_at: Option<String>,
    pub deleted_at: Option<String>,
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
    pub description: Option<String>,
    pub kind: ViewKind,
    pub entity_type: ViewEntityKind,
    pub key: Option<String>,
    pub filters: String,
    pub sort: String,
    pub group_by: Option<String>,
    pub is_visible: bool,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

/// 更新 View 基础字段 patch。
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct UpdateViewPatch {
    pub name: Option<String>,
    pub description: Option<Option<String>>,
    pub filters: Option<String>,
    pub sort: Option<String>,
    pub group_by: Option<Option<String>>,
    pub is_visible: Option<bool>,
    pub sort_order: Option<i32>,
    pub updated_at: Option<String>,
}

/// View 列表查询条件。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ViewListQuery {
    pub entity_type: ViewEntityKind,
    pub visible_only: bool,
}

/// Task View 候选集 placement 查询。
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ViewTaskPlacementQuery {
    All,
    Project(String),
    Inbox,
    NoProject,
}

/// Task View filters JSON 结构。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TaskViewFiltersValue {
    #[serde(default)]
    pub status: Vec<TaskStatus>,
    pub priority: Option<PriorityFilter>,
    pub inbox: Option<bool>,
    pub project: Option<ProjectFilter>,
    pub due: Option<DateFilter>,
    pub scheduled: Option<DateFilter>,
    pub created: Option<DateFilter>,
    pub updated: Option<DateFilter>,
    pub completed: Option<DateFilter>,
    pub archived: Option<bool>,
    pub deleted: Option<bool>,
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
    SortOrder,
    Priority,
    DueAt,
    ScheduledAt,
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
    Scheduled,
}

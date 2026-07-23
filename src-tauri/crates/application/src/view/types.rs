//! View 查询定义及其持久化读模型。

use serde::{Deserialize, Serialize};
use stoneflow_domain::{ViewEntityKind, WorkStatus};

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

/// Storage 可直接执行的候选集约束；不包含排序或展示分组。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ViewTaskQuery {
    pub scope: TaskScopeInput,
    pub statuses: Vec<WorkStatus>,
    pub project: Option<ProjectFilter>,
    pub due: Option<DateFilter>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ViewSpaceLookupRecord {
    pub id: String,
    pub name: String,
    pub slug: String,
}
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ViewProjectLookupRecord {
    pub id: String,
    pub name: String,
}

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

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ViewListQuery {
    pub entity_kind: ViewEntityKind,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TaskScopeInput {
    #[serde(rename = "type")]
    pub kind: TaskScopeKind,
    pub space_id: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TaskScopeKind {
    All,
    Space,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct TaskViewFiltersValue {
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
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct PriorityFilter {
    pub eq: Option<i32>,
    pub gte: Option<i32>,
    pub lte: Option<i32>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ProjectFilter {
    pub mode: ProjectFilterMode,
    #[serde(default)]
    pub ids: Vec<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProjectFilterMode {
    Any,
    None,
    Specific,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct DateFilter {
    pub mode: DateFilterMode,
    pub from: Option<String>,
    pub to: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DateFilterMode {
    Today,
    Overdue,
    Future,
    Past,
    Between,
    None,
    NotNone,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ViewSortRule {
    pub field: TaskSortField,
    pub direction: SortDirection,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TaskSortField {
    Position,
    Priority,
    DueAt,
    PlannedAt,
    CreatedAt,
    UpdatedAt,
    CompletedAt,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SortDirection {
    Asc,
    Desc,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TaskGroupBy {
    None,
    Status,
    Priority,
    Project,
    Due,
    Planned,
}

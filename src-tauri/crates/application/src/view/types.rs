//! View 查询定义及其持久化读模型。

use crate::task::TaskQueryCursor;
use serde::{Deserialize, Serialize};
use stoneflow_domain::{ViewEntityKind, WorkStatus};

use super::filter_query::FilterQueryValue;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TaskViewBaseKey {
    All,
    Active,
    Completed,
    Today,
    Upcoming,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase", deny_unknown_fields)]
pub enum TaskViewContext {
    All,
    Standalone,
    Project {
        #[serde(rename = "projectId")]
        project_id: String,
    },
}

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
    pub status: WorkStatus,
    pub status_changed_at: String,
    pub priority: i32,
    pub planned_at: Option<String>,
    pub due_at: Option<String>,
    pub remind_at: Option<String>,
    pub position: i64,
    pub completed_at: Option<String>,
    pub archived_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Storage 执行本地日历筛选所需的 UTC 半开区间边界。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ViewDateBoundaries {
    pub today_start: String,
    pub tomorrow_start: String,
    pub day_after_tomorrow_start: String,
    pub next_week_start: String,
}

/// Storage 可完整执行的 Task 查询契约。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ViewTaskQuery {
    pub scope: TaskScopeInput,
    pub context: TaskViewContext,
    pub base_view_key: TaskViewBaseKey,
    pub filters: FilterQueryValue,
    pub dates: ViewDateBoundaries,
    pub limit: u32,
    pub cursor: Option<TaskQueryCursor>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ViewTaskPage {
    pub items: Vec<ViewTaskRecord>,
    /// 仅首屏计算；续页无需重复 COUNT。
    pub total_count: Option<u64>,
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

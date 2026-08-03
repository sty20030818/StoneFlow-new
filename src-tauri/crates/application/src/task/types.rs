//! Task 读模型与列表查询内部类型。

use stoneflow_domain::WorkStatus;

/// Task 持久化读模型。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TaskRecord {
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
    pub generation: i64,
    pub completed_at: Option<String>,
    pub archived_at: Option<String>,
    pub deleted_at: Option<String>,
    pub archived_by_operation_id: Option<String>,
    pub deleted_by_operation_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// 创建 Task 的持久化输入。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateTaskPersistenceRecord {
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

/// 更新 Task 基础字段 patch。
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct UpdateTaskPatch {
    pub title: Option<String>,
    pub note: Option<Option<String>>,
    pub status: Option<WorkStatus>,
    pub status_changed_at: Option<String>,
    pub priority: Option<i32>,
    pub space_id: Option<String>,
    pub project_id: Option<Option<String>>,
    pub planned_at: Option<Option<String>>,
    pub due_at: Option<Option<String>>,
    pub remind_at: Option<Option<String>>,
    pub position: Option<i64>,
    pub completed_at: Option<Option<String>>,
}

/// Task 编排所需的 Space 读模型。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TaskSpaceRecord {
    pub id: String,
    pub name: String,
    pub archived_at: Option<String>,
    pub deleted_at: Option<String>,
}

/// Task 编排所需的 Project 读模型。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TaskProjectRecord {
    pub id: String,
    pub name: String,
    pub space_id: String,
    pub archived_at: Option<String>,
    pub deleted_at: Option<String>,
}

/// Task 列表的生命周期过滤。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum TaskLifecycleView {
    #[default]
    Active,
    Completed,
    Canceled,
    Archived,
    All,
}

/// Task 列表 placement 查询（未分配 Project = Standalone）。
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub enum TaskPlacementQuery {
    #[default]
    All,
    Project(String),
    Standalone,
}

/// 列表 keyset 游标（与 ORDER BY position, id 一致）。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TaskListCursor {
    pub position: i64,
    pub id: String,
}

/// 列表日期筛选（与前端 page filter 对齐；有效日期 = COALESCE(due, planned, remind)）。
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum TaskListDateFilter {
    /// 任一日期字段非空
    HasDate,
    /// 全部日期字段为空
    NoDate,
    /// 有效日期落在 [from, to]（RFC3339，闭区间语义由调用方定边界）
    Range {
        from: Option<String>,
        to: Option<String>,
    },
}

/// Task 列表查询条件。
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct TaskListQuery {
    pub space_id: Option<String>,
    pub placement: TaskPlacementQuery,
    pub lifecycle: TaskLifecycleView,
    /// 可选 status 白名单；`None` 或空表示不限 status（仍受 lifecycle 约束）。
    pub statuses: Option<Vec<stoneflow_domain::WorkStatus>>,
    /// 可选 priority 白名单；`None` 或空 = 不限。
    pub priorities: Option<Vec<i32>>,
    /// 可选日期筛选。
    pub date_filter: Option<TaskListDateFilter>,
    /// 页大小；`None` 表示不限制（兼容旧全量路径，新主路径应始终带 limit）。
    pub limit: Option<u32>,
    /// keyset 游标；`None` 表示第一页。
    pub cursor: Option<TaskListCursor>,
}

/// 列表 Scope 内部表示。
#[derive(Debug, Clone)]
pub(crate) struct TaskScope {
    pub space_id: Option<String>,
}

/// 创建时的归属（无 All；list 用 {@link TaskPlacementQuery}）。
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum CreatePlacement {
    Project(String),
    Standalone,
}

/// 内置 viewKey 预设。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum TaskViewPreset {
    Lifecycle(TaskLifecycleView),
    Today,
    Focus,
    Upcoming,
    Overdue,
}

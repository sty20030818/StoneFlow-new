//! Task 读模型与列表查询内部类型。

use stoneflow_domain::TaskStatus;

/// Task 持久化读模型。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TaskRecord {
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

/// 创建 Task 的持久化输入。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CreateTaskPersistenceRecord {
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
    pub created_at: String,
    pub updated_at: String,
}

/// 更新 Task 基础字段 patch。
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct UpdateTaskPatch {
    pub title: Option<String>,
    pub note: Option<Option<String>>,
    pub status: Option<TaskStatus>,
    pub status_changed_at: Option<String>,
    pub priority: Option<i32>,
    pub space_id: Option<String>,
    pub project_id: Option<Option<String>>,
    pub inbox_at: Option<Option<String>>,
    pub due_at: Option<Option<String>>,
    pub scheduled_at: Option<Option<String>>,
    pub reminder_at: Option<Option<String>>,
    pub sort_order: Option<i32>,
    pub completed_at: Option<Option<String>>,
    pub canceled_at: Option<Option<String>>,
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

/// Task 列表 placement 查询。
#[derive(Debug, Clone, PartialEq, Eq, Default)]
pub enum TaskPlacementQuery {
    #[default]
    All,
    Project(String),
    Inbox,
    NoProject,
}

/// Task 列表查询条件。
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct TaskListQuery {
    pub space_id: Option<String>,
    pub placement: TaskPlacementQuery,
    pub lifecycle: TaskLifecycleView,
}

/// 列表 Scope 内部表示。
#[derive(Debug, Clone)]
pub(crate) struct TaskScope {
    pub space_id: Option<String>,
}

/// 列表 / 创建 placement 内部表示。
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum TaskPlacement {
    All,
    Project(String),
    Inbox,
    NoProject,
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

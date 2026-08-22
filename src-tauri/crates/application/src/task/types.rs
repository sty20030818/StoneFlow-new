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

/// Task 查询 keyset 游标（与 ORDER BY position, id 一致）。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TaskQueryCursor {
    pub position: i64,
    pub id: String,
}

/// 创建时的归属（无 All；list 用 {@link TaskPlacementQuery}）。
#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum CreatePlacement {
    Project(String),
    Standalone,
}

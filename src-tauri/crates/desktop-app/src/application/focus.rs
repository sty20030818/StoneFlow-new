//! M3-A 阶段的 Focus 查询与 pin 动作用例。

use anyhow::{bail, Context, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use stoneflow_core::FocusViewType;
use uuid::Uuid;

use crate::application::create::{normalize_required_text, resolve_active_space};
use crate::infrastructure::{
    database::DatabaseState,
    repositories::{FocusViewRepository, SpaceRepository, TaskRepository},
};

const SYSTEM_FOCUS_KEY_FOCUS: &str = "focus";
const SYSTEM_FOCUS_KEY_UPCOMING: &str = "upcoming";
const SYSTEM_FOCUS_KEY_RECENT: &str = "recent";
const SYSTEM_FOCUS_KEY_HIGH_PRIORITY: &str = "high_priority";

/// 查询当前 Space Focus 视图列表的输入。
#[derive(Debug, Clone, Deserialize)]
pub(crate) struct ListFocusViewsInput {
    pub(crate) space_slug: String,
}

/// 查询单个 Focus 视图任务集合的输入。
#[derive(Debug, Clone, Deserialize)]
pub(crate) struct GetFocusViewTasksInput {
    pub(crate) space_slug: String,
    pub(crate) view_key: String,
}

/// 更新任务 pin 状态的输入。
#[derive(Debug, Clone, Deserialize)]
pub(crate) struct UpdateTaskPinStateInput {
    pub(crate) space_slug: String,
    pub(crate) task_id: Uuid,
    pub(crate) pinned: bool,
}

/// Focus 视图元数据。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub(crate) struct FocusViewPayload {
    pub(crate) id: Uuid,
    pub(crate) key: String,
    pub(crate) name: String,
    pub(crate) sort_order: i32,
    pub(crate) is_enabled: bool,
}

/// 当前 Space 的 Focus 视图列表。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub(crate) struct FocusViewListPayload {
    pub(crate) views: Vec<FocusViewPayload>,
}

/// Focus 任务载荷。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub(crate) struct FocusTaskPayload {
    pub(crate) id: Uuid,
    pub(crate) project_id: Uuid,
    pub(crate) title: String,
    pub(crate) note: Option<String>,
    pub(crate) priority: String,
    pub(crate) status: String,
    pub(crate) pinned: bool,
    pub(crate) due_at: Option<DateTime<Utc>>,
    pub(crate) created_at: DateTime<Utc>,
    pub(crate) updated_at: DateTime<Utc>,
}

/// 单个 Focus 视图的任务快照。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub(crate) struct FocusViewTasksPayload {
    pub(crate) view: FocusViewPayload,
    pub(crate) tasks: Vec<FocusTaskPayload>,
}

/// pin 状态切换结果。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub(crate) struct UpdatedTaskPinStatePayload {
    pub(crate) task_id: Uuid,
    pub(crate) pinned: bool,
    pub(crate) updated_at: DateTime<Utc>,
}

/// 查询当前 Space 的系统 Focus 视图列表。
pub(crate) async fn list_focus_views(
    database: &DatabaseState,
    input: ListFocusViewsInput,
) -> Result<FocusViewListPayload> {
    let space_repository = SpaceRepository::new(&database.connection);
    let focus_view_repository = FocusViewRepository::new(&database.connection);

    let space_slug = normalize_required_text(&input.space_slug, "space slug")?;
    let space = resolve_active_space(&space_repository, &space_slug).await?;
    let views = focus_view_repository
        .list_enabled_system_by_space(space.id)
        .await?;

    Ok(FocusViewListPayload {
        views: views
            .into_iter()
            .map(|view| FocusViewPayload {
                id: view.id,
                key: view.key,
                name: view.name,
                sort_order: view.sort_order,
                is_enabled: view.is_enabled,
            })
            .collect(),
    })
}

/// 查询单个系统 Focus 视图的任务集合。
pub(crate) async fn get_focus_view_tasks(
    database: &DatabaseState,
    input: GetFocusViewTasksInput,
) -> Result<FocusViewTasksPayload> {
    let space_repository = SpaceRepository::new(&database.connection);
    let focus_view_repository = FocusViewRepository::new(&database.connection);
    let task_repository = TaskRepository::new(&database.connection);

    let space_slug = normalize_required_text(&input.space_slug, "space slug")?;
    let focus_view_key = normalize_focus_view_key(&input.view_key)?;
    let space = resolve_active_space(&space_repository, &space_slug).await?;
    let view = focus_view_repository
        .find_by_space_and_key(space.id, focus_view_key)
        .await?
        .with_context(|| {
            format!("focus view `{focus_view_key}` does not exist for space `{space_slug}`")
        })?;

    if view.r#type != FocusViewType::System.as_str() {
        bail!("focus view `{focus_view_key}` is not a system view");
    }

    if !view.is_enabled {
        bail!("focus view `{focus_view_key}` is disabled");
    }

    let tasks = task_repository
        .list_focus_view_tasks(space.id, focus_view_key)
        .await?;

    Ok(FocusViewTasksPayload {
        view: FocusViewPayload {
            id: view.id,
            key: view.key,
            name: view.name,
            sort_order: view.sort_order,
            is_enabled: view.is_enabled,
        },
        tasks: tasks
            .into_iter()
            .map(|task| {
                Ok(FocusTaskPayload {
                    id: task.id,
                    project_id: task
                        .project_id
                        .with_context(|| format!("focus task `{}` must have a project", task.id))?,
                    title: task.title,
                    note: task.note,
                    priority: task.priority.with_context(|| {
                        format!("focus task `{}` must have a priority", task.id)
                    })?,
                    status: task.status,
                    pinned: task.pinned,
                    due_at: task.due_at,
                    created_at: task.created_at,
                    updated_at: task.updated_at,
                })
            })
            .collect::<Result<Vec<_>>>()?,
    })
}

/// 更新任务 pin 状态。
pub(crate) async fn update_task_pin_state(
    database: &DatabaseState,
    input: UpdateTaskPinStateInput,
) -> Result<UpdatedTaskPinStatePayload> {
    let space_repository = SpaceRepository::new(&database.connection);
    let task_repository = TaskRepository::new(&database.connection);

    let space_slug = normalize_required_text(&input.space_slug, "space slug")?;
    let space = resolve_active_space(&space_repository, &space_slug).await?;
    let current_task = task_repository
        .find_active_by_id(input.task_id)
        .await?
        .with_context(|| format!("task `{}` does not exist", input.task_id))?;

    if current_task.space_id != space.id {
        bail!(
            "task `{}` does not belong to space `{space_slug}`",
            current_task.id
        );
    }

    if current_task.pinned == input.pinned {
        bail!(
            "pin state request does not change task `{}`",
            current_task.id
        );
    }

    let updated_task = task_repository
        .update_task_pin_state(current_task, input.pinned)
        .await?;

    Ok(UpdatedTaskPinStatePayload {
        task_id: updated_task.id,
        pinned: updated_task.pinned,
        updated_at: updated_task.updated_at,
    })
}

pub(crate) fn normalize_focus_view_key(value: &str) -> Result<&'static str> {
    let normalized = value.trim().to_ascii_lowercase();

    match normalized.as_str() {
        SYSTEM_FOCUS_KEY_FOCUS => Ok(SYSTEM_FOCUS_KEY_FOCUS),
        SYSTEM_FOCUS_KEY_UPCOMING => Ok(SYSTEM_FOCUS_KEY_UPCOMING),
        SYSTEM_FOCUS_KEY_RECENT => Ok(SYSTEM_FOCUS_KEY_RECENT),
        SYSTEM_FOCUS_KEY_HIGH_PRIORITY => Ok(SYSTEM_FOCUS_KEY_HIGH_PRIORITY),
        _ => bail!(
            "focus view key must be one of `{}`, `{}`, `{}`, `{}`",
            SYSTEM_FOCUS_KEY_FOCUS,
            SYSTEM_FOCUS_KEY_UPCOMING,
            SYSTEM_FOCUS_KEY_RECENT,
            SYSTEM_FOCUS_KEY_HIGH_PRIORITY
        ),
    }
}

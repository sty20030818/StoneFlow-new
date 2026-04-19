//! M2-E 阶段的 Task Drawer 详情与编辑用例。

use anyhow::{bail, Context, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::application::create::{
    normalize_required_text, resolve_active_space, PROJECT_STATUS_ACTIVE,
};
use crate::application::inbox::normalize_priority;
use crate::application::project::normalize_project_task_status;
use crate::infrastructure::{
    database::DatabaseState,
    repositories::{
        ProjectRepository, SpaceRepository, TaskRepository, UpdateTaskDrawerFieldsParams,
    },
};

/// 查询单任务 Drawer 详情的输入。
#[derive(Debug, Clone, Deserialize)]
pub(crate) struct GetTaskDrawerDetailInput {
    pub(crate) space_slug: String,
    pub(crate) task_id: Uuid,
}

/// 保存 Task Drawer 基础字段的输入。
#[derive(Debug, Clone, Deserialize)]
pub(crate) struct UpdateTaskDrawerFieldsInput {
    pub(crate) space_slug: String,
    pub(crate) task_id: Uuid,
    pub(crate) title: String,
    pub(crate) note: Option<String>,
    pub(crate) priority: Option<String>,
    pub(crate) project_id: Option<Uuid>,
    pub(crate) status: String,
}

/// Drawer 中可选 Project 的最小载荷。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub(crate) struct TaskDrawerProjectOptionPayload {
    pub(crate) id: Uuid,
    pub(crate) name: String,
    pub(crate) sort_order: i32,
}

/// Drawer 中任务详情载荷。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub(crate) struct TaskDrawerTaskPayload {
    pub(crate) id: Uuid,
    pub(crate) title: String,
    pub(crate) note: Option<String>,
    pub(crate) priority: Option<String>,
    pub(crate) project_id: Option<Uuid>,
    pub(crate) status: String,
    pub(crate) created_at: DateTime<Utc>,
    pub(crate) updated_at: DateTime<Utc>,
    pub(crate) completed_at: Option<DateTime<Utc>>,
}

/// 单任务 Drawer 的完整详情。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub(crate) struct TaskDrawerDetailPayload {
    pub(crate) task: TaskDrawerTaskPayload,
    pub(crate) projects: Vec<TaskDrawerProjectOptionPayload>,
}

/// 保存 Drawer 后返回的最新任务快照。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub(crate) struct UpdatedTaskDrawerPayload {
    pub(crate) task: TaskDrawerTaskPayload,
}

/// 查询单个 Task Drawer 的真实详情。
pub(crate) async fn get_task_drawer_detail(
    database: &DatabaseState,
    input: GetTaskDrawerDetailInput,
) -> Result<TaskDrawerDetailPayload> {
    let space_repository = SpaceRepository::new(&database.connection);
    let project_repository = ProjectRepository::new(&database.connection);
    let task_repository = TaskRepository::new(&database.connection);

    let space_slug = normalize_required_text(&input.space_slug, "space slug")?;
    let space = resolve_active_space(&space_repository, &space_slug).await?;
    let task = task_repository
        .find_active_by_id(input.task_id)
        .await?
        .with_context(|| format!("task `{}` does not exist", input.task_id))?;

    if task.space_id != space.id {
        bail!("task `{}` does not belong to space `{space_slug}`", task.id);
    }

    let projects = project_repository.list_active_by_space(space.id).await?;

    Ok(TaskDrawerDetailPayload {
        task: map_task_drawer_task(task),
        projects: projects
            .into_iter()
            .map(|project| TaskDrawerProjectOptionPayload {
                id: project.id,
                name: project.name,
                sort_order: project.sort_order,
            })
            .collect(),
    })
}

/// 保存 Task Drawer 基础字段。
pub(crate) async fn update_task_drawer_fields(
    database: &DatabaseState,
    input: UpdateTaskDrawerFieldsInput,
) -> Result<UpdatedTaskDrawerPayload> {
    let space_repository = SpaceRepository::new(&database.connection);
    let project_repository = ProjectRepository::new(&database.connection);
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

    let next_title = normalize_required_text(&input.title, "task title")?.to_owned();
    let next_note = normalize_optional_text(input.note.as_deref());
    let next_priority = normalize_optional_priority(input.priority.as_deref())?;
    let next_status = normalize_project_task_status(&input.status)?;

    let next_project_id = match input.project_id {
        Some(project_id) => {
            let project = project_repository
                .find_active_by_id(project_id)
                .await?
                .with_context(|| format!("project `{project_id}` does not exist"))?;

            if project.space_id != space.id {
                bail!("project `{project_id}` does not belong to space `{space_slug}`");
            }

            if project.status != PROJECT_STATUS_ACTIVE {
                bail!("project `{project_id}` is not active");
            }

            Some(project.id)
        }
        None => None,
    };

    let no_field_changes = current_task.title == next_title
        && current_task.note == next_note
        && current_task.priority == next_priority
        && current_task.project_id == next_project_id
        && current_task.status == next_status;

    if no_field_changes {
        bail!(
            "task drawer update request does not change task `{}`",
            current_task.id
        );
    }

    let completed_at = if next_status == "done" {
        current_task.completed_at.or_else(|| Some(Utc::now()))
    } else {
        None
    };

    let updated_task = task_repository
        .update_task_drawer_fields(
            current_task,
            UpdateTaskDrawerFieldsParams {
                title: &next_title,
                note: next_note.as_deref(),
                priority: next_priority.as_deref(),
                project_id: next_project_id,
                status: next_status,
                completed_at,
            },
        )
        .await?;

    Ok(UpdatedTaskDrawerPayload {
        task: map_task_drawer_task(updated_task),
    })
}

fn normalize_optional_priority(value: Option<&str>) -> Result<Option<String>> {
    match value {
        Some(priority) if !priority.trim().is_empty() => normalize_priority(priority).map(Some),
        _ => Ok(None),
    }
}

fn normalize_optional_text(value: Option<&str>) -> Option<String> {
    value.and_then(|text| {
        let normalized = text.trim();

        if normalized.is_empty() {
            None
        } else {
            Some(normalized.to_owned())
        }
    })
}

fn map_task_drawer_task(task: stoneflow_entity::task::Model) -> TaskDrawerTaskPayload {
    TaskDrawerTaskPayload {
        id: task.id,
        title: task.title,
        note: task.note,
        priority: task.priority,
        project_id: task.project_id,
        status: task.status,
        created_at: task.created_at,
        updated_at: task.updated_at,
        completed_at: task.completed_at,
    }
}

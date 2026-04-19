//! M2-C 阶段的 Inbox 查询与整理用例。

use anyhow::{bail, Context, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::application::create::{
    normalize_required_text, resolve_active_space, PROJECT_STATUS_ACTIVE, TASK_STATUS_TODO,
};
use crate::infrastructure::{
    database::DatabaseState,
    repositories::{ProjectRepository, SpaceRepository, TaskRepository},
};

const TASK_PRIORITY_LOW: &str = "low";
const TASK_PRIORITY_MEDIUM: &str = "medium";
const TASK_PRIORITY_HIGH: &str = "high";
const TASK_PRIORITY_URGENT: &str = "urgent";
const TASK_PRIORITIES: [&str; 4] = [
    TASK_PRIORITY_LOW,
    TASK_PRIORITY_MEDIUM,
    TASK_PRIORITY_HIGH,
    TASK_PRIORITY_URGENT,
];

/// 查询 Inbox 的输入。
#[derive(Debug, Clone, Deserialize)]
pub(crate) struct ListInboxTasksInput {
    pub(crate) space_slug: String,
}

/// 整理单个 Inbox Task 的输入。
#[derive(Debug, Clone, Deserialize)]
pub(crate) struct TriageInboxTaskInput {
    pub(crate) space_slug: String,
    pub(crate) task_id: Uuid,
    pub(crate) project_id: Option<Uuid>,
    pub(crate) priority: Option<String>,
}

/// Inbox 中可整理 Task 的最小载荷。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub(crate) struct InboxTaskPayload {
    pub(crate) id: Uuid,
    pub(crate) project_id: Option<Uuid>,
    pub(crate) title: String,
    pub(crate) note: Option<String>,
    pub(crate) status: String,
    pub(crate) priority: Option<String>,
    pub(crate) created_at: DateTime<Utc>,
    pub(crate) updated_at: DateTime<Utc>,
}

/// Inbox 可用 Project 选项。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub(crate) struct InboxProjectOptionPayload {
    pub(crate) id: Uuid,
    pub(crate) name: String,
    pub(crate) sort_order: i32,
}

/// Inbox 列表快照。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub(crate) struct InboxSnapshotPayload {
    pub(crate) tasks: Vec<InboxTaskPayload>,
    pub(crate) projects: Vec<InboxProjectOptionPayload>,
}

/// 单任务整理后的返回载荷。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub(crate) struct TriageInboxTaskPayload {
    pub(crate) task_id: Uuid,
    pub(crate) project_id: Option<Uuid>,
    pub(crate) priority: Option<String>,
    pub(crate) status: String,
    pub(crate) remains_in_inbox: bool,
    pub(crate) updated_at: DateTime<Utc>,
}

/// 查询当前 Space 的 Inbox 列表和可选 Project。
pub(crate) async fn list_inbox_tasks(
    database: &DatabaseState,
    input: ListInboxTasksInput,
) -> Result<InboxSnapshotPayload> {
    let space_repository = SpaceRepository::new(&database.connection);
    let task_repository = TaskRepository::new(&database.connection);
    let project_repository = ProjectRepository::new(&database.connection);

    let space_slug = normalize_required_text(&input.space_slug, "space slug")?;
    let space = resolve_active_space(&space_repository, &space_slug).await?;

    let tasks = task_repository.list_inbox_by_space(space.id).await?;
    let projects = project_repository.list_active_by_space(space.id).await?;

    Ok(InboxSnapshotPayload {
        tasks: tasks
            .into_iter()
            .map(|task| InboxTaskPayload {
                id: task.id,
                project_id: task.project_id,
                title: task.title,
                note: task.note,
                status: task.status,
                priority: task.priority,
                created_at: task.created_at,
                updated_at: task.updated_at,
            })
            .collect(),
        projects: projects
            .into_iter()
            .map(|project| InboxProjectOptionPayload {
                id: project.id,
                name: project.name,
                sort_order: project.sort_order,
            })
            .collect(),
    })
}

/// 整理单个 Inbox Task。
pub(crate) async fn triage_inbox_task(
    database: &DatabaseState,
    input: TriageInboxTaskInput,
) -> Result<TriageInboxTaskPayload> {
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

    if current_task.status != TASK_STATUS_TODO {
        bail!(
            "task `{}` is not triageable because status is `{}`",
            current_task.id,
            current_task.status
        );
    }

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

    let next_priority = input
        .priority
        .map(|priority| normalize_priority(&priority))
        .transpose()?;

    let project_changed = next_project_id
        .map(|project_id| current_task.project_id != Some(project_id))
        .unwrap_or(false);
    let priority_changed = next_priority
        .as_deref()
        .map(|priority| current_task.priority.as_deref() != Some(priority))
        .unwrap_or(false);

    if !project_changed && !priority_changed {
        bail!("triage request does not change task `{}`", current_task.id);
    }

    let updated_task = task_repository
        .update_inbox_triage(current_task, next_project_id, next_priority.as_deref())
        .await?;

    Ok(TriageInboxTaskPayload {
        task_id: updated_task.id,
        project_id: updated_task.project_id,
        priority: updated_task.priority.clone(),
        status: updated_task.status.clone(),
        remains_in_inbox: is_inbox_task(
            &updated_task.status,
            updated_task.project_id,
            updated_task.priority.as_deref(),
        ),
        updated_at: updated_task.updated_at,
    })
}

pub(crate) fn is_inbox_task(
    status: &str,
    project_id: Option<Uuid>,
    priority: Option<&str>,
) -> bool {
    status == TASK_STATUS_TODO
        && (project_id.is_none()
            || priority
                .map(|value| value.trim().is_empty())
                .unwrap_or(true))
}

pub(crate) fn normalize_priority(value: &str) -> Result<String> {
    let normalized = value.trim().to_ascii_lowercase();

    if normalized.is_empty() {
        bail!("task priority cannot be empty");
    }

    if !TASK_PRIORITIES.contains(&normalized.as_str()) {
        bail!(
            "task priority must be one of `{}`, `{}`, `{}`, `{}`",
            TASK_PRIORITY_LOW,
            TASK_PRIORITY_MEDIUM,
            TASK_PRIORITY_HIGH,
            TASK_PRIORITY_URGENT
        );
    }

    Ok(normalized)
}

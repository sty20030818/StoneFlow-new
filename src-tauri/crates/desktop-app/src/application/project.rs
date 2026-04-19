//! M2-D 阶段的 Project 执行视图用例。

use anyhow::{bail, Context, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::application::create::{
    normalize_required_text, resolve_active_space, PROJECT_STATUS_ACTIVE, TASK_STATUS_DONE,
    TASK_STATUS_TODO,
};
use crate::infrastructure::{
    database::DatabaseState,
    repositories::{ProjectRepository, SpaceRepository, TaskRepository},
};

/// 查询当前 Space Project 列表的输入。
#[derive(Debug, Clone, Deserialize)]
pub(crate) struct ListProjectsInput {
    pub(crate) space_slug: String,
}

/// 查询单个 Project 执行视图的输入。
#[derive(Debug, Clone, Deserialize)]
pub(crate) struct GetProjectExecutionViewInput {
    pub(crate) space_slug: String,
    pub(crate) project_id: Uuid,
}

/// 更新 Project 任务状态的输入。
#[derive(Debug, Clone, Deserialize)]
pub(crate) struct UpdateProjectTaskStatusInput {
    pub(crate) space_slug: String,
    pub(crate) project_id: Uuid,
    pub(crate) task_id: Uuid,
    pub(crate) status: String,
}

/// Shell / Project 导航使用的最小项目载荷。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub(crate) struct ProjectListItemPayload {
    pub(crate) id: Uuid,
    pub(crate) name: String,
    pub(crate) status: String,
    pub(crate) sort_order: i32,
}

/// 当前 Space 的真实 Project 列表。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub(crate) struct ProjectListPayload {
    pub(crate) projects: Vec<ProjectListItemPayload>,
}

/// Project 摘要载荷。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub(crate) struct ProjectExecutionProjectPayload {
    pub(crate) id: Uuid,
    pub(crate) name: String,
    pub(crate) status: String,
    pub(crate) sort_order: i32,
}

/// Project 执行页使用的任务载荷。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub(crate) struct ProjectExecutionTaskPayload {
    pub(crate) id: Uuid,
    pub(crate) title: String,
    pub(crate) note: Option<String>,
    pub(crate) priority: String,
    pub(crate) status: String,
    pub(crate) completed_at: Option<DateTime<Utc>>,
    pub(crate) updated_at: DateTime<Utc>,
}

/// 单个 Project 的执行视图快照。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub(crate) struct ProjectExecutionViewPayload {
    pub(crate) project: ProjectExecutionProjectPayload,
    pub(crate) tasks: Vec<ProjectExecutionTaskPayload>,
}

/// 更新任务状态后的返回载荷。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub(crate) struct UpdatedProjectTaskStatusPayload {
    pub(crate) task_id: Uuid,
    pub(crate) status: String,
    pub(crate) completed_at: Option<DateTime<Utc>>,
    pub(crate) updated_at: DateTime<Utc>,
}

/// 查询当前 Space 的真实 Project 列表。
pub(crate) async fn list_projects(
    database: &DatabaseState,
    input: ListProjectsInput,
) -> Result<ProjectListPayload> {
    let space_repository = SpaceRepository::new(&database.connection);
    let project_repository = ProjectRepository::new(&database.connection);

    let space_slug = normalize_required_text(&input.space_slug, "space slug")?;
    let space = resolve_active_space(&space_repository, &space_slug).await?;
    let projects = project_repository.list_active_by_space(space.id).await?;

    Ok(ProjectListPayload {
        projects: projects
            .into_iter()
            .map(|project| ProjectListItemPayload {
                id: project.id,
                name: project.name,
                status: project.status,
                sort_order: project.sort_order,
            })
            .collect(),
    })
}

/// 查询单个 Project 的执行视图。
pub(crate) async fn get_project_execution_view(
    database: &DatabaseState,
    input: GetProjectExecutionViewInput,
) -> Result<ProjectExecutionViewPayload> {
    let space_repository = SpaceRepository::new(&database.connection);
    let project_repository = ProjectRepository::new(&database.connection);
    let task_repository = TaskRepository::new(&database.connection);

    let space_slug = normalize_required_text(&input.space_slug, "space slug")?;
    let space = resolve_active_space(&space_repository, &space_slug).await?;
    let project = project_repository
        .find_active_by_id(input.project_id)
        .await?
        .with_context(|| format!("project `{}` does not exist", input.project_id))?;

    if project.space_id != space.id {
        bail!(
            "project `{}` does not belong to space `{space_slug}`",
            project.id
        );
    }

    if project.status != PROJECT_STATUS_ACTIVE {
        bail!("project `{}` is not active", project.id);
    }

    let tasks = task_repository
        .list_project_execution_tasks(space.id, project.id)
        .await?;

    Ok(ProjectExecutionViewPayload {
        project: ProjectExecutionProjectPayload {
            id: project.id,
            name: project.name,
            status: project.status,
            sort_order: project.sort_order,
        },
        tasks: tasks
            .into_iter()
            .map(|task| ProjectExecutionTaskPayload {
                id: task.id,
                title: task.title,
                note: task.note,
                priority: task.priority.unwrap_or_default(),
                status: task.status,
                completed_at: task.completed_at,
                updated_at: task.updated_at,
            })
            .collect(),
    })
}

/// 在 Project 中切换任务状态。
pub(crate) async fn update_project_task_status(
    database: &DatabaseState,
    input: UpdateProjectTaskStatusInput,
) -> Result<UpdatedProjectTaskStatusPayload> {
    let space_repository = SpaceRepository::new(&database.connection);
    let project_repository = ProjectRepository::new(&database.connection);
    let task_repository = TaskRepository::new(&database.connection);

    let space_slug = normalize_required_text(&input.space_slug, "space slug")?;
    let space = resolve_active_space(&space_repository, &space_slug).await?;
    let next_status = normalize_project_task_status(&input.status)?;
    let project = project_repository
        .find_active_by_id(input.project_id)
        .await?
        .with_context(|| format!("project `{}` does not exist", input.project_id))?;

    if project.space_id != space.id {
        bail!(
            "project `{}` does not belong to space `{space_slug}`",
            project.id
        );
    }

    if project.status != PROJECT_STATUS_ACTIVE {
        bail!("project `{}` is not active", project.id);
    }

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

    if current_task.project_id != Some(project.id) {
        bail!(
            "task `{}` does not belong to project `{}`",
            current_task.id,
            project.id
        );
    }

    if !is_project_execution_task(&current_task) {
        bail!(
            "task `{}` is not executable in project view",
            current_task.id
        );
    }

    if current_task.status == next_status {
        bail!(
            "project task status request does not change task `{}`",
            current_task.id
        );
    }

    let completed_at = if next_status == TASK_STATUS_DONE {
        Some(Utc::now())
    } else {
        None
    };

    let updated_task = task_repository
        .update_project_task_status(current_task, next_status, completed_at)
        .await?;

    Ok(UpdatedProjectTaskStatusPayload {
        task_id: updated_task.id,
        status: updated_task.status,
        completed_at: updated_task.completed_at,
        updated_at: updated_task.updated_at,
    })
}

pub(crate) fn is_project_execution_task(task: &stoneflow_entity::task::Model) -> bool {
    task.deleted_at.is_none()
        && task.project_id.is_some()
        && task.priority.is_some()
        && matches!(task.status.as_str(), TASK_STATUS_TODO | TASK_STATUS_DONE)
}

pub(crate) fn normalize_project_task_status(value: &str) -> Result<&'static str> {
    let normalized = value.trim().to_ascii_lowercase();

    match normalized.as_str() {
        TASK_STATUS_TODO => Ok(TASK_STATUS_TODO),
        TASK_STATUS_DONE => Ok(TASK_STATUS_DONE),
        _ => bail!("project task status must be `todo` or `done`"),
    }
}

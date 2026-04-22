//! M2-B 阶段的基础创建用例，以及 M4-A 捕获底座复用的创建语义。

use std::sync::Mutex;

use anyhow::{anyhow, bail, Context, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use stoneflow_core::default_space_seed;
use uuid::Uuid;

use sea_orm::ConnectionTrait;

use crate::application::inbox::normalize_priority;
use crate::infrastructure::{
    database::DatabaseState,
    repositories::{CreateTaskParams, ProjectRepository, SpaceRepository, TaskRepository},
    seed::initialize_system_focus_views,
};

pub(crate) const PROJECT_STATUS_ACTIVE: &str = "active";
pub(crate) const TASK_STATUS_TODO: &str = "todo";
pub(crate) const TASK_STATUS_DONE: &str = "done";
const TASK_SOURCE_IN_APP_CAPTURE: &str = "in_app_capture";
const TASK_SOURCE_QUICK_CAPTURE: &str = "quick_capture";

/// 当前 Space 的轻量运行时状态。
///
/// 这里保存稳定 `space_id`，业务实体仍然只使用既有 Space 表。
#[derive(Debug, Default)]
pub(crate) struct ActiveSpaceState {
    active_space_id: Mutex<Option<Uuid>>,
}

impl ActiveSpaceState {
    pub(crate) fn set(&self, space_id: Uuid) -> Result<()> {
        let mut active_space_id = self
            .active_space_id
            .lock()
            .map_err(|_| anyhow!("active space state lock is poisoned"))?;
        *active_space_id = Some(space_id);
        Ok(())
    }

    pub(crate) fn get(&self) -> Result<Option<Uuid>> {
        let active_space_id = self
            .active_space_id
            .lock()
            .map_err(|_| anyhow!("active space state lock is poisoned"))?;
        Ok(*active_space_id)
    }
}

/// 创建 Space 的输入。
#[derive(Debug, Clone, Deserialize)]
pub(crate) struct CreateSpaceInput {
    pub(crate) name: String,
}

/// 创建 Project 的输入。
#[derive(Debug, Clone, Deserialize)]
pub(crate) struct CreateProjectInput {
    pub(crate) space_slug: String,
    pub(crate) name: String,
    pub(crate) note: Option<String>,
    pub(crate) parent_project_id: Option<Uuid>,
}

/// 创建 Task 的输入。
#[derive(Debug, Clone, Deserialize)]
pub(crate) struct CreateTaskInput {
    pub(crate) space_slug: String,
    pub(crate) title: String,
    pub(crate) note: Option<String>,
    pub(crate) priority: Option<String>,
    pub(crate) project_id: Option<Uuid>,
}

/// 写入当前 Space 状态的输入。
#[derive(Debug, Clone, Deserialize)]
pub(crate) struct SetActiveSpaceInput {
    pub(crate) space_slug: String,
}

/// 系统级捕获准备入口的最小输入。
#[derive(Debug, Clone, Deserialize)]
pub(crate) struct CaptureTaskInput {
    pub(crate) title: String,
    pub(crate) note: Option<String>,
    pub(crate) priority: Option<String>,
}

/// 创建 Space 的返回载荷。
#[derive(Debug, Clone, Serialize)]
pub(crate) struct CreatedSpacePayload {
    pub(crate) id: Uuid,
    pub(crate) name: String,
    pub(crate) slug: String,
    pub(crate) sort_order: i32,
    pub(crate) created_at: DateTime<Utc>,
    pub(crate) updated_at: DateTime<Utc>,
}

/// 创建 Project 的返回载荷。
#[derive(Debug, Clone, Serialize)]
pub(crate) struct CreatedProjectPayload {
    pub(crate) id: Uuid,
    pub(crate) space_id: Uuid,
    pub(crate) parent_project_id: Option<Uuid>,
    pub(crate) name: String,
    pub(crate) status: String,
    pub(crate) note: Option<String>,
    pub(crate) sort_order: i32,
    pub(crate) created_at: DateTime<Utc>,
    pub(crate) updated_at: DateTime<Utc>,
}

/// 创建 Task 的返回载荷。
#[derive(Debug, Clone, Serialize)]
pub(crate) struct CreatedTaskPayload {
    pub(crate) id: Uuid,
    pub(crate) space_id: Uuid,
    pub(crate) project_id: Option<Uuid>,
    pub(crate) title: String,
    pub(crate) status: String,
    pub(crate) priority: Option<String>,
    pub(crate) note: Option<String>,
    pub(crate) source: String,
    pub(crate) space_fallback: bool,
    pub(crate) created_at: DateTime<Utc>,
    pub(crate) updated_at: DateTime<Utc>,
}

/// 当前 Space 状态写入结果。
#[derive(Debug, Clone, Serialize)]
pub(crate) struct ActiveSpacePayload {
    pub(crate) active_space_id: Uuid,
    pub(crate) space_slug: String,
}

/// 创建 Space，并补齐系统 FocusView。
pub(crate) async fn create_space(
    database: &DatabaseState,
    input: CreateSpaceInput,
) -> Result<CreatedSpacePayload> {
    let space_repository = SpaceRepository::new(&database.connection);

    let name = normalize_required_text(&input.name, "space name")?;
    let slug = normalize_slug(&name);

    if slug.is_empty() {
        bail!("space slug cannot be empty after normalization");
    }

    if space_repository.find_by_slug(&slug).await?.is_some() {
        bail!("space slug `{slug}` already exists");
    }

    let sort_order = space_repository.next_sort_order().await?;
    let created_space = space_repository
        .create_space(&name, &slug, sort_order)
        .await?;

    initialize_system_focus_views(&database.connection, created_space.id).await?;

    Ok(CreatedSpacePayload {
        id: created_space.id,
        name: created_space.name,
        slug: created_space.slug,
        sort_order: created_space.sort_order,
        created_at: created_space.created_at,
        updated_at: created_space.updated_at,
    })
}

/// 创建顶层 Project。
pub(crate) async fn create_project(
    database: &DatabaseState,
    input: CreateProjectInput,
) -> Result<CreatedProjectPayload> {
    let space_repository = SpaceRepository::new(&database.connection);
    let project_repository = ProjectRepository::new(&database.connection);

    let space_slug = normalize_required_text(&input.space_slug, "space slug")?;
    let name = normalize_required_text(&input.name, "project name")?;
    let note = normalize_optional_text(input.note);
    let space = resolve_active_space(&space_repository, &space_slug).await?;
    if let Some(parent_project_id) = input.parent_project_id {
        let parent_project = project_repository
            .find_active_by_id(parent_project_id)
            .await?
            .with_context(|| format!("parent project `{parent_project_id}` does not exist"))?;

        if parent_project.space_id != space.id {
            bail!("parent project `{parent_project_id}` does not belong to space `{space_slug}`");
        }

        if parent_project.status != PROJECT_STATUS_ACTIVE {
            bail!("parent project `{parent_project_id}` is not active");
        }

        if parent_project.parent_project_id.is_some() {
            bail!("StoneFlow V1 only supports one-level subprojects");
        }
    }

    let sort_order = project_repository
        .next_sort_order(space.id, input.parent_project_id)
        .await?;

    let created_project = project_repository
        .create_project(
            space.id,
            input.parent_project_id,
            &name,
            note.as_deref(),
            PROJECT_STATUS_ACTIVE,
            sort_order,
        )
        .await?;

    Ok(CreatedProjectPayload {
        id: created_project.id,
        space_id: created_project.space_id,
        parent_project_id: created_project.parent_project_id,
        name: created_project.name,
        status: created_project.status,
        note: created_project.note,
        sort_order: created_project.sort_order,
        created_at: created_project.created_at,
        updated_at: created_project.updated_at,
    })
}

/// 创建当前 Space Inbox 语义下的 Task。
pub(crate) async fn create_task(
    database: &DatabaseState,
    input: CreateTaskInput,
) -> Result<CreatedTaskPayload> {
    let space_repository = SpaceRepository::new(&database.connection);
    let project_repository = ProjectRepository::new(&database.connection);
    let task_repository = TaskRepository::new(&database.connection);

    let space_slug = normalize_required_text(&input.space_slug, "space slug")?;
    let title = normalize_required_text(&input.title, "task title")?;
    let note = normalize_optional_text(input.note);
    let priority = normalize_optional_priority(input.priority)?;
    let space = resolve_active_space(&space_repository, &space_slug).await?;

    let project_id = match input.project_id {
        Some(project_id) => {
            let project = project_repository
                .find_active_by_id(project_id)
                .await?
                .with_context(|| format!("project `{project_id}` does not exist"))?;

            if project.space_id != space.id {
                bail!("project `{project_id}` does not belong to space `{space_slug}`");
            }

            Some(project.id)
        }
        None => None,
    };

    create_task_in_space(
        &task_repository,
        CreateTaskInSpaceInput {
            space_id: space.id,
            project_id,
            title,
            note,
            priority,
            source: TASK_SOURCE_IN_APP_CAPTURE,
            space_fallback: false,
        },
    )
    .await
}

/// 写入当前活跃 Space 状态，供后续捕获入口读取。
pub(crate) async fn set_active_space(
    database: &DatabaseState,
    active_space_state: &ActiveSpaceState,
    input: SetActiveSpaceInput,
) -> Result<ActiveSpacePayload> {
    let space_repository = SpaceRepository::new(&database.connection);
    let space_slug = normalize_required_text(&input.space_slug, "space slug")?;
    let space = resolve_active_space(&space_repository, &space_slug).await?;

    active_space_state.set(space.id)?;

    Ok(ActiveSpacePayload {
        active_space_id: space.id,
        space_slug: space.slug,
    })
}

/// 系统级捕获准备入口：读取当前 Space，失败时回退默认 Space。
pub(crate) async fn create_capture_task(
    database: &DatabaseState,
    active_space_state: &ActiveSpaceState,
    input: CaptureTaskInput,
) -> Result<CreatedTaskPayload> {
    let space_repository = SpaceRepository::new(&database.connection);
    let task_repository = TaskRepository::new(&database.connection);

    let title = normalize_required_text(&input.title, "task title")?;
    let note = normalize_optional_text(input.note);
    let priority = normalize_optional_priority(input.priority)?;
    let (space, space_fallback) =
        resolve_capture_space(&space_repository, active_space_state).await?;

    create_task_in_space(
        &task_repository,
        CreateTaskInSpaceInput {
            space_id: space.id,
            project_id: None,
            title,
            note,
            priority,
            source: TASK_SOURCE_QUICK_CAPTURE,
            space_fallback,
        },
    )
    .await
}

struct CreateTaskInSpaceInput {
    space_id: Uuid,
    project_id: Option<Uuid>,
    title: String,
    note: Option<String>,
    priority: Option<String>,
    source: &'static str,
    space_fallback: bool,
}

async fn create_task_in_space(
    task_repository: &TaskRepository<'_, impl ConnectionTrait>,
    input: CreateTaskInSpaceInput,
) -> Result<CreatedTaskPayload> {
    let created_task = task_repository
        .create_task(CreateTaskParams {
            space_id: input.space_id,
            project_id: input.project_id,
            title: &input.title,
            note: input.note.as_deref(),
            priority: input.priority.as_deref(),
            status: TASK_STATUS_TODO,
            source: input.source,
        })
        .await?;

    Ok(CreatedTaskPayload {
        id: created_task.id,
        space_id: created_task.space_id,
        project_id: created_task.project_id,
        title: created_task.title,
        status: created_task.status,
        priority: created_task.priority,
        note: created_task.note,
        source: created_task.source,
        space_fallback: input.space_fallback,
        created_at: created_task.created_at,
        updated_at: created_task.updated_at,
    })
}

async fn resolve_capture_space(
    space_repository: &SpaceRepository<'_, impl ConnectionTrait>,
    active_space_state: &ActiveSpaceState,
) -> Result<(stoneflow_entity::space::Model, bool)> {
    if let Some(active_space_id) = active_space_state.get()? {
        if let Some(space) = space_repository.find_by_id(active_space_id).await? {
            if !space.is_archived {
                return Ok((space, false));
            }
        }
    }

    let default_space = resolve_default_space(space_repository).await?;
    Ok((default_space, true))
}

async fn resolve_default_space(
    space_repository: &SpaceRepository<'_, impl ConnectionTrait>,
) -> Result<stoneflow_entity::space::Model> {
    let default_slug = default_space_seed().slug;
    let space = space_repository
        .find_by_slug(default_slug)
        .await?
        .with_context(|| format!("default space `{default_slug}` does not exist"))?;

    if space.is_archived {
        bail!("default space `{default_slug}` is archived");
    }

    Ok(space)
}

pub(crate) async fn resolve_active_space(
    space_repository: &SpaceRepository<'_, impl ConnectionTrait>,
    slug: &str,
) -> Result<stoneflow_entity::space::Model> {
    let space = space_repository
        .find_by_slug(slug)
        .await?
        .with_context(|| format!("space `{slug}` does not exist"))?;

    if space.is_archived {
        bail!("space `{slug}` is archived");
    }

    Ok(space)
}

pub(crate) fn normalize_required_text(value: &str, field_name: &str) -> Result<String> {
    let normalized = value.trim();

    if normalized.is_empty() {
        bail!("{field_name} cannot be empty");
    }

    Ok(normalized.to_owned())
}

pub(crate) fn normalize_optional_text(value: Option<String>) -> Option<String> {
    value.and_then(|item| {
        let normalized = item.trim();
        if normalized.is_empty() {
            None
        } else {
            Some(normalized.to_owned())
        }
    })
}

fn normalize_optional_priority(value: Option<String>) -> Result<Option<String>> {
    match value {
        Some(priority) if priority.trim().is_empty() => Ok(None),
        Some(priority) => Ok(Some(normalize_priority(&priority)?)),
        None => Ok(None),
    }
}

fn normalize_slug(value: &str) -> String {
    let mut slug = String::with_capacity(value.len());
    let mut last_was_dash = false;

    for character in value.chars() {
        if character.is_alphanumeric() {
            for lower in character.to_lowercase() {
                slug.push(lower);
            }
            last_was_dash = false;
            continue;
        }

        if !last_was_dash && !slug.is_empty() {
            slug.push('-');
            last_was_dash = true;
        }
    }

    while slug.ends_with('-') {
        slug.pop();
    }

    slug
}

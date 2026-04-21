//! M2-B 阶段的基础创建用例。

use anyhow::{bail, Context, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
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
    pub(crate) created_at: DateTime<Utc>,
    pub(crate) updated_at: DateTime<Utc>,
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

    let created_task = task_repository
        .create_task(CreateTaskParams {
            space_id: space.id,
            project_id,
            title: &title,
            note: note.as_deref(),
            priority: priority.as_deref(),
            status: TASK_STATUS_TODO,
            source: TASK_SOURCE_IN_APP_CAPTURE,
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
        created_at: created_task.created_at,
        updated_at: created_task.updated_at,
    })
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

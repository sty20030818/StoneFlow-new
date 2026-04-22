//! M3-C 阶段的 Task Resource 挂载与打开用例。

use anyhow::{bail, Context, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::application::create::{normalize_required_text, resolve_active_space};
use crate::infrastructure::{
    database::DatabaseState,
    repositories::{CreateResourceParams, ResourceRepository, SpaceRepository, TaskRepository},
};

pub(crate) const RESOURCE_TYPE_DOC_LINK: &str = "doc_link";
pub(crate) const RESOURCE_TYPE_LOCAL_FILE: &str = "local_file";
pub(crate) const RESOURCE_TYPE_LOCAL_FOLDER: &str = "local_folder";

/// 查询 Task Resource 列表的输入。
#[derive(Debug, Clone, Deserialize)]
pub(crate) struct ListTaskResourcesInput {
    pub(crate) space_slug: String,
    pub(crate) task_id: Uuid,
}

/// 创建 Task Resource 的输入。
#[derive(Debug, Clone, Deserialize)]
pub(crate) struct CreateTaskResourceInput {
    pub(crate) space_slug: String,
    pub(crate) task_id: Uuid,
    pub(crate) r#type: String,
    pub(crate) title: String,
    pub(crate) target: String,
}

/// 打开 Task Resource 的输入。
#[derive(Debug, Clone, Deserialize)]
pub(crate) struct OpenTaskResourceInput {
    pub(crate) space_slug: String,
    pub(crate) resource_id: Uuid,
}

/// 删除 Task Resource 的输入。
#[derive(Debug, Clone, Deserialize)]
pub(crate) struct DeleteTaskResourceInput {
    pub(crate) space_slug: String,
    pub(crate) resource_id: Uuid,
}

/// Task Drawer 使用的 Resource 载荷。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub(crate) struct TaskResourcePayload {
    pub(crate) id: Uuid,
    pub(crate) task_id: Uuid,
    pub(crate) r#type: String,
    pub(crate) title: String,
    pub(crate) target: String,
    pub(crate) sort_order: i32,
    pub(crate) created_at: DateTime<Utc>,
    pub(crate) updated_at: DateTime<Utc>,
}

/// Resource 列表返回载荷。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub(crate) struct TaskResourceListPayload {
    pub(crate) resources: Vec<TaskResourcePayload>,
}

/// Resource 创建返回载荷。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub(crate) struct CreatedTaskResourcePayload {
    pub(crate) resource: TaskResourcePayload,
}

/// Resource 打开返回载荷。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub(crate) struct OpenedTaskResourcePayload {
    pub(crate) resource_id: Uuid,
}

/// Resource 删除返回载荷。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub(crate) struct DeletedTaskResourcePayload {
    pub(crate) resource_id: Uuid,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum ResourceOpenTarget {
    Url(String),
    Path(std::path::PathBuf),
}

/// 查询当前 Task 下挂载的 Resource。
pub(crate) async fn list_task_resources(
    database: &DatabaseState,
    input: ListTaskResourcesInput,
) -> Result<TaskResourceListPayload> {
    let space_slug = normalize_required_text(&input.space_slug, "space slug")?;
    let space_repository = SpaceRepository::new(&database.connection);
    let task_repository = TaskRepository::new(&database.connection);
    let resource_repository = ResourceRepository::new(&database.connection);

    let space = resolve_active_space(&space_repository, &space_slug).await?;
    let task = task_repository
        .find_active_by_id(input.task_id)
        .await?
        .with_context(|| format!("task `{}` does not exist", input.task_id))?;

    if task.space_id != space.id {
        bail!("task `{}` does not belong to space `{space_slug}`", task.id);
    }

    let resources = resource_repository.list_by_task(task.id).await?;

    Ok(TaskResourceListPayload {
        resources: resources.into_iter().map(map_task_resource).collect(),
    })
}

/// 创建新的 Task Resource。
pub(crate) async fn create_task_resource(
    database: &DatabaseState,
    input: CreateTaskResourceInput,
) -> Result<CreatedTaskResourcePayload> {
    let space_slug = normalize_required_text(&input.space_slug, "space slug")?;
    let resource_type = normalize_resource_type(&input.r#type)?;
    let title = normalize_required_text(&input.title, "resource title")?.to_owned();
    let target = normalize_required_text(&input.target, "resource target")?.to_owned();
    validate_resource_target(resource_type, &target)?;

    let space_repository = SpaceRepository::new(&database.connection);
    let task_repository = TaskRepository::new(&database.connection);
    let resource_repository = ResourceRepository::new(&database.connection);

    let space = resolve_active_space(&space_repository, &space_slug).await?;
    let task = task_repository
        .find_active_by_id(input.task_id)
        .await?
        .with_context(|| format!("task `{}` does not exist", input.task_id))?;

    if task.space_id != space.id {
        bail!("task `{}` does not belong to space `{space_slug}`", task.id);
    }

    let sort_order = resource_repository.next_sort_order(task.id).await?;
    let resource = resource_repository
        .create_resource(CreateResourceParams {
            task_id: task.id,
            r#type: resource_type,
            title: &title,
            target: &target,
            sort_order,
        })
        .await?;

    Ok(CreatedTaskResourcePayload {
        resource: map_task_resource(resource),
    })
}

/// 打开已挂载 Resource。
pub(crate) async fn open_task_resource(
    database: &DatabaseState,
    input: OpenTaskResourceInput,
) -> Result<OpenedTaskResourcePayload> {
    let space_slug = normalize_required_text(&input.space_slug, "space slug")?;
    let resource = resolve_resource_in_space(database, &space_slug, input.resource_id).await?;
    let open_target = resolve_open_target(&resource)?;

    match open_target {
        ResourceOpenTarget::Url(url) => tauri_plugin_opener::open_url(url, None::<&str>)
            .context("failed to open resource url")?,
        ResourceOpenTarget::Path(path) => tauri_plugin_opener::open_path(path, None::<&str>)
            .context("failed to open resource path")?,
    }

    Ok(OpenedTaskResourcePayload {
        resource_id: resource.id,
    })
}

/// 删除 Task Resource。Resource 不进入 Trash。
pub(crate) async fn delete_task_resource(
    database: &DatabaseState,
    input: DeleteTaskResourceInput,
) -> Result<DeletedTaskResourcePayload> {
    let space_slug = normalize_required_text(&input.space_slug, "space slug")?;
    let resource = resolve_resource_in_space(database, &space_slug, input.resource_id).await?;
    let resource_repository = ResourceRepository::new(&database.connection);

    resource_repository.delete_resource(resource.id).await?;

    Ok(DeletedTaskResourcePayload {
        resource_id: resource.id,
    })
}

/// 将实体模型转为前端稳定载荷。
pub(crate) fn map_task_resource(
    resource: stoneflow_entity::resource::Model,
) -> TaskResourcePayload {
    TaskResourcePayload {
        id: resource.id,
        task_id: resource.task_id,
        r#type: resource.r#type,
        title: resource.title,
        target: resource.target,
        sort_order: resource.sort_order,
        created_at: resource.created_at,
        updated_at: resource.updated_at,
    }
}

/// 将 Resource 解析成实际打开目标。测试只覆盖该纯边界，避免测试期间唤起系统应用。
pub(crate) fn resolve_open_target(
    resource: &stoneflow_entity::resource::Model,
) -> Result<ResourceOpenTarget> {
    let resource_type = normalize_resource_type(&resource.r#type)?;
    validate_resource_target(resource_type, &resource.target)?;

    match resource_type {
        RESOURCE_TYPE_DOC_LINK => Ok(ResourceOpenTarget::Url(resource.target.clone())),
        RESOURCE_TYPE_LOCAL_FILE | RESOURCE_TYPE_LOCAL_FOLDER => Ok(ResourceOpenTarget::Path(
            std::path::PathBuf::from(&resource.target),
        )),
        _ => unreachable!("resource type should be normalized before matching"),
    }
}

async fn resolve_resource_in_space(
    database: &DatabaseState,
    space_slug: &str,
    resource_id: Uuid,
) -> Result<stoneflow_entity::resource::Model> {
    let space_repository = SpaceRepository::new(&database.connection);
    let task_repository = TaskRepository::new(&database.connection);
    let resource_repository = ResourceRepository::new(&database.connection);

    let space = resolve_active_space(&space_repository, space_slug).await?;
    let resource = resource_repository
        .find_by_id(resource_id)
        .await?
        .with_context(|| format!("resource `{resource_id}` does not exist"))?;
    let task = task_repository
        .find_active_by_id(resource.task_id)
        .await?
        .with_context(|| format!("resource `{resource_id}` task does not exist"))?;

    if task.space_id != space.id {
        bail!("resource `{resource_id}` does not belong to space `{space_slug}`");
    }

    Ok(resource)
}

fn normalize_resource_type(value: &str) -> Result<&'static str> {
    match value.trim() {
        RESOURCE_TYPE_DOC_LINK => Ok(RESOURCE_TYPE_DOC_LINK),
        RESOURCE_TYPE_LOCAL_FILE => Ok(RESOURCE_TYPE_LOCAL_FILE),
        RESOURCE_TYPE_LOCAL_FOLDER => Ok(RESOURCE_TYPE_LOCAL_FOLDER),
        other => bail!("unsupported resource type `{other}`"),
    }
}

fn validate_resource_target(resource_type: &str, target: &str) -> Result<()> {
    match resource_type {
        RESOURCE_TYPE_DOC_LINK => {
            if target.starts_with("https://") || target.starts_with("http://") {
                Ok(())
            } else {
                bail!("doc link resource target must be an http or https url");
            }
        }
        RESOURCE_TYPE_LOCAL_FILE => {
            let path = std::path::Path::new(target);

            if path.is_file() {
                Ok(())
            } else {
                bail!("local file resource target does not point to an existing file");
            }
        }
        RESOURCE_TYPE_LOCAL_FOLDER => {
            let path = std::path::Path::new(target);

            if path.is_dir() {
                Ok(())
            } else {
                bail!("local folder resource target does not point to an existing folder");
            }
        }
        other => bail!("unsupported resource type `{other}`"),
    }
}

//! M3-D 阶段的 Trash 列表与严格原位恢复用例。

use anyhow::{bail, Context, Result};
use chrono::{DateTime, Utc};
use sea_orm::TransactionTrait;
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;

use crate::application::create::{
    normalize_required_text, resolve_active_space, PROJECT_STATUS_ACTIVE,
};
use crate::infrastructure::{
    database::DatabaseState,
    repositories::{ProjectRepository, SpaceRepository, TaskRepository, TrashEntryRepository},
};

const TRASH_ENTITY_TYPE_TASK: &str = "task";
const TRASH_ENTITY_TYPE_PROJECT: &str = "project";

/// 查询 Trash 列表的输入。
#[derive(Debug, Clone, Deserialize)]
pub(crate) struct ListTrashEntriesInput {
    pub(crate) space_slug: String,
}

/// 从 Trash 恢复 Task 的输入。
#[derive(Debug, Clone, Deserialize)]
pub(crate) struct RestoreTaskFromTrashInput {
    pub(crate) space_slug: String,
    pub(crate) trash_entry_id: Uuid,
}

/// 从 Trash 恢复 Project 的输入。
#[derive(Debug, Clone, Deserialize)]
pub(crate) struct RestoreProjectFromTrashInput {
    pub(crate) space_slug: String,
    pub(crate) trash_entry_id: Uuid,
}

/// 删除 Project 到 Trash 的输入。
#[derive(Debug, Clone, Deserialize)]
pub(crate) struct DeleteProjectToTrashInput {
    pub(crate) space_slug: String,
    pub(crate) project_id: Uuid,
}

/// Trash 单项前端展示载荷。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub(crate) struct TrashEntryItemPayload {
    pub(crate) id: Uuid,
    pub(crate) entity_type: String,
    pub(crate) entity_id: Uuid,
    pub(crate) title: String,
    pub(crate) deleted_at: DateTime<Utc>,
    pub(crate) deleted_from: Option<String>,
    pub(crate) restore_hint: String,
    pub(crate) original_project_id: Option<Uuid>,
    pub(crate) original_parent_project_id: Option<Uuid>,
}

/// Trash 列表载荷。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub(crate) struct TrashListPayload {
    pub(crate) entries: Vec<TrashEntryItemPayload>,
}

/// 恢复成功后的最小载荷。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub(crate) struct RestoredTrashEntryPayload {
    pub(crate) trash_entry_id: Uuid,
    pub(crate) entity_type: String,
    pub(crate) entity_id: Uuid,
}

/// Project 删除到 Trash 后返回的最小载荷。
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub(crate) struct DeletedProjectToTrashPayload {
    pub(crate) project_id: Uuid,
    pub(crate) deleted_at: DateTime<Utc>,
}

/// 查询当前 Space 的真实 TrashEntry 列表。
pub(crate) async fn list_trash_entries(
    database: &DatabaseState,
    input: ListTrashEntriesInput,
) -> Result<TrashListPayload> {
    let space_repository = SpaceRepository::new(&database.connection);
    let trash_entry_repository = TrashEntryRepository::new(&database.connection);

    let space_slug = normalize_required_text(&input.space_slug, "space slug")?;
    let space = resolve_active_space(&space_repository, &space_slug).await?;
    let entries = trash_entry_repository.list_by_space(space.id).await?;

    Ok(TrashListPayload {
        entries: entries
            .into_iter()
            .map(map_trash_entry)
            .collect::<Result<Vec<_>>>()?,
    })
}

/// 从 Trash 严格恢复 Task 到删除前 Project / Inbox。
pub(crate) async fn restore_task_from_trash(
    database: &DatabaseState,
    input: RestoreTaskFromTrashInput,
) -> Result<RestoredTrashEntryPayload> {
    let space_slug = normalize_required_text(&input.space_slug, "space slug")?;
    let trash_entry_id = input.trash_entry_id;

    database
        .connection
        .transaction::<_, RestoredTrashEntryPayload, anyhow::Error>(|transaction| {
            let space_slug = space_slug.clone();

            Box::pin(async move {
                let space_repository = SpaceRepository::new(transaction);
                let project_repository = ProjectRepository::new(transaction);
                let task_repository = TaskRepository::new(transaction);
                let trash_entry_repository = TrashEntryRepository::new(transaction);

                let space = resolve_active_space(&space_repository, &space_slug).await?;
                let trash_entry = trash_entry_repository
                    .find_by_id(trash_entry_id)
                    .await?
                    .with_context(|| format!("trash entry `{trash_entry_id}` does not exist"))?;

                ensure_trash_entry_scope(&trash_entry, space.id, TRASH_ENTITY_TYPE_TASK)?;

                let task = task_repository
                    .find_by_id(trash_entry.entity_id)
                    .await?
                    .with_context(|| format!("task `{}` does not exist", trash_entry.entity_id))?;

                if task.space_id != space.id {
                    bail!("task `{}` does not belong to space `{space_slug}`", task.id);
                }

                if task.deleted_at.is_none() {
                    bail!("task `{}` is not deleted", task.id);
                }

                let original_project_id =
                    snapshot_uuid(&trash_entry.entity_snapshot, "project_id")?;
                let project_id = match original_project_id {
                    Some(project_id) => {
                        let project = project_repository
                            .find_by_id(project_id)
                            .await?
                            .with_context(|| {
                                format!("original project `{project_id}` does not exist")
                            })?;

                        if project.space_id != space.id {
                            bail!(
                                "original project `{project_id}` does not belong to space `{space_slug}`"
                            );
                        }

                        if project.deleted_at.is_some() || project.status != PROJECT_STATUS_ACTIVE {
                            bail!("original project `{project_id}` is not restorable");
                        }

                        Some(project.id)
                    }
                    None => None,
                };

                task_repository
                    .restore_task(task, project_id, Utc::now())
                    .await?;
                trash_entry_repository.delete_by_id(trash_entry.id).await?;

                Ok(RestoredTrashEntryPayload {
                    trash_entry_id: trash_entry.id,
                    entity_type: TRASH_ENTITY_TYPE_TASK.to_owned(),
                    entity_id: trash_entry.entity_id,
                })
            })
        })
        .await
        .map_err(|error| anyhow::anyhow!(error))
}

/// 从 Trash 严格恢复 Project 到删除前父 Project / 顶层。
pub(crate) async fn restore_project_from_trash(
    database: &DatabaseState,
    input: RestoreProjectFromTrashInput,
) -> Result<RestoredTrashEntryPayload> {
    let space_slug = normalize_required_text(&input.space_slug, "space slug")?;
    let trash_entry_id = input.trash_entry_id;

    database
        .connection
        .transaction::<_, RestoredTrashEntryPayload, anyhow::Error>(|transaction| {
            let space_slug = space_slug.clone();

            Box::pin(async move {
                let space_repository = SpaceRepository::new(transaction);
                let project_repository = ProjectRepository::new(transaction);
                let trash_entry_repository = TrashEntryRepository::new(transaction);

                let space = resolve_active_space(&space_repository, &space_slug).await?;
                let trash_entry = trash_entry_repository
                    .find_by_id(trash_entry_id)
                    .await?
                    .with_context(|| format!("trash entry `{trash_entry_id}` does not exist"))?;

                ensure_trash_entry_scope(&trash_entry, space.id, TRASH_ENTITY_TYPE_PROJECT)?;

                let project = project_repository
                    .find_by_id(trash_entry.entity_id)
                    .await?
                    .with_context(|| format!("project `{}` does not exist", trash_entry.entity_id))?;

                if project.space_id != space.id {
                    bail!(
                        "project `{}` does not belong to space `{space_slug}`",
                        project.id
                    );
                }

                if project.deleted_at.is_none() {
                    bail!("project `{}` is not deleted", project.id);
                }

                let original_parent_project_id =
                    snapshot_uuid(&trash_entry.entity_snapshot, "parent_project_id")?;
                let parent_project_id = match original_parent_project_id {
                    Some(parent_project_id) => {
                        let parent_project = project_repository
                            .find_by_id(parent_project_id)
                            .await?
                            .with_context(|| {
                                format!("original parent project `{parent_project_id}` does not exist")
                            })?;

                        if parent_project.space_id != space.id {
                            bail!(
                                "original parent project `{parent_project_id}` does not belong to space `{space_slug}`"
                            );
                        }

                        if parent_project.deleted_at.is_some()
                            || parent_project.status != PROJECT_STATUS_ACTIVE
                        {
                            bail!("original parent project `{parent_project_id}` is not restorable");
                        }

                        if parent_project.parent_project_id.is_some() {
                            bail!(
                                "original parent project `{parent_project_id}` would create multi-level subprojects"
                            );
                        }

                        Some(parent_project.id)
                    }
                    None => None,
                };

                project_repository
                    .restore_project(project, parent_project_id, Utc::now())
                    .await?;
                trash_entry_repository.delete_by_id(trash_entry.id).await?;

                Ok(RestoredTrashEntryPayload {
                    trash_entry_id: trash_entry.id,
                    entity_type: TRASH_ENTITY_TYPE_PROJECT.to_owned(),
                    entity_id: trash_entry.entity_id,
                })
            })
        })
        .await
        .map_err(|error| anyhow::anyhow!(error))
}

/// 将 Project 软删除并写入 Trash。M3-D 不级联处理 Task。
pub(crate) async fn delete_project_to_trash(
    database: &DatabaseState,
    input: DeleteProjectToTrashInput,
) -> Result<DeletedProjectToTrashPayload> {
    let space_slug = normalize_required_text(&input.space_slug, "space slug")?;
    let project_id = input.project_id;

    database
        .connection
        .transaction::<_, DeletedProjectToTrashPayload, anyhow::Error>(|transaction| {
            let space_slug = space_slug.clone();

            Box::pin(async move {
                let space_repository = SpaceRepository::new(transaction);
                let project_repository = ProjectRepository::new(transaction);
                let trash_entry_repository = TrashEntryRepository::new(transaction);

                let space = resolve_active_space(&space_repository, &space_slug).await?;
                let project = project_repository
                    .find_active_by_id(project_id)
                    .await?
                    .with_context(|| format!("project `{project_id}` does not exist"))?;

                if project.space_id != space.id {
                    bail!("project `{project_id}` does not belong to space `{space_slug}`");
                }

                let deleted_at = Utc::now();
                let snapshot = build_project_trash_snapshot(&project);

                project_repository
                    .soft_delete_project(project.clone(), deleted_at)
                    .await?;
                trash_entry_repository
                    .create_project_entry(
                        space.id,
                        project.id,
                        snapshot,
                        deleted_at,
                        Some("project_page"),
                    )
                    .await?;

                Ok(DeletedProjectToTrashPayload {
                    project_id: project.id,
                    deleted_at,
                })
            })
        })
        .await
        .map_err(|error| anyhow::anyhow!(error))
}

fn ensure_trash_entry_scope(
    entry: &stoneflow_entity::trash_entry::Model,
    space_id: Uuid,
    entity_type: &str,
) -> Result<()> {
    if entry.space_id != space_id {
        bail!(
            "trash entry `{}` does not belong to current space",
            entry.id
        );
    }

    if entry.entity_type != entity_type {
        bail!(
            "trash entry `{}` is `{}` instead of `{entity_type}`",
            entry.id,
            entry.entity_type
        );
    }

    Ok(())
}

fn map_trash_entry(entry: stoneflow_entity::trash_entry::Model) -> Result<TrashEntryItemPayload> {
    let original_project_id = snapshot_uuid(&entry.entity_snapshot, "project_id")?;
    let original_parent_project_id = snapshot_uuid(&entry.entity_snapshot, "parent_project_id")?;
    let title = snapshot_title(&entry);
    let restore_hint = match entry.entity_type.as_str() {
        TRASH_ENTITY_TYPE_TASK => original_project_id
            .map(|project_id| format!("恢复到原 Project `{project_id}`"))
            .unwrap_or_else(|| "恢复到 Inbox".to_owned()),
        TRASH_ENTITY_TYPE_PROJECT => original_parent_project_id
            .map(|parent_project_id| format!("恢复到原父 Project `{parent_project_id}`"))
            .unwrap_or_else(|| "恢复为顶层 Project".to_owned()),
        _ => "当前类型暂不支持恢复".to_owned(),
    };

    Ok(TrashEntryItemPayload {
        id: entry.id,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        title,
        deleted_at: entry.deleted_at,
        deleted_from: entry.deleted_from,
        restore_hint,
        original_project_id,
        original_parent_project_id,
    })
}

fn snapshot_title(entry: &stoneflow_entity::trash_entry::Model) -> String {
    let key = match entry.entity_type.as_str() {
        TRASH_ENTITY_TYPE_PROJECT => "name",
        _ => "title",
    };

    entry
        .entity_snapshot
        .get(key)
        .and_then(|value| value.as_str())
        .filter(|value| !value.trim().is_empty())
        .map(str::to_owned)
        .unwrap_or_else(|| "未命名条目".to_owned())
}

fn snapshot_uuid(snapshot: &serde_json::Value, key: &str) -> Result<Option<Uuid>> {
    snapshot
        .get(key)
        .and_then(|value| value.as_str())
        .map(|value| Uuid::parse_str(value).with_context(|| format!("invalid uuid in `{key}`")))
        .transpose()
}

fn build_project_trash_snapshot(project: &stoneflow_entity::project::Model) -> serde_json::Value {
    json!({
        "id": project.id,
        "space_id": project.space_id,
        "parent_project_id": project.parent_project_id,
        "name": project.name,
        "status": project.status,
        "note": project.note,
        "due_at": project.due_at,
        "sort_order": project.sort_order,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
    })
}

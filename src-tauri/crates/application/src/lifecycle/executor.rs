//! Lifecycle 列表构建与 Scope 归一化。

use stoneflow_domain::{restore_hint, validate_space_id, LifecycleEntityType};

use crate::{
    lifecycle::types::{
        LifecycleEntry, LifecycleProjectListRecord, LifecycleScopeInput, LifecycleScopeKind,
        LifecycleTaskListRecord,
    },
    space::SpaceRecord,
    ApplicationError,
};

pub(crate) fn normalize_scope(
    input: &LifecycleScopeInput,
) -> Result<Option<String>, ApplicationError> {
    match input.kind {
        LifecycleScopeKind::All => Ok(None),
        LifecycleScopeKind::Space => {
            let space_id = input.space_id.as_deref().ok_or_else(|| {
                ApplicationError::validation("scope.type=space 时必须提供 spaceId")
            })?;
            Ok(Some(validate_space_id(space_id)?))
        }
    }
}

/// 归档列表条目。
pub(crate) fn build_archive_entries(
    space_rows: Vec<SpaceRecord>,
    project_rows: Vec<LifecycleProjectListRecord>,
    task_rows: Vec<LifecycleTaskListRecord>,
) -> Vec<LifecycleEntry> {
    let mut entries = Vec::new();

    entries.extend(space_rows.into_iter().filter_map(|space| {
        let archived_at = space.archived_at.clone()?;
        Some(LifecycleEntry {
            id: space.id.clone(),
            entity_type: LifecycleEntityType::Space,
            title: space.name.clone(),
            space_id: Some(space.id.clone()),
            space_name: Some(space.name.clone()),
            project_id: None,
            project_name: None,
            archived_at: Some(archived_at),
            deleted_at: None,
            source_type: Some("self".to_owned()),
            source_id: Some(space.id.clone()),
            restore_hint: restore_hint(LifecycleEntityType::Space),
        })
    }));

    entries.extend(project_rows.into_iter().filter_map(|project| {
        let archived_at = project.archived_at.clone()?;
        Some(LifecycleEntry {
            id: project.id.clone(),
            entity_type: LifecycleEntityType::Project,
            title: project.name.clone(),
            space_id: Some(project.space_id.clone()),
            space_name: None,
            project_id: Some(project.id.clone()),
            project_name: Some(project.name.clone()),
            archived_at: Some(archived_at),
            deleted_at: None,
            source_type: Some("self".to_owned()),
            source_id: Some(project.id.clone()),
            restore_hint: restore_hint(LifecycleEntityType::Project),
        })
    }));

    entries.extend(task_rows.into_iter().filter_map(|task| {
        let archived_at = task.archived_at.clone()?;
        Some(LifecycleEntry {
            id: task.id.clone(),
            entity_type: LifecycleEntityType::Task,
            title: task.title.clone(),
            space_id: Some(task.space_id.clone()),
            space_name: None,
            project_id: task.project_id.clone(),
            project_name: None,
            archived_at: Some(archived_at),
            deleted_at: None,
            source_type: Some("self".to_owned()),
            source_id: Some(task.id.clone()),
            restore_hint: restore_hint(LifecycleEntityType::Task),
        })
    }));

    sort_by_time_desc(entries, |entry| entry.archived_at.as_deref())
}

/// 回收站列表条目（软删）。
pub(crate) fn build_trash_entries(
    space_rows: Vec<SpaceRecord>,
    project_rows: Vec<LifecycleProjectListRecord>,
    task_rows: Vec<LifecycleTaskListRecord>,
) -> Vec<LifecycleEntry> {
    let mut entries = Vec::new();

    entries.extend(space_rows.into_iter().filter_map(|space| {
        let deleted_at = space.deleted_at.clone()?;
        Some(LifecycleEntry {
            id: space.id.clone(),
            entity_type: LifecycleEntityType::Space,
            title: space.name.clone(),
            space_id: Some(space.id.clone()),
            space_name: Some(space.name.clone()),
            project_id: None,
            project_name: None,
            archived_at: space.archived_at.clone(),
            deleted_at: Some(deleted_at),
            source_type: Some("self".to_owned()),
            source_id: Some(space.id.clone()),
            restore_hint: restore_hint(LifecycleEntityType::Space),
        })
    }));

    entries.extend(project_rows.into_iter().filter_map(|project| {
        let deleted_at = project.deleted_at.clone()?;
        Some(LifecycleEntry {
            id: project.id.clone(),
            entity_type: LifecycleEntityType::Project,
            title: project.name.clone(),
            space_id: Some(project.space_id.clone()),
            space_name: None,
            project_id: Some(project.id.clone()),
            project_name: Some(project.name.clone()),
            archived_at: project.archived_at.clone(),
            deleted_at: Some(deleted_at),
            source_type: Some("self".to_owned()),
            source_id: Some(project.id.clone()),
            restore_hint: restore_hint(LifecycleEntityType::Project),
        })
    }));

    entries.extend(task_rows.into_iter().filter_map(|task| {
        let deleted_at = task.deleted_at.clone()?;
        Some(LifecycleEntry {
            id: task.id.clone(),
            entity_type: LifecycleEntityType::Task,
            title: task.title.clone(),
            space_id: Some(task.space_id.clone()),
            space_name: None,
            project_id: task.project_id.clone(),
            project_name: None,
            archived_at: task.archived_at.clone(),
            deleted_at: Some(deleted_at),
            source_type: Some("self".to_owned()),
            source_id: Some(task.id.clone()),
            restore_hint: restore_hint(LifecycleEntityType::Task),
        })
    }));

    sort_by_time_desc(entries, |entry| entry.deleted_at.as_deref())
}

fn sort_by_time_desc(
    mut entries: Vec<LifecycleEntry>,
    time: impl Fn(&LifecycleEntry) -> Option<&str>,
) -> Vec<LifecycleEntry> {
    entries.sort_by(|left, right| {
        time(right)
            .unwrap_or("")
            .cmp(time(left).unwrap_or(""))
            .then_with(|| left.entity_type.as_str().cmp(right.entity_type.as_str()))
            .then_with(|| left.id.cmp(&right.id))
    });
    entries
}

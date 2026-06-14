//! Lifecycle 列表构建与 Scope 归一化。

use std::collections::HashMap;

use stoneflow_domain::{
    restore_hint, validate_space_id, LifecycleEntityType, LifecycleMode,
};

use crate::{
    lifecycle::types::{
        LifecycleEntry, LifecycleProjectListRecord, LifecycleScopeInput, LifecycleScopeKind,
        LifecycleTaskListRecord,
    },
    project::ProjectRecord,
    space::SpaceRecord,
    UsecaseError,
};

pub(crate) fn normalize_scope(input: &LifecycleScopeInput) -> Result<Option<String>, UsecaseError> {
    match input.kind {
        LifecycleScopeKind::All => Ok(None),
        LifecycleScopeKind::Space => {
            let space_id = input.space_id.as_deref().ok_or_else(|| {
                UsecaseError::validation("scope.type=space 时必须提供 spaceId")
            })?;
            Ok(Some(validate_space_id(space_id)?))
        }
    }
}

pub(crate) fn lifecycle_time(entry: &LifecycleEntry, mode: LifecycleMode) -> &str {
    match mode {
        LifecycleMode::Archive => entry.archived_at.as_deref().unwrap_or(""),
        LifecycleMode::Trash => entry.deleted_at.as_deref().unwrap_or(""),
    }
}

pub(crate) fn space_source(
    space: &SpaceRecord,
    mode: LifecycleMode,
) -> (Option<String>, Option<String>) {
    match mode {
        LifecycleMode::Archive if space.archived_at.is_some() => {
            (Some("self".to_owned()), Some(space.id.clone()))
        }
        LifecycleMode::Trash if space.deleted_at.is_some() => {
            (Some("self".to_owned()), Some(space.id.clone()))
        }
        _ => (None, None),
    }
}

pub(crate) fn project_source(
    project: &LifecycleProjectListRecord,
    mode: LifecycleMode,
) -> (Option<String>, Option<String>) {
    match mode {
        LifecycleMode::Archive => (
            Some(
                project
                    .archived_by_type
                    .clone()
                    .unwrap_or_else(|| "self".to_owned()),
            ),
            Some(
                project
                    .archived_by_id
                    .clone()
                    .unwrap_or_else(|| project.id.clone()),
            ),
        ),
        LifecycleMode::Trash => (
            Some(
                project
                    .deleted_by_type
                    .clone()
                    .unwrap_or_else(|| "self".to_owned()),
            ),
            Some(
                project
                    .deleted_by_id
                    .clone()
                    .unwrap_or_else(|| project.id.clone()),
            ),
        ),
    }
}

pub(crate) fn task_source(
    item: &LifecycleTaskListRecord,
    mode: LifecycleMode,
) -> (Option<String>, Option<String>) {
    match mode {
        LifecycleMode::Archive => (
            Some(
                item.archived_by_type
                    .clone()
                    .unwrap_or_else(|| "self".to_owned()),
            ),
            Some(
                item.archived_by_id
                    .clone()
                    .unwrap_or_else(|| item.id.clone()),
            ),
        ),
        LifecycleMode::Trash => (
            Some(
                item.deleted_by_type
                    .clone()
                    .unwrap_or_else(|| "self".to_owned()),
            ),
            Some(
                item.deleted_by_id
                    .clone()
                    .unwrap_or_else(|| item.id.clone()),
            ),
        ),
    }
}

pub(crate) fn build_lifecycle_entries(
    mode: LifecycleMode,
    space_rows: Vec<SpaceRecord>,
    project_rows: Vec<LifecycleProjectListRecord>,
    task_rows: Vec<LifecycleTaskListRecord>,
    space_map: &HashMap<String, SpaceRecord>,
    project_map: &HashMap<String, ProjectRecord>,
) -> Vec<LifecycleEntry> {
    let mut entries = Vec::new();

    entries.extend(space_rows.into_iter().map(|space| {
        let (source_type, source_id) = space_source(&space, mode);
        LifecycleEntry {
            id: space.id.clone(),
            entity_type: LifecycleEntityType::Space,
            title: space.name.clone(),
            space_id: Some(space.id.clone()),
            space_name: Some(space.name.clone()),
            project_id: None,
            project_name: None,
            archived_at: space.archived_at.clone(),
            deleted_at: space.deleted_at.clone(),
            source_type,
            source_id,
            restore_hint: restore_hint(LifecycleEntityType::Space),
        }
    }));

    entries.extend(project_rows.into_iter().map(|project| {
        let (source_type, source_id) = project_source(&project, mode);
        let space_name = space_map
            .get(&project.space_id)
            .map(|space| space.name.clone());
        LifecycleEntry {
            id: project.id.clone(),
            entity_type: LifecycleEntityType::Project,
            title: project.name.clone(),
            space_id: Some(project.space_id.clone()),
            space_name,
            project_id: Some(project.id.clone()),
            project_name: Some(project.name.clone()),
            archived_at: project.archived_at.clone(),
            deleted_at: project.deleted_at.clone(),
            source_type,
            source_id,
            restore_hint: restore_hint(LifecycleEntityType::Project),
        }
    }));

    entries.extend(task_rows.into_iter().map(|item| {
        let (source_type, source_id) = task_source(&item, mode);
        let project_name = item
            .project_id
            .as_ref()
            .and_then(|project_id| project_map.get(project_id))
            .map(|project| project.name.clone());
        let space_name = space_map
            .get(&item.space_id)
            .map(|space| space.name.clone());
        LifecycleEntry {
            id: item.id.clone(),
            entity_type: LifecycleEntityType::Task,
            title: item.title.clone(),
            space_id: Some(item.space_id.clone()),
            space_name,
            project_id: item.project_id.clone(),
            project_name,
            archived_at: item.archived_at.clone(),
            deleted_at: item.deleted_at.clone(),
            source_type,
            source_id,
            restore_hint: restore_hint(LifecycleEntityType::Task),
        }
    }));

    entries.sort_by(|left, right| {
        lifecycle_time(right, mode)
            .cmp(lifecycle_time(left, mode))
            .then_with(|| left.entity_type.as_str().cmp(right.entity_type.as_str()))
            .then_with(|| left.id.cmp(&right.id))
    });

    entries
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use stoneflow_domain::LifecycleMode;

    use crate::{
        lifecycle::types::{LifecycleProjectListRecord, LifecycleTaskListRecord},
        project::ProjectRecord,
        space::SpaceRecord,
    };

    use super::*;

    fn sample_space(id: &str, archived_at: Option<&str>) -> SpaceRecord {
        SpaceRecord {
            id: id.to_owned(),
            name: format!("Space {id}"),
            icon_key: "folder".to_owned(),
            color_key: "blue".to_owned(),
            is_default: false,
            sort_order: 0,
            archived_at: archived_at.map(str::to_owned),
            deleted_at: None,
            created_at: "2026-01-01T00:00:00Z".to_owned(),
            updated_at: "2026-01-01T00:00:00Z".to_owned(),
        }
    }

    #[test]
    fn normalize_scope_should_require_space_id_for_space_kind() {
        let err = normalize_scope(&LifecycleScopeInput {
            kind: LifecycleScopeKind::Space,
            space_id: None,
        })
        .expect_err("missing space id should fail");
        assert!(err.to_string().contains("spaceId"));
    }

    #[test]
    fn build_lifecycle_entries_should_sort_archive_desc_then_entity_type() {
        let entries = build_lifecycle_entries(
            LifecycleMode::Archive,
            vec![
                sample_space("space-b", Some("2026-01-02T00:00:00Z")),
                sample_space("space-a", Some("2026-01-03T00:00:00Z")),
            ],
            vec![LifecycleProjectListRecord {
                id: "project-1".to_owned(),
                space_id: "space-b".to_owned(),
                name: "Project".to_owned(),
                archived_at: Some("2026-01-01T00:00:00Z".to_owned()),
                deleted_at: None,
                archived_by_type: Some("self".to_owned()),
                archived_by_id: Some("project-1".to_owned()),
                deleted_by_type: None,
                deleted_by_id: None,
            }],
            Vec::<LifecycleTaskListRecord>::new(),
            &HashMap::from([(
                "space-b".to_owned(),
                sample_space("space-b", Some("2026-01-02T00:00:00Z")),
            )]),
            &HashMap::<String, ProjectRecord>::new(),
        );

        assert_eq!(entries.len(), 3);
        assert_eq!(entries[0].id, "space-a");
        assert_eq!(entries[1].id, "space-b");
        assert_eq!(entries[2].id, "project-1");
        assert_eq!(entries[0].source_type.as_deref(), Some("self"));
    }
}

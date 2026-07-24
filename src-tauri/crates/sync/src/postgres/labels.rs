use crate::{EntityIdentity, LifecycleState, SyncEntityKind, SyncError, SyncMutation};

pub fn entity_kind_label(entity: &EntityIdentity) -> &'static str {
    match entity.entity_type {
        SyncEntityKind::Space => "space",
        SyncEntityKind::Project => "project",
        SyncEntityKind::Task => "task",
        SyncEntityKind::TaskLink => "task_link",
        SyncEntityKind::View => "view",
    }
}

pub fn mutation_kind_label(mutation: &SyncMutation) -> &'static str {
    match mutation {
        SyncMutation::Patch { .. } => "patch",
        SyncMutation::Lifecycle { .. } => "lifecycle",
        SyncMutation::Tombstone { .. } => "tombstone",
    }
}

pub fn lifecycle_label(state: LifecycleState) -> &'static str {
    match state {
        LifecycleState::Active => "active",
        LifecycleState::Archived => "archived",
        LifecycleState::Trashed => "trashed",
    }
}

pub fn parse_lifecycle(value: &str) -> Result<LifecycleState, SyncError> {
    match value {
        "active" => Ok(LifecycleState::Active),
        "archived" => Ok(LifecycleState::Archived),
        "trashed" => Ok(LifecycleState::Trashed),
        _ => Err(SyncError::protocol(format!("未知 lifecycle: {value}"))),
    }
}

pub fn parse_entity_kind(value: &str) -> Result<SyncEntityKind, SyncError> {
    match value {
        "space" => Ok(SyncEntityKind::Space),
        "project" => Ok(SyncEntityKind::Project),
        "task" => Ok(SyncEntityKind::Task),
        "task_link" => Ok(SyncEntityKind::TaskLink),
        "view" => Ok(SyncEntityKind::View),
        _ => Err(SyncError::protocol(format!("未知 实体类型: {value}"))),
    }
}

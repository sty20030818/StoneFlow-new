//! schema 与 domain 枚举互转。

use stoneflow_domain::{
    ActivityActorKind, ActivityEntityKind, ActivitySourceKind, TaskStatus, ViewEntityKind, ViewKind,
};
use stoneflow_schema::common::{
    ActivityActorKind as SchemaActivityActorKind, ActivityEntityKind as SchemaActivityEntityKind,
    ActivitySourceKind as SchemaActivitySourceKind, TaskStatus as SchemaTaskStatus,
    ViewEntityKind as SchemaViewEntityKind, ViewKind as SchemaViewKind,
};

pub fn task_status_to_domain(status: SchemaTaskStatus) -> TaskStatus {
    match status {
        SchemaTaskStatus::Todo => TaskStatus::Todo,
        SchemaTaskStatus::Doing => TaskStatus::Doing,
        SchemaTaskStatus::Waiting => TaskStatus::Waiting,
        SchemaTaskStatus::Done => TaskStatus::Done,
        SchemaTaskStatus::Canceled => TaskStatus::Canceled,
    }
}

#[allow(dead_code)]
pub fn task_status_to_schema(status: TaskStatus) -> SchemaTaskStatus {
    match status {
        TaskStatus::Todo => SchemaTaskStatus::Todo,
        TaskStatus::Doing => SchemaTaskStatus::Doing,
        TaskStatus::Waiting => SchemaTaskStatus::Waiting,
        TaskStatus::Done => SchemaTaskStatus::Done,
        TaskStatus::Canceled => SchemaTaskStatus::Canceled,
    }
}

pub fn activity_entity_kind_to_domain(kind: SchemaActivityEntityKind) -> ActivityEntityKind {
    match kind {
        SchemaActivityEntityKind::Task => ActivityEntityKind::Task,
        SchemaActivityEntityKind::Project => ActivityEntityKind::Project,
        SchemaActivityEntityKind::Space => ActivityEntityKind::Space,
        SchemaActivityEntityKind::View => ActivityEntityKind::View,
        SchemaActivityEntityKind::Setting => ActivityEntityKind::Setting,
    }
}

pub fn activity_entity_kind_to_schema(kind: ActivityEntityKind) -> SchemaActivityEntityKind {
    match kind {
        ActivityEntityKind::Task => SchemaActivityEntityKind::Task,
        ActivityEntityKind::Project => SchemaActivityEntityKind::Project,
        ActivityEntityKind::Space => SchemaActivityEntityKind::Space,
        ActivityEntityKind::View => SchemaActivityEntityKind::View,
        ActivityEntityKind::Setting => SchemaActivityEntityKind::Setting,
    }
}

pub fn activity_actor_kind_to_domain(kind: SchemaActivityActorKind) -> ActivityActorKind {
    match kind {
        SchemaActivityActorKind::User => ActivityActorKind::User,
        SchemaActivityActorKind::System => ActivityActorKind::System,
        SchemaActivityActorKind::Ai => ActivityActorKind::Ai,
    }
}

pub fn activity_actor_kind_to_schema(kind: ActivityActorKind) -> SchemaActivityActorKind {
    match kind {
        ActivityActorKind::User => SchemaActivityActorKind::User,
        ActivityActorKind::System => SchemaActivityActorKind::System,
        ActivityActorKind::Ai => SchemaActivityActorKind::Ai,
    }
}

pub fn activity_source_kind_to_domain(kind: SchemaActivitySourceKind) -> ActivitySourceKind {
    match kind {
        SchemaActivitySourceKind::App => ActivitySourceKind::App,
        SchemaActivitySourceKind::Shortcut => ActivitySourceKind::Shortcut,
        SchemaActivitySourceKind::Command => ActivitySourceKind::Command,
        SchemaActivitySourceKind::Import => ActivitySourceKind::Import,
        SchemaActivitySourceKind::Automation => ActivitySourceKind::Automation,
    }
}

pub fn activity_source_kind_to_schema(kind: ActivitySourceKind) -> SchemaActivitySourceKind {
    match kind {
        ActivitySourceKind::App => SchemaActivitySourceKind::App,
        ActivitySourceKind::Shortcut => SchemaActivitySourceKind::Shortcut,
        ActivitySourceKind::Command => SchemaActivitySourceKind::Command,
        ActivitySourceKind::Import => SchemaActivitySourceKind::Import,
        ActivitySourceKind::Automation => SchemaActivitySourceKind::Automation,
    }
}

pub fn map_space_model_to_record(
    model: stoneflow_schema::space::Model,
) -> stoneflow_usecase::space::SpaceRecord {
    stoneflow_usecase::space::SpaceRecord {
        id: model.id,
        name: model.name,
        icon_key: model.icon_key,
        color_key: model.color_key,
        is_default: model.is_default,
        sort_order: model.sort_order,
        archived_at: model.archived_at,
        deleted_at: model.deleted_at,
        created_at: model.created_at,
        updated_at: model.updated_at,
    }
}

pub fn map_project_model_to_lifecycle_list_record(
    model: stoneflow_schema::project::Model,
) -> stoneflow_usecase::lifecycle::LifecycleProjectListRecord {
    stoneflow_usecase::lifecycle::LifecycleProjectListRecord {
        id: model.id,
        space_id: model.space_id,
        name: model.name,
        archived_at: model.archived_at,
        archived_by_type: model.archived_by_type,
        archived_by_id: model.archived_by_id,
        deleted_at: model.deleted_at,
        deleted_by_type: model.deleted_by_type,
        deleted_by_id: model.deleted_by_id,
    }
}

pub fn map_task_model_to_lifecycle_list_record(
    model: stoneflow_schema::task::Model,
) -> stoneflow_usecase::lifecycle::LifecycleTaskListRecord {
    stoneflow_usecase::lifecycle::LifecycleTaskListRecord {
        id: model.id,
        space_id: model.space_id,
        project_id: model.project_id,
        title: model.title,
        archived_at: model.archived_at,
        archived_by_type: model.archived_by_type,
        archived_by_id: model.archived_by_id,
        deleted_at: model.deleted_at,
        deleted_by_type: model.deleted_by_type,
        deleted_by_id: model.deleted_by_id,
    }
}

pub fn map_project_model_to_record(
    model: stoneflow_schema::project::Model,
) -> stoneflow_usecase::project::ProjectRecord {
    stoneflow_usecase::project::ProjectRecord {
        id: model.id,
        space_id: model.space_id,
        name: model.name,
        description: model.description,
        due_at: model.due_at,
        sort_order: model.sort_order,
        completed_at: model.completed_at,
        archived_at: model.archived_at,
        deleted_at: model.deleted_at,
        created_at: model.created_at,
        updated_at: model.updated_at,
    }
}

pub fn map_space_model_to_project_space_record(
    model: stoneflow_schema::space::Model,
) -> stoneflow_usecase::project::ProjectSpaceRecord {
    stoneflow_usecase::project::ProjectSpaceRecord {
        id: model.id,
        name: model.name,
        archived_at: model.archived_at,
        deleted_at: model.deleted_at,
    }
}

pub fn map_task_link_model_to_record(
    model: stoneflow_schema::task_link::Model,
) -> stoneflow_usecase::task_link::TaskLinkRecord {
    stoneflow_usecase::task_link::TaskLinkRecord {
        id: model.id,
        task_id: model.task_id,
        title: model.title,
        url: model.url,
        sort_order: model.sort_order,
        created_at: model.created_at,
        updated_at: model.updated_at,
    }
}

pub fn map_task_model_to_link_task_record(
    model: stoneflow_schema::task::Model,
) -> stoneflow_usecase::task_link::TaskLinkTaskRecord {
    stoneflow_usecase::task_link::TaskLinkTaskRecord {
        id: model.id,
        title: model.title,
        deleted_at: model.deleted_at,
    }
}

pub fn view_kind_to_domain(kind: SchemaViewKind) -> ViewKind {
    match kind {
        SchemaViewKind::System => ViewKind::System,
        SchemaViewKind::Custom => ViewKind::Custom,
    }
}

pub fn view_kind_to_schema(kind: ViewKind) -> SchemaViewKind {
    match kind {
        ViewKind::System => SchemaViewKind::System,
        ViewKind::Custom => SchemaViewKind::Custom,
    }
}

pub fn view_entity_kind_to_domain(kind: SchemaViewEntityKind) -> ViewEntityKind {
    match kind {
        SchemaViewEntityKind::Task => ViewEntityKind::Task,
        SchemaViewEntityKind::Project => ViewEntityKind::Project,
    }
}

pub fn view_entity_kind_to_schema(kind: ViewEntityKind) -> SchemaViewEntityKind {
    match kind {
        ViewEntityKind::Task => SchemaViewEntityKind::Task,
        ViewEntityKind::Project => SchemaViewEntityKind::Project,
    }
}

pub fn map_view_model_to_record(
    model: stoneflow_schema::view::Model,
) -> stoneflow_usecase::view::ViewRecord {
    stoneflow_usecase::view::ViewRecord {
        id: model.id,
        name: model.name,
        description: model.description,
        kind: view_kind_to_domain(model.r#type),
        entity_type: view_entity_kind_to_domain(model.entity_type),
        key: model.key,
        filters: model.filters,
        sort: model.sort,
        group_by: model.group_by,
        is_visible: model.is_visible,
        sort_order: model.sort_order,
        created_at: model.created_at,
        updated_at: model.updated_at,
    }
}

pub fn map_task_model_to_record(
    model: stoneflow_schema::task::Model,
) -> stoneflow_usecase::task::TaskRecord {
    stoneflow_usecase::task::TaskRecord {
        id: model.id,
        space_id: model.space_id,
        project_id: model.project_id,
        title: model.title,
        note: model.note,
        status: task_status_to_domain(model.status),
        status_changed_at: model.status_changed_at,
        priority: model.priority,
        inbox_at: model.inbox_at,
        due_at: model.due_at,
        scheduled_at: model.scheduled_at,
        reminder_at: model.reminder_at,
        sort_order: model.sort_order,
        completed_at: model.completed_at,
        canceled_at: model.canceled_at,
        archived_at: model.archived_at,
        deleted_at: model.deleted_at,
        created_at: model.created_at,
        updated_at: model.updated_at,
    }
}

pub fn map_space_model_to_task_space_record(
    model: stoneflow_schema::space::Model,
) -> stoneflow_usecase::task::TaskSpaceRecord {
    stoneflow_usecase::task::TaskSpaceRecord {
        id: model.id,
        name: model.name,
        archived_at: model.archived_at,
        deleted_at: model.deleted_at,
    }
}

pub fn map_project_model_to_task_project_record(
    model: stoneflow_schema::project::Model,
) -> stoneflow_usecase::task::TaskProjectRecord {
    stoneflow_usecase::task::TaskProjectRecord {
        id: model.id,
        name: model.name,
        space_id: model.space_id,
        archived_at: model.archived_at,
        deleted_at: model.deleted_at,
    }
}

pub fn map_task_model_to_view_task_record(
    model: stoneflow_schema::task::Model,
) -> stoneflow_usecase::view::ViewTaskRecord {
    stoneflow_usecase::view::ViewTaskRecord {
        id: model.id,
        space_id: model.space_id,
        project_id: model.project_id,
        title: model.title,
        note: model.note,
        status: task_status_to_domain(model.status),
        status_changed_at: model.status_changed_at,
        priority: model.priority,
        inbox_at: model.inbox_at,
        due_at: model.due_at,
        scheduled_at: model.scheduled_at,
        reminder_at: model.reminder_at,
        sort_order: model.sort_order,
        completed_at: model.completed_at,
        canceled_at: model.canceled_at,
        archived_at: model.archived_at,
        deleted_at: model.deleted_at,
        created_at: model.created_at,
        updated_at: model.updated_at,
    }
}

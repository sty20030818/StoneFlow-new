//! schema 与 domain 枚举互转。

use crate::entities::common::{
    SyncEntityType as SchemaSyncEntityType, ViewEntityKind as SchemaViewEntityKind,
    WorkStatus as SchemaWorkStatus,
};
use stoneflow_application::operation::SyncEntityKind;
use stoneflow_domain::{ViewEntityKind, WorkStatus};

pub fn work_status_to_domain(status: SchemaWorkStatus) -> WorkStatus {
    match status {
        SchemaWorkStatus::Todo => WorkStatus::Todo,
        SchemaWorkStatus::Doing => WorkStatus::Doing,
        SchemaWorkStatus::Waiting => WorkStatus::Waiting,
        SchemaWorkStatus::Done => WorkStatus::Done,
        SchemaWorkStatus::Canceled => WorkStatus::Canceled,
    }
}

pub fn work_status_to_schema(status: WorkStatus) -> SchemaWorkStatus {
    match status {
        WorkStatus::Todo => SchemaWorkStatus::Todo,
        WorkStatus::Doing => SchemaWorkStatus::Doing,
        WorkStatus::Waiting => SchemaWorkStatus::Waiting,
        WorkStatus::Done => SchemaWorkStatus::Done,
        WorkStatus::Canceled => SchemaWorkStatus::Canceled,
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

pub fn sync_entity_kind_to_schema(kind: SyncEntityKind) -> SchemaSyncEntityType {
    match kind {
        SyncEntityKind::Space => SchemaSyncEntityType::Space,
        SyncEntityKind::Project => SchemaSyncEntityType::Project,
        SyncEntityKind::Task => SchemaSyncEntityType::Task,
        SyncEntityKind::TaskLink => SchemaSyncEntityType::TaskLink,
        SyncEntityKind::View => SchemaSyncEntityType::View,
        SyncEntityKind::Setting => SchemaSyncEntityType::Setting,
        SyncEntityKind::Activity => SchemaSyncEntityType::Activity,
    }
}

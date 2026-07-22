//! 同步协议共享类型与常量。

use serde::{Deserialize, Serialize};
use serde_json::Value;

pub const DEVICE_ID_SCOPE: &str = "sync:device_id";
pub const SERVER_SEQ_CURSOR_SCOPE: &str = "sync:last_pulled_server_seq";
pub const PUSH_BATCH_SIZE: u64 = 100;
pub const PULL_BATCH_SIZE: i64 = 100;

pub const REMOTE_SCHEMA_STATEMENTS: &[&str] = &[
    r#"
    CREATE TABLE IF NOT EXISTS spaces (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        icon_key TEXT NOT NULL,
        color_key TEXT NOT NULL,
        is_default INTEGER NOT NULL,
        sort_order INTEGER NOT NULL,
        archived_at TEXT NULL,
        deleted_at TEXT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    "#,
    r#"
    CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY NOT NULL,
        space_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NULL,
        due_at TEXT NULL,
        sort_order INTEGER NOT NULL,
        completed_at TEXT NULL,
        archived_at TEXT NULL,
        deleted_at TEXT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    "#,
    r#"
    CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY NOT NULL,
        space_id TEXT NOT NULL,
        project_id TEXT NULL,
        title TEXT NOT NULL,
        note TEXT NULL,
        status TEXT NOT NULL,
        status_changed_at TEXT NOT NULL,
        priority INTEGER NOT NULL,
        inbox_at TEXT NULL,
        due_at TEXT NULL,
        scheduled_at TEXT NULL,
        reminder_at TEXT NULL,
        sort_order INTEGER NOT NULL,
        completed_at TEXT NULL,
        canceled_at TEXT NULL,
        archived_at TEXT NULL,
        deleted_at TEXT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    "#,
    r#"
    CREATE TABLE IF NOT EXISTS task_links (
        id TEXT PRIMARY KEY NOT NULL,
        task_id TEXT NOT NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    "#,
    r#"
    CREATE TABLE IF NOT EXISTS views (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        description TEXT NULL,
        type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        key TEXT NULL,
        filters TEXT NOT NULL,
        sort TEXT NOT NULL,
        group_by TEXT NULL,
        is_visible INTEGER NOT NULL,
        sort_order INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    "#,
    r#"
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    "#,
    r#"
    CREATE TABLE IF NOT EXISTS activity_events (
        id TEXT PRIMARY KEY NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        actor_type TEXT NOT NULL,
        source TEXT NOT NULL,
        summary TEXT NULL,
        metadata TEXT NULL,
        created_at TEXT NOT NULL
    )
    "#,
    r#"
    CREATE TABLE IF NOT EXISTS remote_mutations (
        client_id TEXT NOT NULL,
        client_seq INTEGER NOT NULL,
        received_at TEXT NOT NULL,
        server_seq INTEGER NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('applied', 'duplicate', 'rejected', 'conflict')),
        error_message TEXT NULL,
        PRIMARY KEY (client_id, client_seq)
    )
    "#,
    r#"
    CREATE TABLE IF NOT EXISTS remote_change_log (
        server_seq INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'project', 'space', 'view', 'setting', 'task_link')),
        entity_id TEXT NOT NULL,
        change_kind TEXT NOT NULL CHECK (change_kind IN ('upsert', 'soft_delete', 'restore', 'hard_delete', 'conflict_notice')),
        patch TEXT NULL,
        changed_by_client_id TEXT NOT NULL,
        changed_by_client_seq INTEGER NOT NULL,
        committed_at TEXT NOT NULL
    )
    "#,
    r#"
    CREATE INDEX IF NOT EXISTS idx_remote_change_log_entity
    ON remote_change_log(entity_type, entity_id, server_seq)
    "#,
    r#"
    CREATE INDEX IF NOT EXISTS idx_activity_events_entity_action_created_at
    ON activity_events(entity_type, entity_id, action, created_at)
    "#,
];

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LocalMutationRecord {
    pub client_id: String,
    pub client_seq: i64,
    pub entity_type: String,
    pub entity_id: String,
    pub operation: String,
    pub payload: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncAction {
    Upsert,
    Delete,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum SyncOperationPayload {
    Space { snapshot: SpacePayload },
    Project { snapshot: ProjectPayload },
    Task { snapshot: TaskPayload },
    View { snapshot: ViewPayload },
    Setting { snapshot: SettingPayload },
    TaskLink { snapshot: TaskLinkPayload },
    HardDelete { target: HardDeletePayload },
}

impl SyncOperationPayload {
    pub fn entity_type(&self) -> &str {
        match self {
            Self::Space { .. } => "space",
            Self::Project { .. } => "project",
            Self::Task { .. } => "task",
            Self::View { .. } => "view",
            Self::Setting { .. } => "setting",
            Self::TaskLink { .. } => "task_link",
            Self::HardDelete { target } => target.entity_type.as_str(),
        }
    }

    pub fn entity_id(&self) -> &str {
        match self {
            Self::Space { snapshot } => &snapshot.id,
            Self::Project { snapshot } => &snapshot.id,
            Self::Task { snapshot } => &snapshot.id,
            Self::View { snapshot } => &snapshot.id,
            Self::Setting { snapshot } => &snapshot.key,
            Self::TaskLink { snapshot } => &snapshot.id,
            Self::HardDelete { target } => &target.entity_id,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RemoteOperationRecord {
    pub server_seq: i64,
    pub op_id: String,
    pub device_id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub action: SyncAction,
    pub payload: SyncOperationPayload,
    pub committed_at: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RemoteChangeKind {
    Upsert,
    SoftDelete,
    Restore,
    HardDelete,
    ConflictNotice,
}

impl RemoteChangeKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Upsert => "upsert",
            Self::SoftDelete => "soft_delete",
            Self::Restore => "restore",
            Self::HardDelete => "hard_delete",
            Self::ConflictNotice => "conflict_notice",
        }
    }

    pub fn parse(raw: &str) -> Result<Self, crate::error::SyncError> {
        match raw {
            "upsert" => Ok(Self::Upsert),
            "soft_delete" => Ok(Self::SoftDelete),
            "restore" => Ok(Self::Restore),
            "hard_delete" => Ok(Self::HardDelete),
            "conflict_notice" => Ok(Self::ConflictNotice),
            other => Err(crate::error::SyncError::protocol(format!(
                "远端 remote_change_log.change_kind 非法: {other}"
            ))),
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RemoteChangeRecord {
    pub server_seq: i64,
    pub entity_type: String,
    pub entity_id: String,
    pub change_kind: RemoteChangeKind,
    pub patch: Option<SyncOperationPayload>,
    pub changed_by_client_id: String,
    pub changed_by_client_seq: i64,
    pub committed_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SpacePayload {
    pub id: String,
    pub name: String,
    pub icon_key: String,
    pub color_key: String,
    pub is_default: bool,
    pub sort_order: i32,
    pub archived_at: Option<String>,
    pub deleted_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ProjectPayload {
    pub id: String,
    pub space_id: String,
    pub name: String,
    pub description: Option<String>,
    pub due_at: Option<String>,
    pub sort_order: i32,
    pub completed_at: Option<String>,
    pub archived_at: Option<String>,
    pub deleted_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TaskPayload {
    pub id: String,
    pub space_id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub note: Option<String>,
    pub status: String,
    pub status_changed_at: String,
    pub priority: i32,
    pub inbox_at: Option<String>,
    pub due_at: Option<String>,
    pub scheduled_at: Option<String>,
    pub reminder_at: Option<String>,
    pub sort_order: i32,
    pub completed_at: Option<String>,
    pub canceled_at: Option<String>,
    pub archived_at: Option<String>,
    pub deleted_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ViewPayload {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub kind: String,
    pub entity_type: String,
    pub key: Option<String>,
    pub filters: String,
    pub sort: String,
    pub group_by: Option<String>,
    pub is_visible: bool,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SettingPayload {
    pub key: String,
    pub raw_value: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TaskLinkPayload {
    pub id: String,
    pub task_id: String,
    pub title: String,
    pub url: String,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct HardDeletePayload {
    pub entity_type: String,
    pub entity_id: String,
    pub deleted_at: String,
    #[serde(default)]
    pub metadata: Option<Value>,
}

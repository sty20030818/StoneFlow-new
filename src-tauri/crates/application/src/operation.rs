//! 写操作上下文与事务 / Outbox / Tombstone 端口。

#![allow(async_fn_in_trait)]

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use stoneflow_domain::{create_id, now_utc};

use crate::ApplicationError;

/// 一次用户写操作的共享上下文。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct OperationContext {
    pub operation_id: String,
    pub device_id: String,
    pub created_at: String,
}

impl OperationContext {
    /// 生成新的写操作上下文。
    pub fn new(device_id: impl Into<String>) -> Self {
        Self {
            operation_id: create_id().to_string(),
            device_id: device_id.into(),
            created_at: now_utc().to_rfc3339(),
        }
    }
}

/// Outbox 实体类型（与存储层 sync entity 对齐的应用层枚举）。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncEntityKind {
    Space,
    Project,
    Task,
    TaskLink,
    View,
    Setting,
    Activity,
}

impl SyncEntityKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Space => "space",
            Self::Project => "project",
            Self::Task => "task",
            Self::TaskLink => "task_link",
            Self::View => "view",
            Self::Setting => "setting",
            Self::Activity => "activity",
        }
    }
}

/// Outbox 操作类型。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OutboxOpKind {
    Upsert,
    Delete,
    Restore,
    Patch,
}

impl OutboxOpKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Upsert => "upsert",
            Self::Delete => "delete",
            Self::Restore => "restore",
            Self::Patch => "patch",
        }
    }
}

/// R7 Outbox payload：只表达字段变更或生命周期，不保存整实体快照。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum OutboxPayload {
    Patch { fields: Map<String, Value> },
    Lifecycle { state: OutboxLifecycleState },
    Tombstone { deleted_at: String },
}

impl OutboxPayload {
    pub fn to_json(&self) -> Result<String, ApplicationError> {
        serde_json::to_string(self).map_err(|error| {
            ApplicationError::internal(format!("序列化 R7 Outbox payload 失败: {error}"))
        })
    }
}

/// 仅保留实际变化的字段，保证远端字段级 LWW 不会覆盖并发编辑的无关字段。
pub fn changed_outbox_fields(
    before: &Map<String, Value>,
    after: &Map<String, Value>,
) -> Map<String, Value> {
    after
        .iter()
        .filter(|(key, value)| before.get(*key) != Some(*value))
        .map(|(key, value)| (key.clone(), value.clone()))
        .collect()
}

/// 可见实体的同步生命周期。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OutboxLifecycleState {
    Active,
    Archived,
    Trashed,
}

/// 待发送 Outbox 记录。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct OutboxEnqueueRecord {
    pub id: String,
    pub operation_id: String,
    pub entity_type: SyncEntityKind,
    pub entity_id: String,
    pub generation: i64,
    pub operation_type: OutboxOpKind,
    pub payload_json: String,
    pub created_at: String,
    pub available_at: String,
}

/// Tombstone 记录（无业务正文）。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TombstoneRecord {
    pub entity_type: SyncEntityKind,
    pub entity_id: String,
    pub generation: i64,
    pub deletion_seq: i64,
    pub deleted_at: String,
}

/// 远端已应用 operation 的幂等记录。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AppliedOperationRecord {
    pub operation_id: String,
    pub entity_type: SyncEntityKind,
    pub entity_id: String,
    pub applied_at: String,
    pub server_seq: Option<i64>,
}

/// 统一写事务边界。
pub trait UnitOfWork {
    type Connection;

    async fn begin(&self) -> Result<Self::Connection, ApplicationError>;
    async fn commit(&self, connection: Self::Connection) -> Result<(), ApplicationError>;
    async fn rollback(&self, connection: Self::Connection) -> Result<(), ApplicationError>;
}

/// Outbox 写入 port（必须在 UnitOfWork 连接上调用）。
pub trait OutboxWriter {
    type Connection;

    async fn enqueue(
        &self,
        connection: &Self::Connection,
        record: &OutboxEnqueueRecord,
    ) -> Result<(), ApplicationError>;
}

/// Tombstone 写入 port。
pub trait TombstoneWriter {
    type Connection;

    async fn insert_tombstone(
        &self,
        connection: &Self::Connection,
        record: &TombstoneRecord,
    ) -> Result<(), ApplicationError>;
}

/// Applied operations 写入 port。
pub trait AppliedOperationWriter {
    type Connection;

    async fn record_applied(
        &self,
        connection: &Self::Connection,
        record: &AppliedOperationRecord,
    ) -> Result<(), ApplicationError>;
}

//! Activity 持久化 port：定义写入与 timeline 查询边界。

#![allow(async_fn_in_trait)]

use serde_json::Value;
use stoneflow_domain::{ActivityActorKind, ActivityEntityKind, ActivitySourceKind};

use crate::ApplicationError;

use super::{ActivityTimelineEntry, GetEntityActivitiesInput};

/// 写入一条 Activity event 所需的持久化字段。
#[derive(Debug, Clone, PartialEq)]
pub struct ActivityEventRecord {
    pub id: String,
    pub entity_type: ActivityEntityKind,
    pub entity_id: String,
    pub action: String,
    pub actor_type: ActivityActorKind,
    pub source: ActivitySourceKind,
    pub summary: Option<String>,
    pub metadata: Option<Value>,
    pub created_at: String,
}

/// 写入单个 Activity change 所需的持久化字段。
#[derive(Debug, Clone, PartialEq)]
pub struct ActivityChangeRecord {
    pub id: String,
    pub event_id: String,
    pub field: String,
    pub old_value: Option<Value>,
    pub new_value: Option<Value>,
    pub created_at: String,
}

/// Activity 持久化边界：连接类型由 adapter 决定（runtime 为 `DatabaseTransaction`）。
pub trait ActivityPersistence: Send + Sync {
    /// 事务连接句柄。
    type Connection: Send + Sync;

    /// 开启独立事务。
    async fn begin(&self) -> Result<Self::Connection, ApplicationError>;

    /// 提交事务。
    async fn commit(&self, connection: Self::Connection) -> Result<(), ApplicationError>;

    /// 在已有连接上插入 event 与其字段变化。
    async fn insert_event_with_changes(
        &self,
        connection: &Self::Connection,
        event: &ActivityEventRecord,
        changes: &[ActivityChangeRecord],
    ) -> Result<(), ApplicationError>;

    /// 在已有连接上批量插入多条 event 及其字段变化。
    async fn insert_events_with_changes(
        &self,
        connection: &Self::Connection,
        records: &[(ActivityEventRecord, Vec<ActivityChangeRecord>)],
    ) -> Result<(), ApplicationError>;

    /// 按实体查询 timeline。
    async fn list_by_entity(
        &self,
        input: GetEntityActivitiesInput,
    ) -> Result<Vec<ActivityTimelineEntry>, ApplicationError>;
}

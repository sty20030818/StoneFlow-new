//! Activity 输入输出模型。

use serde::{Deserialize, Serialize};
use serde_json::Value;
use stoneflow_domain::{ActivityActorKind, ActivityEntityKind, ActivitySourceKind};

use super::ActivityAction;

/// 单个字段变化输入。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ActivityChangeInput {
    pub field: String,
    pub old_value: Option<Value>,
    pub new_value: Option<Value>,
}

/// 记录 Activity 的统一输入。
#[derive(Debug, Clone, PartialEq)]
pub struct RecordActivityInput {
    pub entity_type: ActivityEntityKind,
    pub entity_id: String,
    pub action: ActivityAction,
    pub actor_type: Option<ActivityActorKind>,
    pub source: Option<ActivitySourceKind>,
    pub summary: Option<String>,
    pub metadata: Option<Value>,
    pub changes: Vec<ActivityChangeInput>,
}

/// 查询单个实体 Activity timeline 的输入。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
pub struct GetEntityActivitiesInput {
    pub entity_type: ActivityEntityKind,
    pub entity_id: String,
    pub limit: Option<u16>,
}

/// Timeline 中的单个字段变化。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ActivityTimelineChange {
    pub id: String,
    pub field: String,
    pub old_value: Option<Value>,
    pub new_value: Option<Value>,
    pub created_at: String,
}

/// Timeline 中的单条事件。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ActivityTimelineEntry {
    pub id: String,
    pub entity_type: ActivityEntityKind,
    pub entity_id: String,
    pub action: String,
    pub actor_type: ActivityActorKind,
    pub source: ActivitySourceKind,
    pub summary: Option<String>,
    pub metadata: Option<Value>,
    pub created_at: String,
    pub changes: Vec<ActivityTimelineChange>,
}

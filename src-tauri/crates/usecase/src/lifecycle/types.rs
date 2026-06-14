//! Lifecycle 列表与查询 DTO。

use serde::{Deserialize, Serialize};
use stoneflow_domain::LifecycleEntityType;

/// Scope 类型。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LifecycleScopeKind {
    All,
    Space,
}

/// 列表 Scope 输入。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LifecycleScopeInput {
    #[serde(rename = "type")]
    pub kind: LifecycleScopeKind,
    pub space_id: Option<String>,
}

/// 列表查询输入。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListLifecycleEntriesInput {
    pub scope: LifecycleScopeInput,
    pub entity_filter: Option<LifecycleEntityType>,
}

/// 归档/回收站列表条目。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LifecycleEntry {
    pub id: String,
    pub entity_type: LifecycleEntityType,
    pub title: String,
    pub space_id: Option<String>,
    pub space_name: Option<String>,
    pub project_id: Option<String>,
    pub project_name: Option<String>,
    pub archived_at: Option<String>,
    pub deleted_at: Option<String>,
    pub source_type: Option<String>,
    pub source_id: Option<String>,
    pub restore_hint: String,
}

/// Project 生命周期列表读模型（含来源字段）。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LifecycleProjectListRecord {
    pub id: String,
    pub space_id: String,
    pub name: String,
    pub archived_at: Option<String>,
    pub archived_by_type: Option<String>,
    pub archived_by_id: Option<String>,
    pub deleted_at: Option<String>,
    pub deleted_by_type: Option<String>,
    pub deleted_by_id: Option<String>,
}

/// Task 生命周期列表读模型（含来源字段）。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LifecycleTaskListRecord {
    pub id: String,
    pub space_id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub archived_at: Option<String>,
    pub archived_by_type: Option<String>,
    pub archived_by_id: Option<String>,
    pub deleted_at: Option<String>,
    pub deleted_by_type: Option<String>,
    pub deleted_by_id: Option<String>,
}

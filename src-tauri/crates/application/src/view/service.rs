//! View 用例（R2）：自定义 View CRUD 端口 + Task View 执行 stub。
//!
//! 系统 View 由代码定义，不入库；完整执行器接线留给后续任务。

#![allow(async_fn_in_trait)]

use serde::{Deserialize, Serialize};
use serde_json::Value;
use stoneflow_domain::{create_id, normalize_required_text, now_utc, ViewEntityKind};

use crate::{
    activity::{ActivityPersistence, ActivityService},
    view::types::{
        CreateViewPersistenceRecord, UpdateViewPatch, ViewListQuery, ViewProjectLookupRecord,
        ViewRecord, ViewSpaceLookupRecord, ViewTaskPlacementQuery, ViewTaskRecord,
    },
    ApplicationError,
};

/// View 返回载荷。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ViewDto {
    pub id: String,
    pub name: String,
    pub entity_kind: ViewEntityKind,
    pub scope: Value,
    pub filters: Value,
    pub sort: Value,
    pub group_by: Option<Value>,
    pub position: i64,
    pub generation: i64,
    pub created_at: String,
    pub updated_at: String,
}

/// 创建 View 输入。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateViewInput {
    pub entity_kind: ViewEntityKind,
    pub name: String,
    pub scope: Value,
    pub filters: Value,
    pub sort: Value,
    pub group_by: Option<Value>,
}

/// 更新 View 输入。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateViewInput {
    pub view_id: String,
    pub name: Option<String>,
    pub scope: Option<Value>,
    pub filters: Option<Value>,
    pub sort: Option<Value>,
    pub group_by: Option<Option<Value>>,
}

/// 列表 View 输入。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListViewsInput {
    pub entity_kind: ViewEntityKind,
}

/// Task View 执行输入（R2 stub）。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunTaskViewInput {
    pub view_id: Option<String>,
    pub space_id: Option<String>,
}

/// Task View 列表单条（R2 stub 载荷）。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskViewItemDto {
    pub id: String,
    pub space_id: String,
    pub project_id: Option<String>,
    pub title: String,
    pub status: stoneflow_domain::WorkStatus,
    pub priority: i32,
    pub position: i64,
}

/// View 持久化边界。
pub trait ViewPersistence: Send + Sync {
    type Connection: Send + Sync;

    async fn begin(&self) -> Result<Self::Connection, ApplicationError>;
    async fn commit(&self, connection: Self::Connection) -> Result<(), ApplicationError>;
    async fn get(&self, view_id: &str) -> Result<Option<ViewRecord>, ApplicationError>;
    async fn list(&self, query: ViewListQuery) -> Result<Vec<ViewRecord>, ApplicationError>;
    async fn next_position(
        &self,
        connection: &Self::Connection,
        entity_kind: ViewEntityKind,
    ) -> Result<i64, ApplicationError>;
    async fn create(
        &self,
        connection: &Self::Connection,
        record: CreateViewPersistenceRecord,
    ) -> Result<ViewRecord, ApplicationError>;
    async fn update(
        &self,
        connection: &Self::Connection,
        view_id: &str,
        patch: UpdateViewPatch,
    ) -> Result<Option<ViewRecord>, ApplicationError>;
    async fn delete(
        &self,
        connection: &Self::Connection,
        view_id: &str,
    ) -> Result<u64, ApplicationError>;
}

/// Task View 执行所需的 Task 读取边界。
pub trait ViewTaskReader: Send + Sync {
    async fn list_candidates(
        &self,
        space_id: Option<String>,
        placement: ViewTaskPlacementQuery,
    ) -> Result<Vec<ViewTaskRecord>, ApplicationError>;
}

/// Task View 列表所需的 Space / Project 名称查找边界。
pub trait ViewLookupReader: Send + Sync {
    async fn list_spaces_by_ids(
        &self,
        space_ids: &[String],
    ) -> Result<Vec<ViewSpaceLookupRecord>, ApplicationError>;
    async fn list_projects_by_ids(
        &self,
        project_ids: &[String],
    ) -> Result<Vec<ViewProjectLookupRecord>, ApplicationError>;
}

/// View 用例编排。
#[derive(Debug, Clone)]
pub struct ViewService<P, A, T, L>
where
    P: ViewPersistence,
    A: ActivityPersistence<Connection = P::Connection>,
    T: ViewTaskReader,
    L: ViewLookupReader,
{
    persistence: P,
    _activity: ActivityService<A>,
    _task_reader: T,
    _lookup_reader: L,
}

impl<P, A, T, L> ViewService<P, A, T, L>
where
    P: ViewPersistence,
    A: ActivityPersistence<Connection = P::Connection>,
    T: ViewTaskReader,
    L: ViewLookupReader,
{
    pub fn new(
        persistence: P,
        activity: ActivityService<A>,
        task_reader: T,
        lookup_reader: L,
    ) -> Self {
        Self {
            persistence,
            _activity: activity,
            _task_reader: task_reader,
            _lookup_reader: lookup_reader,
        }
    }

    pub async fn list_views(
        &self,
        input: ListViewsInput,
    ) -> Result<Vec<ViewDto>, ApplicationError> {
        let records = self
            .persistence
            .list(ViewListQuery {
                entity_kind: input.entity_kind,
            })
            .await?;
        records.into_iter().map(map_view_record).collect()
    }

    pub async fn create_view(&self, input: CreateViewInput) -> Result<ViewDto, ApplicationError> {
        let name = normalize_required_text(&input.name, "name")?;
        let now = now_utc().to_rfc3339();
        let transaction = self.persistence.begin().await?;
        let position = self
            .persistence
            .next_position(&transaction, input.entity_kind)
            .await?;
        let record = self
            .persistence
            .create(
                &transaction,
                CreateViewPersistenceRecord {
                    id: create_id().to_string(),
                    name,
                    entity_kind: input.entity_kind,
                    scope_json: json_string(&input.scope)?,
                    filters_json: json_string(&input.filters)?,
                    sort_json: json_string(&input.sort)?,
                    group_by_json: input.group_by.as_ref().map(json_string).transpose()?,
                    position,
                    created_at: now.clone(),
                    updated_at: now,
                },
            )
            .await?;
        self.persistence.commit(transaction).await?;
        map_view_record(record)
    }

    pub async fn update_view(&self, input: UpdateViewInput) -> Result<ViewDto, ApplicationError> {
        let now = now_utc().to_rfc3339();
        let transaction = self.persistence.begin().await?;
        let patch = UpdateViewPatch {
            name: input
                .name
                .as_deref()
                .map(|value| normalize_required_text(value, "name"))
                .transpose()?,
            scope_json: input.scope.as_ref().map(json_string).transpose()?,
            filters_json: input.filters.as_ref().map(json_string).transpose()?,
            sort_json: input.sort.as_ref().map(json_string).transpose()?,
            group_by_json: match input.group_by {
                None => None,
                Some(None) => Some(None),
                Some(Some(value)) => Some(Some(json_string(&value)?)),
            },
            position: None,
            updated_at: Some(now),
        };
        let updated = self
            .persistence
            .update(&transaction, &input.view_id, patch)
            .await?
            .ok_or_else(|| ApplicationError::not_found("View 不存在"))?;
        self.persistence.commit(transaction).await?;
        map_view_record(updated)
    }

    pub async fn delete_view(&self, view_id: &str) -> Result<(), ApplicationError> {
        let transaction = self.persistence.begin().await?;
        let deleted = self.persistence.delete(&transaction, view_id).await?;
        if deleted == 0 {
            return Err(ApplicationError::not_found("View 不存在"));
        }
        self.persistence.commit(transaction).await
    }

    /// Task View 执行：R2 基线返回空列表，完整过滤留给后续。
    pub async fn run_task_view(
        &self,
        _input: RunTaskViewInput,
    ) -> Result<Vec<TaskViewItemDto>, ApplicationError> {
        Ok(Vec::new())
    }
}

fn map_view_record(record: ViewRecord) -> Result<ViewDto, ApplicationError> {
    Ok(ViewDto {
        id: record.id,
        name: record.name,
        entity_kind: record.entity_kind,
        scope: parse_json(&record.scope_json)?,
        filters: parse_json(&record.filters_json)?,
        sort: parse_json(&record.sort_json)?,
        group_by: record
            .group_by_json
            .as_deref()
            .map(parse_json)
            .transpose()?,
        position: record.position,
        generation: record.generation,
        created_at: record.created_at,
        updated_at: record.updated_at,
    })
}

fn json_string(value: &Value) -> Result<String, ApplicationError> {
    serde_json::to_string(value)
        .map_err(|error| ApplicationError::validation(format!("View JSON 序列化失败: {error}")))
}

fn parse_json(raw: &str) -> Result<Value, ApplicationError> {
    serde_json::from_str(raw)
        .map_err(|error| ApplicationError::validation(format!("View JSON 解析失败: {error}")))
}

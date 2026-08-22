//! Saved View 生命周期与 Task 查询。

#![allow(async_fn_in_trait)]

use crate::{
    operation::{
        changed_outbox_fields, OutboxEnqueueRecord, OutboxOpKind, OutboxPayload, SyncEntityKind,
    },
    task::executor::{decode_task_query_cursor, encode_task_query_cursor},
    view::{
        filter_query::{parse_filters_json, validate_filter_query, FilterQueryValue},
        CreateViewPersistenceRecord, TaskScopeInput, TaskScopeKind, TaskViewBaseKey,
        TaskViewContext, UpdateViewPatch, ViewDateBoundaries, ViewProjectLookupRecord, ViewRecord,
        ViewSpaceLookupRecord, ViewTaskPage, ViewTaskQuery,
    },
    ApplicationError,
};
use chrono::{Datelike, Duration, Local, NaiveDate, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use std::collections::{HashMap, HashSet};
use stoneflow_domain::{
    create_id, normalize_required_text, now_utc, validate_project_id, ViewEntityKind, WorkStatus,
};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct StoredTaskViewDefinition {
    base_view_key: TaskViewBaseKey,
    context: TaskViewContext,
    filters: FilterQueryValue,
}

const DEFAULT_TASK_QUERY_PAGE_SIZE: u32 = 150;
const EMPTY_SORT_JSON: &str = "[]";
const NO_GROUP_JSON: &str = "\"none\"";

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ViewDto {
    pub id: String,
    pub name: String,
    pub scope: TaskScopeInput,
    pub context: TaskViewContext,
    pub base_view_key: TaskViewBaseKey,
    /// 用户保存的筛选条件；运行时可被 URL Filter Draft 完整替换。
    pub filters: FilterQueryValue,
    pub position: i64,
    pub created_at: String,
    pub updated_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub definition_error: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CreateViewInput {
    pub name: String,
    pub scope: TaskScopeInput,
    pub context: TaskViewContext,
    pub base_view_key: TaskViewBaseKey,
    pub filters: FilterQueryValue,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct UpdateViewInput {
    pub view_id: String,
    pub name: Option<String>,
    pub scope: Option<TaskScopeInput>,
    pub context: Option<TaskViewContext>,
    pub base_view_key: Option<TaskViewBaseKey>,
    pub filters: Option<FilterQueryValue>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ListViewsInput {
    pub scope: TaskScopeInput,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RunTaskViewInput {
    pub scope: TaskScopeInput,
    pub view_id: String,
    /// URL draft；存在时完整替换 View filters（包括显式空查询）。
    pub filters: Option<FilterQueryValue>,
    /// opaque keyset cursor（与统一查询的 position + id 排序一致）。
    #[serde(default)]
    pub cursor: Option<String>,
}

/// Default View 与 Saved View 共用的 Task 查询契约。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RunTaskQueryInput {
    pub scope: TaskScopeInput,
    pub context: TaskViewContext,
    pub base_view_key: TaskViewBaseKey,
    pub filters: FilterQueryValue,
    #[serde(default)]
    pub cursor: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CountTaskQueryInput {
    pub scope: TaskScopeInput,
    pub context: TaskViewContext,
    pub base_view_key: TaskViewBaseKey,
    pub filters: FilterQueryValue,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskViewItemDto {
    pub id: String,
    pub space_id: String,
    pub space_name: String,
    pub space_slug: String,
    pub project_id: Option<String>,
    pub project_name: Option<String>,
    pub title: String,
    pub status: WorkStatus,
    pub status_changed_at: String,
    pub priority: i32,
    pub planned_at: Option<String>,
    pub due_at: Option<String>,
    pub remind_at: Option<String>,
    pub completed_at: Option<String>,
    pub canceled_at: Option<String>,
    pub archived_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunTaskViewOutput {
    pub view: ViewDto,
    pub items: Vec<TaskViewItemDto>,
    /// 过滤+排序后的总数（窗口前）。
    /// 首屏为精确总数；续页为 null，避免重复 COUNT。
    pub total_count: Option<u64>,
    /// 下一页 opaque keyset cursor；无更多则为 null。
    pub next_cursor: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunTaskQueryOutput {
    pub items: Vec<TaskViewItemDto>,
    /// 首屏为精确总数；续页为 null，避免重复 COUNT。
    pub total_count: Option<u64>,
    pub next_cursor: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CountTaskQueryOutput {
    pub total_count: u64,
}

pub trait ViewPersistence: Send + Sync {
    type Connection: Send + Sync;
    async fn begin(&self) -> Result<Self::Connection, ApplicationError>;
    async fn commit(&self, connection: Self::Connection) -> Result<(), ApplicationError>;
    async fn get(&self, view_id: &str) -> Result<Option<ViewRecord>, ApplicationError>;
    async fn list(&self) -> Result<Vec<ViewRecord>, ApplicationError>;
    async fn next_position(&self, connection: &Self::Connection) -> Result<i64, ApplicationError>;
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
    async fn enqueue(
        &self,
        connection: &Self::Connection,
        record: &OutboxEnqueueRecord,
    ) -> Result<(), ApplicationError>;
}
pub trait ViewTaskReader: Send + Sync {
    async fn run_query(&self, query: ViewTaskQuery) -> Result<ViewTaskPage, ApplicationError>;
    async fn count_query(&self, query: ViewTaskQuery) -> Result<u64, ApplicationError>;
}
pub trait ViewLookupReader: Send + Sync {
    async fn list_spaces_by_ids(
        &self,
        ids: &[String],
    ) -> Result<Vec<ViewSpaceLookupRecord>, ApplicationError>;
    async fn list_projects_by_ids(
        &self,
        ids: &[String],
    ) -> Result<Vec<ViewProjectLookupRecord>, ApplicationError>;
}

#[derive(Debug, Clone)]
pub struct ViewService<P, T, L> {
    persistence: P,
    task_reader: T,
    lookup_reader: L,
}
impl<P, T, L> ViewService<P, T, L>
where
    P: ViewPersistence,
    T: ViewTaskReader,
    L: ViewLookupReader,
{
    pub fn new(persistence: P, task_reader: T, lookup_reader: L) -> Self {
        Self {
            persistence,
            task_reader,
            lookup_reader,
        }
    }
    pub async fn list_views(
        &self,
        input: ListViewsInput,
    ) -> Result<Vec<ViewDto>, ApplicationError> {
        validate_scope(&input.scope)?;
        let records = self.persistence.list().await?;
        let mut views = Vec::new();
        for record in records {
            let scope: TaskScopeInput = from_json(&record.scope_json)?;
            validate_scope(&scope)?;
            if scope == input.scope {
                views.push(decode_view_for_list(record, scope)?);
            }
        }
        Ok(views)
    }
    pub async fn create_view(&self, input: CreateViewInput) -> Result<ViewDto, ApplicationError> {
        validate_definition(&input.scope, &input.context, &input.filters)?;
        let definition = StoredTaskViewDefinition {
            base_view_key: input.base_view_key,
            context: input.context,
            filters: input.filters,
        };
        let now = now_utc().to_rfc3339();
        let connection = self.persistence.begin().await?;
        let record = self
            .persistence
            .create(
                &connection,
                CreateViewPersistenceRecord {
                    id: create_id().to_string(),
                    name: normalize_required_text(&input.name, "name")?,
                    entity_kind: ViewEntityKind::Task,
                    scope_json: to_json(&input.scope)?,
                    filters_json: to_json(&definition)?,
                    sort_json: EMPTY_SORT_JSON.to_owned(),
                    group_by_json: Some(NO_GROUP_JSON.to_owned()),
                    position: self.persistence.next_position(&connection).await?,
                    created_at: now.clone(),
                    updated_at: now.clone(),
                },
            )
            .await?;
        enqueue(
            &self.persistence,
            &connection,
            &record,
            OutboxOpKind::Upsert,
            &now,
            OutboxPayload::Patch {
                fields: view_fields(&record)?,
            },
        )
        .await?;
        self.persistence.commit(connection).await?;
        decode_view(record)
    }
    pub async fn update_view(&self, input: UpdateViewInput) -> Result<ViewDto, ApplicationError> {
        let current = self
            .persistence
            .get(&input.view_id)
            .await?
            .ok_or_else(|| ApplicationError::not_found("View 不存在"))?;
        let current_dto = decode_view(current.clone())?;
        let scope = input.scope.unwrap_or(current_dto.scope);
        let definition = StoredTaskViewDefinition {
            base_view_key: input.base_view_key.unwrap_or(current_dto.base_view_key),
            context: input.context.unwrap_or(current_dto.context),
            filters: input.filters.unwrap_or(current_dto.filters),
        };
        validate_definition(&scope, &definition.context, &definition.filters)?;
        let now = now_utc().to_rfc3339();
        let connection = self.persistence.begin().await?;
        // sort/group 已退出产品契约；旧列只写空值，Saved View 定义统一进 filters_json。
        let record = self
            .persistence
            .update(
                &connection,
                &input.view_id,
                UpdateViewPatch {
                    name: input
                        .name
                        .as_deref()
                        .map(|v| normalize_required_text(v, "name"))
                        .transpose()?,
                    scope_json: Some(to_json(&scope)?),
                    filters_json: Some(to_json(&definition)?),
                    sort_json: Some(EMPTY_SORT_JSON.to_owned()),
                    group_by_json: Some(Some(NO_GROUP_JSON.to_owned())),
                    position: None,
                    updated_at: Some(now.clone()),
                },
            )
            .await?
            .ok_or_else(|| ApplicationError::not_found("View 不存在"))?;
        let payload = OutboxPayload::Patch {
            fields: changed_outbox_fields(&view_fields(&current)?, &view_fields(&record)?),
        };
        enqueue(
            &self.persistence,
            &connection,
            &record,
            OutboxOpKind::Patch,
            &now,
            payload,
        )
        .await?;
        self.persistence.commit(connection).await?;
        decode_view(record)
    }
    pub async fn delete_view(&self, view_id: &str) -> Result<(), ApplicationError> {
        let current = self
            .persistence
            .get(view_id)
            .await?
            .ok_or_else(|| ApplicationError::not_found("View 不存在"))?;
        let now = now_utc().to_rfc3339();
        let connection = self.persistence.begin().await?;
        if self.persistence.delete(&connection, view_id).await? == 0 {
            return Err(ApplicationError::not_found("View 不存在"));
        }
        enqueue(
            &self.persistence,
            &connection,
            &current,
            OutboxOpKind::Delete,
            &now,
            OutboxPayload::Tombstone {
                deleted_at: now.clone(),
            },
        )
        .await?;
        self.persistence.commit(connection).await
    }
    pub async fn run_task_view(
        &self,
        input: RunTaskViewInput,
    ) -> Result<RunTaskViewOutput, ApplicationError> {
        validate_scope(&input.scope)?;
        let view = decode_view(
            self.persistence
                .get(&input.view_id)
                .await?
                .ok_or_else(|| ApplicationError::not_found("View 不存在"))?,
        )?;
        if view.scope != input.scope {
            return Err(ApplicationError::validation("View 不属于当前 Scope"));
        }

        let filter_query = input.filters.unwrap_or_else(|| view.filters.clone());
        let result = self
            .run_task_query(RunTaskQueryInput {
                scope: view.scope.clone(),
                context: view.context.clone(),
                base_view_key: view.base_view_key,
                filters: filter_query,
                cursor: input.cursor,
            })
            .await?;
        Ok(RunTaskViewOutput {
            view,
            items: result.items,
            total_count: result.total_count,
            next_cursor: result.next_cursor,
        })
    }

    /// 执行 Task 查询。Default View 直接调用；Saved View 加载定义后委托到这里。
    pub async fn run_task_query(
        &self,
        input: RunTaskQueryInput,
    ) -> Result<RunTaskQueryOutput, ApplicationError> {
        validate_definition(&input.scope, &input.context, &input.filters)?;
        let limit = DEFAULT_TASK_QUERY_PAGE_SIZE;
        let page = self
            .task_reader
            .run_query(ViewTaskQuery {
                scope: input.scope,
                context: input.context,
                base_view_key: input.base_view_key,
                filters: input.filters,
                dates: build_date_boundaries(stoneflow_domain::today_local_date())?,
                limit: limit.saturating_add(1),
                cursor: input
                    .cursor
                    .as_deref()
                    .map(decode_task_query_cursor)
                    .transpose()?,
            })
            .await?;
        let mut page_tasks = page.items;
        let has_more = page_tasks.len() as u32 > limit;
        page_tasks.truncate(limit as usize);
        let next_cursor = if has_more {
            page_tasks
                .last()
                .map(|task| encode_task_query_cursor(task.position, &task.id))
        } else {
            None
        };

        let space_ids = page_tasks
            .iter()
            .map(|task| task.space_id.clone())
            .collect::<HashSet<_>>()
            .into_iter()
            .collect::<Vec<_>>();
        let project_ids = page_tasks
            .iter()
            .filter_map(|task| task.project_id.clone())
            .collect::<HashSet<_>>()
            .into_iter()
            .collect::<Vec<_>>();
        let spaces = self
            .lookup_reader
            .list_spaces_by_ids(&space_ids)
            .await?
            .into_iter()
            .map(|space| (space.id.clone(), space))
            .collect::<HashMap<_, _>>();
        let projects = self
            .lookup_reader
            .list_projects_by_ids(&project_ids)
            .await?
            .into_iter()
            .map(|project| (project.id, project.name))
            .collect::<HashMap<_, _>>();
        let items = page_tasks
            .iter()
            .map(|task| {
                let space = spaces
                    .get(&task.space_id)
                    .ok_or_else(|| ApplicationError::internal("Task 的 Space 不存在"))?;
                Ok(TaskViewItemDto {
                    id: task.id.clone(),
                    space_id: task.space_id.clone(),
                    space_name: space.name.clone(),
                    space_slug: space.slug.clone(),
                    project_id: task.project_id.clone(),
                    project_name: task
                        .project_id
                        .as_ref()
                        .and_then(|id| projects.get(id).cloned()),
                    title: task.title.clone(),
                    status: task.status,
                    status_changed_at: task.status_changed_at.clone(),
                    priority: task.priority,
                    planned_at: task.planned_at.clone(),
                    due_at: task.due_at.clone(),
                    remind_at: task.remind_at.clone(),
                    completed_at: task.completed_at.clone(),
                    canceled_at: matches!(task.status, WorkStatus::Canceled)
                        .then(|| task.status_changed_at.clone()),
                    archived_at: task.archived_at.clone(),
                    created_at: task.created_at.clone(),
                    updated_at: task.updated_at.clone(),
                })
            })
            .collect::<Result<Vec<_>, ApplicationError>>()?;
        Ok(RunTaskQueryOutput {
            items,
            total_count: page.total_count,
            next_cursor,
        })
    }

    /// Sidebar 等只读数量消费者复用同一 SQL predicate，不加载 Task 窗口与 lookup。
    pub async fn count_task_query(
        &self,
        input: CountTaskQueryInput,
    ) -> Result<CountTaskQueryOutput, ApplicationError> {
        validate_definition(&input.scope, &input.context, &input.filters)?;
        let total_count = self
            .task_reader
            .count_query(ViewTaskQuery {
                scope: input.scope,
                context: input.context,
                base_view_key: input.base_view_key,
                filters: input.filters,
                dates: build_date_boundaries(stoneflow_domain::today_local_date())?,
                limit: 1,
                cursor: None,
            })
            .await?;
        Ok(CountTaskQueryOutput { total_count })
    }
}

fn build_date_boundaries(today: NaiveDate) -> Result<ViewDateBoundaries, ApplicationError> {
    let days_until_next_week = i64::from(7 - today.weekday().num_days_from_monday());
    Ok(ViewDateBoundaries {
        today_start: local_day_start(today)?,
        tomorrow_start: local_day_start(today + Duration::days(1))?,
        day_after_tomorrow_start: local_day_start(today + Duration::days(2))?,
        next_week_start: local_day_start(today + Duration::days(days_until_next_week))?,
    })
}

fn local_day_start(date: NaiveDate) -> Result<String, ApplicationError> {
    let local = Local
        .from_local_datetime(
            &date
                .and_hms_opt(0, 0, 0)
                .ok_or_else(|| ApplicationError::internal("无法构造本地日期边界"))?,
        )
        .earliest()
        .ok_or_else(|| ApplicationError::internal("无法解析本地日期边界"))?;
    Ok(local.with_timezone(&Utc).to_rfc3339())
}

fn validate_definition(
    scope: &TaskScopeInput,
    context: &TaskViewContext,
    filters: &FilterQueryValue,
) -> Result<(), ApplicationError> {
    validate_scope(scope)?;
    if let TaskViewContext::Project { project_id } = context {
        validate_project_id(project_id)?;
    }
    validate_filter_query(filters)?;
    Ok(())
}

fn validate_scope(scope: &TaskScopeInput) -> Result<(), ApplicationError> {
    if matches!(scope.kind, TaskScopeKind::Space)
        && scope.space_id.as_deref().is_none_or(str::is_empty)
    {
        return Err(ApplicationError::validation("Space 范围必须提供 spaceId"));
    }
    if matches!(scope.kind, TaskScopeKind::All) && scope.space_id.is_some() {
        return Err(ApplicationError::validation(
            "全部 Space 范围不能提供 spaceId",
        ));
    }
    Ok(())
}

fn decode_view(record: ViewRecord) -> Result<ViewDto, ApplicationError> {
    if record.entity_kind != ViewEntityKind::Task {
        return Err(ApplicationError::validation("仅支持 Task View"));
    }
    let scope = from_json(&record.scope_json)?;
    let definition = decode_stored_definition(&record.filters_json)?;
    validate_definition(&scope, &definition.context, &definition.filters)?;
    Ok(ViewDto {
        id: record.id,
        name: record.name,
        scope,
        context: definition.context,
        base_view_key: definition.base_view_key,
        filters: definition.filters,
        position: record.position,
        created_at: record.created_at,
        updated_at: record.updated_at,
        definition_error: None,
    })
}

/// Library 必须隔离单行旧定义错误，让用户仍可删除并重建该 Saved View。
fn decode_view_for_list(
    record: ViewRecord,
    scope: TaskScopeInput,
) -> Result<ViewDto, ApplicationError> {
    if record.entity_kind != ViewEntityKind::Task {
        return Err(ApplicationError::validation("仅支持 Task View"));
    }
    match decode_view(record.clone()) {
        Ok(view) => Ok(view),
        Err(error) => Ok(ViewDto {
            id: record.id,
            name: record.name,
            scope,
            context: TaskViewContext::All,
            base_view_key: TaskViewBaseKey::All,
            filters: FilterQueryValue::default(),
            position: record.position,
            created_at: record.created_at,
            updated_at: record.updated_at,
            definition_error: Some(error.to_string()),
        }),
    }
}

fn decode_stored_definition(value: &str) -> Result<StoredTaskViewDefinition, ApplicationError> {
    let trimmed = value.trim();
    if trimmed.is_empty() || trimmed == "null" {
        return Ok(StoredTaskViewDefinition {
            base_view_key: TaskViewBaseKey::All,
            context: TaskViewContext::All,
            filters: FilterQueryValue::default(),
        });
    }
    let json: Value = serde_json::from_str(trimmed)
        .map_err(|_| ApplicationError::validation("View filters 定义无效"))?;
    let is_definition = json.as_object().is_some_and(|object| {
        object.contains_key("baseViewKey")
            || object.contains_key("context")
            || object.contains_key("filters")
    });
    if is_definition {
        return serde_json::from_value(json)
            .map_err(|_| ApplicationError::validation("Saved View 定义无效"));
    }

    // 唯一兼容边界：旧 filters_json 仍按原筛选形状读取，随后进入新定义。
    Ok(StoredTaskViewDefinition {
        base_view_key: TaskViewBaseKey::All,
        context: TaskViewContext::All,
        filters: parse_filters_json(value)?,
    })
}

fn to_json<T: Serialize>(value: &T) -> Result<String, ApplicationError> {
    serde_json::to_string(value)
        .map_err(|error| ApplicationError::validation(format!("View 定义序列化失败: {error}")))
}
fn from_json<T: for<'de> Deserialize<'de>>(value: &str) -> Result<T, ApplicationError> {
    serde_json::from_str(value).map_err(|_| ApplicationError::validation("View 定义无效"))
}
async fn enqueue<P: ViewPersistence>(
    persistence: &P,
    connection: &P::Connection,
    record: &ViewRecord,
    operation_type: OutboxOpKind,
    now: &str,
    payload: OutboxPayload,
) -> Result<(), ApplicationError> {
    persistence
        .enqueue(
            connection,
            &OutboxEnqueueRecord {
                id: create_id().to_string(),
                operation_id: create_id().to_string(),
                entity_type: SyncEntityKind::View,
                entity_id: record.id.clone(),
                generation: record.generation
                    + if matches!(operation_type, OutboxOpKind::Delete) {
                        1
                    } else {
                        0
                    },
                operation_type,
                payload_json: payload.to_json()?,
                created_at: now.to_owned(),
                available_at: now.to_owned(),
            },
        )
        .await
}

fn view_fields(record: &ViewRecord) -> Result<Map<String, Value>, ApplicationError> {
    Ok(Map::from_iter([
        ("name".to_owned(), json!(record.name)),
        ("entity_kind".to_owned(), json!(record.entity_kind)),
        (
            "scope".to_owned(),
            serde_json::from_str(&record.scope_json)
                .map_err(|_| ApplicationError::validation("View scope 定义无效"))?,
        ),
        (
            "filters".to_owned(),
            serde_json::from_str(&record.filters_json)
                .map_err(|_| ApplicationError::validation("View filters 定义无效"))?,
        ),
        (
            "sort".to_owned(),
            serde_json::from_str(&record.sort_json)
                .map_err(|_| ApplicationError::validation("View sort 定义无效"))?,
        ),
        (
            "group_by".to_owned(),
            record
                .group_by_json
                .as_deref()
                .map(serde_json::from_str)
                .transpose()
                .map_err(|_| ApplicationError::validation("View groupBy 定义无效"))?
                .unwrap_or(Value::Null),
        ),
        ("position".to_owned(), json!(record.position)),
        ("created_at".to_owned(), json!(record.created_at)),
        ("updated_at".to_owned(), json!(record.updated_at)),
    ]))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn create_view_input_should_reject_unknown_fields() {
        let with_description = json!({
            "name": "Legacy",
            "description": "旧字段",
            "scope": { "type": "all" },
            "context": { "kind": "all" },
            "baseViewKey": "all",
            "filters": { "clauses": [] }
        });
        assert!(serde_json::from_value::<CreateViewInput>(with_description).is_err());

        let with_sort = json!({
            "name": "NoSort",
            "scope": { "type": "all" },
            "context": { "kind": "all" },
            "baseViewKey": "all",
            "filters": { "clauses": [] },
            "sort": []
        });
        assert!(serde_json::from_value::<CreateViewInput>(with_sort).is_err());
    }

    #[test]
    fn stored_definition_should_round_trip() {
        let definition = StoredTaskViewDefinition {
            base_view_key: TaskViewBaseKey::Today,
            context: TaskViewContext::Standalone,
            filters: FilterQueryValue::default(),
        };

        let decoded = decode_stored_definition(&to_json(&definition).unwrap()).unwrap();

        assert_eq!(decoded, definition);
    }

    #[test]
    fn legacy_filters_should_decode_only_at_storage_boundary() {
        let decoded = decode_stored_definition(
            r#"{"clauses":[{"id":"1","field":"status","op":"is","values":["todo"]}]}"#,
        )
        .unwrap();

        assert_eq!(
            (decoded.base_view_key, decoded.context),
            (TaskViewBaseKey::All, TaskViewContext::All)
        );
    }

    #[test]
    fn malformed_new_definition_should_not_fall_back_to_legacy_filters() {
        let missing_context = r#"{"baseViewKey":"all","filters":{"clauses":[]}}"#;

        assert!(decode_stored_definition(missing_context).is_err());
    }

    #[test]
    fn invalid_legacy_definition_should_remain_listable_for_cleanup() {
        let scope = TaskScopeInput {
            kind: TaskScopeKind::All,
            space_id: None,
        };
        let view = decode_view_for_list(
            ViewRecord {
                id: "legacy".to_owned(),
                name: "旧视图".to_owned(),
                entity_kind: ViewEntityKind::Task,
                scope_json: to_json(&scope).unwrap(),
                filters_json: r#"{"due":{"mode":"between","from":null,"to":null}}"#.to_owned(),
                sort_json: "[]".to_owned(),
                group_by_json: None,
                position: 1,
                generation: 1,
                created_at: "2026-08-22T00:00:00Z".to_owned(),
                updated_at: "2026-08-22T00:00:00Z".to_owned(),
            },
            scope,
        )
        .unwrap();

        assert_eq!(view.id, "legacy");
        assert!(view.definition_error.is_some());
    }
}

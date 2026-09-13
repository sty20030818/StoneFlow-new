//! Saved View 生命周期与 Task 查询。

#![allow(async_fn_in_trait)]

use crate::{
    operation::{
        changed_outbox_fields, OutboxEnqueueRecord, OutboxOpKind, OutboxPayload, SyncEntityKind,
    },
    task::{
        executor::{decode_task_query_cursor, encode_task_query_cursor, TaskQueryIdentity},
        TaskCompletedOrder, TaskOrderBy, TaskOrderDirection, TaskQueryOrder,
    },
    view::{
        codec::{
            decode_record_definition, from_json, to_json, validate_definition, validate_scope,
            view_sync_fields, StoredTaskViewDefinition, EMPTY_SORT_JSON, NO_GROUP_JSON,
        },
        CreateViewPersistenceRecord, FilterQueryValue, TaskScopeInput, TaskScopeKind,
        TaskViewBaseKey, TaskViewContext, UpdateViewPatch, ViewDateBoundaries,
        ViewProjectLookupRecord, ViewRecord, ViewSpaceLookupRecord, ViewTaskPage, ViewTaskQuery,
    },
    ApplicationError,
};
use chrono::{Datelike, Duration, Local, NaiveDate, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use stoneflow_domain::{create_id, normalize_required_text, now_utc, ViewEntityKind, WorkStatus};

const DEFAULT_TASK_QUERY_PAGE_SIZE: u32 = 150;

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
}

/// Library 的不可用记录只有恢复所需身份，不提供可被误执行的默认查询。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UnavailableViewDto {
    pub id: String,
    pub name: String,
    pub scope: Option<TaskScopeInput>,
    pub position: i64,
    pub created_at: String,
    pub updated_at: String,
    pub definition_error: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(untagged)]
pub enum ViewListItemDto {
    Available(ViewDto),
    Unavailable(UnavailableViewDto),
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
    pub order: TaskQueryOrder,
    /// 本机日历日；翻页期间固定，跨日重新从首屏开始。
    pub date_basis: String,
    /// 绑定查询、顺序、日期边界与完整 keyset 元组的版本化 cursor。
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
    pub order: TaskQueryOrder,
    pub date_basis: String,
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
    async fn get_in_connection(
        &self,
        connection: &Self::Connection,
        view_id: &str,
    ) -> Result<Option<ViewRecord>, ApplicationError>;
    async fn get_project_in_connection(
        &self,
        connection: &Self::Connection,
        project_id: &str,
    ) -> Result<Option<ViewProjectLookupRecord>, ApplicationError>;
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
    ) -> Result<Vec<ViewListItemDto>, ApplicationError> {
        validate_scope(&input.scope)?;
        let records = self.persistence.list().await?;
        let mut views = Vec::new();
        for record in records {
            let scope = from_json::<TaskScopeInput>(&record.scope_json)
                .and_then(|scope| {
                    validate_scope(&scope)?;
                    Ok(scope)
                })
                .ok();
            let belongs = scope
                .as_ref()
                .map_or(input.scope.kind == TaskScopeKind::All, |scope| {
                    scope == &input.scope
                });
            if !belongs {
                continue;
            }
            views.push(match decode_view(record.clone()) {
                Ok(view) => ViewListItemDto::Available(view),
                Err(error) => unavailable_view(record, scope, error),
            });
        }
        let project_ids: Vec<_> = views
            .iter()
            .filter_map(|item| match item {
                ViewListItemDto::Available(ViewDto {
                    context: TaskViewContext::Project { project_id },
                    ..
                }) => Some(project_id.clone()),
                _ => None,
            })
            .collect::<HashSet<_>>()
            .into_iter()
            .collect();
        // I/O 失败仍使本次读取失败；只有读到的业务事实可将单条定义标为不可用。
        let projects: HashMap<_, _> = self
            .lookup_reader
            .list_projects_by_ids(&project_ids)
            .await?
            .into_iter()
            .map(|project| (project.id.clone(), project))
            .collect();
        for item in &mut views {
            if let ViewListItemDto::Available(view) = item {
                if let TaskViewContext::Project { project_id } = &view.context {
                    if let Err(error) =
                        validate_project_boundary(&view.scope, projects.get(project_id))
                    {
                        *item = ViewListItemDto::Unavailable(UnavailableViewDto {
                            id: view.id.clone(),
                            name: view.name.clone(),
                            scope: Some(view.scope.clone()),
                            position: view.position,
                            created_at: view.created_at.clone(),
                            updated_at: view.updated_at.clone(),
                            definition_error: error.to_string(),
                        });
                    }
                }
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
        self.validate_project_in_connection(&connection, &input.scope, &definition.context)
            .await?;
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
                fields: view_sync_fields(&record)?,
            },
        )
        .await?;
        self.persistence.commit(connection).await?;
        decode_view(record)
    }
    pub async fn update_view(&self, input: UpdateViewInput) -> Result<ViewDto, ApplicationError> {
        let connection = self.persistence.begin().await?;
        let current = self
            .persistence
            .get_in_connection(&connection, &input.view_id)
            .await?
            .ok_or_else(|| ApplicationError::not_found("View 不存在"))?;
        let current_dto = decode_view(current.clone())?;
        self.validate_project_in_connection(&connection, &current_dto.scope, &current_dto.context)
            .await?;
        let scope = input.scope.unwrap_or(current_dto.scope);
        let definition = StoredTaskViewDefinition {
            base_view_key: input.base_view_key.unwrap_or(current_dto.base_view_key),
            context: input.context.unwrap_or(current_dto.context),
            filters: input.filters.unwrap_or(current_dto.filters),
        };
        validate_definition(&scope, &definition.context, &definition.filters)?;
        let now = now_utc().to_rfc3339();
        self.validate_project_in_connection(&connection, &scope, &definition.context)
            .await?;
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
            fields: changed_outbox_fields(
                &view_sync_fields(&current)?,
                &view_sync_fields(&record)?,
            ),
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
        let connection = self.persistence.begin().await?;
        let current = self
            .persistence
            .get_in_connection(&connection, view_id)
            .await?
            .ok_or_else(|| ApplicationError::not_found("View 不存在"))?;
        let now = now_utc().to_rfc3339();
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
        self.validate_project(&view.scope, &view.context).await?;

        let filter_query = input.filters.unwrap_or_else(|| view.filters.clone());
        let result = self
            .run_task_query(RunTaskQueryInput {
                scope: view.scope.clone(),
                context: view.context.clone(),
                base_view_key: view.base_view_key,
                filters: filter_query,
                order: input.order,
                date_basis: input.date_basis,
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

    async fn validate_project_in_connection(
        &self,
        connection: &P::Connection,
        scope: &TaskScopeInput,
        context: &TaskViewContext,
    ) -> Result<(), ApplicationError> {
        if let TaskViewContext::Project { project_id } = context {
            let project = self
                .persistence
                .get_project_in_connection(connection, project_id)
                .await?;
            validate_project_boundary(scope, project.as_ref())?;
        }
        Ok(())
    }

    async fn validate_project(
        &self,
        scope: &TaskScopeInput,
        context: &TaskViewContext,
    ) -> Result<(), ApplicationError> {
        if let TaskViewContext::Project { project_id } = context {
            let projects = self
                .lookup_reader
                .list_projects_by_ids(std::slice::from_ref(project_id))
                .await?;
            validate_project_boundary(
                scope,
                projects.iter().find(|project| &project.id == project_id),
            )?;
        }
        Ok(())
    }

    /// 执行 Task 查询。Default View 直接调用；Saved View 加载定义后委托到这里。
    pub async fn run_task_query(
        &self,
        input: RunTaskQueryInput,
    ) -> Result<RunTaskQueryOutput, ApplicationError> {
        validate_definition(&input.scope, &input.context, &input.filters)?;
        let date = parse_date_basis(&input.date_basis)?;
        let order = input.order.normalized();
        let identity = TaskQueryIdentity::new(
            &input.scope,
            &input.context,
            input.base_view_key,
            &input.filters,
            order,
            &input.date_basis,
        );
        let (cursor, dates) = match input.cursor.as_deref() {
            Some(raw) => {
                let (cursor, dates) = decode_task_query_cursor(raw, &identity)?;
                (Some(cursor), dates)
            }
            None => (None, build_date_boundaries(date)?),
        };
        let limit = DEFAULT_TASK_QUERY_PAGE_SIZE;
        let page = self
            .task_reader
            .run_query(ViewTaskQuery {
                scope: input.scope,
                context: input.context,
                base_view_key: input.base_view_key,
                filters: input.filters,
                dates: dates.clone(),
                order,
                limit: limit.saturating_add(1),
                cursor,
            })
            .await?;
        let mut page_tasks = page.items;
        let has_more = page_tasks.len() as u32 > limit;
        page_tasks.truncate(limit as usize);
        let next_cursor = if has_more {
            page_tasks
                .last()
                .map(|task| encode_task_query_cursor(&identity, &dates, task))
                .transpose()?
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
                order: TaskQueryOrder {
                    order_by: TaskOrderBy::Manual,
                    order_direction: TaskOrderDirection::Asc,
                    completed_order: TaskCompletedOrder::Natural,
                },
                limit: 1,
                cursor: None,
            })
            .await?;
        Ok(CountTaskQueryOutput { total_count })
    }
}

fn parse_date_basis(raw: &str) -> Result<NaiveDate, ApplicationError> {
    if raw.len() != 10 {
        return Err(ApplicationError::validation("列表日期基准无效"));
    }
    let date = NaiveDate::parse_from_str(raw, "%Y-%m-%d")
        .map_err(|_| ApplicationError::validation("列表日期基准无效"))?;
    if date.format("%Y-%m-%d").to_string() != raw {
        return Err(ApplicationError::validation("列表日期基准无效"));
    }
    Ok(date)
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

fn decode_view(record: ViewRecord) -> Result<ViewDto, ApplicationError> {
    let (scope, definition) = decode_record_definition(&record)?;
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
    })
}

/// Library 必须隔离单行旧定义错误，让用户仍可删除并重建该 Saved View。
fn unavailable_view(
    record: ViewRecord,
    scope: Option<TaskScopeInput>,
    error: ApplicationError,
) -> ViewListItemDto {
    ViewListItemDto::Unavailable(UnavailableViewDto {
        id: record.id,
        name: record.name,
        scope,
        position: record.position,
        created_at: record.created_at,
        updated_at: record.updated_at,
        definition_error: error.to_string(),
    })
}

fn validate_project_boundary(
    scope: &TaskScopeInput,
    project: Option<&ViewProjectLookupRecord>,
) -> Result<(), ApplicationError> {
    let project =
        project.ok_or_else(|| ApplicationError::validation("项目不存在，需要重新保存视图"))?;
    if project.archived_at.is_some() || project.deleted_at.is_some() {
        return Err(ApplicationError::validation(
            "项目已归档或在回收站中，请恢复项目后重试",
        ));
    }
    if scope.kind == TaskScopeKind::Space
        && scope.space_id.as_deref() != Some(project.space_id.as_str())
    {
        return Err(ApplicationError::validation(
            "项目范围已变化，需要重新保存视图",
        ));
    }
    Ok(())
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
                generation: if matches!(operation_type, OutboxOpKind::Delete) {
                    record
                        .generation
                        .checked_add(1)
                        .ok_or_else(|| ApplicationError::validation("View 代际已超出可删除范围"))?
                } else {
                    record.generation
                },
                operation_type,
                payload_json: payload.to_json()?,
                created_at: now.to_owned(),
                available_at: now.to_owned(),
            },
        )
        .await
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::view::codec::decode_stored_definition;
    use serde_json::json;

    #[test]
    fn task_query_inputs_require_order_and_canonical_date_basis() {
        let query = json!({
            "scope": { "type": "all" },
            "context": { "kind": "all" },
            "baseViewKey": "all",
            "filters": { "clauses": [] },
            "order": { "orderBy": "smart", "orderDirection": "asc", "completedOrder": "natural" },
            "dateBasis": "2026-09-13"
        });
        assert!(serde_json::from_value::<RunTaskQueryInput>(query.clone()).is_ok());
        for field in ["order", "dateBasis"] {
            let mut missing = query.clone();
            missing.as_object_mut().unwrap().remove(field);
            assert!(serde_json::from_value::<RunTaskQueryInput>(missing).is_err());
        }
        for invalid in [
            "",
            "2026-9-13",
            "2026-09-31",
            "2026-09-13T00:00:00Z",
            "+262142-12-31",
        ] {
            assert!(parse_date_basis(invalid).is_err());
        }
        assert_eq!(
            parse_date_basis("2026-09-13").unwrap(),
            NaiveDate::from_ymd_opt(2026, 9, 13).unwrap()
        );
        let view = json!({
            "scope": { "type": "all" }, "viewId": "view-1",
            "order": query["order"], "dateBasis": query["dateBasis"]
        });
        assert!(serde_json::from_value::<RunTaskViewInput>(view.clone()).is_ok());
        for field in ["order", "dateBasis"] {
            let mut missing = view.clone();
            missing.as_object_mut().unwrap().remove(field);
            assert!(serde_json::from_value::<RunTaskViewInput>(missing).is_err());
        }
    }

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
}

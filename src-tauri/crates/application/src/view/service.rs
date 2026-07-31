//! 自定义 View 生命周期与系统 Task 查询。

#![allow(async_fn_in_trait)]

use crate::{
    operation::{
        changed_outbox_fields, OutboxEnqueueRecord, OutboxOpKind, OutboxPayload, SyncEntityKind,
    },
    view::{
        executor::{is_active, local_date, matches, sort},
        CreateViewPersistenceRecord, DateFilterMode, ProjectFilterMode, TaskGroupBy,
        TaskScopeInput, TaskScopeKind, TaskViewFiltersValue, UpdateViewPatch, ViewListQuery,
        ViewProjectLookupRecord, ViewRecord, ViewSortRule, ViewSpaceLookupRecord, ViewTaskQuery,
        ViewTaskRecord,
    },
    ApplicationError,
};
use chrono::{Duration, Local, LocalResult, TimeZone, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{json, Map, Value};
use std::collections::{HashMap, HashSet};
use stoneflow_domain::{create_id, normalize_required_text, now_utc, ViewEntityKind, WorkStatus};

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ViewDto {
    pub id: String,
    pub name: String,
    pub scope: TaskScopeInput,
    pub filters: TaskViewFiltersValue,
    pub sort: Vec<ViewSortRule>,
    pub group_by: TaskGroupBy,
    pub position: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CreateViewInput {
    pub name: String,
    pub scope: TaskScopeInput,
    #[serde(default)]
    pub filters: TaskViewFiltersValue,
    #[serde(default)]
    pub sort: Vec<ViewSortRule>,
    #[serde(default)]
    pub group_by: Option<TaskGroupBy>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct UpdateViewInput {
    pub view_id: String,
    pub name: Option<String>,
    pub scope: Option<TaskScopeInput>,
    pub filters: Option<TaskViewFiltersValue>,
    pub sort: Option<Vec<ViewSortRule>>,
    pub group_by: Option<TaskGroupBy>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ListViewsInput {}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RunTaskViewInput {
    pub scope: TaskScopeInput,
    pub view_id: Option<String>,
    pub view_key: Option<SystemViewKey>,
    pub filters: Option<TaskViewFiltersValue>,
    pub sort: Option<Vec<ViewSortRule>>,
    pub group_by: Option<TaskGroupBy>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SystemViewKey {
    All,
    Active,
    Today,
    Upcoming,
    Overdue,
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
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskViewGroupDto {
    pub key: String,
    pub task_ids: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunTaskViewOutput {
    pub view: Option<ViewDto>,
    pub items: Vec<TaskViewItemDto>,
    pub groups: Vec<TaskViewGroupDto>,
}

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
    async fn enqueue(
        &self,
        connection: &Self::Connection,
        record: &OutboxEnqueueRecord,
    ) -> Result<(), ApplicationError>;
}
pub trait ViewTaskReader: Send + Sync {
    async fn list_candidates(
        &self,
        query: ViewTaskQuery,
    ) -> Result<Vec<ViewTaskRecord>, ApplicationError>;
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
    pub async fn list_views(&self, _: ListViewsInput) -> Result<Vec<ViewDto>, ApplicationError> {
        self.persistence
            .list(ViewListQuery {
                entity_kind: ViewEntityKind::Task,
            })
            .await?
            .into_iter()
            .map(decode_view)
            .collect()
    }
    pub async fn create_view(&self, input: CreateViewInput) -> Result<ViewDto, ApplicationError> {
        validate_definition(&input.scope, &input.filters, &input.sort)?;
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
                    filters_json: to_json(&input.filters)?,
                    sort_json: to_json(&input.sort)?,
                    group_by_json: Some(to_json(&input.group_by.unwrap_or(TaskGroupBy::None))?),
                    position: self
                        .persistence
                        .next_position(&connection, ViewEntityKind::Task)
                        .await?,
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
        let filters = input.filters.unwrap_or(current_dto.filters);
        let sort_rules = input.sort.unwrap_or(current_dto.sort);
        validate_definition(&scope, &filters, &sort_rules)?;
        let now = now_utc().to_rfc3339();
        let connection = self.persistence.begin().await?;
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
                    filters_json: Some(to_json(&filters)?),
                    sort_json: Some(to_json(&sort_rules)?),
                    group_by_json: Some(Some(to_json(
                        &input.group_by.unwrap_or(current_dto.group_by),
                    )?)),
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
        let search_filters = input.filters;
        let search_sort = input.sort;
        let search_group_by = input.group_by;
        let (scope, mut filters, mut sort_rules, mut group_by, view, system_key) =
            match (input.view_id, input.view_key) {
                (Some(id), None) => {
                    let dto = decode_view(
                        self.persistence
                            .get(&id)
                            .await?
                            .ok_or_else(|| ApplicationError::not_found("View 不存在"))?,
                    )?;
                    (
                        dto.scope.clone(),
                        dto.filters.clone(),
                        dto.sort.clone(),
                        dto.group_by,
                        Some(dto),
                        None,
                    )
                }
                (None, Some(key)) => {
                    let (filters, sort) = system_definition(key);
                    (
                        input.scope,
                        filters,
                        sort,
                        TaskGroupBy::None,
                        None,
                        Some(key),
                    )
                }
                _ => {
                    return Err(ApplicationError::validation(
                        "必须指定一个系统 View 或自定义 View",
                    ))
                }
            };
        if let Some(override_filters) = search_filters {
            filters = merge_filters(filters, override_filters);
        }
        if let Some(override_sort) = search_sort.filter(|rules| !rules.is_empty()) {
            sort_rules = override_sort;
        }
        if let Some(override_group_by) = search_group_by {
            group_by = override_group_by;
        }
        validate_definition(&scope, &filters, &sort_rules)?;
        let today = Local::now().date_naive();
        let mut tasks = self
            .task_reader
            .list_candidates(ViewTaskQuery {
                scope: scope.clone(),
                statuses: filters.status.clone(),
                project: filters.project.clone(),
                due: filters.due.clone(),
            })
            .await?;
        tasks.retain(|task| {
            matches(task, &filters, today) && system_matches(task, system_key, today)
        });
        sort(&mut tasks, &sort_rules);
        let space_ids = tasks
            .iter()
            .map(|task| task.space_id.clone())
            .collect::<HashSet<_>>()
            .into_iter()
            .collect::<Vec<_>>();
        let project_ids = tasks
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
        let items = tasks
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
                    created_at: task.created_at.clone(),
                    updated_at: task.updated_at.clone(),
                })
            })
            .collect::<Result<Vec<_>, ApplicationError>>()?;
        let groups = group(&tasks, group_by);
        Ok(RunTaskViewOutput {
            view,
            items,
            groups,
        })
    }
}

fn system_definition(key: SystemViewKey) -> (TaskViewFiltersValue, Vec<ViewSortRule>) {
    let active = vec![WorkStatus::Todo, WorkStatus::Doing, WorkStatus::Waiting];
    let mut filters = TaskViewFiltersValue {
        status: active,
        ..Default::default()
    };
    match key {
        SystemViewKey::All => filters.status.clear(),
        SystemViewKey::Upcoming => {
            let today = Local::now().date_naive();
            let from = today.and_hms_opt(0, 0, 0).and_then(|value| {
                match Local.from_local_datetime(&value) {
                    LocalResult::Single(value) => Some(value.with_timezone(&Utc).to_rfc3339()),
                    _ => None,
                }
            });
            let to = (today + Duration::days(7))
                .and_hms_opt(23, 59, 59)
                .and_then(|value| match Local.from_local_datetime(&value) {
                    LocalResult::Single(value) => Some(value.with_timezone(&Utc).to_rfc3339()),
                    _ => None,
                });
            if let (Some(from), Some(to)) = (from, to) {
                filters.due = Some(crate::view::DateFilter {
                    mode: DateFilterMode::Between,
                    from: Some(from),
                    to: Some(to),
                });
            }
        }
        SystemViewKey::Active | SystemViewKey::Today | SystemViewKey::Overdue => {}
    }
    (
        filters,
        vec![ViewSortRule {
            field: crate::view::TaskSortField::DueAt,
            direction: crate::view::SortDirection::Asc,
        }],
    )
}
fn system_matches(
    task: &ViewTaskRecord,
    key: Option<SystemViewKey>,
    today: chrono::NaiveDate,
) -> bool {
    match key {
        None | Some(SystemViewKey::All) | Some(SystemViewKey::Active) => true,
        Some(SystemViewKey::Today) => [task.planned_at.as_deref(), task.due_at.as_deref()]
            .into_iter()
            .flatten()
            .any(|value| local_date(value) == Some(today)),
        Some(SystemViewKey::Upcoming) => task
            .due_at
            .as_deref()
            .and_then(local_date)
            .is_some_and(|date| date >= today && date <= today + Duration::days(7)),
        Some(SystemViewKey::Overdue) => task
            .due_at
            .as_deref()
            .and_then(local_date)
            .is_some_and(|date| date < today),
    }
}
fn group(tasks: &[ViewTaskRecord], group_by: TaskGroupBy) -> Vec<TaskViewGroupDto> {
    let mut groups = Vec::<TaskViewGroupDto>::new();
    for task in tasks {
        let key = match group_by {
            TaskGroupBy::None => "all".to_owned(),
            TaskGroupBy::Status => task.status.as_str().to_owned(),
            TaskGroupBy::Priority => task.priority.to_string(),
            TaskGroupBy::Project => task
                .project_id
                .clone()
                .unwrap_or_else(|| "standalone".to_owned()),
            TaskGroupBy::Due => task
                .due_at
                .as_deref()
                .and_then(local_date)
                .map(|date| date.to_string())
                .unwrap_or_else(|| "none".to_owned()),
            TaskGroupBy::Planned => task
                .planned_at
                .as_deref()
                .and_then(local_date)
                .map(|date| date.to_string())
                .unwrap_or_else(|| "none".to_owned()),
        };
        if let Some(group) = groups.iter_mut().find(|group| group.key == key) {
            group.task_ids.push(task.id.clone());
        } else {
            groups.push(TaskViewGroupDto {
                key,
                task_ids: vec![task.id.clone()],
            });
        }
    }
    groups
}
fn merge_filters(
    mut base: TaskViewFiltersValue,
    overrides: TaskViewFiltersValue,
) -> TaskViewFiltersValue {
    if !overrides.status.is_empty() {
        base.status = overrides.status;
    }
    if overrides.priority.is_some() {
        base.priority = overrides.priority;
    }
    if overrides.project.is_some() {
        base.project = overrides.project;
    }
    if overrides.due.is_some() {
        base.due = overrides.due;
    }
    if overrides.planned.is_some() {
        base.planned = overrides.planned;
    }
    if overrides.created.is_some() {
        base.created = overrides.created;
    }
    if overrides.updated.is_some() {
        base.updated = overrides.updated;
    }
    if overrides.completed.is_some() {
        base.completed = overrides.completed;
    }
    base
}
fn validate_definition(
    scope: &TaskScopeInput,
    filters: &TaskViewFiltersValue,
    sort_rules: &[ViewSortRule],
) -> Result<(), ApplicationError> {
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
    if filters.status.iter().any(|status| {
        !is_active(*status)
            && filters
                .due
                .as_ref()
                .is_some_and(|due| matches!(due.mode, DateFilterMode::Overdue))
    }) {
        return Err(ApplicationError::validation("逾期 View 只允许进行中任务"));
    }
    if filters.project.as_ref().is_some_and(|project| {
        matches!(project.mode, ProjectFilterMode::Specific) && project.ids.is_empty()
    }) {
        return Err(ApplicationError::validation(
            "指定项目筛选必须提供 project ID",
        ));
    }
    if sort_rules.len() > 3 {
        return Err(ApplicationError::validation("最多允许三个排序字段"));
    }
    Ok(())
}
fn decode_view(record: ViewRecord) -> Result<ViewDto, ApplicationError> {
    if record.entity_kind != ViewEntityKind::Task {
        return Err(ApplicationError::validation("仅支持 Task View"));
    }
    Ok(ViewDto {
        id: record.id,
        name: record.name,
        scope: from_json(&record.scope_json)?,
        filters: from_json(&record.filters_json)?,
        sort: from_json(&record.sort_json)?,
        group_by: record
            .group_by_json
            .as_deref()
            .map(from_json)
            .transpose()?
            .unwrap_or(TaskGroupBy::None),
        position: record.position,
        created_at: record.created_at,
        updated_at: record.updated_at,
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
    use chrono::NaiveDate;
    use serde_json::json;

    #[test]
    fn create_view_input_should_reject_legacy_description_field() {
        let input = json!({
            "name": "Legacy",
            "description": "旧字段",
            "scope": { "type": "all" },
            "filters": {},
            "sort": []
        });

        assert!(serde_json::from_value::<CreateViewInput>(input).is_err());
    }

    #[test]
    fn today_system_view_should_match_planned_at() {
        let today = Local::now().date_naive();
        let task = task_with_dates("planned", Some(today), None);

        assert!(system_matches(&task, Some(SystemViewKey::Today), today));
    }

    fn task_with_dates(
        id: &str,
        planned_date: Option<NaiveDate>,
        due_date: Option<NaiveDate>,
    ) -> ViewTaskRecord {
        ViewTaskRecord {
            id: id.to_owned(),
            space_id: "space".to_owned(),
            project_id: None,
            title: id.to_owned(),
            note: None,
            status: WorkStatus::Todo,
            status_changed_at: "2026-07-23T00:00:00Z".to_owned(),
            priority: 0,
            planned_at: planned_date.map(local_date_to_rfc3339),
            due_at: due_date.map(local_date_to_rfc3339),
            remind_at: None,
            position: 1,
            completed_at: None,
            created_at: "2026-07-23T00:00:00Z".to_owned(),
            updated_at: "2026-07-23T00:00:00Z".to_owned(),
        }
    }

    fn local_date_to_rfc3339(date: NaiveDate) -> String {
        let local = Local
            .from_local_datetime(&date.and_hms_opt(12, 0, 0).expect("valid local noon"))
            .single()
            .expect("local noon should be unambiguous");
        local.with_timezone(&Utc).to_rfc3339()
    }
}

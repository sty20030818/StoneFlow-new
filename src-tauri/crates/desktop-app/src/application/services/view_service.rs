//! View Service：集中承载阶段 9 的 View 业务规则、执行器与 Activity 编排。

use std::cmp::Ordering;
use std::collections::{BTreeMap, HashMap};

use chrono::{DateTime, Datelike, Duration, FixedOffset, NaiveDate};
use sea_orm::TransactionTrait;
use serde::{Deserialize, Deserializer, Serialize};
use serde_json::{json, Value};
use stoneflow_schema::{
    common::{ActivityEntityKind, TaskStatus, ViewEntityKind, ViewKind},
    task, view,
};

use crate::{
    app::error::AppError,
    application::activity::{
        ActivityAction, ActivityChangeInput, ActivityService, RecordActivityInput,
    },
    domain::{
        create_id, normalize_required_text, normalize_slug, now_utc, parse_calendar_date,
        today_local_date,
    },
    infrastructure::repositories::{
        CreateViewRecord, ProjectRepository, SpaceRepository, TaskPlacementQuery, TaskRepository,
        UpdateViewPatch, ViewListQuery, ViewRepository,
    },
};

use super::{
    project_service::ProjectScopeInput,
    task_service::{
        ListTasksPlacementInput, ListTasksPlacementKind, TaskListItemDto, TaskScopeInput,
        TaskScopeKind,
    },
};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ViewSortDirection {
    Asc,
    Desc,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ViewSortRuleDto {
    pub field: String,
    pub direction: ViewSortDirection,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ViewDto {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub r#type: ViewKind,
    pub entity_type: ViewEntityKind,
    pub key: Option<String>,
    pub filters: Value,
    pub sort: Vec<ViewSortRuleDto>,
    pub group_by: Option<String>,
    pub is_visible: bool,
    pub sort_order: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListViewsInput {
    pub entity_type: ViewEntityKind,
    pub visible_only: Option<bool>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunTaskViewInput {
    pub scope: TaskScopeInput,
    pub view_id: Option<String>,
    pub view_key: Option<String>,
    pub placement: Option<ListTasksPlacementInput>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RunProjectViewInput {
    pub scope: ProjectScopeInput,
    pub view_id: Option<String>,
    pub view_key: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateViewInput {
    pub entity_type: ViewEntityKind,
    pub name: String,
    pub description: Option<String>,
    pub filters: Value,
    pub sort: Vec<ViewSortRuleDto>,
    pub group_by: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateViewInput {
    pub view_id: String,
    pub name: Option<String>,
    #[serde(default)]
    #[serde(deserialize_with = "deserialize_nullable_string_field")]
    pub description: Option<Option<String>>,
    pub filters: Option<Value>,
    pub sort: Option<Vec<ViewSortRuleDto>>,
    #[serde(default)]
    #[serde(deserialize_with = "deserialize_nullable_string_field")]
    pub group_by: Option<Option<String>>,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteViewInput {
    pub view_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToggleViewVisibleInput {
    pub view_id: String,
    pub visible: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReorderViewsInput {
    pub entity_type: ViewEntityKind,
    pub ordered_ids: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskViewGroupDto {
    pub key: String,
    pub label: String,
    pub task_ids: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunTaskViewOutput {
    pub view: ViewDto,
    pub items: Vec<TaskListItemDto>,
    pub groups: Vec<TaskViewGroupDto>,
}

#[derive(Debug, Clone)]
pub struct ViewService {
    repository: ViewRepository,
    space_repository: SpaceRepository,
    project_repository: ProjectRepository,
    task_repository: TaskRepository,
    activity_service: ActivityService,
}

impl ViewService {
    pub fn new(
        repository: ViewRepository,
        space_repository: SpaceRepository,
        project_repository: ProjectRepository,
        task_repository: TaskRepository,
        activity_service: ActivityService,
    ) -> Self {
        Self {
            repository,
            space_repository,
            project_repository,
            task_repository,
            activity_service,
        }
    }

    pub fn repository(&self) -> &ViewRepository {
        &self.repository
    }

    pub async fn list_views(&self, input: ListViewsInput) -> Result<Vec<ViewDto>, AppError> {
        let models = self
            .repository
            .list(ViewListQuery {
                entity_type: input.entity_type,
                visible_only: input.visible_only.unwrap_or(false),
            })
            .await?;

        models
            .into_iter()
            .map(map_view_model)
            .collect::<Result<Vec<_>, AppError>>()
    }

    pub async fn run_task_view(
        &self,
        input: RunTaskViewInput,
    ) -> Result<RunTaskViewOutput, AppError> {
        let scope = normalize_task_scope(&input.scope)?;
        let placement = normalize_task_placement(input.placement)?;
        let view = self
            .resolve_view(ViewEntityKind::Task, input.view_id, input.view_key)
            .await?;
        let view_dto = map_view_model(view.clone())?;
        let filters = parse_task_view_filters(&view.filters)?;
        let sort_rules = parse_sort_rules(&view.sort)?;
        let group_by = parse_group_by(view.group_by.as_deref())?;
        let include_deleted = filters.deleted.unwrap_or(false);

        let mut tasks = self
            .task_repository
            .list_candidates(scope.space_id.clone(), placement, include_deleted)
            .await?;
        let today = today_local_date();
        let special_key = view.key.as_deref().map(str::to_owned);
        tasks.retain(|task| matches_task_view(task, &filters, special_key.as_deref(), today));
        sort_tasks(&mut tasks, &sort_rules, special_key.as_deref(), today);
        let groups = build_task_groups(&tasks, group_by, today);
        let items = self.build_task_list(tasks).await?;

        Ok(RunTaskViewOutput {
            view: view_dto,
            items,
            groups,
        })
    }

    pub async fn create_view(&self, input: CreateViewInput) -> Result<ViewDto, AppError> {
        if input.entity_type != ViewEntityKind::Task {
            return Err(AppError::validation("当前仅支持创建 Task 自定义 View"));
        }

        let name = normalize_required_text(&input.name, "View name")?;
        let description = normalize_optional_long_text(input.description);
        let sort_rules = normalize_sort_rules(input.sort)?;
        let filters = normalize_filters(input.filters)?;
        let group_by = normalize_group_by(input.group_by)?;
        let now = now_utc().to_rfc3339();
        let transaction = self.repository.connection().begin().await?;
        let sort_order = self
            .repository
            .next_sort_order(&transaction, input.entity_type)
            .await?;

        let created = self
            .repository
            .create(
                &transaction,
                CreateViewRecord {
                    id: create_id().to_string(),
                    name: name.clone(),
                    description: description.clone(),
                    kind: ViewKind::Custom,
                    entity_type: input.entity_type,
                    key: None,
                    filters: serde_json::to_string(&filters)
                        .map_err(|error| AppError::validation(error.to_string()))?,
                    sort: serde_json::to_string(&sort_rules)
                        .map_err(|error| AppError::validation(error.to_string()))?,
                    group_by: group_by.clone(),
                    is_visible: true,
                    sort_order,
                    created_at: now.clone(),
                    updated_at: now.clone(),
                },
            )
            .await?;

        self.activity_service
            .record_activity_in_txn(
                &transaction,
                RecordActivityInput {
                    entity_type: ActivityEntityKind::View,
                    entity_id: created.id.clone(),
                    action: ActivityAction::ViewCreated,
                    actor_type: None,
                    source: None,
                    summary: Some(format!("创建视图「{}」", created.name)),
                    metadata: Some(json!({
                        "viewId": created.id,
                        "entityType": created.entity_type,
                    })),
                    changes: vec![
                        ActivityChangeInput {
                            field: "name".to_owned(),
                            old_value: None,
                            new_value: Some(json!(name)),
                        },
                        ActivityChangeInput {
                            field: "filters".to_owned(),
                            old_value: None,
                            new_value: Some(filters),
                        },
                    ],
                },
            )
            .await?;

        transaction.commit().await?;
        map_view_model(created)
    }

    pub async fn update_view(&self, input: UpdateViewInput) -> Result<ViewDto, AppError> {
        let view_id = normalize_required_text(&input.view_id, "View id")?;
        let current = self
            .repository
            .get(&view_id)
            .await?
            .ok_or_else(|| AppError::not_found("View 不存在"))?;

        if current.r#type == ViewKind::System {
            return Err(AppError::conflict("系统 View 不允许编辑"));
        }

        let name = match input.name {
            Some(name) => Some(normalize_required_text(&name, "View name")?),
            None => None,
        };
        let description = input.description.map(normalize_optional_long_text_option);
        let filters = input.filters.map(normalize_filters).transpose()?;
        let sort_rules = input.sort.map(normalize_sort_rules).transpose()?;
        let group_by = input.group_by.map(normalize_group_by_option).transpose()?;
        let now = now_utc().to_rfc3339();

        let mut changes = Vec::new();
        if let Some(ref name) = name {
            changes.push(ActivityChangeInput {
                field: "name".to_owned(),
                old_value: Some(json!(current.name)),
                new_value: Some(json!(name)),
            });
        }
        if let Some(ref description) = description {
            changes.push(ActivityChangeInput {
                field: "description".to_owned(),
                old_value: json_option_string(&current.description),
                new_value: description.as_ref().map(|value| json!(value)),
            });
        }
        if let Some(ref filters) = filters {
            changes.push(ActivityChangeInput {
                field: "filters".to_owned(),
                old_value: Some(parse_json_value(&current.filters)?),
                new_value: Some(filters.clone()),
            });
        }
        if let Some(ref sort_rules) = sort_rules {
            changes.push(ActivityChangeInput {
                field: "sort".to_owned(),
                old_value: Some(parse_json_value(&current.sort)?),
                new_value: Some(json!(sort_rules)),
            });
        }
        if let Some(ref group_by) = group_by {
            changes.push(ActivityChangeInput {
                field: "groupBy".to_owned(),
                old_value: json_option_string(&current.group_by),
                new_value: group_by.as_ref().map(|value| json!(value)),
            });
        }
        changes.retain(|change| change.old_value != change.new_value);
        if changes.is_empty() {
            return map_view_model(current);
        }

        let transaction = self.repository.connection().begin().await?;
        let updated = self
            .repository
            .update(
                &transaction,
                &view_id,
                UpdateViewPatch {
                    name,
                    description,
                    filters: filters
                        .map(|value| {
                            serde_json::to_string(&value)
                                .map_err(|error| AppError::validation(error.to_string()))
                        })
                        .transpose()?,
                    sort: sort_rules
                        .map(|value| {
                            serde_json::to_string(&value)
                                .map_err(|error| AppError::validation(error.to_string()))
                        })
                        .transpose()?,
                    group_by,
                    updated_at: Some(now.clone()),
                    ..Default::default()
                },
            )
            .await?
            .ok_or_else(|| AppError::not_found("View 不存在"))?;

        self.activity_service
            .record_activity_in_txn(
                &transaction,
                RecordActivityInput {
                    entity_type: ActivityEntityKind::View,
                    entity_id: updated.id.clone(),
                    action: ActivityAction::ViewUpdated,
                    actor_type: None,
                    source: None,
                    summary: Some(format!("更新视图「{}」", updated.name)),
                    metadata: Some(json!({
                        "viewId": updated.id,
                        "entityType": updated.entity_type,
                    })),
                    changes,
                },
            )
            .await?;

        transaction.commit().await?;
        map_view_model(updated)
    }

    pub async fn delete_view(&self, input: DeleteViewInput) -> Result<(), AppError> {
        let view_id = normalize_required_text(&input.view_id, "View id")?;
        let current = self
            .repository
            .get(&view_id)
            .await?
            .ok_or_else(|| AppError::not_found("View 不存在"))?;

        if current.r#type == ViewKind::System {
            return Err(AppError::conflict("系统 View 不允许删除"));
        }

        let transaction = self.repository.connection().begin().await?;
        let affected = self.repository.delete(&transaction, &view_id).await?;
        if affected == 0 {
            return Err(AppError::not_found("View 不存在"));
        }

        self.activity_service
            .record_activity_in_txn(
                &transaction,
                RecordActivityInput {
                    entity_type: ActivityEntityKind::View,
                    entity_id: current.id.clone(),
                    action: ActivityAction::ViewDeleted,
                    actor_type: None,
                    source: None,
                    summary: Some(format!("删除视图「{}」", current.name)),
                    metadata: Some(json!({
                        "viewId": current.id,
                        "entityType": current.entity_type,
                    })),
                    changes: Vec::new(),
                },
            )
            .await?;

        transaction.commit().await?;
        Ok(())
    }

    pub async fn toggle_view_visible(
        &self,
        input: ToggleViewVisibleInput,
    ) -> Result<ViewDto, AppError> {
        let view_id = normalize_required_text(&input.view_id, "View id")?;
        let current = self
            .repository
            .get(&view_id)
            .await?
            .ok_or_else(|| AppError::not_found("View 不存在"))?;
        if current.is_visible == input.visible {
            return map_view_model(current);
        }

        let now = now_utc().to_rfc3339();
        let transaction = self.repository.connection().begin().await?;
        let updated = self
            .repository
            .update(
                &transaction,
                &view_id,
                UpdateViewPatch {
                    is_visible: Some(input.visible),
                    updated_at: Some(now.clone()),
                    ..Default::default()
                },
            )
            .await?
            .ok_or_else(|| AppError::not_found("View 不存在"))?;

        self.activity_service
            .record_activity_in_txn(
                &transaction,
                RecordActivityInput {
                    entity_type: ActivityEntityKind::View,
                    entity_id: updated.id.clone(),
                    action: ActivityAction::ViewVisibilityChanged,
                    actor_type: None,
                    source: None,
                    summary: Some(format!(
                        "{}视图「{}」",
                        if updated.is_visible {
                            "显示"
                        } else {
                            "隐藏"
                        },
                        updated.name
                    )),
                    metadata: Some(json!({
                        "viewId": updated.id,
                        "entityType": updated.entity_type,
                    })),
                    changes: vec![ActivityChangeInput {
                        field: "isVisible".to_owned(),
                        old_value: Some(json!(current.is_visible)),
                        new_value: Some(json!(updated.is_visible)),
                    }],
                },
            )
            .await?;

        transaction.commit().await?;
        map_view_model(updated)
    }

    pub async fn reorder_views(&self, input: ReorderViewsInput) -> Result<Vec<ViewDto>, AppError> {
        if input.ordered_ids.is_empty() {
            return self
                .list_views(ListViewsInput {
                    entity_type: input.entity_type,
                    visible_only: Some(false),
                })
                .await;
        }

        let now = now_utc().to_rfc3339();
        let transaction = self.repository.connection().begin().await?;
        for (index, view_id) in input.ordered_ids.iter().enumerate() {
            let sort_order = ((index as i32) + 1) * 100;
            self.repository
                .update(
                    &transaction,
                    view_id,
                    UpdateViewPatch {
                        sort_order: Some(sort_order),
                        updated_at: Some(now.clone()),
                        ..Default::default()
                    },
                )
                .await?;
        }

        self.activity_service
            .record_activity_in_txn(
                &transaction,
                RecordActivityInput {
                    entity_type: ActivityEntityKind::View,
                    entity_id: format!("{}:reorder", entity_type_key(input.entity_type)),
                    action: ActivityAction::ViewUpdated,
                    actor_type: None,
                    source: None,
                    summary: Some("重排视图顺序".to_owned()),
                    metadata: Some(json!({
                        "entityType": input.entity_type,
                        "orderedIds": input.ordered_ids,
                    })),
                    changes: Vec::new(),
                },
            )
            .await?;

        transaction.commit().await?;
        self.list_views(ListViewsInput {
            entity_type: input.entity_type,
            visible_only: Some(false),
        })
        .await
    }

    async fn resolve_view(
        &self,
        entity_type: ViewEntityKind,
        view_id: Option<String>,
        view_key: Option<String>,
    ) -> Result<view::Model, AppError> {
        let by_id = match view_id {
            Some(view_id) => {
                let normalized = normalize_required_text(&view_id, "View id")?;
                self.repository.get(&normalized).await?
            }
            None => None,
        };
        let by_key = match view_key {
            Some(view_key) => {
                let normalized = normalize_required_text(&view_key, "View key")?;
                self.repository.get_by_key(entity_type, &normalized).await?
            }
            None => None,
        };

        let view = by_id
            .or(by_key)
            .ok_or_else(|| AppError::not_found("View 不存在"))?;
        if view.entity_type != entity_type {
            return Err(AppError::validation("View 实体类型不匹配"));
        }

        Ok(view)
    }

    async fn build_task_list(
        &self,
        tasks: Vec<task::Model>,
    ) -> Result<Vec<TaskListItemDto>, AppError> {
        let space_ids = tasks
            .iter()
            .map(|task| task.space_id.clone())
            .collect::<Vec<_>>();
        let project_ids = tasks
            .iter()
            .filter_map(|task| task.project_id.clone())
            .collect::<Vec<_>>();
        let spaces = self.space_repository.list_by_ids(&space_ids).await?;
        let projects = self.project_repository.list_by_ids(&project_ids).await?;
        let space_map = spaces
            .into_iter()
            .map(|space| (space.id.clone(), space))
            .collect::<HashMap<_, _>>();
        let project_map = projects
            .into_iter()
            .map(|project| (project.id.clone(), project))
            .collect::<HashMap<_, _>>();

        Ok(tasks
            .into_iter()
            .map(|item| {
                let (space_name, space_slug) = space_map
                    .get(&item.space_id)
                    .map(|space| (space.name.clone(), normalize_slug(&space.name)))
                    .unwrap_or_else(|| (item.space_id.clone(), "unknown".to_owned()));
                let project_name = item
                    .project_id
                    .as_ref()
                    .and_then(|project_id| project_map.get(project_id))
                    .map(|project| project.name.clone());

                TaskListItemDto {
                    id: item.id,
                    space_id: item.space_id,
                    space_name,
                    space_slug,
                    project_id: item.project_id,
                    project_name,
                    inbox_at: item.inbox_at,
                    title: item.title,
                    note: item.note,
                    status: item.status,
                    status_changed_at: item.status_changed_at,
                    priority: item.priority,
                    due_at: item.due_at,
                    scheduled_at: item.scheduled_at,
                    reminder_at: item.reminder_at,
                    completed_at: item.completed_at,
                    canceled_at: item.canceled_at,
                    archived_at: item.archived_at,
                    created_at: item.created_at,
                    updated_at: item.updated_at,
                }
            })
            .collect())
    }
}

fn entity_type_key(value: ViewEntityKind) -> &'static str {
    match value {
        ViewEntityKind::Task => "task",
        ViewEntityKind::Project => "project",
    }
}

#[derive(Debug, Clone)]
struct NormalizedTaskScope {
    space_id: Option<String>,
}

fn normalize_task_scope(input: &TaskScopeInput) -> Result<NormalizedTaskScope, AppError> {
    match input.kind {
        TaskScopeKind::All => Ok(NormalizedTaskScope { space_id: None }),
        TaskScopeKind::Space => Ok(NormalizedTaskScope {
            space_id: Some(normalize_required_text(
                input
                    .space_id
                    .as_deref()
                    .ok_or_else(|| AppError::validation("scope.type=space 时必须提供 spaceId"))?,
                "spaceId",
            )?),
        }),
    }
}

fn deserialize_nullable_string_field<'de, D>(
    deserializer: D,
) -> Result<Option<Option<String>>, D::Error>
where
    D: Deserializer<'de>,
{
    Option::<String>::deserialize(deserializer).map(Some)
}

fn normalize_task_placement(
    input: Option<ListTasksPlacementInput>,
) -> Result<TaskPlacementQuery, AppError> {
    let placement = input.unwrap_or(ListTasksPlacementInput {
        kind: ListTasksPlacementKind::All,
        project_id: None,
    });

    match placement.kind {
        ListTasksPlacementKind::All => Ok(TaskPlacementQuery::All),
        ListTasksPlacementKind::Project => {
            Ok(TaskPlacementQuery::Project(normalize_required_text(
                placement.project_id.as_deref().ok_or_else(|| {
                    AppError::validation("placement.kind=project 时必须提供 projectId")
                })?,
                "projectId",
            )?))
        }
        ListTasksPlacementKind::Inbox => Ok(TaskPlacementQuery::Inbox),
        ListTasksPlacementKind::NoProject => Ok(TaskPlacementQuery::NoProject),
    }
}

fn normalize_filters(value: Value) -> Result<Value, AppError> {
    let filters = parse_task_view_filters_value(&value)?;
    serde_json::to_value(filters).map_err(|error| AppError::validation(error.to_string()))
}

fn normalize_sort_rules(value: Vec<ViewSortRuleDto>) -> Result<Vec<ViewSortRuleDto>, AppError> {
    if value.is_empty() {
        return Err(AppError::validation("View sort 至少需要一条规则"));
    }

    for rule in &value {
        let _ = parse_sort_field(&rule.field)?;
    }

    Ok(value)
}

fn normalize_group_by(value: Option<String>) -> Result<Option<String>, AppError> {
    let normalized = normalize_optional_text(value);
    parse_group_by(normalized.as_deref())?;
    Ok(normalized)
}

fn normalize_group_by_option(value: Option<String>) -> Result<Option<String>, AppError> {
    normalize_group_by(value)
}

fn normalize_optional_text(value: Option<String>) -> Option<String> {
    value.and_then(|value| {
        let trimmed = value.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(trimmed.to_owned())
        }
    })
}

fn normalize_optional_long_text(value: Option<String>) -> Option<String> {
    value.and_then(|value| {
        if value.trim().is_empty() {
            None
        } else {
            Some(value)
        }
    })
}

fn normalize_optional_long_text_option(value: Option<String>) -> Option<String> {
    normalize_optional_long_text(value)
}

fn json_option_string(value: &Option<String>) -> Option<Value> {
    value.as_ref().map(|value| json!(value))
}

fn parse_json_value(value: &str) -> Result<Value, AppError> {
    serde_json::from_str(value)
        .map_err(|error| AppError::validation(format!("View JSON 非法: {error}")))
}

fn map_view_model(model: view::Model) -> Result<ViewDto, AppError> {
    Ok(ViewDto {
        id: model.id,
        name: model.name,
        description: model.description,
        r#type: model.r#type,
        entity_type: model.entity_type,
        key: model.key,
        filters: parse_json_value(&model.filters)?,
        sort: parse_sort_rules(&model.sort)?,
        group_by: model.group_by,
        is_visible: model.is_visible,
        sort_order: model.sort_order,
        created_at: model.created_at,
        updated_at: model.updated_at,
    })
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct TaskViewFiltersValue {
    #[serde(default)]
    status: Vec<TaskStatus>,
    priority: Option<PriorityFilter>,
    inbox: Option<bool>,
    project: Option<ProjectFilter>,
    due: Option<DateFilter>,
    scheduled: Option<DateFilter>,
    created: Option<DateFilter>,
    updated: Option<DateFilter>,
    completed: Option<DateFilter>,
    archived: Option<bool>,
    deleted: Option<bool>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct PriorityFilter {
    eq: Option<i32>,
    gte: Option<i32>,
    lte: Option<i32>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProjectFilter {
    mode: String,
    #[serde(default)]
    ids: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
enum DateFilterMode {
    Today,
    Tomorrow,
    ThisWeek,
    NextWeek,
    Overdue,
    Future,
    Past,
    Between,
    None,
    NotNone,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DateFilter {
    mode: DateFilterMode,
    from: Option<String>,
    to: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum TaskSortField {
    SortOrder,
    Priority,
    DueAt,
    ScheduledAt,
    CreatedAt,
    UpdatedAt,
    CompletedAt,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum TaskGroupBy {
    None,
    Status,
    Priority,
    Project,
    Due,
    Scheduled,
}

fn parse_task_view_filters(value: &str) -> Result<TaskViewFiltersValue, AppError> {
    let json = parse_json_value(value)?;
    parse_task_view_filters_value(&json)
}

fn parse_task_view_filters_value(value: &Value) -> Result<TaskViewFiltersValue, AppError> {
    serde_json::from_value(value.clone())
        .map_err(|error| AppError::validation(format!("Task View filters 非法: {error}")))
}

fn parse_sort_rules(value: &str) -> Result<Vec<ViewSortRuleDto>, AppError> {
    let rules = serde_json::from_str::<Vec<ViewSortRuleDto>>(value)
        .map_err(|error| AppError::validation(format!("Task View sort 非法: {error}")))?;
    normalize_sort_rules(rules)
}

fn parse_group_by(value: Option<&str>) -> Result<TaskGroupBy, AppError> {
    match value {
        None => Ok(TaskGroupBy::None),
        Some("none") => Ok(TaskGroupBy::None),
        Some("status") => Ok(TaskGroupBy::Status),
        Some("priority") => Ok(TaskGroupBy::Priority),
        Some("project") => Ok(TaskGroupBy::Project),
        Some("due") => Ok(TaskGroupBy::Due),
        Some("scheduled") => Ok(TaskGroupBy::Scheduled),
        Some(_) => Err(AppError::validation("Task View groupBy 非法")),
    }
}

fn parse_sort_field(value: &str) -> Result<TaskSortField, AppError> {
    match value {
        "sortOrder" => Ok(TaskSortField::SortOrder),
        "priority" => Ok(TaskSortField::Priority),
        "dueAt" => Ok(TaskSortField::DueAt),
        "scheduledAt" => Ok(TaskSortField::ScheduledAt),
        "createdAt" => Ok(TaskSortField::CreatedAt),
        "updatedAt" => Ok(TaskSortField::UpdatedAt),
        "completedAt" => Ok(TaskSortField::CompletedAt),
        _ => Err(AppError::validation("Task View sort 字段非法")),
    }
}

fn matches_task_view(
    task: &task::Model,
    filters: &TaskViewFiltersValue,
    special_key: Option<&str>,
    today: NaiveDate,
) -> bool {
    if let Some(deleted) = filters.deleted {
        if deleted != task.deleted_at.is_some() {
            return false;
        }
    } else if task.deleted_at.is_some() {
        return false;
    }

    if let Some(archived) = filters.archived {
        if archived != task.archived_at.is_some() {
            return false;
        }
    }

    if !filters.status.is_empty() && !filters.status.contains(&task.status) {
        return false;
    }

    if let Some(priority) = &filters.priority {
        if !matches_priority_filter(task.priority, priority) {
            return false;
        }
    }

    if let Some(inbox) = filters.inbox {
        if inbox != task.inbox_at.is_some() {
            return false;
        }
    }

    if let Some(project) = &filters.project {
        if !matches_project_filter(task, project) {
            return false;
        }
    }

    if !matches_special_temporal_filter(task, special_key, today) {
        return false;
    }

    if !is_special_key(special_key) {
        if let Some(filter) = &filters.due {
            if !matches_date_filter(task.due_at.as_deref(), filter, today, false) {
                return false;
            }
        }
        if let Some(filter) = &filters.scheduled {
            if !matches_date_filter(task.scheduled_at.as_deref(), filter, today, false) {
                return false;
            }
        }
    }

    if let Some(filter) = &filters.created {
        if !matches_date_filter(Some(task.created_at.as_str()), filter, today, true) {
            return false;
        }
    }
    if let Some(filter) = &filters.updated {
        if !matches_date_filter(Some(task.updated_at.as_str()), filter, today, true) {
            return false;
        }
    }
    if let Some(filter) = &filters.completed {
        if !matches_date_filter(task.completed_at.as_deref(), filter, today, true) {
            return false;
        }
    }

    true
}

fn matches_priority_filter(value: i32, filter: &PriorityFilter) -> bool {
    if let Some(eq) = filter.eq {
        return value == eq;
    }
    if let Some(gte) = filter.gte {
        if value < gte {
            return false;
        }
    }
    if let Some(lte) = filter.lte {
        if value > lte {
            return false;
        }
    }
    true
}

fn matches_project_filter(task: &task::Model, filter: &ProjectFilter) -> bool {
    match filter.mode.as_str() {
        "any" => task.project_id.is_some(),
        "none" => task.project_id.is_none(),
        "specific" => task
            .project_id
            .as_ref()
            .is_some_and(|project_id| filter.ids.iter().any(|id| id == project_id)),
        _ => false,
    }
}

fn is_special_key(special_key: Option<&str>) -> bool {
    matches!(special_key, Some("today" | "upcoming"))
}

fn matches_special_temporal_filter(
    task: &task::Model,
    special_key: Option<&str>,
    today: NaiveDate,
) -> bool {
    match special_key {
        Some("today") => {
            let due = due_date(task);
            let scheduled = scheduled_date(task);
            scheduled == Some(today) || due == Some(today) || due.is_some_and(|value| value < today)
        }
        Some("upcoming") => {
            due_date(task).is_some_and(|value| value > today)
                || scheduled_date(task).is_some_and(|value| value > today)
        }
        _ => true,
    }
}

fn sort_tasks(
    tasks: &mut [task::Model],
    sort_rules: &[ViewSortRuleDto],
    special_key: Option<&str>,
    today: NaiveDate,
) {
    tasks.sort_by(|left, right| {
        if special_key == Some("today") {
            let special = compare_today_bucket(left, right, today);
            if special != Ordering::Equal {
                return special;
            }
        }
        if special_key == Some("upcoming") {
            let special = compare_upcoming_bucket(left, right, today);
            if special != Ordering::Equal {
                return special;
            }
        }

        for rule in sort_rules {
            let ordering = compare_by_rule(left, right, rule);
            if ordering != Ordering::Equal {
                return ordering;
            }
        }

        compare_string_desc(&left.updated_at, &right.updated_at)
    });
}

fn compare_by_rule(left: &task::Model, right: &task::Model, rule: &ViewSortRuleDto) -> Ordering {
    let field = match parse_sort_field(&rule.field) {
        Ok(field) => field,
        Err(_) => return Ordering::Equal,
    };

    let ordering = match field {
        TaskSortField::SortOrder => left.sort_order.cmp(&right.sort_order),
        TaskSortField::Priority => left.priority.cmp(&right.priority),
        TaskSortField::DueAt => compare_option_date(due_date(left), due_date(right)),
        TaskSortField::ScheduledAt => {
            compare_option_date(scheduled_date(left), scheduled_date(right))
        }
        TaskSortField::CreatedAt => compare_option_date(
            timestamp_date(left.created_at.as_str()),
            timestamp_date(right.created_at.as_str()),
        ),
        TaskSortField::UpdatedAt => compare_option_date(
            timestamp_date(left.updated_at.as_str()),
            timestamp_date(right.updated_at.as_str()),
        ),
        TaskSortField::CompletedAt => compare_option_date(
            timestamp_date_option(&left.completed_at),
            timestamp_date_option(&right.completed_at),
        ),
    };

    match rule.direction {
        ViewSortDirection::Asc => ordering,
        ViewSortDirection::Desc => ordering.reverse(),
    }
}

fn compare_today_bucket(left: &task::Model, right: &task::Model, today: NaiveDate) -> Ordering {
    let left_bucket = today_bucket(left, today);
    let right_bucket = today_bucket(right, today);
    left_bucket.cmp(&right_bucket)
}

fn compare_upcoming_bucket(left: &task::Model, right: &task::Model, today: NaiveDate) -> Ordering {
    compare_option_date(
        next_upcoming_date(left, today),
        next_upcoming_date(right, today),
    )
}

fn compare_option_date(left: Option<NaiveDate>, right: Option<NaiveDate>) -> Ordering {
    match (left, right) {
        (Some(left), Some(right)) => left.cmp(&right),
        (Some(_), None) => Ordering::Less,
        (None, Some(_)) => Ordering::Greater,
        (None, None) => Ordering::Equal,
    }
}

fn compare_string_desc(left: &str, right: &str) -> Ordering {
    right.cmp(left)
}

fn build_task_groups(
    tasks: &[task::Model],
    group_by: TaskGroupBy,
    today: NaiveDate,
) -> Vec<TaskViewGroupDto> {
    if matches!(group_by, TaskGroupBy::None | TaskGroupBy::Status) {
        return Vec::new();
    }

    let mut groups = BTreeMap::<String, TaskViewGroupDto>::new();
    for task in tasks {
        let (key, label) = group_key_label(task, group_by, today);
        groups
            .entry(key.clone())
            .and_modify(|group| group.task_ids.push(task.id.clone()))
            .or_insert(TaskViewGroupDto {
                key,
                label,
                task_ids: vec![task.id.clone()],
            });
    }

    groups.into_values().collect()
}

fn group_key_label(
    task: &task::Model,
    group_by: TaskGroupBy,
    today: NaiveDate,
) -> (String, String) {
    match group_by {
        TaskGroupBy::Priority => {
            let label = match task.priority {
                4 => "P4",
                3 => "P3",
                2 => "P2",
                1 => "P1",
                _ => "P0",
            };
            (format!("priority:{}", task.priority), label.to_owned())
        }
        TaskGroupBy::Project => match &task.project_id {
            Some(project_id) => (
                format!("project:{project_id}"),
                task.project_id
                    .clone()
                    .unwrap_or_else(|| "独立事项".to_owned()),
            ),
            None => ("project:none".to_owned(), "独立事项".to_owned()),
        },
        TaskGroupBy::Due => date_bucket_key_label(due_date(task), today, "截止"),
        TaskGroupBy::Scheduled => date_bucket_key_label(scheduled_date(task), today, "计划"),
        TaskGroupBy::None | TaskGroupBy::Status => ("all".to_owned(), "全部".to_owned()),
    }
}

fn date_bucket_key_label(
    date: Option<NaiveDate>,
    today: NaiveDate,
    none_label: &str,
) -> (String, String) {
    match date {
        None => ("none".to_owned(), format!("无{none_label}时间")),
        Some(value) if value < today => ("past".to_owned(), "已过期".to_owned()),
        Some(value) if value == today => ("today".to_owned(), "今天".to_owned()),
        Some(value) => (
            format!("date:{value}"),
            value.format("%Y-%m-%d").to_string(),
        ),
    }
}

fn matches_date_filter(
    raw_value: Option<&str>,
    filter: &DateFilter,
    today: NaiveDate,
    allow_timestamp: bool,
) -> bool {
    let parsed = if allow_timestamp {
        raw_value.and_then(parse_timestamp_date)
    } else {
        raw_value.and_then(parse_calendar_date)
    };

    match filter.mode {
        DateFilterMode::None => parsed.is_none(),
        DateFilterMode::NotNone => parsed.is_some(),
        DateFilterMode::Today => parsed == Some(today),
        DateFilterMode::Tomorrow => parsed == Some(today + Duration::days(1)),
        DateFilterMode::ThisWeek => parsed.is_some_and(|value| same_week(value, today)),
        DateFilterMode::NextWeek => {
            parsed.is_some_and(|value| same_week(value, today + Duration::days(7)))
        }
        DateFilterMode::Overdue => parsed.is_some_and(|value| value < today),
        DateFilterMode::Future => parsed.is_some_and(|value| value > today),
        DateFilterMode::Past => parsed.is_some_and(|value| value < today),
        DateFilterMode::Between => {
            let Some(value) = parsed else {
                return false;
            };
            let from = filter.from.as_deref().and_then(parse_calendar_date);
            let to = filter.to.as_deref().and_then(parse_calendar_date);
            match (from, to) {
                (Some(from), Some(to)) => value >= from && value <= to,
                (Some(from), None) => value >= from,
                (None, Some(to)) => value <= to,
                (None, None) => true,
            }
        }
    }
}

fn parse_timestamp_date(value: &str) -> Option<NaiveDate> {
    DateTime::<FixedOffset>::parse_from_rfc3339(value)
        .ok()
        .map(|date| date.date_naive())
}

fn timestamp_date(value: &str) -> Option<NaiveDate> {
    parse_timestamp_date(value)
}

fn timestamp_date_option(value: &Option<String>) -> Option<NaiveDate> {
    value.as_deref().and_then(parse_timestamp_date)
}

fn same_week(value: NaiveDate, anchor: NaiveDate) -> bool {
    let start = anchor - Duration::days(anchor.weekday().num_days_from_monday() as i64);
    let end = start + Duration::days(6);
    value >= start && value <= end
}

fn due_date(task: &task::Model) -> Option<NaiveDate> {
    task.due_at.as_deref().and_then(parse_calendar_date)
}

fn scheduled_date(task: &task::Model) -> Option<NaiveDate> {
    task.scheduled_at.as_deref().and_then(parse_calendar_date)
}

fn today_bucket(task: &task::Model, today: NaiveDate) -> u8 {
    if due_date(task).is_some_and(|value| value < today) {
        return 0;
    }
    if due_date(task) == Some(today) {
        return 1;
    }
    if scheduled_date(task) == Some(today) {
        return 2;
    }
    3
}

fn next_upcoming_date(task: &task::Model, today: NaiveDate) -> Option<NaiveDate> {
    [scheduled_date(task), due_date(task)]
        .into_iter()
        .flatten()
        .filter(|date| *date > today)
        .min()
}

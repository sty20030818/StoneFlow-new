//! View 用例编排：CRUD、Task View 执行与 Activity 记录。

#![allow(async_fn_in_trait)]

use std::collections::HashMap;

use serde::{Deserialize, Deserializer, Serialize};
use serde_json::{json, Value};
use stoneflow_domain::{
    create_id, normalize_required_text, normalize_slug, now_utc, today_local_date,
    ActivityEntityKind, TaskStatus, ViewEntityKind, ViewKind,
};

use crate::{
    activity::{
        ActivityAction, ActivityChangeInput, ActivityPersistence, ActivityService,
        RecordActivityInput,
    },
    project::ProjectScopeInput,
    view::{
        executor::{
            build_task_groups, matches_task_view, normalize_filters, normalize_group_by,
            normalize_group_by_option, normalize_sort_rules, parse_group_by, parse_sort_rules,
            parse_task_view_filters,
        },
        types::{
            CreateViewPersistenceRecord, UpdateViewPatch, ViewListQuery, ViewProjectLookupRecord,
            ViewRecord, ViewSpaceLookupRecord, ViewTaskPlacementQuery, ViewTaskRecord,
        },
    },
    UsecaseError,
};

/// View 排序方向。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ViewSortDirection {
    Asc,
    Desc,
}

/// View 排序规则。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ViewSortRuleDto {
    pub field: String,
    pub direction: ViewSortDirection,
}

/// View 返回载荷。
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

/// Task View 列表单条记录。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ViewTaskListItemDto {
    pub id: String,
    pub space_id: String,
    pub space_name: String,
    pub space_slug: String,
    pub project_id: Option<String>,
    pub project_name: Option<String>,
    pub inbox_at: Option<String>,
    pub title: String,
    pub note: Option<String>,
    pub status: TaskStatus,
    pub status_changed_at: String,
    pub priority: i32,
    pub due_at: Option<String>,
    pub scheduled_at: Option<String>,
    pub reminder_at: Option<String>,
    pub completed_at: Option<String>,
    pub canceled_at: Option<String>,
    pub archived_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// 前端 Scope 在 Task View 命令边界的序列化形状。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ViewTaskScopeInput {
    #[serde(rename = "type")]
    pub kind: ViewTaskScopeKind,
    pub space_id: Option<String>,
}

/// Task View Scope 类型。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ViewTaskScopeKind {
    All,
    Space,
}

/// Task View placement 查询输入。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ViewListTasksPlacementInput {
    #[serde(rename = "kind")]
    pub kind: ViewListTasksPlacementKind,
    pub project_id: Option<String>,
}

/// Task View placement 类型。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ViewListTasksPlacementKind {
    All,
    Project,
    Inbox,
    NoProject,
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
    pub scope: ViewTaskScopeInput,
    pub view_id: Option<String>,
    pub view_key: Option<String>,
    pub placement: Option<ViewListTasksPlacementInput>,
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
    pub items: Vec<ViewTaskListItemDto>,
    pub groups: Vec<TaskViewGroupDto>,
}

/// View 持久化边界。
pub trait ViewPersistence: Send + Sync {
    type Connection: Send + Sync;

    async fn begin(&self) -> Result<Self::Connection, UsecaseError>;
    async fn commit(&self, connection: Self::Connection) -> Result<(), UsecaseError>;
    async fn get(&self, view_id: &str) -> Result<Option<ViewRecord>, UsecaseError>;
    async fn get_by_key(
        &self,
        entity_type: ViewEntityKind,
        key: &str,
    ) -> Result<Option<ViewRecord>, UsecaseError>;
    async fn list(&self, query: ViewListQuery) -> Result<Vec<ViewRecord>, UsecaseError>;
    async fn next_sort_order(
        &self,
        connection: &Self::Connection,
        entity_type: ViewEntityKind,
    ) -> Result<i32, UsecaseError>;
    async fn create(
        &self,
        connection: &Self::Connection,
        record: CreateViewPersistenceRecord,
    ) -> Result<ViewRecord, UsecaseError>;
    async fn update(
        &self,
        connection: &Self::Connection,
        view_id: &str,
        patch: UpdateViewPatch,
    ) -> Result<Option<ViewRecord>, UsecaseError>;
    async fn delete(
        &self,
        connection: &Self::Connection,
        view_id: &str,
    ) -> Result<u64, UsecaseError>;
}

/// Task View 执行所需的 Task 读取边界。
pub trait ViewTaskReader: Send + Sync {
    async fn list_candidates(
        &self,
        space_id: Option<String>,
        placement: ViewTaskPlacementQuery,
        include_deleted: bool,
    ) -> Result<Vec<ViewTaskRecord>, UsecaseError>;
}

/// Task View 列表所需的 Space / Project 名称查找边界。
pub trait ViewLookupReader: Send + Sync {
    async fn list_spaces_by_ids(
        &self,
        space_ids: &[String],
    ) -> Result<Vec<ViewSpaceLookupRecord>, UsecaseError>;
    async fn list_projects_by_ids(
        &self,
        project_ids: &[String],
    ) -> Result<Vec<ViewProjectLookupRecord>, UsecaseError>;
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
    activity: ActivityService<A>,
    task_reader: T,
    lookup_reader: L,
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
            activity,
            task_reader,
            lookup_reader,
        }
    }

    pub async fn list_views(&self, input: ListViewsInput) -> Result<Vec<ViewDto>, UsecaseError> {
        let views = self
            .persistence
            .list(ViewListQuery {
                entity_type: input.entity_type,
                visible_only: input.visible_only.unwrap_or(false),
            })
            .await?;

        views
            .into_iter()
            .map(map_view_record)
            .collect::<Result<Vec<_>, UsecaseError>>()
    }

    pub async fn run_task_view(
        &self,
        input: RunTaskViewInput,
    ) -> Result<RunTaskViewOutput, UsecaseError> {
        let scope = normalize_task_scope(&input.scope)?;
        let placement = normalize_task_placement(input.placement)?;
        let view = self
            .resolve_view(ViewEntityKind::Task, input.view_id, input.view_key)
            .await?;
        let view_dto = map_view_record(view.clone())?;
        let filters = parse_task_view_filters(&view.filters)?;
        let sort_rules = parse_sort_rules(&view.sort)?;
        let group_by = parse_group_by(view.group_by.as_deref())?;
        let include_deleted = filters.deleted.unwrap_or(false);

        let mut tasks = self
            .task_reader
            .list_candidates(scope.space_id.clone(), placement, include_deleted)
            .await?;
        let today = today_local_date();
        let special_key = view.key.as_deref().map(str::to_owned);
        tasks.retain(|task| matches_task_view(task, &filters, special_key.as_deref(), today));
        super::executor::sort_tasks(&mut tasks, &sort_rules, special_key.as_deref(), today);
        let groups = build_task_groups(&tasks, group_by, today);
        let items = self.build_task_list(tasks).await?;

        Ok(RunTaskViewOutput {
            view: view_dto,
            items,
            groups,
        })
    }

    pub async fn create_view(&self, input: CreateViewInput) -> Result<ViewDto, UsecaseError> {
        if input.entity_type != ViewEntityKind::Task {
            return Err(UsecaseError::validation("当前仅支持创建 Task 自定义 View"));
        }

        let name = normalize_required_text(&input.name, "View name")?;
        let description = normalize_optional_long_text(input.description);
        let sort_rules = normalize_sort_rules(input.sort)?;
        let filters = normalize_filters(input.filters)?;
        let group_by = normalize_group_by(input.group_by)?;
        let now = now_utc().to_rfc3339();
        let transaction = self.persistence.begin().await?;
        let sort_order = self
            .persistence
            .next_sort_order(&transaction, input.entity_type)
            .await?;

        let created = self
            .persistence
            .create(
                &transaction,
                CreateViewPersistenceRecord {
                    id: create_id().to_string(),
                    name: name.clone(),
                    description: description.clone(),
                    kind: ViewKind::Custom,
                    entity_type: input.entity_type,
                    key: None,
                    filters: serde_json::to_string(&filters)
                        .map_err(|error| UsecaseError::validation(error.to_string()))?,
                    sort: serde_json::to_string(&sort_rules)
                        .map_err(|error| UsecaseError::validation(error.to_string()))?,
                    group_by: group_by.clone(),
                    is_visible: true,
                    sort_order,
                    created_at: now.clone(),
                    updated_at: now.clone(),
                },
            )
            .await?;

        self.activity
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

        self.persistence.commit(transaction).await?;
        map_view_record(created)
    }

    pub async fn update_view(&self, input: UpdateViewInput) -> Result<ViewDto, UsecaseError> {
        let view_id = normalize_required_text(&input.view_id, "View id")?;
        let current = self
            .persistence
            .get(&view_id)
            .await?
            .ok_or_else(|| UsecaseError::not_found("View 不存在"))?;

        if current.kind == ViewKind::System {
            return Err(UsecaseError::conflict("系统 View 不允许编辑"));
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
            return map_view_record(current);
        }

        let transaction = self.persistence.begin().await?;
        let updated = self
            .persistence
            .update(
                &transaction,
                &view_id,
                UpdateViewPatch {
                    name,
                    description,
                    filters: filters
                        .map(|value| {
                            serde_json::to_string(&value)
                                .map_err(|error| UsecaseError::validation(error.to_string()))
                        })
                        .transpose()?,
                    sort: sort_rules
                        .map(|value| {
                            serde_json::to_string(&value)
                                .map_err(|error| UsecaseError::validation(error.to_string()))
                        })
                        .transpose()?,
                    group_by,
                    updated_at: Some(now.clone()),
                    ..Default::default()
                },
            )
            .await?
            .ok_or_else(|| UsecaseError::not_found("View 不存在"))?;

        self.activity
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

        self.persistence.commit(transaction).await?;
        map_view_record(updated)
    }

    pub async fn delete_view(&self, input: DeleteViewInput) -> Result<(), UsecaseError> {
        let view_id = normalize_required_text(&input.view_id, "View id")?;
        let current = self
            .persistence
            .get(&view_id)
            .await?
            .ok_or_else(|| UsecaseError::not_found("View 不存在"))?;

        if current.kind == ViewKind::System {
            return Err(UsecaseError::conflict("系统 View 不允许删除"));
        }

        let transaction = self.persistence.begin().await?;
        let affected = self.persistence.delete(&transaction, &view_id).await?;
        if affected == 0 {
            return Err(UsecaseError::not_found("View 不存在"));
        }

        self.activity
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

        self.persistence.commit(transaction).await?;
        Ok(())
    }

    pub async fn toggle_view_visible(
        &self,
        input: ToggleViewVisibleInput,
    ) -> Result<ViewDto, UsecaseError> {
        let view_id = normalize_required_text(&input.view_id, "View id")?;
        let current = self
            .persistence
            .get(&view_id)
            .await?
            .ok_or_else(|| UsecaseError::not_found("View 不存在"))?;
        if current.is_visible == input.visible {
            return map_view_record(current);
        }

        let now = now_utc().to_rfc3339();
        let transaction = self.persistence.begin().await?;
        let updated = self
            .persistence
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
            .ok_or_else(|| UsecaseError::not_found("View 不存在"))?;

        self.activity
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

        self.persistence.commit(transaction).await?;
        map_view_record(updated)
    }

    pub async fn reorder_views(
        &self,
        input: ReorderViewsInput,
    ) -> Result<Vec<ViewDto>, UsecaseError> {
        if input.ordered_ids.is_empty() {
            return self
                .list_views(ListViewsInput {
                    entity_type: input.entity_type,
                    visible_only: Some(false),
                })
                .await;
        }

        let now = now_utc().to_rfc3339();
        let transaction = self.persistence.begin().await?;
        for (index, view_id) in input.ordered_ids.iter().enumerate() {
            let sort_order = ((index as i32) + 1) * 100;
            self.persistence
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

        self.activity
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

        self.persistence.commit(transaction).await?;
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
    ) -> Result<ViewRecord, UsecaseError> {
        let by_id = match view_id {
            Some(view_id) => {
                let normalized = normalize_required_text(&view_id, "View id")?;
                self.persistence.get(&normalized).await?
            }
            None => None,
        };
        let by_key = match view_key {
            Some(view_key) => {
                let normalized = normalize_required_text(&view_key, "View key")?;
                self.persistence
                    .get_by_key(entity_type, &normalized)
                    .await?
            }
            None => None,
        };

        let view = by_id
            .or(by_key)
            .ok_or_else(|| UsecaseError::not_found("View 不存在"))?;
        if view.entity_type != entity_type {
            return Err(UsecaseError::validation("View 实体类型不匹配"));
        }

        Ok(view)
    }

    async fn build_task_list(
        &self,
        tasks: Vec<ViewTaskRecord>,
    ) -> Result<Vec<ViewTaskListItemDto>, UsecaseError> {
        let space_ids = tasks
            .iter()
            .map(|task| task.space_id.clone())
            .collect::<Vec<_>>();
        let project_ids = tasks
            .iter()
            .filter_map(|task| task.project_id.clone())
            .collect::<Vec<_>>();
        let spaces = self.lookup_reader.list_spaces_by_ids(&space_ids).await?;
        let projects = self
            .lookup_reader
            .list_projects_by_ids(&project_ids)
            .await?;
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

                ViewTaskListItemDto {
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

#[derive(Debug, Clone)]
struct NormalizedTaskScope {
    space_id: Option<String>,
}

fn normalize_task_scope(input: &ViewTaskScopeInput) -> Result<NormalizedTaskScope, UsecaseError> {
    match input.kind {
        ViewTaskScopeKind::All => Ok(NormalizedTaskScope { space_id: None }),
        ViewTaskScopeKind::Space => Ok(NormalizedTaskScope {
            space_id: Some(normalize_required_text(
                input.space_id.as_deref().ok_or_else(|| {
                    UsecaseError::validation("scope.type=space 时必须提供 spaceId")
                })?,
                "spaceId",
            )?),
        }),
    }
}

fn normalize_task_placement(
    input: Option<ViewListTasksPlacementInput>,
) -> Result<ViewTaskPlacementQuery, UsecaseError> {
    let placement = input.unwrap_or(ViewListTasksPlacementInput {
        kind: ViewListTasksPlacementKind::All,
        project_id: None,
    });

    match placement.kind {
        ViewListTasksPlacementKind::All => Ok(ViewTaskPlacementQuery::All),
        ViewListTasksPlacementKind::Project => {
            Ok(ViewTaskPlacementQuery::Project(normalize_required_text(
                placement.project_id.as_deref().ok_or_else(|| {
                    UsecaseError::validation("placement.kind=project 时必须提供 projectId")
                })?,
                "projectId",
            )?))
        }
        ViewListTasksPlacementKind::Inbox => Ok(ViewTaskPlacementQuery::Inbox),
        ViewListTasksPlacementKind::NoProject => Ok(ViewTaskPlacementQuery::NoProject),
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

fn parse_json_value(value: &str) -> Result<Value, UsecaseError> {
    serde_json::from_str(value)
        .map_err(|error| UsecaseError::validation(format!("View JSON 非法: {error}")))
}

fn map_view_record(record: ViewRecord) -> Result<ViewDto, UsecaseError> {
    Ok(ViewDto {
        id: record.id,
        name: record.name,
        description: record.description,
        r#type: record.kind,
        entity_type: record.entity_type,
        key: record.key,
        filters: parse_json_value(&record.filters)?,
        sort: parse_sort_rules(&record.sort)?,
        group_by: record.group_by,
        is_visible: record.is_visible,
        sort_order: record.sort_order,
        created_at: record.created_at,
        updated_at: record.updated_at,
    })
}

fn entity_type_key(value: ViewEntityKind) -> &'static str {
    match value {
        ViewEntityKind::Task => "task",
        ViewEntityKind::Project => "project",
    }
}

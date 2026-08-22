//! Default View 与 Saved View 共用的 Task SQL 查询。

use sea_orm::{
    sea_query::Expr, ColumnTrait, Condition, EntityTrait, PaginatorTrait, QueryFilter, QueryOrder,
    QuerySelect, Select,
};
use stoneflow_application::view::{
    FilterClauseValue, TaskScopeKind, TaskViewBaseKey, TaskViewContext, ViewDateBoundaries,
    ViewTaskQuery,
};

use super::TaskRepository;
use crate::{
    entities::{common::WorkStatus as StorageWorkStatus, task, task::Entity as Task},
    error::StorageError,
};

impl TaskRepository {
    /// Default/Saved View 共用的完整 SQL 查询；只返回当前窗口。
    pub async fn list_for_view(
        &self,
        definition: &ViewTaskQuery,
    ) -> Result<Vec<task::Model>, StorageError> {
        let mut query = apply_view_task_filters(Task::find(), definition);
        if let Some(cursor) = &definition.cursor {
            query = query.filter(
                Condition::any()
                    .add(task::Column::Position.gt(cursor.position))
                    .add(
                        Condition::all()
                            .add(task::Column::Position.eq(cursor.position))
                            .add(task::Column::Id.gt(cursor.id.as_str())),
                    ),
            );
        }
        query
            .order_by_asc(task::Column::Position)
            .order_by_asc(task::Column::Id)
            .limit(u64::from(definition.limit))
            .all(&self.db)
            .await
            .map_err(Into::into)
    }

    /// 与 `list_for_view` 完全相同的过滤条件，不含 cursor/window。
    pub async fn count_for_view(&self, definition: &ViewTaskQuery) -> Result<u64, StorageError> {
        apply_view_task_filters(Task::find(), definition)
            .count(&self.db)
            .await
            .map_err(Into::into)
    }
}

fn apply_view_task_filters(mut query: Select<Task>, definition: &ViewTaskQuery) -> Select<Task> {
    query = query
        .filter(task::Column::ArchivedAt.is_null())
        .filter(task::Column::DeletedAt.is_null());
    if matches!(definition.scope.kind, TaskScopeKind::Space) {
        query = query.filter(
            task::Column::SpaceId.eq(definition.scope.space_id.as_deref().unwrap_or_default()),
        );
    }

    query = match definition.base_view_key {
        TaskViewBaseKey::All => query,
        TaskViewBaseKey::Completed => {
            query.filter(task::Column::Status.eq(StorageWorkStatus::Done))
        }
        TaskViewBaseKey::Active | TaskViewBaseKey::Today | TaskViewBaseKey::Upcoming => query
            .filter(task::Column::Status.is_in([
                StorageWorkStatus::Todo,
                StorageWorkStatus::Doing,
                StorageWorkStatus::Waiting,
            ])),
    };
    query = match definition.base_view_key {
        TaskViewBaseKey::Today => query.filter(
            Condition::any()
                .add(sqlite_date_before(
                    "due_at",
                    &definition.dates.tomorrow_start,
                ))
                .add(sqlite_date_range(
                    "planned_at",
                    &definition.dates.today_start,
                    &definition.dates.tomorrow_start,
                )),
        ),
        TaskViewBaseKey::Upcoming => query.filter(
            Condition::any()
                .add(sqlite_date_at_or_after(
                    "due_at",
                    &definition.dates.tomorrow_start,
                ))
                .add(sqlite_date_at_or_after(
                    "planned_at",
                    &definition.dates.tomorrow_start,
                )),
        ),
        TaskViewBaseKey::All | TaskViewBaseKey::Active | TaskViewBaseKey::Completed => query,
    };

    query = match &definition.context {
        TaskViewContext::All => query,
        TaskViewContext::Standalone => query.filter(task::Column::ProjectId.is_null()),
        TaskViewContext::Project { project_id } => {
            query.filter(task::Column::ProjectId.eq(project_id.as_str()))
        }
    };

    for clause in &definition.filters.clauses {
        query = match clause.field.as_str() {
            "status" => {
                let values = clause
                    .values
                    .iter()
                    .filter_map(|value| storage_status_from_str(value))
                    .collect::<Vec<_>>();
                if clause.op == "is_not" {
                    query.filter(task::Column::Status.is_not_in(values))
                } else {
                    query.filter(task::Column::Status.is_in(values))
                }
            }
            "priority" => {
                let values = clause
                    .values
                    .iter()
                    .filter_map(|value| value.parse::<i32>().ok())
                    .collect::<Vec<_>>();
                if clause.op == "is_not" {
                    query.filter(task::Column::Priority.is_not_in(values))
                } else {
                    query.filter(task::Column::Priority.is_in(values))
                }
            }
            "project" => query.filter(project_clause_condition(clause)),
            "due" => query.filter(date_clause_condition(
                task::Column::DueAt,
                "due_at",
                clause,
                &definition.dates,
            )),
            "planned" => query.filter(date_clause_condition(
                task::Column::PlannedAt,
                "planned_at",
                clause,
                &definition.dates,
            )),
            _ => query,
        };
    }
    query
}

fn project_clause_condition(clause: &FilterClauseValue) -> Condition {
    let includes_none = clause.values.iter().any(|value| value == "__none__");
    let ids = clause
        .values
        .iter()
        .filter(|value| value.as_str() != "__none__")
        .cloned()
        .collect::<Vec<_>>();

    if clause.op != "is_not" {
        let mut selected = Condition::any();
        if includes_none {
            selected = selected.add(task::Column::ProjectId.is_null());
        }
        if !ids.is_empty() {
            selected = selected.add(task::Column::ProjectId.is_in(ids));
        }
        return selected;
    }

    if includes_none {
        let mut complement = Condition::all().add(task::Column::ProjectId.is_not_null());
        if !ids.is_empty() {
            complement = complement.add(task::Column::ProjectId.is_not_in(ids));
        }
        return complement;
    }

    Condition::any()
        .add(task::Column::ProjectId.is_null())
        .add(task::Column::ProjectId.is_not_in(ids))
}

fn date_clause_condition(
    column: task::Column,
    column_name: &'static str,
    clause: &FilterClauseValue,
    dates: &ViewDateBoundaries,
) -> Condition {
    if clause.op == "is_not" {
        return clause
            .values
            .iter()
            .fold(Condition::all(), |condition, value| {
                condition.add(date_value_complement(column, column_name, value, dates))
            });
    }
    clause
        .values
        .iter()
        .fold(Condition::any(), |condition, value| {
            condition.add(date_value_condition(column, column_name, value, dates))
        })
}

fn date_value_condition(
    column: task::Column,
    column_name: &'static str,
    value: &str,
    dates: &ViewDateBoundaries,
) -> Condition {
    match value {
        "today" => {
            sqlite_date_range_condition(column_name, &dates.today_start, &dates.tomorrow_start)
        }
        "tomorrow" => sqlite_date_range_condition(
            column_name,
            &dates.tomorrow_start,
            &dates.day_after_tomorrow_start,
        ),
        "thisWeek" => {
            sqlite_date_range_condition(column_name, &dates.today_start, &dates.next_week_start)
        }
        "future" => {
            Condition::all().add(sqlite_date_at_or_after(column_name, &dates.tomorrow_start))
        }
        "overdue" => Condition::all().add(sqlite_date_before(column_name, &dates.today_start)),
        "hasDate" => Condition::all().add(column.is_not_null()),
        "noDate" => Condition::all().add(column.is_null()),
        _ => Condition::all(),
    }
}

fn date_value_complement(
    column: task::Column,
    column_name: &'static str,
    value: &str,
    dates: &ViewDateBoundaries,
) -> Condition {
    match value {
        "today" => sqlite_date_range_complement(
            column,
            column_name,
            &dates.today_start,
            &dates.tomorrow_start,
        ),
        "tomorrow" => sqlite_date_range_complement(
            column,
            column_name,
            &dates.tomorrow_start,
            &dates.day_after_tomorrow_start,
        ),
        "thisWeek" => sqlite_date_range_complement(
            column,
            column_name,
            &dates.today_start,
            &dates.next_week_start,
        ),
        "future" => Condition::any()
            .add(column.is_null())
            .add(sqlite_date_before(column_name, &dates.tomorrow_start)),
        "overdue" => Condition::any()
            .add(column.is_null())
            .add(sqlite_date_at_or_after(column_name, &dates.today_start)),
        "hasDate" => Condition::all().add(column.is_null()),
        "noDate" => Condition::all().add(column.is_not_null()),
        _ => Condition::all(),
    }
}

fn sqlite_date_range_condition(column: &str, from: &str, to: &str) -> Condition {
    Condition::all().add(sqlite_date_range(column, from, to))
}

fn sqlite_date_range_complement(
    column: task::Column,
    column_name: &str,
    from: &str,
    to: &str,
) -> Condition {
    Condition::any()
        .add(column.is_null())
        .add(Expr::cust_with_values(
            format!("julianday({column_name}) < julianday(?)"),
            [from],
        ))
        .add(Expr::cust_with_values(
            format!("julianday({column_name}) >= julianday(?)"),
            [to],
        ))
}

fn sqlite_date_range(column: &str, from: &str, to: &str) -> sea_orm::sea_query::SimpleExpr {
    Expr::cust_with_values(
        format!("julianday({column}) >= julianday(?) AND julianday({column}) < julianday(?)"),
        [from, to],
    )
}

fn sqlite_date_before(column: &str, value: &str) -> sea_orm::sea_query::SimpleExpr {
    Expr::cust_with_values(format!("julianday({column}) < julianday(?)"), [value])
}

fn sqlite_date_at_or_after(column: &str, value: &str) -> sea_orm::sea_query::SimpleExpr {
    Expr::cust_with_values(format!("julianday({column}) >= julianday(?)"), [value])
}

fn storage_status_from_str(value: &str) -> Option<StorageWorkStatus> {
    match value {
        "todo" => Some(StorageWorkStatus::Todo),
        "doing" => Some(StorageWorkStatus::Doing),
        "waiting" => Some(StorageWorkStatus::Waiting),
        "done" => Some(StorageWorkStatus::Done),
        "canceled" => Some(StorageWorkStatus::Canceled),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use sea_orm::ConnectionTrait;
    use stoneflow_application::{
        task::TaskQueryCursor,
        view::{FilterQueryValue, TaskScopeInput},
    };
    use stoneflow_domain::WorkStatus;
    use stoneflow_test_support::TestDatabase;

    use super::super::CreateTaskRecord;
    use super::*;

    const SPACE_ID: &str = "view-query-space";
    const NOW: &str = "2026-08-21T16:00:00Z";
    const DUE_TODAY: &str = "2026-08-21T09:30:00-07:00";
    const PLANNED_TOMORROW: &str = "2026-08-22T09:00:00-07:00";

    async fn insert_task(
        repository: &TaskRepository,
        id: &str,
        project_id: Option<&str>,
        status: WorkStatus,
        due_at: Option<&str>,
        planned_at: Option<&str>,
        position: i64,
    ) {
        repository
            .create(
                repository.connection(),
                CreateTaskRecord {
                    id: id.to_owned(),
                    space_id: SPACE_ID.to_owned(),
                    project_id: project_id.map(str::to_owned),
                    title: id.to_owned(),
                    note: None,
                    status,
                    status_changed_at: NOW.to_owned(),
                    priority: 3,
                    planned_at: planned_at.map(str::to_owned),
                    due_at: due_at.map(str::to_owned),
                    remind_at: None,
                    position,
                    completed_at: None,
                    created_at: NOW.to_owned(),
                    updated_at: NOW.to_owned(),
                },
            )
            .await
            .expect("insert task fixture");
    }

    #[tokio::test]
    async fn view_query_preserves_due_planned_and_multi_project_is_not_semantics() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        database
            .connection()
            .execute_unprepared(&format!(
                "INSERT INTO spaces \
                 (id, name, icon_key, color_key, is_default, position, generation, created_at, updated_at) \
                 VALUES ('{SPACE_ID}', 'Query', 'home', 'blue', 0, 1000, 1, '{NOW}', '{NOW}')"
            ))
            .await
            .expect("insert space fixture");
        database
            .connection()
            .execute_unprepared(&format!(
                "INSERT INTO projects \
                 (id, space_id, name, status, priority, status_changed_at, position, generation, created_at, updated_at) \
                 VALUES \
                 ('project-1', '{SPACE_ID}', 'P1', 'todo', 0, '{NOW}', 1000, 1, '{NOW}', '{NOW}'), \
                 ('project-2', '{SPACE_ID}', 'P2', 'todo', 0, '{NOW}', 2000, 1, '{NOW}', '{NOW}'), \
                 ('project-3', '{SPACE_ID}', 'P3', 'todo', 0, '{NOW}', 3000, 1, '{NOW}', '{NOW}')"
            ))
            .await
            .expect("insert project fixtures");

        let repository = TaskRepository::new(database.connection().clone());
        insert_task(
            &repository,
            "keep-standalone",
            None,
            WorkStatus::Todo,
            Some(DUE_TODAY),
            Some(PLANNED_TOMORROW),
            1000,
        )
        .await;
        insert_task(
            &repository,
            "keep-project-3",
            Some("project-3"),
            WorkStatus::Doing,
            Some(DUE_TODAY),
            Some(PLANNED_TOMORROW),
            2000,
        )
        .await;
        insert_task(
            &repository,
            "exclude-project-1",
            Some("project-1"),
            WorkStatus::Todo,
            Some(DUE_TODAY),
            Some(PLANNED_TOMORROW),
            3000,
        )
        .await;
        insert_task(
            &repository,
            "exclude-project-2",
            Some("project-2"),
            WorkStatus::Todo,
            Some(DUE_TODAY),
            Some(PLANNED_TOMORROW),
            4000,
        )
        .await;
        insert_task(
            &repository,
            "exclude-due",
            Some("project-3"),
            WorkStatus::Todo,
            Some(PLANNED_TOMORROW),
            Some(PLANNED_TOMORROW),
            5000,
        )
        .await;
        insert_task(
            &repository,
            "exclude-planned",
            Some("project-3"),
            WorkStatus::Todo,
            Some(DUE_TODAY),
            Some(DUE_TODAY),
            6000,
        )
        .await;
        insert_task(
            &repository,
            "exclude-completed",
            Some("project-3"),
            WorkStatus::Done,
            Some(DUE_TODAY),
            Some(PLANNED_TOMORROW),
            7000,
        )
        .await;
        insert_task(
            &repository,
            "keep-null-due",
            Some("project-3"),
            WorkStatus::Todo,
            None,
            Some(PLANNED_TOMORROW),
            8000,
        )
        .await;

        let query = ViewTaskQuery {
            scope: TaskScopeInput {
                kind: TaskScopeKind::Space,
                space_id: Some(SPACE_ID.to_owned()),
            },
            context: TaskViewContext::All,
            base_view_key: TaskViewBaseKey::Active,
            filters: FilterQueryValue {
                clauses: vec![
                    FilterClauseValue {
                        id: "due".to_owned(),
                        field: "due".to_owned(),
                        op: "is".to_owned(),
                        values: vec!["today".to_owned()],
                    },
                    FilterClauseValue {
                        id: "planned".to_owned(),
                        field: "planned".to_owned(),
                        op: "is".to_owned(),
                        values: vec!["tomorrow".to_owned()],
                    },
                    FilterClauseValue {
                        id: "project".to_owned(),
                        field: "project".to_owned(),
                        op: "is_not".to_owned(),
                        values: vec!["project-1".to_owned(), "project-2".to_owned()],
                    },
                ],
            },
            dates: ViewDateBoundaries {
                today_start: "2026-08-22T00:00:00+08:00".to_owned(),
                tomorrow_start: "2026-08-23T00:00:00+08:00".to_owned(),
                day_after_tomorrow_start: "2026-08-24T00:00:00+08:00".to_owned(),
                next_week_start: "2026-08-24T00:00:00+08:00".to_owned(),
            },
            limit: 1,
            cursor: None,
        };

        assert_eq!(repository.count_for_view(&query).await.unwrap(), 2);
        let first_page = repository.list_for_view(&query).await.unwrap();
        assert_eq!(
            first_page
                .iter()
                .map(|task| task.id.as_str())
                .collect::<Vec<_>>(),
            vec!["keep-standalone"]
        );

        let second_page = repository
            .list_for_view(&ViewTaskQuery {
                cursor: Some(TaskQueryCursor {
                    position: first_page[0].position,
                    id: first_page[0].id.clone(),
                }),
                ..query.clone()
            })
            .await
            .unwrap();
        assert_eq!(
            second_page
                .iter()
                .map(|task| task.id.as_str())
                .collect::<Vec<_>>(),
            vec!["keep-project-3"]
        );

        let date_is_not_query = ViewTaskQuery {
            filters: FilterQueryValue {
                clauses: vec![FilterClauseValue {
                    id: "due-is-not".to_owned(),
                    field: "due".to_owned(),
                    op: "is_not".to_owned(),
                    values: vec!["today".to_owned(), "tomorrow".to_owned()],
                }],
            },
            limit: 10,
            cursor: None,
            ..query.clone()
        };
        let date_is_not_items = repository.list_for_view(&date_is_not_query).await.unwrap();
        assert_eq!(
            date_is_not_items
                .iter()
                .map(|task| task.id.as_str())
                .collect::<Vec<_>>(),
            vec!["keep-null-due"]
        );

        let future_query = ViewTaskQuery {
            filters: FilterQueryValue {
                clauses: vec![FilterClauseValue {
                    id: "due-future".to_owned(),
                    field: "due".to_owned(),
                    op: "is".to_owned(),
                    values: vec!["future".to_owned()],
                }],
            },
            limit: 10,
            cursor: None,
            ..query.clone()
        };
        let future_items = repository.list_for_view(&future_query).await.unwrap();
        assert_eq!(
            future_items
                .iter()
                .map(|task| task.id.as_str())
                .collect::<Vec<_>>(),
            vec!["exclude-due"]
        );

        let not_future_query = ViewTaskQuery {
            filters: FilterQueryValue {
                clauses: vec![FilterClauseValue {
                    id: "due-not-future".to_owned(),
                    field: "due".to_owned(),
                    op: "is_not".to_owned(),
                    values: vec!["future".to_owned()],
                }],
            },
            limit: 10,
            cursor: None,
            ..query
        };
        let not_future_items = repository.list_for_view(&not_future_query).await.unwrap();
        assert_eq!(
            not_future_items
                .iter()
                .map(|task| task.id.as_str())
                .collect::<Vec<_>>(),
            vec![
                "keep-standalone",
                "keep-project-3",
                "exclude-project-1",
                "exclude-project-2",
                "exclude-planned",
                "keep-null-due",
            ]
        );
    }
}

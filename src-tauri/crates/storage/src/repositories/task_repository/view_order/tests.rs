use std::{
    cmp::Ordering,
    collections::{HashMap, HashSet},
};

use chrono::{Datelike, Duration, Local, NaiveDate, TimeZone};
use sea_orm::ConnectionTrait;
use stoneflow_application::{
    task::{
        TaskCompletedOrder, TaskDateBucket, TaskGroupBy, TaskOrderBy, TaskOrderDirection,
        TaskQueryGroup, TaskQueryOrder, UpdateTaskInput,
    },
    view::{
        CreateViewInput, FilterQueryValue, RunTaskQueryInput, RunTaskViewInput, TaskScopeInput,
        TaskScopeKind, TaskViewBaseKey, TaskViewContext, ViewDateBoundaries, ViewTaskQuery,
    },
};
use stoneflow_domain::WorkStatus;
use stoneflow_test_support::TestDatabase;

use crate::{
    adapters::{build_task_service, build_view_service},
    repositories::{CreateTaskRecord, TaskRepository, UpdateTaskPatch},
};

const SPACE: &str = "11111111-1111-4111-8111-111111111111";

fn input(order: TaskQueryOrder) -> RunTaskQueryInput {
    RunTaskQueryInput {
        scope: TaskScopeInput {
            kind: TaskScopeKind::All,
            space_id: None,
        },
        context: TaskViewContext::All,
        base_view_key: TaskViewBaseKey::All,
        filters: FilterQueryValue::default(),
        order,
        date_basis: "2026-09-13".to_owned(),
        cursor: None,
    }
}

fn date(index: usize) -> String {
    // 相同瞬间的两种时区写法不能按字符串排序。
    let day = index % 23 + 1;
    if index % 2 == 0 {
        format!("2026-08-{day:02}T08:00:00+08:00")
    } else {
        format!("2026-08-{day:02}T00:00:00Z")
    }
}

async fn fixture() -> (TestDatabase, Vec<CreateTaskRecord>) {
    let database = TestDatabase::bootstrap_in_memory().await.unwrap();
    database.connection().execute_unprepared(&format!(
        "INSERT INTO spaces (id, name, icon_key, color_key, is_default, position, generation, created_at, updated_at) VALUES ('{SPACE}', '排序', 'home', 'blue', 0, 1024, 1, '2026-09-13T00:00:00Z', '2026-09-13T00:00:00Z')"
    )).await.unwrap();
    let repository = TaskRepository::new(database.connection().clone());
    let mut rows = Vec::new();
    for index in 0..337 {
        let status = [
            WorkStatus::Todo,
            WorkStatus::Doing,
            WorkStatus::Waiting,
            WorkStatus::Done,
            WorkStatus::Canceled,
        ][index % 5];
        let mut row = CreateTaskRecord {
            id: format!("00000000-0000-4000-8000-{index:012}"),
            space_id: SPACE.to_owned(),
            project_id: None,
            title: format!("任务 {index}"),
            note: None,
            status,
            status_changed_at: date(index * 3),
            priority: (index % 5) as i32,
            due_at: (index % 3 != 0).then(|| date(index * 2)),
            planned_at: (index % 4 != 0).then(|| date(index * 3)),
            remind_at: None,
            position: (index / 2) as i64,
            completed_at: (status == WorkStatus::Done && index % 3 != 0).then(|| date(index * 5)),
            created_at: date(index * 7),
            updated_at: date(index * 11),
        };
        if index == 336 {
            row.status = WorkStatus::Doing;
            row.priority = 4;
            row.due_at = Some("2000-01-01T00:00:00Z".to_owned());
            row.updated_at = "2030-01-01T00:00:00Z".to_owned();
        }
        // 微秒、毫秒舍入边界和跨秒，覆盖真实 now_utc 写入精度。
        if index < 10 {
            let precise = [
                "2026-08-01T00:00:00.000100Z",
                "2026-08-01T08:00:00.000200+08:00",
                "2026-08-01T00:00:00.000400Z",
                "2026-08-01T00:00:00.000600Z",
                "2026-08-01T00:00:00.999900Z",
                "2026-08-01T00:00:01.000100Z",
                "2026-07-31T17:00:00.000100-07:00",
                "2026-08-01T00:00:00.000100000Z",
                "2026-08-01T00:00:00.000100001Z",
                "2026-08-01T00:00:00.000100002Z",
            ][index]
                .to_owned();
            row.updated_at = precise.clone();
            row.created_at = precise.clone();
            row.status_changed_at = precise.clone();
            row.due_at = Some(precise.clone());
            row.planned_at = Some(precise.clone());
            if status == WorkStatus::Done {
                row.completed_at = Some(precise);
            }
        }
        repository
            .create(database.connection(), row.clone())
            .await
            .unwrap();
        rows.push(row);
    }
    (database, rows)
}

fn compare_date(
    left: Option<&str>,
    right: Option<&str>,
    direction: TaskOrderDirection,
) -> Ordering {
    match (left, right) {
        (Some(left), Some(right)) => orient(
            chrono::DateTime::parse_from_rfc3339(left)
                .unwrap()
                .cmp(&chrono::DateTime::parse_from_rfc3339(right).unwrap()),
            direction,
        ),
        (Some(_), None) => Ordering::Less,
        (None, Some(_)) => Ordering::Greater,
        (None, None) => Ordering::Equal,
    }
}

fn orient(ordering: Ordering, direction: TaskOrderDirection) -> Ordering {
    if direction == TaskOrderDirection::Desc {
        ordering.reverse()
    } else {
        ordering
    }
}

fn status_rank(status: WorkStatus) -> usize {
    [
        WorkStatus::Doing,
        WorkStatus::Todo,
        WorkStatus::Waiting,
        WorkStatus::Done,
        WorkStatus::Canceled,
    ]
    .iter()
    .position(|item| *item == status)
    .unwrap()
}

// 独立按产品合同计算预期，不复用生产 terms/tuple 或 SQL 生成器。
fn compare(left: &CreateTaskRecord, right: &CreateTaskRecord, order: TaskQueryOrder) -> Ordering {
    use TaskOrderDirection::{Asc, Desc};
    if order.completed_order == TaskCompletedOrder::Recency {
        let done = (
            left.status == WorkStatus::Done,
            right.status == WorkStatus::Done,
        );
        if done.0 != done.1 {
            return done.0.cmp(&done.1);
        }
        if done.0 {
            return compare_date(
                left.completed_at.as_deref(),
                right.completed_at.as_deref(),
                Desc,
            )
            .then_with(|| left.id.cmp(&right.id));
        }
    }
    let updated = || compare_date(Some(&left.updated_at), Some(&right.updated_at), Desc);
    let ordinary = match order.order_by {
        TaskOrderBy::Manual => left.position.cmp(&right.position),
        TaskOrderBy::Smart => status_rank(left.status)
            .cmp(&status_rank(right.status))
            .then_with(|| {
                compare_date(
                    left.due_at.as_deref().or(left.planned_at.as_deref()),
                    right.due_at.as_deref().or(right.planned_at.as_deref()),
                    Asc,
                )
            })
            .then_with(|| right.priority.cmp(&left.priority))
            .then_with(updated)
            .then_with(|| compare_date(Some(&left.created_at), Some(&right.created_at), Desc)),
        by => match by {
            TaskOrderBy::Priority => {
                orient(left.priority.cmp(&right.priority), order.order_direction)
            }
            TaskOrderBy::Status => orient(
                status_rank(left.status).cmp(&status_rank(right.status)),
                order.order_direction,
            ),
            _ => {
                let value = |row: &CreateTaskRecord| -> Option<String> {
                    match by {
                        TaskOrderBy::DueAt => row.due_at.clone(),
                        TaskOrderBy::PlannedAt => row.planned_at.clone(),
                        TaskOrderBy::StatusChangedAt => Some(row.status_changed_at.clone()),
                        TaskOrderBy::CreatedAt => Some(row.created_at.clone()),
                        TaskOrderBy::UpdatedAt => Some(row.updated_at.clone()),
                        TaskOrderBy::CompletedAt => row.completed_at.clone(),
                        TaskOrderBy::CanceledAt => (row.status == WorkStatus::Canceled)
                            .then(|| row.status_changed_at.clone()),
                        _ => unreachable!(),
                    }
                };
                compare_date(
                    value(left).as_deref(),
                    value(right).as_deref(),
                    order.order_direction,
                )
            }
        }
        .then_with(updated),
    };
    ordinary.then_with(|| left.id.cmp(&right.id))
}

#[tokio::test]
async fn every_global_order_pages_through_real_sqlite_without_duplicates_or_omissions() {
    let (database, rows) = fixture().await;
    let service = build_view_service(database.connection().clone());
    for order_by in [
        TaskOrderBy::Manual,
        TaskOrderBy::Smart,
        TaskOrderBy::Priority,
        TaskOrderBy::Status,
        TaskOrderBy::DueAt,
        TaskOrderBy::PlannedAt,
        TaskOrderBy::StatusChangedAt,
        TaskOrderBy::CreatedAt,
        TaskOrderBy::UpdatedAt,
        TaskOrderBy::CompletedAt,
        TaskOrderBy::CanceledAt,
    ] {
        for order_direction in [TaskOrderDirection::Asc, TaskOrderDirection::Desc] {
            for completed_order in [TaskCompletedOrder::Natural, TaskCompletedOrder::Recency] {
                let order = TaskQueryOrder {
                    group_by: TaskGroupBy::None,
                    sub_group_by: TaskGroupBy::None,
                    order_by,
                    order_direction,
                    completed_order,
                };
                let mut expected = rows.iter().collect::<Vec<_>>();
                expected.sort_by(|left, right| compare(left, right, order));
                let expected = expected
                    .iter()
                    .map(|row| row.id.clone())
                    .collect::<Vec<_>>();
                let mut query = input(order);
                let mut actual = Vec::new();
                let mut page_count = 0;
                loop {
                    let page = service.run_task_query(query.clone()).await.unwrap();
                    assert_eq!(
                        page.total_count,
                        if page_count == 0 { Some(337) } else { None }
                    );
                    let page_ids = page
                        .items
                        .iter()
                        .map(|row| row.id.clone())
                        .collect::<Vec<_>>();
                    let end = (actual.len() + 150).min(expected.len());
                    assert_eq!(
                        page_ids,
                        expected[actual.len()..end],
                        "{order:?}, page {page_count}"
                    );
                    actual.extend(page_ids);
                    page_count += 1;
                    query.cursor = page.next_cursor;
                    if query.cursor.is_none() {
                        break;
                    }
                    assert!(page_count < 4, "cursor 必须前进");
                }
                assert_eq!(page_count, 3);
                assert_eq!(actual.iter().collect::<HashSet<_>>().len(), 337);
                assert_eq!(actual, expected);
                if order_by == TaskOrderBy::Smart {
                    assert_eq!(actual[0], rows[336].id);
                }
            }
        }
    }
}

#[tokio::test]
async fn saved_view_uses_same_order_and_manual_ignores_metadata_updates_except_explicit_recency() {
    let (database, rows) = fixture().await;
    let service = build_view_service(database.connection().clone());
    let tasks = build_task_service(database.connection().clone());
    let order = TaskQueryOrder {
        group_by: TaskGroupBy::None,
        sub_group_by: TaskGroupBy::None,
        order_by: TaskOrderBy::Manual,
        order_direction: TaskOrderDirection::Asc,
        completed_order: TaskCompletedOrder::Natural,
    };
    let query = input(order);
    let view = service
        .create_view(CreateViewInput {
            name: "全部任务".to_owned(),
            scope: query.scope.clone(),
            context: query.context.clone(),
            base_view_key: query.base_view_key,
            filters: query.filters.clone(),
        })
        .await
        .unwrap();
    let first = service.run_task_query(query.clone()).await.unwrap();
    assert!(service
        .run_task_query(RunTaskQueryInput {
            date_basis: "2026-09-14".to_owned(),
            cursor: first.next_cursor.clone(),
            ..query.clone()
        })
        .await
        .is_err());
    assert!(service
        .run_task_view(RunTaskViewInput {
            scope: query.scope.clone(),
            view_id: view.id.clone(),
            filters: None,
            order,
            date_basis: "2026-09-14".to_owned(),
            cursor: first.next_cursor.clone()
        })
        .await
        .is_err());
    tasks.update_task(serde_json::from_value::<UpdateTaskInput>(serde_json::json!({"taskId": rows[2].id, "title": "已编辑", "priority": 4, "dueAt": "2031-01-01T00:00:00Z"})).unwrap()).await.unwrap();
    let repository = TaskRepository::new(database.connection().clone());
    assert_eq!(
        repository.get(&rows[2].id).await.unwrap().unwrap().position,
        rows[2].position
    );
    let after = service
        .run_task_view(RunTaskViewInput {
            scope: query.scope,
            view_id: view.id,
            filters: None,
            order,
            date_basis: query.date_basis,
            cursor: None,
        })
        .await
        .unwrap();
    assert_eq!(
        first.items.iter().map(|row| &row.id).collect::<Vec<_>>(),
        after.items.iter().map(|row| &row.id).collect::<Vec<_>>()
    );
    assert!(first.items.iter().any(|row| row.status == WorkStatus::Done));
    let recency = service
        .run_task_query(input(TaskQueryOrder {
            completed_order: TaskCompletedOrder::Recency,
            ..order
        }))
        .await
        .unwrap();
    assert!(recency
        .items
        .iter()
        .all(|row| row.status != WorkStatus::Done));
    assert!(service
        .run_task_query(RunTaskQueryInput {
            cursor: first.next_cursor,
            ..input(TaskQueryOrder {
                order_by: TaskOrderBy::Priority,
                ..order
            })
        })
        .await
        .is_err());
}

#[tokio::test]
async fn date_membership_and_count_do_not_round_last_microseconds_into_tomorrow() {
    let (database, rows) = fixture().await;
    database
        .connection()
        .execute_unprepared(&format!(
            "UPDATE tasks SET due_at = NULL, planned_at = NULL;
         UPDATE tasks SET due_at = '2026-09-13T23:59:59.999999999Z' WHERE id = '{}';
         UPDATE tasks SET due_at = '2026-09-14T08:00:00+08:00' WHERE id = '{}';
         UPDATE tasks SET due_at = '2026-09-14T00:00:00.000001Z' WHERE id = '{}';",
            rows[0].id, rows[1].id, rows[2].id,
        ))
        .await
        .unwrap();
    let repository = TaskRepository::new(database.connection().clone());
    let mut query = ViewTaskQuery {
        scope: TaskScopeInput {
            kind: TaskScopeKind::All,
            space_id: None,
        },
        context: TaskViewContext::All,
        base_view_key: TaskViewBaseKey::Today,
        filters: FilterQueryValue::default(),
        order: TaskQueryOrder {
            group_by: TaskGroupBy::None,
            sub_group_by: TaskGroupBy::None,
            order_by: TaskOrderBy::DueAt,
            order_direction: TaskOrderDirection::Asc,
            completed_order: TaskCompletedOrder::Natural,
        },
        dates: ViewDateBoundaries {
            today_start: "2026-09-13T00:00:00Z".to_owned(),
            tomorrow_start: "2026-09-14T00:00:00Z".to_owned(),
            day_after_tomorrow_start: "2026-09-15T00:00:00Z".to_owned(),
            next_week_start: "2026-09-14T00:00:00Z".to_owned(),
        },
        limit: 150,
        cursor: None,
    };
    assert_eq!(repository.count_for_view(&query).await.unwrap(), 1);
    assert_eq!(
        repository.list_for_view(&query).await.unwrap()[0].id,
        rows[0].id
    );
    query.base_view_key = TaskViewBaseKey::Upcoming;
    assert_eq!(repository.count_for_view(&query).await.unwrap(), 2);
    assert_eq!(
        repository
            .list_for_view(&query)
            .await
            .unwrap()
            .iter()
            .map(|row| &row.id)
            .collect::<Vec<_>>(),
        vec![&rows[1].id, &rows[2].id]
    );
    query.base_view_key = TaskViewBaseKey::All;
    query.filters = serde_json::from_value(serde_json::json!({"clauses":[{"id":"date", "field":"due", "op":"is_not", "values":["today"]}]})).unwrap();
    assert_eq!(repository.count_for_view(&query).await.unwrap(), 336);
    assert!(repository
        .list_for_view(&query)
        .await
        .unwrap()
        .iter()
        .all(|row| row.id != rows[0].id));
}

async fn grouped_fixture() -> (TestDatabase, Vec<CreateTaskRecord>, HashMap<String, String>) {
    let (database, mut rows) = fixture().await;
    let names = ["A", "a", "同名", "同名", "\u{e000}", "𐀀"];
    let mut projects = HashMap::new();
    for (index, name) in names.into_iter().enumerate() {
        let id = format!("22222222-2222-4222-8222-{index:012}");
        database.connection().execute_unprepared(&format!(
            "INSERT INTO projects (id, space_id, name, status, priority, status_changed_at, position, generation, created_at, updated_at) VALUES ('{id}', '{SPACE}', '{name}', 'todo', 0, '2026-09-10T00:00:00Z', 0, 1, '2026-09-10T00:00:00Z', '2026-09-10T00:00:00Z')"
        )).await.unwrap();
        projects.insert(id, name.to_owned());
    }
    let mut project_ids = projects.keys().cloned().collect::<Vec<_>>();
    project_ids.sort();
    let start = Local
        .with_ymd_and_hms(2026, 9, 10, 0, 0, 0)
        .earliest()
        .unwrap();
    let moments = [
        Some((start - Duration::nanoseconds(1)).to_rfc3339()),
        Some(start.to_rfc3339()),
        Some((start + Duration::days(1) - Duration::nanoseconds(1)).to_rfc3339()),
        Some((start + Duration::days(1)).to_rfc3339()),
        Some((start + Duration::days(2)).to_rfc3339()),
        Some((start + Duration::days(4)).to_rfc3339()),
        None,
    ];
    let repository = TaskRepository::new(database.connection().clone());
    for (index, row) in rows.iter_mut().enumerate() {
        row.project_id = project_ids.get(index % (project_ids.len() + 1)).cloned();
        row.priority = ((index / 5) % 5) as i32;
        row.due_at = moments[index % moments.len()].clone();
        row.planned_at = moments[(index + 3) % moments.len()].clone();
        repository
            .update(
                database.connection(),
                &row.id,
                UpdateTaskPatch {
                    project_id: Some(row.project_id.clone()),
                    priority: Some(row.priority),
                    due_at: Some(row.due_at.clone()),
                    planned_at: Some(row.planned_at.clone()),
                    ..Default::default()
                },
                &row.updated_at,
            )
            .await
            .unwrap();
    }
    (database, rows, projects)
}

fn expected_group(
    row: &CreateTaskRecord,
    by: TaskGroupBy,
    projects: &HashMap<String, String>,
) -> TaskQueryGroup {
    match by {
        TaskGroupBy::None => TaskQueryGroup::None,
        TaskGroupBy::Status => TaskQueryGroup::Status { status: row.status },
        TaskGroupBy::Priority => TaskQueryGroup::Priority {
            priority: row.priority,
        },
        TaskGroupBy::Project => TaskQueryGroup::Project {
            project_id: row.project_id.clone(),
            project_name: row
                .project_id
                .as_ref()
                .and_then(|id| projects.get(id))
                .cloned(),
        },
        TaskGroupBy::Due | TaskGroupBy::Scheduled => {
            let value = if by == TaskGroupBy::Due {
                row.due_at.as_deref()
            } else {
                row.planned_at.as_deref()
            };
            let today = NaiveDate::from_ymd_opt(2026, 9, 10).unwrap();
            let bucket = value.map_or(TaskDateBucket::None, |value| {
                let date = chrono::DateTime::parse_from_rfc3339(value)
                    .unwrap()
                    .with_timezone(&Local)
                    .date_naive();
                match date.signed_duration_since(today).num_days() {
                    days if days < 0 => TaskDateBucket::Overdue,
                    0 => TaskDateBucket::Today,
                    1 => TaskDateBucket::Tomorrow,
                    _ if date.iso_week() == today.iso_week() => TaskDateBucket::ThisWeek,
                    _ => TaskDateBucket::Later,
                }
            });
            if by == TaskGroupBy::Due {
                TaskQueryGroup::Due { bucket }
            } else {
                TaskQueryGroup::Scheduled { bucket }
            }
        }
    }
}

fn compare_group(left: &TaskQueryGroup, right: &TaskQueryGroup) -> Ordering {
    match (left, right) {
        (TaskQueryGroup::Status { status: left }, TaskQueryGroup::Status { status: right }) => {
            status_rank(*left).cmp(&status_rank(*right))
        }
        (
            TaskQueryGroup::Priority { priority: left },
            TaskQueryGroup::Priority { priority: right },
        ) => right.cmp(left),
        (
            TaskQueryGroup::Project {
                project_id: left_id,
                project_name: left_name,
            },
            TaskQueryGroup::Project {
                project_id: right_id,
                project_name: right_name,
            },
        ) => left_id
            .is_none()
            .cmp(&right_id.is_none())
            .then_with(|| left_name.cmp(right_name))
            .then_with(|| left_id.cmp(right_id)),
        (TaskQueryGroup::Due { bucket: left }, TaskQueryGroup::Due { bucket: right })
        | (
            TaskQueryGroup::Scheduled { bucket: left },
            TaskQueryGroup::Scheduled { bucket: right },
        ) => {
            let buckets = [
                TaskDateBucket::Overdue,
                TaskDateBucket::Today,
                TaskDateBucket::Tomorrow,
                TaskDateBucket::ThisWeek,
                TaskDateBucket::Later,
                TaskDateBucket::None,
            ];
            buckets
                .iter()
                .position(|bucket| bucket == left)
                .cmp(&buckets.iter().position(|bucket| bucket == right))
        }
        (TaskQueryGroup::None, TaskQueryGroup::None) => Ordering::Equal,
        _ => panic!("比较了不同分组配置"),
    }
}

#[tokio::test]
async fn primary_groups_and_row_identities_share_stable_windows_and_leaf_recency() {
    let (database, rows, projects) = grouped_fixture().await;
    let service = build_view_service(database.connection().clone());
    for group_by in [
        TaskGroupBy::Status,
        TaskGroupBy::Priority,
        TaskGroupBy::Project,
        TaskGroupBy::Due,
        TaskGroupBy::Scheduled,
    ] {
        for (order_by, order_direction) in [
            (TaskOrderBy::Manual, TaskOrderDirection::Asc),
            (TaskOrderBy::Smart, TaskOrderDirection::Asc),
            (TaskOrderBy::Priority, TaskOrderDirection::Desc),
            (TaskOrderBy::DueAt, TaskOrderDirection::Desc),
        ] {
            for completed_order in [TaskCompletedOrder::Natural, TaskCompletedOrder::Recency] {
                let order = TaskQueryOrder {
                    group_by,
                    sub_group_by: TaskGroupBy::None,
                    order_by,
                    order_direction,
                    completed_order,
                };
                let mut expected = rows.iter().collect::<Vec<_>>();
                expected.sort_by(|left, right| {
                    compare_group(
                        &expected_group(left, group_by, &projects),
                        &expected_group(right, group_by, &projects),
                    )
                    .then_with(|| compare(left, right, order))
                });
                let expected_ids = expected
                    .iter()
                    .map(|row| row.id.clone())
                    .collect::<Vec<_>>();
                let mut query = RunTaskQueryInput {
                    date_basis: "2026-09-10".to_owned(),
                    ..input(order)
                };
                let mut actual = Vec::new();
                let mut group_keys = HashSet::new();
                let mut last_group = None;
                let mut crossed_group_page = false;
                for page_index in 0..3 {
                    let page = service.run_task_query(query.clone()).await.unwrap();
                    assert_eq!(page.total_count, (page_index == 0).then_some(337));
                    if page_index > 0
                        && page
                            .items
                            .first()
                            .is_some_and(|item| Some(&item.group) == last_group.as_ref())
                    {
                        crossed_group_page = true;
                    }
                    for item in &page.items {
                        let expected_row = expected[actual.len()];
                        assert_eq!(
                            item.group,
                            expected_group(expected_row, group_by, &projects),
                            "{order:?}"
                        );
                        if last_group.as_ref() != Some(&item.group) {
                            let key = serde_json::to_string(&item.group).unwrap();
                            assert!(group_keys.insert(key), "{order:?}: 后页回到了之前的组");
                            last_group = Some(item.group.clone());
                        }
                        actual.push(item.id.clone());
                    }
                    assert_eq!(
                        actual,
                        expected_ids[..actual.len()],
                        "{order:?}, page {page_index}"
                    );
                    query.cursor = page.next_cursor;
                    assert_eq!(query.cursor.is_some(), page_index < 2);
                }
                assert!(crossed_group_page, "夹具必须覆盖同组跨页");
                assert_eq!(actual.iter().collect::<HashSet<_>>().len(), 337);
            }
        }
    }
}

#[tokio::test]
async fn grouping_changes_invalidate_cursors_and_saved_view_returns_the_same_grouped_window() {
    let (database, _, _) = grouped_fixture().await;
    let service = build_view_service(database.connection().clone());
    let query = RunTaskQueryInput {
        date_basis: "2026-09-10".to_owned(),
        ..input(TaskQueryOrder {
            group_by: TaskGroupBy::Project,
            sub_group_by: TaskGroupBy::None,
            order_by: TaskOrderBy::Priority,
            order_direction: TaskOrderDirection::Desc,
            completed_order: TaskCompletedOrder::Recency,
        })
    };
    let view = service
        .create_view(CreateViewInput {
            name: "项目分组".to_owned(),
            scope: query.scope.clone(),
            context: query.context.clone(),
            base_view_key: query.base_view_key,
            filters: query.filters.clone(),
        })
        .await
        .unwrap();
    let first = service.run_task_query(query.clone()).await.unwrap();
    let saved_input = RunTaskViewInput {
        scope: query.scope.clone(),
        view_id: view.id,
        filters: None,
        order: query.order,
        date_basis: query.date_basis.clone(),
        cursor: None,
    };
    let saved = service.run_task_view(saved_input.clone()).await.unwrap();
    assert_eq!(saved.items, first.items);
    assert_eq!(saved.next_cursor, first.next_cursor);
    let mut changed = query.clone();
    changed.order.group_by = TaskGroupBy::Status;
    changed.cursor = first.next_cursor.clone();
    assert!(service.run_task_query(changed).await.is_err());
    let mut old: serde_json::Value =
        serde_json::from_str(first.next_cursor.as_deref().unwrap()).unwrap();
    old["version"] = serde_json::json!(1);
    assert!(service
        .run_task_view(RunTaskViewInput {
            cursor: Some(old.to_string()),
            ..saved_input
        })
        .await
        .is_err());
}

async fn nested_fixture() -> (TestDatabase, Vec<CreateTaskRecord>, HashMap<String, String>) {
    let (database, mut rows, projects) = grouped_fixture().await;
    let moments = rows
        .iter()
        .take(7)
        .map(|row| row.due_at.clone())
        .collect::<Vec<_>>();
    let repository = TaskRepository::new(database.connection().clone());
    // 主、子维度必须能相互交叉；不能让项目和两个日期字段使用同一个循环。
    for (index, row) in rows.iter_mut().enumerate() {
        row.due_at = moments[(index / 7) % 7].clone();
        row.planned_at = moments[(index / 49) % 7].clone();
        repository
            .update(
                database.connection(),
                &row.id,
                UpdateTaskPatch {
                    due_at: Some(row.due_at.clone()),
                    planned_at: Some(row.planned_at.clone()),
                    ..Default::default()
                },
                &row.updated_at,
            )
            .await
            .unwrap();
    }
    (database, rows, projects)
}

#[tokio::test]
async fn every_nested_group_pair_pages_in_product_order_with_distinct_leaf_identities() {
    let (database, rows, projects) = nested_fixture().await;
    let service = build_view_service(database.connection().clone());
    let dimensions = [
        TaskGroupBy::Status,
        TaskGroupBy::Priority,
        TaskGroupBy::Project,
        TaskGroupBy::Due,
        TaskGroupBy::Scheduled,
    ];
    for group_by in dimensions {
        for sub_group_by in dimensions {
            if group_by == sub_group_by {
                continue;
            }
            for (order_by, order_direction) in [
                (TaskOrderBy::Manual, TaskOrderDirection::Asc),
                (TaskOrderBy::Smart, TaskOrderDirection::Asc),
                (TaskOrderBy::Priority, TaskOrderDirection::Desc),
                (TaskOrderBy::DueAt, TaskOrderDirection::Desc),
            ] {
                for completed_order in [TaskCompletedOrder::Natural, TaskCompletedOrder::Recency] {
                    let order = TaskQueryOrder {
                        group_by,
                        sub_group_by,
                        order_by,
                        order_direction,
                        completed_order,
                    };
                    let mut expected = rows.iter().collect::<Vec<_>>();
                    expected.sort_by(|left, right| {
                        compare_group(
                            &expected_group(left, group_by, &projects),
                            &expected_group(right, group_by, &projects),
                        )
                        .then_with(|| {
                            compare_group(
                                &expected_group(left, sub_group_by, &projects),
                                &expected_group(right, sub_group_by, &projects),
                            )
                        })
                        .then_with(|| compare(left, right, order))
                    });
                    let mut query = RunTaskQueryInput {
                        date_basis: "2026-09-10".to_owned(),
                        ..input(order)
                    };
                    let mut actual = Vec::new();
                    let mut visited_paths = HashSet::new();
                    let mut last_path = None;
                    let mut crossed_leaf_page = false;
                    for page_index in 0..3 {
                        let page = service.run_task_query(query.clone()).await.unwrap();
                        assert_eq!(page.total_count, (page_index == 0).then_some(337));
                        assert_eq!(page.items.len(), if page_index < 2 { 150 } else { 37 });
                        if page_index > 0
                            && page.items.first().is_some_and(|item| {
                                last_path.as_ref()
                                    == Some(&(item.group.clone(), item.sub_group.clone()))
                            })
                        {
                            crossed_leaf_page = true;
                        }
                        for item in &page.items {
                            let expected_row = expected[actual.len()];
                            assert_eq!(item.id, expected_row.id, "{order:?}, page {page_index}");
                            let path = (item.group.clone(), item.sub_group.clone());
                            assert_eq!(
                                path,
                                (
                                    expected_group(expected_row, group_by, &projects),
                                    expected_group(expected_row, sub_group_by, &projects)
                                ),
                                "{order:?}"
                            );
                            if last_path.as_ref() != Some(&path) {
                                assert!(
                                    visited_paths.insert(serde_json::to_string(&path).unwrap()),
                                    "{order:?}: 后页回到了之前的叶组"
                                );
                                last_path = Some(path);
                            }
                            actual.push(item.id.clone());
                        }
                        query.cursor = page.next_cursor;
                        assert_eq!(query.cursor.is_some(), page_index < 2);
                    }
                    assert!(crossed_leaf_page, "{order:?}: 夹具必须覆盖同子组跨页");
                    assert_eq!(actual.iter().collect::<HashSet<_>>().len(), 337);
                }
            }
        }
    }
}

#[tokio::test]
async fn nested_cursors_bind_effective_paths_and_saved_views_share_every_page() {
    let (database, _, _) = nested_fixture().await;
    let service = build_view_service(database.connection().clone());
    let query = RunTaskQueryInput {
        date_basis: "2026-09-10".to_owned(),
        ..input(TaskQueryOrder {
            group_by: TaskGroupBy::Priority,
            sub_group_by: TaskGroupBy::Project,
            order_by: TaskOrderBy::DueAt,
            order_direction: TaskOrderDirection::Desc,
            completed_order: TaskCompletedOrder::Recency,
        })
    };
    let view = service
        .create_view(CreateViewInput {
            name: "两级分组".to_owned(),
            scope: query.scope.clone(),
            context: query.context.clone(),
            base_view_key: query.base_view_key,
            filters: query.filters.clone(),
        })
        .await
        .unwrap();
    let saved_input = RunTaskViewInput {
        scope: query.scope.clone(),
        view_id: view.id,
        filters: None,
        order: query.order,
        date_basis: query.date_basis.clone(),
        cursor: None,
    };
    let first = service.run_task_query(query.clone()).await.unwrap();
    assert_eq!(
        serde_json::from_str::<serde_json::Value>(first.next_cursor.as_deref().unwrap()).unwrap()
            ["version"],
        3
    );
    let mut paged = query.clone();
    for page_index in 0..3 {
        let page = service.run_task_query(paged.clone()).await.unwrap();
        let saved = service
            .run_task_view(RunTaskViewInput {
                cursor: paged.cursor.clone(),
                ..saved_input.clone()
            })
            .await
            .unwrap();
        assert_eq!(saved.items, page.items);
        assert_eq!(saved.next_cursor, page.next_cursor);
        assert_eq!(saved.total_count, page.total_count);
        paged.cursor = page.next_cursor;
        assert_eq!(paged.cursor.is_some(), page_index < 2);
    }
    for sub_group_by in [
        TaskGroupBy::None,
        TaskGroupBy::Status,
        TaskGroupBy::Due,
        TaskGroupBy::Scheduled,
    ] {
        let order = TaskQueryOrder {
            sub_group_by,
            ..query.order
        };
        assert!(service
            .run_task_query(RunTaskQueryInput {
                order,
                cursor: first.next_cursor.clone(),
                ..query.clone()
            })
            .await
            .is_err());
        assert!(service
            .run_task_view(RunTaskViewInput {
                order,
                cursor: first.next_cursor.clone(),
                ..saved_input.clone()
            })
            .await
            .is_err());
    }
    for version in [1, 2] {
        let mut old: serde_json::Value =
            serde_json::from_str(first.next_cursor.as_deref().unwrap()).unwrap();
        old["version"] = serde_json::json!(version);
        assert!(service
            .run_task_query(RunTaskQueryInput {
                cursor: Some(old.to_string()),
                ..query.clone()
            })
            .await
            .is_err());
        assert!(service
            .run_task_view(RunTaskViewInput {
                cursor: Some(old.to_string()),
                ..saved_input.clone()
            })
            .await
            .is_err());
    }
    for (group_by, sub_group_by) in [
        (TaskGroupBy::None, TaskGroupBy::Project),
        (TaskGroupBy::Priority, TaskGroupBy::Priority),
    ] {
        let canonical = RunTaskQueryInput {
            order: TaskQueryOrder {
                group_by,
                sub_group_by: TaskGroupBy::None,
                ..query.order
            },
            ..query.clone()
        };
        let effective = RunTaskQueryInput {
            order: TaskQueryOrder {
                sub_group_by,
                ..canonical.order
            },
            ..canonical.clone()
        };
        let canonical_first = service.run_task_query(canonical.clone()).await.unwrap();
        let effective_first = service.run_task_query(effective.clone()).await.unwrap();
        assert_eq!(canonical_first, effective_first);
        assert!(effective_first
            .items
            .iter()
            .all(|item| item.sub_group == TaskQueryGroup::None));
        let canonical_next = service
            .run_task_query(RunTaskQueryInput {
                cursor: canonical_first.next_cursor.clone(),
                ..canonical
            })
            .await
            .unwrap();
        let effective_next = service
            .run_task_query(RunTaskQueryInput {
                cursor: canonical_first.next_cursor,
                ..effective
            })
            .await
            .unwrap();
        assert_eq!(canonical_next, effective_next);
    }
}

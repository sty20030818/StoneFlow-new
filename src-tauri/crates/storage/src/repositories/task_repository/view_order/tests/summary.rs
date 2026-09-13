use super::*;
use crate::repositories::ProjectRepository;
use sea_orm::TransactionTrait;
use std::sync::{Arc, Mutex};
use stoneflow_application::view::CountTaskQueryInput;

fn order(group_by: TaskGroupBy, sub_group_by: TaskGroupBy) -> TaskQueryOrder {
    TaskQueryOrder {
        group_by,
        sub_group_by,
        order_by: TaskOrderBy::Manual,
        order_direction: TaskOrderDirection::Asc,
        completed_order: TaskCompletedOrder::Natural,
    }
}

async fn insert_empty_project(
    connection: &impl ConnectionTrait,
    id: &str,
    space: &str,
    name: &str,
) {
    connection.execute_unprepared(&format!("INSERT INTO projects (id, space_id, name, status, priority, status_changed_at, position, generation, created_at, updated_at) VALUES ('{id}', '{space}', '{name}', 'todo', 0, '2026-09-10T00:00:00Z', 0, 1, '2026-09-10T00:00:00Z', '2026-09-10T00:00:00Z')")).await.unwrap();
}

fn project_ids(
    summary: &[stoneflow_application::task::TaskGroupSummary],
) -> HashSet<Option<String>> {
    summary
        .iter()
        .map(|node| match &node.group {
            TaskQueryGroup::Project { project_id, .. } => project_id.clone(),
            _ => panic!("应为项目组"),
        })
        .collect()
}

#[tokio::test]
async fn project_zero_candidates_follow_scope_context_and_lifecycle_without_empty_child_products() {
    let (database, rows, projects) = nested_fixture().await;
    let connection = database.connection();
    let empty = "33333333-3333-4333-8333-000000000001";
    let completed = "33333333-3333-4333-8333-000000000002";
    let archived = "33333333-3333-4333-8333-000000000003";
    let deleted = "33333333-3333-4333-8333-000000000004";
    let other = "33333333-3333-4333-8333-000000000005";
    let other_space = "44444444-4444-4444-8444-000000000001";
    connection.execute_unprepared(&format!("INSERT INTO spaces (id, name, icon_key, color_key, is_default, position, generation, created_at, updated_at) VALUES ('{other_space}', '外部空间', 'home', 'blue', 0, 2048, 1, '2026-09-10T00:00:00Z', '2026-09-10T00:00:00Z')")).await.unwrap();
    for id in [empty, completed, archived, deleted] {
        insert_empty_project(connection, id, SPACE, "空项目").await;
    }
    insert_empty_project(connection, other, other_space, "外部项目").await;
    connection
        .execute_unprepared(&format!(
            "UPDATE projects SET status = 'done' WHERE id = '{completed}'"
        ))
        .await
        .unwrap();
    connection
        .execute_unprepared(&format!(
            "UPDATE projects SET archived_at = '2026-09-10T00:00:00Z' WHERE id = '{archived}'"
        ))
        .await
        .unwrap();
    connection
        .execute_unprepared(&format!(
            "UPDATE projects SET deleted_at = '2026-09-10T00:00:00Z' WHERE id = '{deleted}'"
        ))
        .await
        .unwrap();
    for (index, column) in [(0, "archived_at"), (1, "deleted_at")] {
        connection
            .execute_unprepared(&format!(
                "UPDATE tasks SET {column} = '2026-09-10T00:00:00Z' WHERE id = '{}'",
                rows[index].id
            ))
            .await
            .unwrap();
    }
    let service = build_view_service(connection.clone());
    let all = service
        .run_task_query(input(order(TaskGroupBy::Project, TaskGroupBy::Status)))
        .await
        .unwrap();
    assert_eq!(all.total_count, Some(335));
    let summary = all.group_summary.unwrap();
    let candidates = project_ids(&summary);
    for id in [empty, completed, other] {
        assert!(candidates.contains(&Some(id.to_owned())));
    }
    for id in [archived, deleted] {
        assert!(!candidates.contains(&Some(id.to_owned())));
    }
    assert!(candidates.contains(&None));
    assert_eq!(candidates.len(), projects.len() + 4);
    for node in summary.iter().filter(|node| node.total_count == 0) {
        assert_eq!(node.sub_groups.len(), 5);
        assert!(node.sub_groups.iter().all(|sub| sub.total_count == 0));
    }
    let mut query = input(order(TaskGroupBy::Project, TaskGroupBy::None));
    query.scope = TaskScopeInput {
        kind: TaskScopeKind::Space,
        space_id: Some(SPACE.to_owned()),
    };
    let scoped = service.run_task_query(query.clone()).await.unwrap();
    assert!(!project_ids(scoped.group_summary.as_ref().unwrap()).contains(&Some(other.to_owned())));
    query.context = TaskViewContext::Project {
        project_id: empty.to_owned(),
    };
    let page = service.run_task_query(query.clone()).await.unwrap();
    assert_eq!(page.total_count, Some(0));
    assert!(page.items.is_empty());
    assert_eq!(
        project_ids(page.group_summary.as_ref().unwrap()),
        HashSet::from([Some(empty.to_owned())])
    );
    query.context = TaskViewContext::Standalone;
    let page = service.run_task_query(query.clone()).await.unwrap();
    assert_eq!(
        project_ids(page.group_summary.as_ref().unwrap()),
        HashSet::from([None])
    );
    assert_eq!(
        page.total_count,
        Some(
            rows[2..]
                .iter()
                .filter(|row| row.project_id.is_none())
                .count() as u64
        )
    );
    query.context = TaskViewContext::All;
    query.order = order(TaskGroupBy::Status, TaskGroupBy::Project);
    let page = service.run_task_query(query.clone()).await.unwrap();
    assert!(page
        .group_summary
        .as_ref()
        .unwrap()
        .iter()
        .flat_map(|node| &node.sub_groups)
        .all(|sub| sub.total_count > 0));

    // Task 筛选不能裁掉候选目录；没有成员的有限维度也必须显式为零。
    query.filters = serde_json::from_value(serde_json::json!({"clauses":[{"id":"empty", "field":"project", "op":"is", "values":[empty]}]})).unwrap();
    for (dimension, expected_len) in [
        (TaskGroupBy::None, 1),
        (TaskGroupBy::Status, 5),
        (TaskGroupBy::Priority, 5),
        (TaskGroupBy::Due, 6),
        (TaskGroupBy::Scheduled, 6),
        (TaskGroupBy::Project, projects.len() + 3),
    ] {
        query.order = order(dimension, TaskGroupBy::None);
        let page = service.run_task_query(query.clone()).await.unwrap();
        assert_eq!(page.total_count, Some(0));
        assert_eq!(page.group_summary.as_ref().unwrap().len(), expected_len);
        assert!(page
            .group_summary
            .unwrap()
            .iter()
            .all(|group| group.total_count == 0 && group.sub_groups.is_empty()));
        assert!(page.items.is_empty() && page.next_cursor.is_none());
    }
}

#[tokio::test]
async fn group_page_and_project_reads_keep_one_short_snapshot_during_a_second_connection_write() {
    let database = TestDatabase::bootstrap().await.unwrap();
    let connection = database.connection();
    connection
        .execute_unprepared("PRAGMA journal_mode = WAL")
        .await
        .unwrap();
    connection.execute_unprepared(&format!("INSERT INTO spaces (id, name, icon_key, color_key, is_default, position, generation, created_at, updated_at) VALUES ('{SPACE}', '事务空间', 'home', 'blue', 0, 2048, 1, '2026-09-10T00:00:00Z', '2026-09-10T00:00:00Z')")).await.unwrap();
    let project = "33333333-3333-4333-8333-000000000001";
    let empty = "33333333-3333-4333-8333-000000000002";
    insert_empty_project(connection, project, SPACE, "旧名称").await;
    let tasks = TaskRepository::new(connection.clone());
    let projects = ProjectRepository::new(connection.clone());
    let mut row = CreateTaskRecord {
        id: "55555555-5555-4555-8555-000000000001".to_owned(),
        space_id: SPACE.to_owned(),
        project_id: Some(project.to_owned()),
        title: "已有任务".to_owned(),
        note: None,
        status: WorkStatus::Todo,
        status_changed_at: "2026-09-10T00:00:00Z".to_owned(),
        priority: 0,
        due_at: None,
        planned_at: None,
        remind_at: None,
        position: 1024,
        completed_at: None,
        created_at: "2026-09-10T00:00:00Z".to_owned(),
        updated_at: "2026-09-10T00:00:00Z".to_owned(),
    };
    tasks.create(connection, row.clone()).await.unwrap();
    let query = ViewTaskQuery {
        scope: TaskScopeInput {
            kind: TaskScopeKind::Space,
            space_id: Some(SPACE.to_owned()),
        },
        context: TaskViewContext::All,
        base_view_key: TaskViewBaseKey::All,
        filters: FilterQueryValue::default(),
        order: order(TaskGroupBy::Project, TaskGroupBy::None),
        limit: 151,
        cursor: None,
        dates: ViewDateBoundaries {
            today_start: "2026-09-10T00:00:00Z".to_owned(),
            tomorrow_start: "2026-09-11T00:00:00Z".to_owned(),
            day_after_tomorrow_start: "2026-09-12T00:00:00Z".to_owned(),
            next_week_start: "2026-09-14T00:00:00Z".to_owned(),
        },
    };
    let transaction = connection.begin().await.unwrap();
    let counts = tasks
        .group_counts_for_view(&transaction, &query)
        .await
        .unwrap();
    assert_eq!(counts.iter().map(|group| group.total_count).sum::<u64>(), 1);
    let writer = crate::database::connect_sqlite(database.database_path())
        .await
        .unwrap();
    writer
        .execute_unprepared(&format!(
            "UPDATE projects SET name = '新名称' WHERE id = '{project}'"
        ))
        .await
        .unwrap();
    insert_empty_project(&writer, empty, SPACE, "新增空项目").await;
    row.id = "55555555-5555-4555-8555-000000000002".to_owned();
    tasks.create(&writer, row).await.unwrap();
    let items = tasks.list_for_view(&transaction, &query).await.unwrap();
    assert_eq!(items.len(), 1);
    let candidates = projects
        .view_group_candidates(&transaction, &query.scope, &query.context)
        .await
        .unwrap();
    assert_eq!(candidates, vec![(project.to_owned(), "旧名称".to_owned())]);
    let lookup = projects
        .list_by_ids_in_connection(&transaction, &[project.to_owned()])
        .await
        .unwrap();
    assert_eq!(lookup[0].name, "旧名称");
    assert_eq!(
        counts[0].group,
        TaskQueryGroup::Project {
            project_id: Some(project.to_owned()),
            project_name: Some("旧名称".to_owned())
        }
    );
    transaction.commit().await.unwrap();
    let page = build_view_service(connection.clone())
        .run_task_query(RunTaskQueryInput {
            scope: query.scope,
            ..input(query.order)
        })
        .await
        .unwrap();
    assert_eq!(page.total_count, Some(2));
    assert_eq!(page.items.len(), 2);
    assert!(page.items.iter().all(|item| item.group
        == TaskQueryGroup::Project {
            project_id: Some(project.to_owned()),
            project_name: Some("新名称".to_owned())
        }));
    assert!(page.group_summary.unwrap().iter().any(|group| group.total_count == 0 && matches!(&group.group, TaskQueryGroup::Project { project_id: Some(id), .. } if id == empty)));
    writer.close().await.unwrap();
    drop(tasks);
    drop(projects);
    database.close().await;
}

#[tokio::test]
async fn exact_summary_matches_independent_groups_for_every_dimension_pair_and_precision_boundary()
{
    let (database, rows, projects) = nested_fixture().await;
    let service = build_view_service(database.connection().clone());
    let dimensions = [
        TaskGroupBy::None,
        TaskGroupBy::Status,
        TaskGroupBy::Priority,
        TaskGroupBy::Project,
        TaskGroupBy::Due,
        TaskGroupBy::Scheduled,
    ];
    for main in dimensions {
        for sub in dimensions {
            let order = order(main, sub).normalized();
            let page = service
                .run_task_query(RunTaskQueryInput {
                    date_basis: "2026-09-10".to_owned(),
                    ..input(order)
                })
                .await
                .unwrap();
            let summary = page.group_summary.unwrap();
            assert_eq!(page.total_count, Some(rows.len() as u64));
            assert_eq!(
                summary.iter().map(|group| group.total_count).sum::<u64>(),
                rows.len() as u64
            );
            assert!(summary
                .windows(2)
                .all(|pair| compare_group(&pair[0].group, &pair[1].group).is_lt()));
            let mut expected = HashMap::<(TaskQueryGroup, TaskQueryGroup), u64>::new();
            for row in &rows {
                *expected
                    .entry((
                        expected_group(row, order.group_by, &projects),
                        expected_group(row, order.sub_group_by, &projects),
                    ))
                    .or_default() += 1;
            }
            let mut actual = HashMap::new();
            for group in &summary {
                if order.sub_group_by == TaskGroupBy::None {
                    assert!(group.sub_groups.is_empty());
                    if group.total_count > 0 {
                        actual.insert(
                            (group.group.clone(), TaskQueryGroup::None),
                            group.total_count,
                        );
                    }
                } else {
                    assert_eq!(
                        group
                            .sub_groups
                            .iter()
                            .map(|sub| sub.total_count)
                            .sum::<u64>(),
                        group.total_count
                    );
                    assert!(group.sub_groups.windows(2).all(|pair| compare_group(
                        &pair[0].group,
                        &pair[1].group
                    )
                    .is_lt()));
                    for sub in &group.sub_groups {
                        if order.sub_group_by == TaskGroupBy::Project {
                            assert!(sub.total_count > 0);
                        }
                        if sub.total_count > 0 {
                            actual
                                .insert((group.group.clone(), sub.group.clone()), sub.total_count);
                        }
                    }
                }
            }
            assert_eq!(actual, expected, "{order:?}");
            for item in page.items {
                assert!(actual.contains_key(&(item.group, item.sub_group)));
            }
        }
    }
}

#[tokio::test]
async fn continuation_does_not_repeat_aggregates_and_count_only_does_not_load_a_window() {
    let (database, _, _) = nested_fixture().await;
    let statements = Arc::new(Mutex::new(Vec::<String>::new()));
    let capture = statements.clone();
    let mut connection = database.connection().clone();
    connection
        .set_metric_callback(move |info| capture.lock().unwrap().push(info.statement.sql.clone()));
    let service = build_view_service(connection);
    let mut query = input(order(TaskGroupBy::Status, TaskGroupBy::Priority));
    for index in 0..3 {
        statements.lock().unwrap().clear();
        let page = service.run_task_query(query.clone()).await.unwrap();
        let sql = statements.lock().unwrap().clone();
        assert_eq!(
            sql.iter().filter(|sql| sql.contains("COUNT(")).count(),
            usize::from(index == 0),
            "{sql:?}"
        );
        assert_eq!(
            sql.iter().filter(|sql| sql.contains("GROUP BY")).count(),
            usize::from(index == 0)
        );
        for aggregate in sql.iter().filter(|sql| sql.contains("GROUP BY")) {
            assert!(!aggregate.contains("\"title\"") && !aggregate.contains("\"note\""));
        }
        assert_eq!(page.group_summary.is_some(), index == 0);
        assert_eq!(page.total_count, (index == 0).then_some(337));
        query.cursor = page.next_cursor;
        assert_eq!(query.cursor.is_some(), index < 2);
    }
    statements.lock().unwrap().clear();
    let count = service
        .count_task_query(CountTaskQueryInput {
            scope: query.scope,
            context: query.context,
            base_view_key: query.base_view_key,
            filters: query.filters,
        })
        .await
        .unwrap();
    assert_eq!(count.total_count, 337);
    let sql = statements.lock().unwrap();
    assert_eq!(sql.len(), 1, "{sql:?}");
    assert!(
        sql[0].contains("COUNT(") && !sql[0].contains("GROUP BY") && !sql[0].contains("\"title\"")
    );
}

#[tokio::test]
async fn first_page_has_exact_group_summary_before_unloaded_groups_arrive() {
    let (database, rows, _) = nested_fixture().await;
    let service = build_view_service(database.connection().clone());
    let page = service
        .run_task_query(input(TaskQueryOrder {
            group_by: TaskGroupBy::Status,
            sub_group_by: TaskGroupBy::Priority,
            order_by: TaskOrderBy::Manual,
            order_direction: TaskOrderDirection::Asc,
            completed_order: TaskCompletedOrder::Natural,
        }))
        .await
        .unwrap();
    let encoded = serde_json::to_value(&page).unwrap();
    let summary = encoded["groupSummary"]
        .as_array()
        .expect("首屏必须提供精确主子组摘要");
    assert_eq!(summary.len(), 5);
    assert_eq!(
        summary
            .iter()
            .map(|node| node["totalCount"].as_u64().unwrap())
            .sum::<u64>(),
        rows.len() as u64
    );
    assert!(summary
        .iter()
        .any(|node| node["group"]["status"] == "canceled"
            && node["totalCount"].as_u64().unwrap() > 0));
    assert!(page
        .items
        .iter()
        .all(|item| item.status != WorkStatus::Canceled));
}

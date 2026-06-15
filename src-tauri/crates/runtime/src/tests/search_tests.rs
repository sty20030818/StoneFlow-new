//! 全局搜索服务回归测试。

use sea_orm::TransactionTrait;
use stoneflow_schema::common::TaskStatus;
use stoneflow_testing::TempDatabaseDir;

use crate::services::{SearchEntitiesInput, SearchService};
use stoneflow_storage::{
    database::bootstrap_database,
    repositories::{
        CreateProjectRecord, CreateTaskRecord, ProjectRepository, SpaceRepository,
        TaskRepository,
    },
};


#[tokio::test]
async fn search_entities_should_rank_title_prefix_before_note_matches() {
    let temp_dir = TempDatabaseDir::new("stoneflow-search-rank-title-prefix").expect("temp dir");
    let database = bootstrap_database(temp_dir.path())
        .await
        .expect("database bootstrap should succeed");
    let service = build_search_service(&database);
    let space = default_space(&database).await;
    let project = insert_project(&database, &space.id, "搜索项目").await;

    insert_task(
        &database,
        CreateTaskRecord {
            id: "task-note".to_owned(),
            space_id: space.id.clone(),
            project_id: Some(project.id.clone()),
            title: "别的标题".to_owned(),
            note: Some("这里提到了 stone".to_owned()),
            status: TaskStatus::Todo,
            status_changed_at: "2026-05-09T10:00:00Z".to_owned(),
            priority: 1,
            inbox_at: None,
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
            sort_order: 1000,
            completed_at: None,
            canceled_at: None,
            created_at: "2026-05-09T10:00:00Z".to_owned(),
            updated_at: "2026-05-09T10:00:00Z".to_owned(),
        },
    )
    .await;
    insert_task(
        &database,
        CreateTaskRecord {
            id: "task-prefix".to_owned(),
            space_id: space.id.clone(),
            project_id: Some(project.id.clone()),
            title: "Stone 搜索".to_owned(),
            note: None,
            status: TaskStatus::Todo,
            status_changed_at: "2026-05-09T11:00:00Z".to_owned(),
            priority: 2,
            inbox_at: None,
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
            sort_order: 2000,
            completed_at: None,
            canceled_at: None,
            created_at: "2026-05-09T11:00:00Z".to_owned(),
            updated_at: "2026-05-09T11:00:00Z".to_owned(),
        },
    )
    .await;

    let result = service
        .search_entities(SearchEntitiesInput {
            query: "stone".to_owned(),
            limit_per_section: Some(5),
        })
        .await
        .expect("search should succeed");

    assert_eq!(result.tasks.len(), 2);
    assert_eq!(result.tasks[0].id, "task-prefix");
    assert_eq!(result.tasks[1].id, "task-note");
}

#[tokio::test]
async fn search_entities_should_split_active_and_closed_and_exclude_archived_or_deleted() {
    let temp_dir = TempDatabaseDir::new("stoneflow-search-lifecycle").expect("temp dir");
    let database = bootstrap_database(temp_dir.path())
        .await
        .expect("database bootstrap should succeed");
    let service = build_search_service(&database);
    let space = default_space(&database).await;

    insert_project_record(
        &database,
        CreateProjectRecord {
            id: "project-active".to_owned(),
            space_id: space.id.clone(),
            name: "Stone Active".to_owned(),
            description: Some("活动项目".to_owned()),
            due_at: None,
            sort_order: 1000,
            created_at: "2026-05-09T10:00:00Z".to_owned(),
            updated_at: "2026-05-09T10:00:00Z".to_owned(),
        },
    )
    .await;
    let completed_project = insert_project_record(
        &database,
        CreateProjectRecord {
            id: "project-completed".to_owned(),
            space_id: space.id.clone(),
            name: "Stone Completed".to_owned(),
            description: Some("已完成项目".to_owned()),
            due_at: None,
            sort_order: 2000,
            created_at: "2026-05-09T11:00:00Z".to_owned(),
            updated_at: "2026-05-09T11:00:00Z".to_owned(),
        },
    )
    .await;
    let archived_project = insert_project_record(
        &database,
        CreateProjectRecord {
            id: "project-archived".to_owned(),
            space_id: space.id.clone(),
            name: "Stone Archived".to_owned(),
            description: Some("归档项目".to_owned()),
            due_at: None,
            sort_order: 3000,
            created_at: "2026-05-09T12:00:00Z".to_owned(),
            updated_at: "2026-05-09T12:00:00Z".to_owned(),
        },
    )
    .await;
    let deleted_project = insert_project_record(
        &database,
        CreateProjectRecord {
            id: "project-deleted".to_owned(),
            space_id: space.id.clone(),
            name: "Stone Deleted".to_owned(),
            description: Some("删除项目".to_owned()),
            due_at: None,
            sort_order: 4000,
            created_at: "2026-05-09T13:00:00Z".to_owned(),
            updated_at: "2026-05-09T13:00:00Z".to_owned(),
        },
    )
    .await;

    set_project_completed_at(
        &database,
        &completed_project.id,
        Some("2026-05-09T11:30:00Z"),
    )
    .await;
    set_project_archived_at(
        &database,
        &archived_project.id,
        Some("2026-05-09T12:30:00Z"),
    )
    .await;
    set_project_deleted_at(&database, &deleted_project.id, Some("2026-05-09T13:30:00Z")).await;

    insert_task(
        &database,
        CreateTaskRecord {
            id: "task-active".to_owned(),
            space_id: space.id.clone(),
            project_id: None,
            title: "Stone Active Task".to_owned(),
            note: None,
            status: TaskStatus::Todo,
            status_changed_at: "2026-05-09T10:00:00Z".to_owned(),
            priority: 1,
            inbox_at: Some("2026-05-09T10:00:00Z".to_owned()),
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
            sort_order: 1000,
            completed_at: None,
            canceled_at: None,
            created_at: "2026-05-09T10:00:00Z".to_owned(),
            updated_at: "2026-05-09T10:00:00Z".to_owned(),
        },
    )
    .await;
    insert_task(
        &database,
        CreateTaskRecord {
            id: "task-canceled".to_owned(),
            space_id: space.id.clone(),
            project_id: None,
            title: "Stone Canceled Task".to_owned(),
            note: None,
            status: TaskStatus::Canceled,
            status_changed_at: "2026-05-09T11:30:00Z".to_owned(),
            priority: 1,
            inbox_at: None,
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
            sort_order: 2500,
            completed_at: None,
            canceled_at: Some("2026-05-09T11:30:00Z".to_owned()),
            created_at: "2026-05-09T11:30:00Z".to_owned(),
            updated_at: "2026-05-09T11:30:00Z".to_owned(),
        },
    )
    .await;
    insert_task(
        &database,
        CreateTaskRecord {
            id: "task-completed".to_owned(),
            space_id: space.id.clone(),
            project_id: None,
            title: "Stone Completed Task".to_owned(),
            note: None,
            status: TaskStatus::Done,
            status_changed_at: "2026-05-09T11:00:00Z".to_owned(),
            priority: 1,
            inbox_at: None,
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
            sort_order: 2000,
            completed_at: Some("2026-05-09T11:00:00Z".to_owned()),
            canceled_at: None,
            created_at: "2026-05-09T11:00:00Z".to_owned(),
            updated_at: "2026-05-09T11:00:00Z".to_owned(),
        },
    )
    .await;
    let archived_task = insert_task(
        &database,
        CreateTaskRecord {
            id: "task-archived".to_owned(),
            space_id: space.id.clone(),
            project_id: None,
            title: "Stone Archived Task".to_owned(),
            note: None,
            status: TaskStatus::Todo,
            status_changed_at: "2026-05-09T12:00:00Z".to_owned(),
            priority: 1,
            inbox_at: None,
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
            sort_order: 3000,
            completed_at: None,
            canceled_at: None,
            created_at: "2026-05-09T12:00:00Z".to_owned(),
            updated_at: "2026-05-09T12:00:00Z".to_owned(),
        },
    )
    .await;
    let deleted_task = insert_task(
        &database,
        CreateTaskRecord {
            id: "task-deleted".to_owned(),
            space_id: space.id.clone(),
            project_id: None,
            title: "Stone Deleted Task".to_owned(),
            note: None,
            status: TaskStatus::Todo,
            status_changed_at: "2026-05-09T13:00:00Z".to_owned(),
            priority: 1,
            inbox_at: None,
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
            sort_order: 4000,
            completed_at: None,
            canceled_at: None,
            created_at: "2026-05-09T13:00:00Z".to_owned(),
            updated_at: "2026-05-09T13:00:00Z".to_owned(),
        },
    )
    .await;

    set_task_archived_at(&database, &archived_task.id, Some("2026-05-09T12:30:00Z")).await;
    set_task_deleted_at(&database, &deleted_task.id, Some("2026-05-09T13:30:00Z")).await;

    let result = service
        .search_entities(SearchEntitiesInput {
            query: "stone".to_owned(),
            limit_per_section: Some(5),
        })
        .await
        .expect("search should succeed");

    assert_eq!(
        result
            .tasks
            .iter()
            .map(|item| item.id.as_str())
            .collect::<Vec<_>>(),
        vec!["task-active"]
    );
    assert_eq!(
        result
            .completed_tasks
            .iter()
            .map(|item| item.id.as_str())
            .collect::<Vec<_>>(),
        vec!["task-completed", "task-canceled"]
    );
    assert_eq!(
        result
            .projects
            .iter()
            .map(|item| item.id.as_str())
            .collect::<Vec<_>>(),
        vec!["project-active"]
    );
    assert_eq!(
        result
            .completed_projects
            .iter()
            .map(|item| item.id.as_str())
            .collect::<Vec<_>>(),
        vec!["project-completed"]
    );
}

#[tokio::test]
async fn search_entities_should_respect_limit_per_section_and_status_sort() {
    let temp_dir = TempDatabaseDir::new("stoneflow-search-limit").expect("temp dir");
    let database = bootstrap_database(temp_dir.path())
        .await
        .expect("database bootstrap should succeed");
    let service = build_search_service(&database);
    let space = default_space(&database).await;

    insert_task(
        &database,
        CreateTaskRecord {
            id: "task-todo".to_owned(),
            space_id: space.id.clone(),
            project_id: None,
            title: "Stone Todo".to_owned(),
            note: None,
            status: TaskStatus::Todo,
            status_changed_at: "2026-05-09T12:00:00Z".to_owned(),
            priority: 1,
            inbox_at: Some("2026-05-09T12:00:00Z".to_owned()),
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
            sort_order: 1000,
            completed_at: None,
            canceled_at: None,
            created_at: "2026-05-09T12:00:00Z".to_owned(),
            updated_at: "2026-05-09T12:00:00Z".to_owned(),
        },
    )
    .await;
    insert_task(
        &database,
        CreateTaskRecord {
            id: "task-doing".to_owned(),
            space_id: space.id.clone(),
            project_id: None,
            title: "Stone Doing".to_owned(),
            note: None,
            status: TaskStatus::Doing,
            status_changed_at: "2026-05-09T10:00:00Z".to_owned(),
            priority: 1,
            inbox_at: Some("2026-05-09T10:00:00Z".to_owned()),
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
            sort_order: 1500,
            completed_at: None,
            canceled_at: None,
            created_at: "2026-05-09T10:00:00Z".to_owned(),
            updated_at: "2026-05-09T10:00:00Z".to_owned(),
        },
    )
    .await;
    insert_task(
        &database,
        CreateTaskRecord {
            id: "task-waiting".to_owned(),
            space_id: space.id.clone(),
            project_id: None,
            title: "Stone Waiting".to_owned(),
            note: None,
            status: TaskStatus::Waiting,
            status_changed_at: "2026-05-09T13:00:00Z".to_owned(),
            priority: 1,
            inbox_at: Some("2026-05-09T13:00:00Z".to_owned()),
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
            sort_order: 2000,
            completed_at: None,
            canceled_at: None,
            created_at: "2026-05-09T13:00:00Z".to_owned(),
            updated_at: "2026-05-09T13:00:00Z".to_owned(),
        },
    )
    .await;

    let result = service
        .search_entities(SearchEntitiesInput {
            query: "stone".to_owned(),
            limit_per_section: Some(3),
        })
        .await
        .expect("search should succeed");

    assert_eq!(result.tasks.len(), 3);
    assert_eq!(
        result.tasks.iter().map(|item| item.id.as_str()).collect::<Vec<_>>(),
        vec!["task-doing", "task-todo", "task-waiting"]
    );
}

fn build_search_service(
    database: &stoneflow_storage::database::DatabaseRuntimeState,
) -> SearchService {
    let connection = database.connection().clone();
    SearchService::new(
        SpaceRepository::new(connection.clone()),
        ProjectRepository::new(connection.clone()),
        TaskRepository::new(connection),
    )
}

async fn default_space(
    database: &stoneflow_storage::database::DatabaseRuntimeState,
) -> stoneflow_schema::space::Model {
    SpaceRepository::new(database.connection().clone())
        .list_visible()
        .await
        .expect("list visible spaces should succeed")
        .into_iter()
        .next()
        .expect("default space should exist")
}

async fn insert_project(
    database: &stoneflow_storage::database::DatabaseRuntimeState,
    space_id: &str,
    name: &str,
) -> stoneflow_schema::project::Model {
    let repository = ProjectRepository::new(database.connection().clone());
    let transaction = repository
        .connection()
        .begin()
        .await
        .expect("transaction should begin");
    let sort_order = repository
        .next_sort_order(&transaction, space_id)
        .await
        .expect("next sort order should succeed");

    let created = repository
        .create(
            &transaction,
            CreateProjectRecord {
                id: name.to_lowercase().replace(' ', "-"),
                space_id: space_id.to_owned(),
                name: name.to_owned(),
                description: None,
                due_at: None,
                sort_order,
                created_at: "2026-05-09T10:00:00Z".to_owned(),
                updated_at: "2026-05-09T10:00:00Z".to_owned(),
            },
        )
        .await
        .expect("create project should succeed");
    transaction
        .commit()
        .await
        .expect("transaction commit should succeed");
    created
}

async fn insert_project_record(
    database: &stoneflow_storage::database::DatabaseRuntimeState,
    record: CreateProjectRecord,
) -> stoneflow_schema::project::Model {
    let repository = ProjectRepository::new(database.connection().clone());
    let transaction = repository
        .connection()
        .begin()
        .await
        .expect("transaction should begin");
    let created = repository
        .create(&transaction, record)
        .await
        .expect("create project should succeed");
    transaction
        .commit()
        .await
        .expect("transaction commit should succeed");
    created
}

async fn insert_task(
    database: &stoneflow_storage::database::DatabaseRuntimeState,
    record: CreateTaskRecord,
) -> stoneflow_schema::task::Model {
    let repository = TaskRepository::new(database.connection().clone());
    let transaction = repository
        .connection()
        .begin()
        .await
        .expect("transaction should begin");
    let created = repository
        .create(&transaction, record)
        .await
        .expect("create task should succeed");
    transaction
        .commit()
        .await
        .expect("transaction commit should succeed");
    created
}

async fn set_project_completed_at(
    database: &stoneflow_storage::database::DatabaseRuntimeState,
    project_id: &str,
    completed_at: Option<&str>,
) {
    let repository = ProjectRepository::new(database.connection().clone());
    let transaction = repository
        .connection()
        .begin()
        .await
        .expect("transaction should begin");
    repository
        .complete_raw(
            &transaction,
            project_id,
            completed_at.expect("completedAt should exist"),
            completed_at.expect("completedAt should exist"),
        )
        .await
        .expect("complete project should succeed");
    transaction
        .commit()
        .await
        .expect("transaction commit should succeed");
}

async fn set_project_archived_at(
    database: &stoneflow_storage::database::DatabaseRuntimeState,
    project_id: &str,
    archived_at: Option<&str>,
) {
    let repository = ProjectRepository::new(database.connection().clone());
    let transaction = repository
        .connection()
        .begin()
        .await
        .expect("transaction should begin");
    repository
        .archive_raw(
            &transaction,
            project_id,
            archived_at.expect("archivedAt should exist"),
            "user-1",
            archived_at.expect("archivedAt should exist"),
        )
        .await
        .expect("archive project should succeed");
    transaction
        .commit()
        .await
        .expect("transaction commit should succeed");
}

async fn set_project_deleted_at(
    database: &stoneflow_storage::database::DatabaseRuntimeState,
    project_id: &str,
    deleted_at: Option<&str>,
) {
    let repository = ProjectRepository::new(database.connection().clone());
    let transaction = repository
        .connection()
        .begin()
        .await
        .expect("transaction should begin");
    repository
        .delete_raw(
            &transaction,
            project_id,
            deleted_at.expect("deletedAt should exist"),
            "user-1",
            deleted_at.expect("deletedAt should exist"),
        )
        .await
        .expect("delete project should succeed");
    transaction
        .commit()
        .await
        .expect("transaction commit should succeed");
}

async fn set_task_archived_at(
    database: &stoneflow_storage::database::DatabaseRuntimeState,
    task_id: &str,
    archived_at: Option<&str>,
) {
    let repository = TaskRepository::new(database.connection().clone());
    let transaction = repository
        .connection()
        .begin()
        .await
        .expect("transaction should begin");
    repository
        .archive_raw(
            &transaction,
            task_id,
            archived_at.expect("archivedAt should exist"),
            "user-1",
            archived_at.expect("archivedAt should exist"),
        )
        .await
        .expect("archive task should succeed");
    transaction
        .commit()
        .await
        .expect("transaction commit should succeed");
}

async fn set_task_deleted_at(
    database: &stoneflow_storage::database::DatabaseRuntimeState,
    task_id: &str,
    deleted_at: Option<&str>,
) {
    let repository = TaskRepository::new(database.connection().clone());
    let transaction = repository
        .connection()
        .begin()
        .await
        .expect("transaction should begin");
    repository
        .delete_raw(
            &transaction,
            task_id,
            deleted_at.expect("deletedAt should exist"),
            "user-1",
            deleted_at.expect("deletedAt should exist"),
        )
        .await
        .expect("delete task should succeed");
    transaction
        .commit()
        .await
        .expect("transaction commit should succeed");
}

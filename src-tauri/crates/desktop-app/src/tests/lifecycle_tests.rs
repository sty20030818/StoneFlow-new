//! 阶段 10 生命周期服务回归测试。

use sea_orm::{ActiveValue::Set, ConnectionTrait, DatabaseBackend, Statement, TransactionTrait};
use stoneflow_schema::{common::TaskStatus, project, space, task};
use stoneflow_test_support::TempDatabaseDir;

use crate::{
    application::{
        activity::ActivityService,
        services::{
            LifecycleEntityType, LifecycleScopeInput, LifecycleScopeKind, LifecycleService,
            ListLifecycleEntriesInput,
        },
    },
    domain::create_id,
    infrastructure::{
        database::bootstrap_database,
        repositories::{ActivityRepository, ProjectRepository, SpaceRepository, TaskRepository},
    },
};

#[tokio::test]
async fn delete_space_should_record_cascade_activity_for_each_child() {
    let temp_dir =
        TempDatabaseDir::new("stoneflow-stage10-delete-space-cascade-activity").expect("temp dir");
    let database = bootstrap_database(temp_dir.path())
        .await
        .expect("database bootstrap should succeed");
    let service = build_lifecycle_service(&database);
    let archived_space = insert_space(&database, "工作", false).await;
    let project = insert_project(&database, &archived_space.id, "项目 A").await;
    let task = insert_task(&database, &archived_space.id, Some(&project.id), "任务 A").await;

    service
        .delete_space(&archived_space.id)
        .await
        .expect("delete space should succeed");

    let space_deleted = scalar_i64_with_args(
        database.connection(),
        "SELECT COUNT(*) AS value FROM activity_events WHERE entity_id = ? AND action = ?",
        vec![archived_space.id.clone(), "space.deleted".to_owned()],
    )
    .await
    .expect("space deleted activity query should succeed");
    let project_deleted = scalar_i64_with_args(
        database.connection(),
        "SELECT COUNT(*) AS value FROM activity_events WHERE entity_id = ? AND action = ?",
        vec![project.id.clone(), "project.deleted".to_owned()],
    )
    .await
    .expect("project deleted activity query should succeed");
    let task_deleted = scalar_i64_with_args(
        database.connection(),
        "SELECT COUNT(*) AS value FROM activity_events WHERE entity_id = ? AND action = ?",
        vec![task.id.clone(), "task.deleted".to_owned()],
    )
    .await
    .expect("task deleted activity query should succeed");

    assert_eq!(space_deleted, 1);
    assert_eq!(project_deleted, 1);
    assert_eq!(task_deleted, 1);
}

#[tokio::test]
async fn restore_task_should_fallback_to_default_space_and_inbox_when_original_context_is_gone() {
    let temp_dir =
        TempDatabaseDir::new("stoneflow-stage10-restore-task-fallback").expect("temp dir");
    let database = bootstrap_database(temp_dir.path())
        .await
        .expect("database bootstrap should succeed");
    let service = build_lifecycle_service(&database);
    let default_space = default_space(&database).await;
    let another_space = insert_space(&database, "学习", false).await;
    let project = insert_project(&database, &another_space.id, "项目 B").await;
    let task = insert_task(&database, &another_space.id, Some(&project.id), "任务 B").await;

    service
        .delete_space(&another_space.id)
        .await
        .expect("delete space should succeed");

    let restored = service
        .restore_task(&task.id)
        .await
        .expect("restore task should succeed");

    assert_eq!(restored.space_id, default_space.id);
    assert_eq!(restored.project_id, None);
    assert!(restored.inbox_at.is_some());
    assert!(restored.deleted_at.is_none());
    assert!(restored.archived_at.is_none());
}

#[tokio::test]
async fn permanently_delete_task_should_require_deleted_state_and_remove_row() {
    let temp_dir =
        TempDatabaseDir::new("stoneflow-stage10-permanently-delete-task").expect("temp dir");
    let database = bootstrap_database(temp_dir.path())
        .await
        .expect("database bootstrap should succeed");
    let service = build_lifecycle_service(&database);
    let space = default_space(&database).await;
    let task = insert_task(&database, &space.id, None, "任务 C").await;

    let error = service
        .permanently_delete_task(&task.id)
        .await
        .expect_err("permanently deleting active task should fail");
    assert_eq!(
        error.to_string(),
        "数据冲突: Task 只有处于删除态时才能永久删除"
    );

    service
        .delete_task(&task.id)
        .await
        .expect("delete task should succeed");
    service
        .permanently_delete_task(&task.id)
        .await
        .expect("permanently delete task should succeed");

    let deleted = TaskRepository::new(database.connection().clone())
        .get(&task.id)
        .await
        .expect("query task should succeed");
    assert!(deleted.is_none());
}

#[tokio::test]
async fn list_archive_entries_should_obey_scope_and_sort_desc() {
    let temp_dir =
        TempDatabaseDir::new("stoneflow-stage10-list-archive-entries").expect("temp dir");
    let database = bootstrap_database(temp_dir.path())
        .await
        .expect("database bootstrap should succeed");
    let service = build_lifecycle_service(&database);
    let default_space = default_space(&database).await;
    let other_space = insert_space(&database, "副空间", false).await;
    let project = insert_project(&database, &default_space.id, "项目 C").await;
    let task = insert_task(&database, &default_space.id, Some(&project.id), "任务 D").await;

    let connection = database.connection();
    SpaceRepository::new(connection.clone())
        .archive_raw(
            connection,
            &other_space.id,
            "2026-05-01T10:00:00Z",
            "2026-05-01T10:00:00Z",
        )
        .await
        .expect("archive space raw should succeed");
    ProjectRepository::new(connection.clone())
        .archive_raw(
            connection,
            &project.id,
            "2026-05-01T09:00:00Z",
            &project.id,
            "2026-05-01T09:00:00Z",
        )
        .await
        .expect("archive project raw should succeed");
    TaskRepository::new(connection.clone())
        .archive_raw(
            connection,
            &task.id,
            "2026-05-01T09:30:00Z",
            &task.id,
            "2026-05-01T09:30:00Z",
        )
        .await
        .expect("archive task raw should succeed");

    let all_entries = service
        .list_archive_entries(ListLifecycleEntriesInput {
            scope: LifecycleScopeInput {
                kind: LifecycleScopeKind::All,
                space_id: None,
            },
            entity_filter: None,
        })
        .await
        .expect("list all archive entries should succeed");
    let scoped_entries = service
        .list_archive_entries(ListLifecycleEntriesInput {
            scope: LifecycleScopeInput {
                kind: LifecycleScopeKind::Space,
                space_id: Some(default_space.id.clone()),
            },
            entity_filter: None,
        })
        .await
        .expect("list scoped archive entries should succeed");

    assert_eq!(
        all_entries
            .iter()
            .map(|entry| entry.id.as_str())
            .collect::<Vec<_>>(),
        vec![
            other_space.id.as_str(),
            task.id.as_str(),
            project.id.as_str()
        ]
    );
    assert_eq!(scoped_entries.len(), 2);
    assert_eq!(scoped_entries[0].entity_type, LifecycleEntityType::Task);
    assert_eq!(scoped_entries[0].id, task.id);
    assert_eq!(scoped_entries[1].entity_type, LifecycleEntityType::Project);
    assert_eq!(scoped_entries[1].id, project.id);
}

fn build_lifecycle_service(
    database: &crate::infrastructure::database::DatabaseRuntimeState,
) -> LifecycleService {
    let connection = database.connection().clone();
    LifecycleService::new(
        SpaceRepository::new(connection.clone()),
        ProjectRepository::new(connection.clone()),
        TaskRepository::new(connection.clone()),
        ActivityService::new(ActivityRepository::new(connection)),
    )
}

async fn default_space(
    database: &crate::infrastructure::database::DatabaseRuntimeState,
) -> space::Model {
    SpaceRepository::new(database.connection().clone())
        .list_visible()
        .await
        .expect("list visible spaces should succeed")
        .into_iter()
        .next()
        .expect("default space should exist")
}

async fn insert_space(
    database: &crate::infrastructure::database::DatabaseRuntimeState,
    name: &str,
    is_default: bool,
) -> space::Model {
    let repository = SpaceRepository::new(database.connection().clone());
    let transaction = repository
        .connection()
        .begin()
        .await
        .expect("transaction should begin");
    let sort_order = repository
        .next_sort_order(&transaction)
        .await
        .expect("next sort order should succeed");
    let now = "2026-05-01T00:00:00Z".to_owned();
    let created = repository
        .create(
            &transaction,
            crate::infrastructure::repositories::CreateSpaceRecord {
                id: create_id().to_string(),
                name: name.to_owned(),
                icon_key: "folder".to_owned(),
                color_key: "blue".to_owned(),
                is_default,
                sort_order,
                created_at: now.clone(),
                updated_at: now,
            },
        )
        .await
        .expect("create space should succeed");
    transaction
        .commit()
        .await
        .expect("transaction commit should succeed");
    created
}

async fn insert_project(
    database: &crate::infrastructure::database::DatabaseRuntimeState,
    space_id: &str,
    name: &str,
) -> project::Model {
    let repository = ProjectRepository::new(database.connection().clone());
    repository
        .insert_for_test(
            repository.connection(),
            project::ActiveModel {
                id: Set(create_id().to_string()),
                space_id: Set(space_id.to_owned()),
                name: Set(name.to_owned()),
                description: Set(None),
                due_at: Set(None),
                sort_order: Set(1000),
                completed_at: Set(None),
                archived_at: Set(None),
                archived_by_type: Set(None),
                archived_by_id: Set(None),
                deleted_at: Set(None),
                deleted_by_type: Set(None),
                deleted_by_id: Set(None),
                created_at: Set("2026-05-01T00:00:00Z".to_owned()),
                updated_at: Set("2026-05-01T00:00:00Z".to_owned()),
            },
        )
        .await
        .expect("insert project should succeed")
}

async fn insert_task(
    database: &crate::infrastructure::database::DatabaseRuntimeState,
    space_id: &str,
    project_id: Option<&str>,
    title: &str,
) -> task::Model {
    let repository = TaskRepository::new(database.connection().clone());
    repository
        .insert_for_test(
            repository.connection(),
            task::ActiveModel {
                id: Set(create_id().to_string()),
                space_id: Set(space_id.to_owned()),
                project_id: Set(project_id.map(str::to_owned)),
                title: Set(title.to_owned()),
                note: Set(None),
                status: Set(TaskStatus::Todo),
                status_changed_at: Set("2026-05-01T00:00:00Z".to_owned()),
                priority: Set(0),
                inbox_at: Set(None),
                due_at: Set(None),
                scheduled_at: Set(None),
                reminder_at: Set(None),
                sort_order: Set(1000),
                completed_at: Set(None),
                canceled_at: Set(None),
                archived_at: Set(None),
                archived_by_type: Set(None),
                archived_by_id: Set(None),
                deleted_at: Set(None),
                deleted_by_type: Set(None),
                deleted_by_id: Set(None),
                created_at: Set("2026-05-01T00:00:00Z".to_owned()),
                updated_at: Set("2026-05-01T00:00:00Z".to_owned()),
            },
        )
        .await
        .expect("insert task should succeed")
}

async fn scalar_i64_with_args<C>(
    connection: &C,
    sql: &str,
    args: Vec<String>,
) -> Result<i64, sea_orm::DbErr>
where
    C: ConnectionTrait,
{
    let statement = Statement::from_sql_and_values(
        DatabaseBackend::Sqlite,
        sql.to_owned(),
        args.into_iter().map(Into::into),
    );
    let row = connection
        .query_one(statement)
        .await?
        .expect("row should exist");
    row.try_get("", "value")
}

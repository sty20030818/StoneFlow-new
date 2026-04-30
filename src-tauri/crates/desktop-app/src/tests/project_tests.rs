//! 阶段 5 Project 服务回归测试。

use sea_orm::{ActiveValue::Set, ConnectionTrait, DatabaseBackend, Statement};
use stoneflow_entity::{common::TaskStatus, task};
use stoneflow_test_support::TempDatabaseDir;

use crate::{
    application::{
        activity::ActivityService,
        services::{
            CreateProjectInput, ListProjectOverviewInput, ListSidebarProjectsInput, ProjectIdInput,
            ProjectScopeInput, ProjectScopeKind, ProjectService,
        },
    },
    infrastructure::{
        database::bootstrap_database,
        repositories::{ActivityRepository, ProjectRepository, SpaceRepository, TaskRepository},
    },
};

#[tokio::test]
async fn create_project_should_fail_when_name_conflicts_in_same_space() {
    let temp_dir =
        TempDatabaseDir::new("stoneflow-stage5-service-create-project-conflict").expect("temp dir");
    let database = bootstrap_database(temp_dir.path())
        .await
        .expect("database bootstrap should succeed");
    let service = build_project_service(&database);
    let space = SpaceRepository::new(database.connection().clone())
        .list_visible()
        .await
        .expect("list visible spaces should succeed")
        .into_iter()
        .next()
        .expect("default space should exist");

    service
        .create_project(CreateProjectInput {
            space_id: space.id.clone(),
            name: "阶段 5".to_owned(),
            description: None,
            due_at: None,
        })
        .await
        .expect("first create should succeed");

    let error = service
        .create_project(CreateProjectInput {
            space_id: space.id,
            name: "阶段 5".to_owned(),
            description: None,
            due_at: None,
        })
        .await
        .expect_err("duplicate name should fail");

    assert_eq!(
        error.to_string(),
        "数据冲突: 当前 Space 下已存在同名 Project"
    );
}

#[tokio::test]
async fn archive_and_restore_project_should_not_restore_tasks() {
    let temp_dir =
        TempDatabaseDir::new("stoneflow-stage5-service-archive-restore-project").expect("temp dir");
    let database = bootstrap_database(temp_dir.path())
        .await
        .expect("database bootstrap should succeed");
    let service = build_project_service(&database);
    let space = SpaceRepository::new(database.connection().clone())
        .list_visible()
        .await
        .expect("list visible spaces should succeed")
        .into_iter()
        .next()
        .expect("default space should exist");

    let created = service
        .create_project(CreateProjectInput {
            space_id: space.id.clone(),
            name: "项目归档".to_owned(),
            description: None,
            due_at: None,
        })
        .await
        .expect("create project should succeed");
    insert_task_for_project(&database, &space.id, &created.id).await;

    service
        .archive_project(ProjectIdInput {
            project_id: created.id.clone(),
        })
        .await
        .expect("archive project should succeed");
    service
        .restore_project(ProjectIdInput {
            project_id: created.id.clone(),
        })
        .await
        .expect("restore project should succeed");

    let archived_task_count = scalar_i64_with_arg(
        database.connection(),
        "SELECT COUNT(*) AS value FROM tasks WHERE project_id = ? AND archived_at IS NOT NULL",
        created.id,
    )
    .await
    .expect("archived task count query should succeed");

    assert_eq!(archived_task_count, 1);
}

#[tokio::test]
async fn delete_project_should_cascade_delete_tasks() {
    let temp_dir =
        TempDatabaseDir::new("stoneflow-stage5-service-delete-project").expect("temp dir");
    let database = bootstrap_database(temp_dir.path())
        .await
        .expect("database bootstrap should succeed");
    let service = build_project_service(&database);
    let space = SpaceRepository::new(database.connection().clone())
        .list_visible()
        .await
        .expect("list visible spaces should succeed")
        .into_iter()
        .next()
        .expect("default space should exist");

    let created = service
        .create_project(CreateProjectInput {
            space_id: space.id.clone(),
            name: "项目删除".to_owned(),
            description: None,
            due_at: None,
        })
        .await
        .expect("create project should succeed");
    insert_task_for_project(&database, &space.id, &created.id).await;

    service
        .delete_project(ProjectIdInput {
            project_id: created.id.clone(),
        })
        .await
        .expect("delete project should succeed");

    let deleted_task_count = scalar_i64_with_arg(
        database.connection(),
        "SELECT COUNT(*) AS value FROM tasks WHERE project_id = ? AND deleted_at IS NOT NULL AND deleted_by_type = 'project'",
        created.id,
    )
    .await
    .expect("deleted task count query should succeed");

    assert_eq!(deleted_task_count, 1);
}

#[tokio::test]
async fn list_project_overview_should_filter_tabs_correctly() {
    let temp_dir =
        TempDatabaseDir::new("stoneflow-stage5-service-project-overview-tabs").expect("temp dir");
    let database = bootstrap_database(temp_dir.path())
        .await
        .expect("database bootstrap should succeed");
    let service = build_project_service(&database);
    let space = SpaceRepository::new(database.connection().clone())
        .list_visible()
        .await
        .expect("list visible spaces should succeed")
        .into_iter()
        .next()
        .expect("default space should exist");

    let active = service
        .create_project(CreateProjectInput {
            space_id: space.id.clone(),
            name: "Active".to_owned(),
            description: None,
            due_at: None,
        })
        .await
        .expect("create active project should succeed");
    let completed = service
        .create_project(CreateProjectInput {
            space_id: space.id.clone(),
            name: "Completed".to_owned(),
            description: None,
            due_at: None,
        })
        .await
        .expect("create completed project should succeed");
    let archived = service
        .create_project(CreateProjectInput {
            space_id: space.id.clone(),
            name: "Archived".to_owned(),
            description: None,
            due_at: None,
        })
        .await
        .expect("create archived project should succeed");

    service
        .complete_project(ProjectIdInput {
            project_id: completed.id,
        })
        .await
        .expect("complete project should succeed");
    service
        .archive_project(ProjectIdInput {
            project_id: archived.id,
        })
        .await
        .expect("archive project should succeed");

    let active_rows = service
        .list_project_overview(ListProjectOverviewInput {
            scope: ProjectScopeInput {
                kind: ProjectScopeKind::Space,
                space_id: Some(space.id.clone()),
            },
            view_key: "active".to_owned(),
        })
        .await
        .expect("active overview should succeed");
    let completed_rows = service
        .list_project_overview(ListProjectOverviewInput {
            scope: ProjectScopeInput {
                kind: ProjectScopeKind::Space,
                space_id: Some(space.id.clone()),
            },
            view_key: "completed".to_owned(),
        })
        .await
        .expect("completed overview should succeed");
    let archived_rows = service
        .list_project_overview(ListProjectOverviewInput {
            scope: ProjectScopeInput {
                kind: ProjectScopeKind::Space,
                space_id: Some(space.id),
            },
            view_key: "archived".to_owned(),
        })
        .await
        .expect("archived overview should succeed");

    assert_eq!(active_rows.len(), 1);
    assert_eq!(active_rows[0].id, active.id);
    assert_eq!(completed_rows.len(), 1);
    assert_eq!(completed_rows[0].name, "Completed");
    assert_eq!(archived_rows.len(), 1);
    assert_eq!(archived_rows[0].name, "Archived");
}

#[tokio::test]
async fn list_sidebar_projects_should_respect_show_completed_and_max_visible() {
    let temp_dir =
        TempDatabaseDir::new("stoneflow-stage5-service-sidebar-projects").expect("temp dir");
    let database = bootstrap_database(temp_dir.path())
        .await
        .expect("database bootstrap should succeed");
    let service = build_project_service(&database);
    let space = SpaceRepository::new(database.connection().clone())
        .list_visible()
        .await
        .expect("list visible spaces should succeed")
        .into_iter()
        .next()
        .expect("default space should exist");

    let first = service
        .create_project(CreateProjectInput {
            space_id: space.id.clone(),
            name: "P1".to_owned(),
            description: None,
            due_at: None,
        })
        .await
        .expect("create first project should succeed");
    let second = service
        .create_project(CreateProjectInput {
            space_id: space.id.clone(),
            name: "P2".to_owned(),
            description: None,
            due_at: None,
        })
        .await
        .expect("create second project should succeed");
    service
        .complete_project(ProjectIdInput {
            project_id: second.id,
        })
        .await
        .expect("complete project should succeed");

    let hidden_completed = service
        .list_sidebar_projects(ListSidebarProjectsInput {
            scope: ProjectScopeInput {
                kind: ProjectScopeKind::Space,
                space_id: Some(space.id.clone()),
            },
            show_completed: false,
            max_visible: Some(10),
        })
        .await
        .expect("sidebar projects should succeed");
    let limited = service
        .list_sidebar_projects(ListSidebarProjectsInput {
            scope: ProjectScopeInput {
                kind: ProjectScopeKind::Space,
                space_id: Some(space.id),
            },
            show_completed: true,
            max_visible: Some(1),
        })
        .await
        .expect("sidebar limited projects should succeed");

    assert_eq!(hidden_completed.len(), 1);
    assert_eq!(hidden_completed[0].id, first.id);
    assert_eq!(limited.len(), 1);
}

fn build_project_service(
    database: &crate::infrastructure::database::DatabaseRuntimeState,
) -> ProjectService {
    let connection = database.connection().clone();
    ProjectService::new(
        SpaceRepository::new(connection.clone()),
        ProjectRepository::new(connection.clone()),
        TaskRepository::new(connection.clone()),
        ActivityService::new(ActivityRepository::new(connection)),
    )
}

async fn insert_task_for_project(
    database: &crate::infrastructure::database::DatabaseRuntimeState,
    space_id: &str,
    project_id: &str,
) {
    let timestamp = "2026-04-30T12:00:00+00:00".to_owned();
    TaskRepository::new(database.connection().clone())
        .insert_for_test(
            database.connection(),
            task::ActiveModel {
                id: Set(uuid::Uuid::new_v4().to_string()),
                space_id: Set(space_id.to_owned()),
                project_id: Set(Some(project_id.to_owned())),
                title: Set("Task A".to_owned()),
                note: Set(None),
                status: Set(TaskStatus::Todo),
                status_changed_at: Set(timestamp.clone()),
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
                created_at: Set(timestamp.clone()),
                updated_at: Set(timestamp),
            },
        )
        .await
        .expect("task insert should succeed");
}

async fn scalar_i64_with_arg(
    connection: &sea_orm::DatabaseConnection,
    sql: &str,
    arg: String,
) -> Result<i64, sea_orm::DbErr> {
    let row = connection
        .query_one(Statement::from_sql_and_values(
            DatabaseBackend::Sqlite,
            sql.to_owned(),
            [arg.into()],
        ))
        .await?
        .expect("scalar query should always return one row");

    row.try_get("", "value")
}

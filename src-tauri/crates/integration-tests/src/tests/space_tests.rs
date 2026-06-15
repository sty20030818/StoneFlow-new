//! 阶段 4 Space 服务回归测试。

use sea_orm::{ActiveValue::Set, ConnectionTrait, DatabaseBackend, Statement};
use stoneflow_schema::{common::TaskStatus, project, task};
use stoneflow_test_support::TempDatabaseDir;

use crate::services::{
    activity::ActivityService,
    CreateSpaceInput, SetDefaultSpaceInput, SpaceIdInput, SpaceService
};
use stoneflow_storage::{
    database::bootstrap_database,
    repositories::{ActivityRepository, ProjectRepository, SpaceRepository, TaskRepository},
};

#[tokio::test]
async fn set_default_space_should_keep_only_one_active_default_space() {
    let temp_dir =
        TempDatabaseDir::new("stoneflow-stage4-service-set-default").expect("temporary dir");
    let database = bootstrap_database(temp_dir.path())
        .await
        .expect("database bootstrap should succeed");
    let service = build_space_service(&database);

    let created = service
        .create_space(CreateSpaceInput {
            name: "学习".to_owned(),
            icon_key: "graduation_cap".to_owned(),
            color_key: "amber".to_owned(),
        })
        .await
        .expect("create space should succeed");

    service
        .set_default_space(SetDefaultSpaceInput {
            space_id: created.id.clone(),
        })
        .await
        .expect("set default space should succeed");

    let default_count = scalar_i64(
        database.connection(),
        "SELECT COUNT(*) AS value FROM spaces WHERE is_default = 1 AND archived_at IS NULL AND deleted_at IS NULL",
    )
    .await
    .expect("default count query should succeed");

    assert_eq!(default_count, 1);
}

#[tokio::test]
async fn archive_space_should_cascade_archive_projects_and_tasks() {
    let temp_dir =
        TempDatabaseDir::new("stoneflow-stage4-service-archive-space").expect("temporary dir");
    let database = bootstrap_database(temp_dir.path())
        .await
        .expect("database bootstrap should succeed");
    let service = build_space_service(&database);

    let created = service
        .create_space(CreateSpaceInput {
            name: "工作".to_owned(),
            icon_key: "briefcase".to_owned(),
            color_key: "blue".to_owned(),
        })
        .await
        .expect("create space should succeed");

    insert_project_and_task(&database, &created.id).await;

    service
        .archive_space(SpaceIdInput {
            space_id: created.id.clone(),
        })
        .await
        .expect("archive space should succeed");

    let archived_project_count = scalar_i64_with_arg(
        database.connection(),
        "SELECT COUNT(*) AS value FROM projects WHERE space_id = ? AND archived_at IS NOT NULL AND archived_by_type = 'space'",
        Some(created.id.clone()),
    )
    .await
    .expect("archived project count query should succeed");
    let archived_task_count = scalar_i64_with_arg(
        database.connection(),
        "SELECT COUNT(*) AS value FROM tasks WHERE space_id = ? AND archived_at IS NOT NULL AND archived_by_type = 'space'",
        Some(created.id.clone()),
    )
    .await
    .expect("archived task count query should succeed");

    assert_eq!(archived_project_count, 1);
    assert_eq!(archived_task_count, 1);
}

#[tokio::test]
async fn delete_space_should_fail_when_target_is_only_active_default_space() {
    let temp_dir =
        TempDatabaseDir::new("stoneflow-stage4-service-delete-default").expect("temporary dir");
    let database = bootstrap_database(temp_dir.path())
        .await
        .expect("database bootstrap should succeed");
    let service = build_space_service(&database);
    let default_space = service
        .list_visible_spaces()
        .await
        .expect("list visible spaces should succeed")
        .into_iter()
        .find(|space| space.is_default)
        .expect("seeded default space should exist");

    let error = service
        .delete_space(SpaceIdInput {
            space_id: default_space.id,
        })
        .await
        .expect_err("deleting only default space should fail");

    assert_eq!(
        error.to_string(),
        "数据冲突: 当前唯一活跃默认 Space 不能直接删除，请先切换默认 Space"
    );
}

fn build_space_service(
    database: &stoneflow_storage::database::DatabaseRuntimeState,
) -> SpaceService {
    let connection = database.connection().clone();
    SpaceService::new(
        SpaceRepository::new(connection.clone()),
        ProjectRepository::new(connection.clone()),
        TaskRepository::new(connection.clone()),
        ActivityService::new(ActivityRepository::new(connection)),
    )
}

async fn insert_project_and_task(
    database: &stoneflow_storage::database::DatabaseRuntimeState,
    space_id: &str,
) {
    let connection = database.connection();
    let timestamp = "2026-04-30T00:00:00+00:00".to_owned();
    let project_repository = ProjectRepository::new(connection.clone());
    let task_repository = TaskRepository::new(connection.clone());

    let project_id = uuid::Uuid::new_v4().to_string();
    project_repository
        .insert_for_test(
            connection,
            project::ActiveModel {
                id: Set(project_id.clone()),
                space_id: Set(space_id.to_owned()),
                name: Set("Project A".to_owned()),
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
                created_at: Set(timestamp.clone()),
                updated_at: Set(timestamp.clone()),
            },
        )
        .await
        .expect("project insert should succeed");

    task_repository
        .insert_for_test(
            connection,
            task::ActiveModel {
                id: Set(uuid::Uuid::new_v4().to_string()),
                space_id: Set(space_id.to_owned()),
                project_id: Set(Some(project_id)),
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

async fn scalar_i64(
    connection: &sea_orm::DatabaseConnection,
    sql: &str,
) -> Result<i64, sea_orm::DbErr> {
    scalar_i64_with_arg(connection, sql, None).await
}

async fn scalar_i64_with_arg(
    connection: &sea_orm::DatabaseConnection,
    sql: &str,
    arg: Option<String>,
) -> Result<i64, sea_orm::DbErr> {
    let row = if let Some(arg) = arg {
        connection
            .query_one(Statement::from_sql_and_values(
                DatabaseBackend::Sqlite,
                sql.to_owned(),
                [arg.into()],
            ))
            .await?
    } else {
        connection
            .query_one(Statement::from_string(
                DatabaseBackend::Sqlite,
                sql.to_owned(),
            ))
            .await?
    }
    .expect("scalar query should always return one row");

    row.try_get("", "value")
}

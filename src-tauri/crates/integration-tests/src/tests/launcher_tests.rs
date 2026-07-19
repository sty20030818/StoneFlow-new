//! Launcher 服务回归测试。

use sea_orm::TransactionTrait;
use stoneflow_schema::common::TaskStatus;
use stoneflow_test_support::TestDatabase;
use stoneflow_usecase::launcher::{
    LauncherListProjectsBySpaceInput, LauncherPlacementKind, LauncherProjectOptionKind,
    LauncherScopeKind,
};
use uuid::Uuid;

use crate::{
    app::state::{ActiveScopeKind, ActiveScopeSnapshot},
    services::{
        LauncherOpenContextService, LauncherResolvedPlacement, LauncherService,
        LauncherSessionBridge,
    },
};
use stoneflow_domain::create_id;
use stoneflow_storage::repositories::{
    ActivityRepository, CreateProjectRecord, CreateSpaceRecord, CreateTaskRecord,
    ProjectRepository, SpaceRepository, TaskRepository,
};

#[tokio::test]
async fn launcher_initial_state_should_use_space_scope_and_trim_recent_lists() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
    let service = build_launcher_session_bridge(&database);
    let default_space = default_space(&database).await;

    for index in 0..6 {
        let project_id = format!("project-{index}");
        insert_project_record(
            &database,
            CreateProjectRecord {
                id: project_id.clone(),
                space_id: default_space.id.clone(),
                name: format!("项目 {index}"),
                description: None,
                due_at: None,
                sort_order: 1000 + index,
                created_at: format!("2026-05-09T0{}:00:00Z", index + 1),
                updated_at: format!("2026-05-09T0{}:00:00Z", index + 1),
            },
        )
        .await;

        insert_task(
            &database,
            CreateTaskRecord {
                id: format!("task-{index}"),
                space_id: default_space.id.clone(),
                project_id: Some(project_id),
                title: format!("任务 {index}"),
                note: None,
                status: TaskStatus::Todo,
                status_changed_at: format!("2026-05-09T0{}:00:00Z", index + 1),
                priority: 1,
                inbox_at: None,
                due_at: None,
                scheduled_at: None,
                reminder_at: None,
                sort_order: 1000 + index,
                completed_at: None,
                canceled_at: None,
                created_at: format!("2026-05-09T0{}:00:00Z", index + 1),
                updated_at: format!("2026-05-09T0{}:00:00Z", index + 1),
            },
        )
        .await;
    }

    let state = service
        .prepare_initial_state(Some(ActiveScopeSnapshot {
            id: Uuid::new_v4(),
            kind: ActiveScopeKind::Space,
            space_id: Some(Uuid::parse_str(&default_space.id).expect("space id should be uuid")),
        }))
        .await
        .expect("get initial state should succeed");

    assert_eq!(state.current_scope.kind, LauncherScopeKind::Space);
    assert_eq!(
        state.current_scope.space_id.as_deref(),
        Some(default_space.id.as_str())
    );
    assert_eq!(state.default_space_id, default_space.id);
    assert_eq!(state.default_placement.kind, LauncherPlacementKind::Inbox);
    assert_eq!(state.recent_tasks.len(), 5);
    assert_eq!(state.recent_projects.len(), 5);
    assert_eq!(
        state
            .recent_tasks
            .iter()
            .map(|item| item.id.as_str())
            .collect::<Vec<_>>(),
        vec!["task-5", "task-4", "task-3", "task-2", "task-1"]
    );
}

#[tokio::test]
async fn launcher_initial_state_should_keep_all_scope_and_default_space() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
    let service = build_launcher_session_bridge(&database);
    let default_space = default_space(&database).await;

    insert_space(
        &database,
        CreateSpaceRecord {
            id: Uuid::now_v7().to_string(),
            name: "第二空间".to_owned(),
            icon_key: "circle".to_owned(),
            color_key: "blue".to_owned(),
            is_default: false,
            sort_order: 2000,
            created_at: "2026-05-09T12:00:00Z".to_owned(),
            updated_at: "2026-05-09T12:00:00Z".to_owned(),
        },
    )
    .await;

    let state = service
        .prepare_initial_state(Some(ActiveScopeSnapshot {
            id: Uuid::new_v4(),
            kind: ActiveScopeKind::All,
            space_id: None,
        }))
        .await
        .expect("get initial state should succeed");

    assert_eq!(state.current_scope.kind, LauncherScopeKind::All);
    assert_eq!(state.current_scope.space_id, None);
    assert_eq!(state.default_space_id, default_space.id);
    assert_eq!(state.spaces.len(), 2);
    assert_eq!(state.spaces[0].icon_key, default_space.icon_key);
    assert_eq!(state.spaces[0].color_key, default_space.color_key);
}

#[tokio::test]
async fn launcher_list_projects_by_space_should_include_virtual_placements() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
    let service = build_launcher_service(&database);
    let default_space = default_space(&database).await;

    insert_project_record(
        &database,
        CreateProjectRecord {
            id: "project-a".to_owned(),
            space_id: default_space.id.clone(),
            name: "项目 A".to_owned(),
            description: None,
            due_at: None,
            sort_order: 1000,
            created_at: "2026-05-09T10:00:00Z".to_owned(),
            updated_at: "2026-05-09T10:00:00Z".to_owned(),
        },
    )
    .await;
    insert_project_record(
        &database,
        CreateProjectRecord {
            id: "project-b".to_owned(),
            space_id: default_space.id.clone(),
            name: "项目 B".to_owned(),
            description: None,
            due_at: None,
            sort_order: 2000,
            created_at: "2026-05-09T11:00:00Z".to_owned(),
            updated_at: "2026-05-09T11:00:00Z".to_owned(),
        },
    )
    .await;

    let result = service
        .list_projects_by_space(LauncherListProjectsBySpaceInput {
            space_id: default_space.id.clone(),
        })
        .await
        .expect("list projects by space should succeed");

    assert_eq!(result.inbox_project.kind, LauncherProjectOptionKind::Inbox);
    assert_eq!(
        result.no_project_option.kind,
        LauncherProjectOptionKind::NoProject
    );
    assert_eq!(result.projects.len(), 2);
}

#[tokio::test]
async fn launcher_resolve_open_target_should_preserve_placement_and_dates() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
    let service = build_launcher_service(&database);
    let default_space = default_space(&database).await;
    let project = insert_project_record(
        &database,
        CreateProjectRecord {
            id: create_id().to_string(),
            space_id: default_space.id.clone(),
            name: "目标项目".to_owned(),
            description: None,
            due_at: None,
            sort_order: 1000,
            created_at: "2026-05-09T10:00:00Z".to_owned(),
            updated_at: "2026-05-09T10:00:00Z".to_owned(),
        },
    )
    .await;

    let created = insert_task(
        &database,
        CreateTaskRecord {
            id: create_id().to_string(),
            space_id: default_space.id.clone(),
            project_id: Some(project.id.clone()),
            title: "Launcher 任务".to_owned(),
            note: Some("带日期字段".to_owned()),
            status: TaskStatus::Todo,
            status_changed_at: "2026-05-09T10:00:00Z".to_owned(),
            priority: 3,
            inbox_at: None,
            due_at: Some("2026-05-12".to_owned()),
            scheduled_at: Some("2026-05-13".to_owned()),
            reminder_at: Some("2026-05-11".to_owned()),
            sort_order: 1000,
            completed_at: None,
            canceled_at: None,
            created_at: "2026-05-09T10:00:00Z".to_owned(),
            updated_at: "2026-05-09T10:00:00Z".to_owned(),
        },
    )
    .await;

    let detail = service
        .get_task_detail(&created.id)
        .await
        .expect("task detail should exist");
    let open_target = service
        .resolve_task_open_target(&created.id)
        .await
        .expect("resolve open target should succeed");

    assert_eq!(detail.project_id.as_deref(), Some(project.id.as_str()));
    assert_eq!(detail.due_at.as_deref(), Some("2026-05-12"));
    assert_eq!(detail.scheduled_at.as_deref(), Some("2026-05-13"));
    assert_eq!(detail.reminder_at.as_deref(), Some("2026-05-11"));
    assert_eq!(open_target.placement, LauncherResolvedPlacement::Project);
    assert_eq!(open_target.project_id.as_deref(), Some(project.id.as_str()));
}

fn build_launcher_service(
    database: &stoneflow_storage::database::DatabaseRuntimeState,
) -> LauncherService {
    let connection = database.connection().clone();
    LauncherService::new(
        SpaceRepository::new(connection.clone()),
        ProjectRepository::new(connection.clone()),
        TaskRepository::new(connection.clone()),
        ActivityRepository::new(connection),
    )
}

fn build_launcher_session_bridge(
    database: &stoneflow_storage::database::DatabaseRuntimeState,
) -> LauncherSessionBridge {
    let connection = database.connection().clone();
    let space_repository = SpaceRepository::new(connection.clone());
    let project_repository = ProjectRepository::new(connection.clone());
    let task_repository = TaskRepository::new(connection.clone());
    let launcher_service = LauncherService::new(
        space_repository.clone(),
        project_repository.clone(),
        task_repository.clone(),
        ActivityRepository::new(connection),
    );

    LauncherSessionBridge::new(LauncherOpenContextService::new(
        launcher_service,
        space_repository,
        project_repository,
        task_repository,
    ))
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

async fn insert_space(
    database: &stoneflow_storage::database::DatabaseRuntimeState,
    record: CreateSpaceRecord,
) -> stoneflow_schema::space::Model {
    let repository = SpaceRepository::new(database.connection().clone());
    let transaction = repository
        .connection()
        .begin()
        .await
        .expect("transaction should begin");
    let created = repository
        .create(&transaction, record)
        .await
        .expect("create space should succeed");
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

//! 阶段 6 Task 服务回归测试。

use chrono::Duration;
use sea_orm::{ConnectionTrait, DatabaseBackend, Statement, TransactionTrait};
use stoneflow_domain::TaskStatus;
use stoneflow_test_support::TestDatabase;

use crate::services::{
    activity::ActivityService, CreateTaskInput, CreateTaskPlacementInput, CreateTaskPlacementKind,
    ListTasksInput, ListTasksPlacementInput, ListTasksPlacementKind, TaskIdInput, TaskScopeInput,
    TaskScopeKind, TaskService, UpdateTaskInput, UpdateTaskPlacementInput, UpdateTaskPlacementKind,
};
use stoneflow_domain::{create_id, today_local_date};
use stoneflow_storage::repositories::{
    ActivityRepository, ProjectRepository, SpaceRepository, SyncRepository, TaskRepository,
};

#[tokio::test]
async fn create_task_should_fail_when_title_is_blank() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
    let service = build_task_service(&database);
    let space = default_space(&database).await;

    let error = service
        .create_task(CreateTaskInput {
            space_id: Some(space.id),
            placement: CreateTaskPlacementInput {
                kind: CreateTaskPlacementKind::Inbox,
                project_id: None,
            },
            title: "   ".to_owned(),
            note: None,
            status: None,
            priority: None,
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
        })
        .await
        .expect_err("blank title should fail");

    assert_eq!(error.to_string(), "验证失败: Task title 不能为空");
}

#[tokio::test]
async fn create_task_should_follow_selected_project_space() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
    let service = build_task_service(&database);
    let default_space = default_space(&database).await;
    let another_space = insert_space(&database, "学习", false).await;
    let project = insert_project(&database, &another_space.id, "阶段 6").await;

    let created = service
        .create_task(CreateTaskInput {
            space_id: Some(default_space.id),
            placement: CreateTaskPlacementInput {
                kind: CreateTaskPlacementKind::Project,
                project_id: Some(project.id.clone()),
            },
            title: "接 Task 真链路".to_owned(),
            note: None,
            status: None,
            priority: Some(3),
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
        })
        .await
        .expect("create task should succeed");

    assert_eq!(created.project_id, Some(project.id));
    assert_eq!(created.space_id, another_space.id);
    assert_eq!(created.space_name, another_space.name);
}

#[tokio::test]
async fn create_task_should_persist_inbox_and_no_project_placement() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
    let service = build_task_service(&database);
    let space = default_space(&database).await;

    let inbox_task = service
        .create_task(CreateTaskInput {
            space_id: Some(space.id.clone()),
            placement: CreateTaskPlacementInput {
                kind: CreateTaskPlacementKind::Inbox,
                project_id: None,
            },
            title: "Inbox".to_owned(),
            note: None,
            status: None,
            priority: None,
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
        })
        .await
        .expect("create inbox task should succeed");
    let no_project_task = service
        .create_task(CreateTaskInput {
            space_id: Some(space.id),
            placement: CreateTaskPlacementInput {
                kind: CreateTaskPlacementKind::NoProject,
                project_id: None,
            },
            title: "No Project".to_owned(),
            note: None,
            status: None,
            priority: None,
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
        })
        .await
        .expect("create no project task should succeed");

    assert!(inbox_task.inbox_at.is_some());
    assert!(inbox_task.project_id.is_none());
    assert!(no_project_task.inbox_at.is_none());
    assert!(no_project_task.project_id.is_none());
}

#[tokio::test]
async fn update_task_should_move_task_between_inbox_project_and_no_project() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
    let service = build_task_service(&database);
    let space = default_space(&database).await;
    let project = insert_project(&database, &space.id, "Inbox 整理").await;

    let inbox_task = service
        .create_task(CreateTaskInput {
            space_id: Some(space.id.clone()),
            placement: CreateTaskPlacementInput {
                kind: CreateTaskPlacementKind::Inbox,
                project_id: None,
            },
            title: "整理链路".to_owned(),
            note: None,
            status: None,
            priority: None,
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
        })
        .await
        .expect("create inbox task should succeed");

    let moved_to_project = service
        .update_task(UpdateTaskInput {
            task_id: inbox_task.id.clone(),
            title: None,
            note: None,
            status: None,
            priority: None,
            placement: Some(UpdateTaskPlacementInput {
                kind: UpdateTaskPlacementKind::Project,
                space_id: space.id.clone(),
                project_id: Some(project.id.clone()),
            }),
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
        })
        .await
        .expect("move to project should succeed");
    assert_eq!(moved_to_project.project_id, Some(project.id.clone()));
    assert!(moved_to_project.inbox_at.is_none());

    let moved_back_to_inbox = service
        .update_task(UpdateTaskInput {
            task_id: moved_to_project.id.clone(),
            title: None,
            note: None,
            status: None,
            priority: None,
            placement: Some(UpdateTaskPlacementInput {
                kind: UpdateTaskPlacementKind::Inbox,
                space_id: space.id.clone(),
                project_id: None,
            }),
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
        })
        .await
        .expect("move back to inbox should succeed");
    assert!(moved_back_to_inbox.project_id.is_none());
    assert!(moved_back_to_inbox.inbox_at.is_some());

    let no_project = service
        .update_task(UpdateTaskInput {
            task_id: moved_back_to_inbox.id.clone(),
            title: None,
            note: None,
            status: None,
            priority: None,
            placement: Some(UpdateTaskPlacementInput {
                kind: UpdateTaskPlacementKind::NoProject,
                space_id: space.id.clone(),
                project_id: None,
            }),
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
        })
        .await
        .expect("move to no project should succeed");
    assert!(no_project.project_id.is_none());
    assert!(no_project.inbox_at.is_none());
}

#[tokio::test]
async fn update_task_should_manage_status_timestamps() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
    let service = build_task_service(&database);
    let space = default_space(&database).await;

    let created = service
        .create_task(CreateTaskInput {
            space_id: Some(space.id),
            placement: CreateTaskPlacementInput {
                kind: CreateTaskPlacementKind::Inbox,
                project_id: None,
            },
            title: "状态流转".to_owned(),
            note: None,
            status: Some(TaskStatus::Todo),
            priority: Some(2),
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
        })
        .await
        .expect("create task should succeed");
    let reprioritized = service
        .update_task(UpdateTaskInput {
            task_id: created.id.clone(),
            title: None,
            note: None,
            status: None,
            priority: Some(4),
            placement: None,
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
        })
        .await
        .expect("update priority should succeed");
    assert!(reprioritized.inbox_at.is_some());

    let doing = service
        .update_task(UpdateTaskInput {
            task_id: created.id.clone(),
            title: None,
            note: None,
            status: Some(TaskStatus::Doing),
            priority: None,
            placement: None,
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
        })
        .await
        .expect("move to doing should succeed");
    assert!(doing.inbox_at.is_some());
    let done = service
        .update_task(UpdateTaskInput {
            task_id: created.id.clone(),
            title: None,
            note: None,
            status: Some(TaskStatus::Done),
            priority: None,
            placement: None,
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
        })
        .await
        .expect("move to done should succeed");
    assert!(done.inbox_at.is_none());
    let canceled = service
        .update_task(UpdateTaskInput {
            task_id: created.id.clone(),
            title: None,
            note: None,
            status: Some(TaskStatus::Canceled),
            priority: None,
            placement: None,
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
        })
        .await
        .expect("move to canceled should succeed");
    let reopened = service
        .update_task(UpdateTaskInput {
            task_id: created.id,
            title: None,
            note: None,
            status: Some(TaskStatus::Todo),
            priority: None,
            placement: None,
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
        })
        .await
        .expect("reopen should succeed");

    assert_eq!(doing.status, TaskStatus::Doing);
    assert!(doing.completed_at.is_none());
    assert!(doing.canceled_at.is_none());
    assert_ne!(doing.status_changed_at, created.status_changed_at);

    assert_eq!(done.status, TaskStatus::Done);
    assert!(done.completed_at.is_some());
    assert!(done.canceled_at.is_none());

    assert_eq!(canceled.status, TaskStatus::Canceled);
    assert!(canceled.completed_at.is_none());
    assert!(canceled.canceled_at.is_some());

    assert_eq!(reopened.status, TaskStatus::Todo);
    assert!(reopened.completed_at.is_none());
    assert!(reopened.canceled_at.is_none());
}

#[tokio::test]
async fn update_task_should_keep_note_newlines_and_allow_blank_note() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
    let service = build_task_service(&database);
    let space = default_space(&database).await;

    let created = service
        .create_task(CreateTaskInput {
            space_id: Some(space.id),
            placement: CreateTaskPlacementInput {
                kind: CreateTaskPlacementKind::Inbox,
                project_id: None,
            },
            title: "备注换行".to_owned(),
            note: Some("已有备注".to_owned()),
            status: None,
            priority: None,
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
        })
        .await
        .expect("create task should succeed");

    let updated = service
        .update_task(UpdateTaskInput {
            task_id: created.id.clone(),
            title: None,
            note: Some(Some("\n第一行\n第二行\n".to_owned())),
            status: None,
            priority: None,
            placement: None,
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
        })
        .await
        .expect("update note should succeed");
    assert_eq!(updated.note.as_deref(), Some("\n第一行\n第二行\n"));

    let cleared = service
        .update_task(UpdateTaskInput {
            task_id: created.id,
            title: None,
            note: Some(Some("\n  \n".to_owned())),
            status: None,
            priority: None,
            placement: None,
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
        })
        .await
        .expect("clear note should succeed");
    assert_eq!(cleared.note, None);
}

#[tokio::test]
async fn create_task_should_enqueue_pending_sync_mutation_record() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
    let service = build_task_service(&database);
    let space = default_space(&database).await;
    let sync_repository = SyncRepository::new(database.connection().clone());

    let created = service
        .create_task(CreateTaskInput {
            space_id: Some(space.id),
            placement: CreateTaskPlacementInput {
                kind: CreateTaskPlacementKind::Inbox,
                project_id: None,
            },
            title: "同步创建".to_owned(),
            note: Some("准备上推".to_owned()),
            status: None,
            priority: Some(2),
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
        })
        .await
        .expect("create task should succeed");

    let pending = sync_repository
        .list_mutations_by_status("pending", 10)
        .await
        .expect("pending mutation query should succeed");

    assert_eq!(pending.len(), 1);
    assert_eq!(pending[0].entity_type, "task");
    assert_eq!(pending[0].entity_id, created.id);
    assert_eq!(pending[0].operation, "upsert");
    assert!(pending[0].payload.contains("\"title\":\"同步创建\""));
}

#[tokio::test]
async fn update_task_should_enqueue_pending_sync_mutation_record() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
    let service = build_task_service(&database);
    let space = default_space(&database).await;
    let sync_repository = SyncRepository::new(database.connection().clone());

    let created = service
        .create_task(CreateTaskInput {
            space_id: Some(space.id.clone()),
            placement: CreateTaskPlacementInput {
                kind: CreateTaskPlacementKind::Inbox,
                project_id: None,
            },
            title: "待更新同步".to_owned(),
            note: None,
            status: None,
            priority: None,
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
        })
        .await
        .expect("create task should succeed");

    service
        .update_task(UpdateTaskInput {
            task_id: created.id.clone(),
            title: Some("已更新同步".to_owned()),
            note: Some(Some("新备注".to_owned())),
            status: Some(TaskStatus::Doing),
            priority: Some(4),
            placement: Some(UpdateTaskPlacementInput {
                kind: UpdateTaskPlacementKind::NoProject,
                space_id: space.id,
                project_id: None,
            }),
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
        })
        .await
        .expect("update task should succeed");

    let pending = sync_repository
        .list_mutations_by_status("pending", 10)
        .await
        .expect("pending mutation query should succeed");

    assert_eq!(pending.len(), 2);
    assert_eq!(pending[1].entity_type, "task");
    assert_eq!(pending[1].entity_id, created.id);
    assert_eq!(pending[1].operation, "upsert");
    assert!(pending[1].payload.contains("\"title\":\"已更新同步\""));
    assert!(pending[1].payload.contains("\"status\":\"doing\""));
}

#[test]
fn update_task_input_should_distinguish_null_note_from_missing_note() {
    let clear_note: UpdateTaskInput = serde_json::from_value(serde_json::json!({
        "taskId": "task-1",
        "note": null
    }))
    .expect("null note payload should deserialize");
    let missing_note: UpdateTaskInput = serde_json::from_value(serde_json::json!({
        "taskId": "task-1"
    }))
    .expect("missing note payload should deserialize");

    assert_eq!(clear_note.note, Some(None));
    assert_eq!(missing_note.note, None);
}

#[tokio::test]
async fn list_tasks_should_filter_scope_project_and_lifecycle() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
    let service = build_task_service(&database);
    let default_space = default_space(&database).await;
    let another_space = insert_space(&database, "副空间", false).await;
    let project = insert_project(&database, &default_space.id, "Project A").await;

    let active = service
        .create_task(CreateTaskInput {
            space_id: Some(default_space.id.clone()),
            placement: CreateTaskPlacementInput {
                kind: CreateTaskPlacementKind::Project,
                project_id: Some(project.id.clone()),
            },
            title: "Active".to_owned(),
            note: None,
            status: Some(TaskStatus::Todo),
            priority: None,
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
        })
        .await
        .expect("create active should succeed");
    let completed = service
        .create_task(CreateTaskInput {
            space_id: Some(default_space.id.clone()),
            placement: CreateTaskPlacementInput {
                kind: CreateTaskPlacementKind::Project,
                project_id: Some(project.id.clone()),
            },
            title: "Completed".to_owned(),
            note: None,
            status: Some(TaskStatus::Done),
            priority: None,
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
        })
        .await
        .expect("create completed should succeed");
    let canceled = service
        .create_task(CreateTaskInput {
            space_id: Some(default_space.id.clone()),
            placement: CreateTaskPlacementInput {
                kind: CreateTaskPlacementKind::NoProject,
                project_id: None,
            },
            title: "Canceled".to_owned(),
            note: None,
            status: Some(TaskStatus::Canceled),
            priority: None,
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
        })
        .await
        .expect("create canceled should succeed");
    let archived = service
        .create_task(CreateTaskInput {
            space_id: Some(another_space.id.clone()),
            placement: CreateTaskPlacementInput {
                kind: CreateTaskPlacementKind::NoProject,
                project_id: None,
            },
            title: "Archived".to_owned(),
            note: None,
            status: Some(TaskStatus::Todo),
            priority: None,
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
        })
        .await
        .expect("create archived should succeed");
    service
        .archive_task(TaskIdInput {
            task_id: archived.id.clone(),
        })
        .await
        .expect("archive should succeed");

    let active_rows = service
        .list_tasks(ListTasksInput {
            scope: TaskScopeInput {
                kind: TaskScopeKind::Space,
                space_id: Some(default_space.id.clone()),
            },
            view_key: "active".to_owned(),
            placement: ListTasksPlacementInput {
                kind: ListTasksPlacementKind::Project,
                project_id: Some(project.id.clone()),
            },
        })
        .await
        .expect("active list should succeed");
    let completed_rows = service
        .list_tasks(ListTasksInput {
            scope: TaskScopeInput {
                kind: TaskScopeKind::Space,
                space_id: Some(default_space.id.clone()),
            },
            view_key: "completed".to_owned(),
            placement: ListTasksPlacementInput {
                kind: ListTasksPlacementKind::Project,
                project_id: Some(project.id.clone()),
            },
        })
        .await
        .expect("completed list should succeed");
    let canceled_rows = service
        .list_tasks(ListTasksInput {
            scope: TaskScopeInput {
                kind: TaskScopeKind::Space,
                space_id: Some(default_space.id),
            },
            view_key: "canceled".to_owned(),
            placement: ListTasksPlacementInput {
                kind: ListTasksPlacementKind::NoProject,
                project_id: None,
            },
        })
        .await
        .expect("canceled list should succeed");
    let archived_rows = service
        .list_tasks(ListTasksInput {
            scope: TaskScopeInput {
                kind: TaskScopeKind::Space,
                space_id: Some(another_space.id),
            },
            view_key: "archived".to_owned(),
            placement: ListTasksPlacementInput {
                kind: ListTasksPlacementKind::NoProject,
                project_id: None,
            },
        })
        .await
        .expect("archived list should succeed");

    assert_eq!(active_rows.len(), 1);
    assert_eq!(active_rows[0].id, active.id);
    assert!(active_rows[0].inbox_at.is_none());
    assert_eq!(completed_rows.len(), 1);
    assert_eq!(completed_rows[0].id, completed.id);
    assert!(completed_rows[0].inbox_at.is_none());
    assert_eq!(canceled_rows.len(), 1);
    assert_eq!(canceled_rows[0].id, canceled.id);
    assert!(canceled_rows[0].inbox_at.is_none());
    assert_eq!(archived_rows.len(), 1);
    assert_eq!(archived_rows[0].id, archived.id);
    assert!(archived_rows[0].inbox_at.is_none());
}

#[tokio::test]
async fn list_tasks_should_filter_inbox_and_no_project_placement() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
    let service = build_task_service(&database);
    let space = default_space(&database).await;
    let project = insert_project(&database, &space.id, "Project Placement").await;

    let inbox_task = service
        .create_task(CreateTaskInput {
            space_id: Some(space.id.clone()),
            placement: CreateTaskPlacementInput {
                kind: CreateTaskPlacementKind::Inbox,
                project_id: None,
            },
            title: "Inbox Task".to_owned(),
            note: None,
            status: None,
            priority: None,
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
        })
        .await
        .expect("create inbox task should succeed");
    let no_project_task = service
        .create_task(CreateTaskInput {
            space_id: Some(space.id.clone()),
            placement: CreateTaskPlacementInput {
                kind: CreateTaskPlacementKind::NoProject,
                project_id: None,
            },
            title: "No Project Task".to_owned(),
            note: None,
            status: None,
            priority: None,
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
        })
        .await
        .expect("create no project task should succeed");
    let project_task = service
        .create_task(CreateTaskInput {
            space_id: Some(space.id.clone()),
            placement: CreateTaskPlacementInput {
                kind: CreateTaskPlacementKind::Project,
                project_id: Some(project.id.clone()),
            },
            title: "Project Task".to_owned(),
            note: None,
            status: None,
            priority: None,
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
        })
        .await
        .expect("create project task should succeed");

    let inbox_rows = service
        .list_tasks(ListTasksInput {
            scope: TaskScopeInput {
                kind: TaskScopeKind::Space,
                space_id: Some(space.id.clone()),
            },
            view_key: "active".to_owned(),
            placement: ListTasksPlacementInput {
                kind: ListTasksPlacementKind::Inbox,
                project_id: None,
            },
        })
        .await
        .expect("list inbox tasks should succeed");
    let no_project_rows = service
        .list_tasks(ListTasksInput {
            scope: TaskScopeInput {
                kind: TaskScopeKind::Space,
                space_id: Some(space.id.clone()),
            },
            view_key: "active".to_owned(),
            placement: ListTasksPlacementInput {
                kind: ListTasksPlacementKind::NoProject,
                project_id: None,
            },
        })
        .await
        .expect("list no project tasks should succeed");
    let project_rows = service
        .list_tasks(ListTasksInput {
            scope: TaskScopeInput {
                kind: TaskScopeKind::Space,
                space_id: Some(space.id),
            },
            view_key: "active".to_owned(),
            placement: ListTasksPlacementInput {
                kind: ListTasksPlacementKind::Project,
                project_id: Some(project.id),
            },
        })
        .await
        .expect("list project tasks should succeed");

    assert_eq!(
        inbox_rows
            .iter()
            .map(|item| item.id.as_str())
            .collect::<Vec<_>>(),
        vec![inbox_task.id.as_str()]
    );
    assert!(inbox_rows[0].inbox_at.is_some());
    assert_eq!(
        no_project_rows
            .iter()
            .map(|item| item.id.as_str())
            .collect::<Vec<_>>(),
        vec![no_project_task.id.as_str()]
    );
    assert!(no_project_rows[0].inbox_at.is_none());
    assert_eq!(
        project_rows
            .iter()
            .map(|item| item.id.as_str())
            .collect::<Vec<_>>(),
        vec![project_task.id.as_str()]
    );
    assert!(project_rows[0].inbox_at.is_none());
}

#[tokio::test]
async fn archive_restore_delete_task_should_record_activity_and_return_consistent_payload() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
    let service = build_task_service(&database);
    let space = default_space(&database).await;

    let created = service
        .create_task(CreateTaskInput {
            space_id: Some(space.id),
            placement: CreateTaskPlacementInput {
                kind: CreateTaskPlacementKind::Inbox,
                project_id: None,
            },
            title: "Task 生命周期".to_owned(),
            note: None,
            status: None,
            priority: None,
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
        })
        .await
        .expect("create task should succeed");
    let archived = service
        .archive_task(TaskIdInput {
            task_id: created.id.clone(),
        })
        .await
        .expect("archive should succeed");
    let restored = service
        .restore_task(TaskIdInput {
            task_id: created.id.clone(),
        })
        .await
        .expect("restore should succeed");
    let deleted = service
        .delete_task(TaskIdInput {
            task_id: created.id.clone(),
        })
        .await
        .expect("delete should succeed");

    let activity_count = scalar_i64_with_arg(
        database.connection(),
        "SELECT COUNT(*) AS value FROM activity_events WHERE entity_id = ?",
        created.id.clone(),
    )
    .await
    .expect("activity count query should succeed");

    assert!(archived.archived_at.is_some());
    assert!(restored.archived_at.is_none());
    assert!(deleted.deleted_at.is_some());
    assert_eq!(activity_count, 4);
}

#[tokio::test]
async fn system_task_views_should_filter_and_sort_by_stage8_rules() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
    let service = build_task_service(&database);
    let space = default_space(&database).await;
    let today = today_local_date();
    let overdue_date = (today - Duration::days(1)).format("%Y-%m-%d").to_string();
    let due_today_date = today.format("%Y-%m-%d").to_string();
    let scheduled_today_date = today.format("%Y-%m-%d").to_string();
    let upcoming_soon_date = (today + Duration::days(2)).format("%Y-%m-%d").to_string();
    let upcoming_later_date = (today + Duration::days(5)).format("%Y-%m-%d").to_string();

    service
        .create_task(CreateTaskInput {
            space_id: Some(space.id.clone()),
            placement: CreateTaskPlacementInput {
                kind: CreateTaskPlacementKind::NoProject,
                project_id: None,
            },
            title: "Overdue".to_owned(),
            note: None,
            status: Some(TaskStatus::Todo),
            priority: Some(2),
            due_at: Some(overdue_date.clone()),
            scheduled_at: None,
            reminder_at: None,
        })
        .await
        .expect("create overdue task should succeed");
    service
        .create_task(CreateTaskInput {
            space_id: Some(space.id.clone()),
            placement: CreateTaskPlacementInput {
                kind: CreateTaskPlacementKind::NoProject,
                project_id: None,
            },
            title: "Due Today".to_owned(),
            note: None,
            status: Some(TaskStatus::Todo),
            priority: Some(4),
            due_at: Some(due_today_date.clone()),
            scheduled_at: None,
            reminder_at: None,
        })
        .await
        .expect("create due today task should succeed");
    service
        .create_task(CreateTaskInput {
            space_id: Some(space.id.clone()),
            placement: CreateTaskPlacementInput {
                kind: CreateTaskPlacementKind::NoProject,
                project_id: None,
            },
            title: "Scheduled Today".to_owned(),
            note: None,
            status: Some(TaskStatus::Doing),
            priority: Some(1),
            due_at: None,
            scheduled_at: Some(scheduled_today_date.clone()),
            reminder_at: None,
        })
        .await
        .expect("create scheduled today task should succeed");
    service
        .create_task(CreateTaskInput {
            space_id: Some(space.id.clone()),
            placement: CreateTaskPlacementInput {
                kind: CreateTaskPlacementKind::NoProject,
                project_id: None,
            },
            title: "Upcoming Soon".to_owned(),
            note: None,
            status: Some(TaskStatus::Todo),
            priority: Some(3),
            due_at: None,
            scheduled_at: Some(upcoming_soon_date.clone()),
            reminder_at: None,
        })
        .await
        .expect("create upcoming soon task should succeed");
    service
        .create_task(CreateTaskInput {
            space_id: Some(space.id.clone()),
            placement: CreateTaskPlacementInput {
                kind: CreateTaskPlacementKind::NoProject,
                project_id: None,
            },
            title: "Upcoming Later".to_owned(),
            note: None,
            status: Some(TaskStatus::Todo),
            priority: Some(4),
            due_at: Some(upcoming_later_date.clone()),
            scheduled_at: None,
            reminder_at: None,
        })
        .await
        .expect("create upcoming later task should succeed");
    service
        .create_task(CreateTaskInput {
            space_id: Some(space.id.clone()),
            placement: CreateTaskPlacementInput {
                kind: CreateTaskPlacementKind::NoProject,
                project_id: None,
            },
            title: "Waiting P4".to_owned(),
            note: None,
            status: Some(TaskStatus::Waiting),
            priority: Some(4),
            due_at: None,
            scheduled_at: Some(upcoming_soon_date),
            reminder_at: None,
        })
        .await
        .expect("create waiting task should succeed");

    let base_input = ListTasksInput {
        scope: TaskScopeInput {
            kind: TaskScopeKind::Space,
            space_id: Some(space.id),
        },
        view_key: String::new(),
        placement: ListTasksPlacementInput {
            kind: ListTasksPlacementKind::All,
            project_id: None,
        },
    };

    let today_rows = service
        .list_tasks(ListTasksInput {
            view_key: "today".to_owned(),
            ..base_input.clone()
        })
        .await
        .expect("today list should succeed");
    let overdue_rows = service
        .list_tasks(ListTasksInput {
            view_key: "overdue".to_owned(),
            ..base_input.clone()
        })
        .await
        .expect("overdue list should succeed");
    let focus_rows = service
        .list_tasks(ListTasksInput {
            view_key: "focus".to_owned(),
            ..base_input.clone()
        })
        .await
        .expect("focus list should succeed");
    let upcoming_rows = service
        .list_tasks(ListTasksInput {
            view_key: "upcoming".to_owned(),
            ..base_input
        })
        .await
        .expect("upcoming list should succeed");

    assert_eq!(
        today_rows
            .iter()
            .map(|item| item.title.as_str())
            .collect::<Vec<_>>(),
        vec!["Overdue", "Due Today", "Scheduled Today"]
    );
    assert_eq!(
        overdue_rows
            .iter()
            .map(|item| item.title.as_str())
            .collect::<Vec<_>>(),
        vec!["Overdue"]
    );
    assert_eq!(
        focus_rows
            .iter()
            .map(|item| item.title.as_str())
            .collect::<Vec<_>>(),
        vec!["Due Today", "Upcoming Later", "Upcoming Soon"]
    );
    assert_eq!(
        upcoming_rows
            .iter()
            .map(|item| item.title.as_str())
            .collect::<Vec<_>>(),
        vec!["Waiting P4", "Upcoming Soon", "Upcoming Later"]
    );
    assert!(!upcoming_rows.iter().any(|item| item.title == "Due Today"));
    assert!(!focus_rows.iter().any(|item| item.title == "Waiting P4"));
}

fn build_task_service(database: &stoneflow_storage::database::DatabaseRuntimeState) -> TaskService {
    let connection = database.connection().clone();
    TaskService::new(
        SpaceRepository::new(connection.clone()),
        ProjectRepository::new(connection.clone()),
        TaskRepository::new(connection.clone()),
        SyncRepository::new(connection.clone()),
        ActivityService::new(ActivityRepository::new(connection)),
    )
}

async fn default_space(
    database: &stoneflow_storage::database::DatabaseRuntimeState,
) -> stoneflow_storage::entities::space::Model {
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
    name: &str,
    is_default: bool,
) -> stoneflow_storage::entities::space::Model {
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
    let now = "2026-04-30T00:00:00Z".to_owned();
    let created = repository
        .create(
            &transaction,
            stoneflow_storage::repositories::CreateSpaceRecord {
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
    database: &stoneflow_storage::database::DatabaseRuntimeState,
    space_id: &str,
    name: &str,
) -> stoneflow_storage::entities::project::Model {
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
    let now = "2026-04-30T00:00:00Z".to_owned();
    let created = repository
        .create(
            &transaction,
            stoneflow_storage::repositories::CreateProjectRecord {
                id: create_id().to_string(),
                space_id: space_id.to_owned(),
                name: name.to_owned(),
                description: None,
                due_at: None,
                sort_order,
                created_at: now.clone(),
                updated_at: now,
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

async fn scalar_i64_with_arg<C>(
    connection: &C,
    sql: &str,
    arg: String,
) -> Result<i64, sea_orm::DbErr>
where
    C: ConnectionTrait,
{
    let statement = Statement::from_sql_and_values(DatabaseBackend::Sqlite, sql, [arg.into()]);
    let row = connection
        .query_one(statement)
        .await?
        .expect("row should exist");
    row.try_get::<i64>("", "value")
}

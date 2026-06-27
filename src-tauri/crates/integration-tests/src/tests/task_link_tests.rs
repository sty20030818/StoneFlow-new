//! 阶段 5 Task Links 回归测试。

use sea_orm::TransactionTrait;
use stoneflow_test_support::TestDatabase;

use crate::services::{
    activity::{ActivityService, GetEntityActivitiesInput},
    CreateTaskInput, CreateTaskLinkInput, CreateTaskPlacementInput, CreateTaskPlacementKind,
    DeleteTaskLinkInput, ListTaskLinksInput, TaskIdInput, TaskLinkService, TaskService,
    UpdateTaskLinkInput,
};
use stoneflow_storage::repositories::{
    ActivityRepository, CreateTaskLinkRecord, ProjectRepository, SpaceRepository,
    SyncRepository, TaskLinkRepository, TaskRepository,
};

#[tokio::test]
async fn task_link_repository_should_support_crud_roundtrip() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
    let task = create_task_fixture(&database, "Repository Task").await;
    let repository = TaskLinkRepository::new(database.connection().clone());
    let transaction = repository
        .connection()
        .begin()
        .await
        .expect("transaction should begin");
    let sort_order = repository
        .next_sort_order(&transaction, &task.id)
        .await
        .expect("next sort order should succeed");
    let created = repository
        .create(
            &transaction,
            CreateTaskLinkRecord {
                id: "link-1".to_owned(),
                task_id: task.id.clone(),
                title: "技术方案".to_owned(),
                url: "https://example.com/spec".to_owned(),
                sort_order,
                created_at: "2026-05-23T10:00:00Z".to_owned(),
                updated_at: "2026-05-23T10:00:00Z".to_owned(),
            },
        )
        .await
        .expect("create task link should succeed");
    transaction
        .commit()
        .await
        .expect("transaction commit should succeed");

    let listed = repository
        .list_by_task(&task.id)
        .await
        .expect("list links should succeed");
    assert_eq!(listed.len(), 1);
    assert_eq!(listed[0].title, "技术方案");
    assert_eq!(listed[0].sort_order, created.sort_order);

    let transaction = repository
        .connection()
        .begin()
        .await
        .expect("transaction should begin");
    let updated = repository
        .update(
            &transaction,
            "link-1",
            stoneflow_storage::repositories::UpdateTaskLinkPatch {
                title: Some("技术方案文档".to_owned()),
                url: Some("https://example.com/spec-v2".to_owned()),
            },
            "2026-05-23T11:00:00Z",
        )
        .await
        .expect("update should succeed")
        .expect("link should still exist");
    transaction
        .commit()
        .await
        .expect("transaction commit should succeed");
    assert_eq!(updated.title, "技术方案文档");
    assert_eq!(updated.url, "https://example.com/spec-v2");

    let transaction = repository
        .connection()
        .begin()
        .await
        .expect("transaction should begin");
    let deleted = repository
        .delete(&transaction, "link-1")
        .await
        .expect("delete should succeed");
    transaction
        .commit()
        .await
        .expect("transaction commit should succeed");
    assert!(deleted);
    assert!(repository
        .list_by_task(&task.id)
        .await
        .expect("list links should succeed")
        .is_empty());
}

#[tokio::test]
async fn task_link_service_should_validate_title_url_and_deleted_task() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
    let task = create_task_fixture(&database, "Validation Task").await;
    let link_service = build_task_link_service(&database);
    let task_service = build_task_service(&database);

    let blank_title = link_service
        .create_task_link(CreateTaskLinkInput {
            task_id: task.id.clone(),
            title: "   ".to_owned(),
            url: "https://example.com".to_owned(),
        })
        .await
        .expect_err("blank title should fail");
    assert_eq!(blank_title.to_string(), "验证失败: Link title 不能为空");

    let invalid_url = link_service
        .create_task_link(CreateTaskLinkInput {
            task_id: task.id.clone(),
            title: "文档".to_owned(),
            url: "obsidian://vault/spec".to_owned(),
        })
        .await
        .expect_err("custom scheme should fail");
    assert_eq!(
        invalid_url.to_string(),
        "验证失败: Link URL 仅支持 http 或 https"
    );

    task_service
        .delete_task(TaskIdInput {
            task_id: task.id.clone(),
        })
        .await
        .expect("delete task should succeed");

    let deleted_task = link_service
        .create_task_link(CreateTaskLinkInput {
            task_id: task.id,
            title: "文档".to_owned(),
            url: "https://example.com".to_owned(),
        })
        .await
        .expect_err("deleted task should not allow new links");
    assert_eq!(deleted_task.to_string(), "实体不存在: Task 不存在");
}

#[tokio::test]
async fn task_link_service_should_record_activity_and_keep_task_detail_unchanged() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
    let task = create_task_fixture(&database, "Activity Task").await;
    let link_service = build_task_link_service(&database);
    let task_service = build_task_service(&database);
    let activity_service =
        ActivityService::new(ActivityRepository::new(database.connection().clone()));

    let before = task_service
        .get_task_detail(TaskIdInput {
            task_id: task.id.clone(),
        })
        .await
        .expect("task detail should load");

    let created = link_service
        .create_task_link(CreateTaskLinkInput {
            task_id: task.id.clone(),
            title: "设计稿".to_owned(),
            url: "https://example.com/figma".to_owned(),
        })
        .await
        .expect("create task link should succeed");
    let updated = link_service
        .update_task_link(UpdateTaskLinkInput {
            link_id: created.id.clone(),
            title: Some("最终设计稿".to_owned()),
            url: Some("https://example.com/figma-final".to_owned()),
        })
        .await
        .expect("update task link should succeed");
    let deleted = link_service
        .delete_task_link(DeleteTaskLinkInput {
            link_id: created.id.clone(),
        })
        .await
        .expect("delete task link should succeed");

    assert_eq!(deleted.id, created.id);
    assert_eq!(updated.title, "最终设计稿");
    assert!(link_service
        .list_task_links(ListTaskLinksInput {
            task_id: task.id.clone(),
        })
        .await
        .expect("list links should succeed")
        .is_empty());

    let timeline = activity_service
        .get_entity_activities(GetEntityActivitiesInput {
            entity_type: stoneflow_domain::ActivityEntityKind::Task,
            entity_id: task.id.clone(),
            limit: Some(10),
        })
        .await
        .expect("activity timeline should load");
    let actions = timeline
        .iter()
        .map(|entry| entry.action.as_str())
        .collect::<Vec<_>>();
    assert!(actions.contains(&"task.link.added"));
    assert!(actions.contains(&"task.link.updated"));
    assert!(actions.contains(&"task.link.removed"));

    let updated_entry = timeline
        .iter()
        .find(|entry| entry.action == "task.link.updated")
        .expect("updated link activity should exist");
    assert_eq!(updated_entry.changes.len(), 2);
    assert_eq!(updated_entry.changes[0].field, "title");
    assert_eq!(updated_entry.changes[1].field, "url");

    let after = task_service
        .get_task_detail(TaskIdInput { task_id: task.id })
        .await
        .expect("task detail should still load");
    assert_eq!(before.updated_at, after.updated_at);
    assert_eq!(before.title, after.title);
    assert_eq!(before.note, after.note);
}

#[tokio::test]
async fn task_link_service_should_enqueue_sync_outbox_for_create_update_delete() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
    let task = create_task_fixture(&database, "Sync Task").await;
    let link_service = build_task_link_service(&database);
    let sync_repository = SyncRepository::new(database.connection().clone());

    let created = link_service
        .create_task_link(CreateTaskLinkInput {
            task_id: task.id.clone(),
            title: "链接 A".to_owned(),
            url: "https://example.com/a".to_owned(),
        })
        .await
        .expect("create task link should succeed");
    link_service
        .update_task_link(UpdateTaskLinkInput {
            link_id: created.id.clone(),
            title: Some("链接 B".to_owned()),
            url: Some("https://example.com/b".to_owned()),
        })
        .await
        .expect("update task link should succeed");
    link_service
        .delete_task_link(DeleteTaskLinkInput {
            link_id: created.id.clone(),
        })
        .await
        .expect("delete task link should succeed");

    let pending = sync_repository
        .list_outbox_by_status("pending", 10)
        .await
        .expect("pending outbox query should succeed");

    assert_eq!(pending.len(), 4);
    assert_eq!(pending[1].entity_type, "task");
    assert_eq!(pending[1].entity_id, task.id);
    assert_eq!(pending[1].action, "upsert");
    assert_eq!(pending[2].action, "upsert");
    assert_eq!(pending[3].action, "delete");
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

fn build_task_link_service(
    database: &stoneflow_storage::database::DatabaseRuntimeState,
) -> TaskLinkService {
    let connection = database.connection().clone();
    TaskLinkService::new(
        TaskRepository::new(connection.clone()),
        TaskLinkRepository::new(connection.clone()),
        SyncRepository::new(connection.clone()),
        ActivityService::new(ActivityRepository::new(connection)),
    )
}

async fn create_task_fixture(
    database: &stoneflow_storage::database::DatabaseRuntimeState,
    title: &str,
) -> crate::services::TaskDetailDto {
    let default_space = SpaceRepository::new(database.connection().clone())
        .list_visible()
        .await
        .expect("list visible spaces should succeed")
        .into_iter()
        .next()
        .expect("default space should exist");

    build_task_service(database)
        .create_task(CreateTaskInput {
            space_id: Some(default_space.id),
            placement: CreateTaskPlacementInput {
                kind: CreateTaskPlacementKind::Inbox,
                project_id: None,
            },
            title: title.to_owned(),
            note: None,
            status: None,
            priority: None,
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
        })
        .await
        .expect("create task should succeed")
}

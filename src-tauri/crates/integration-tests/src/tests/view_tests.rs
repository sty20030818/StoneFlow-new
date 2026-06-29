//! 阶段 3 View 同步 mutation 回归测试。

use serde_json::json;
use stoneflow_domain::ViewEntityKind;
use stoneflow_test_support::TestDatabase;

use crate::services::{
    activity::ActivityService, CreateViewInput, DeleteViewInput, ReorderViewsInput,
    ToggleViewVisibleInput, UpdateViewInput, ViewService, ViewSortDirection, ViewSortRuleDto,
};
use stoneflow_storage::repositories::{
    ActivityRepository, ProjectRepository, SpaceRepository, SyncRepository, TaskRepository,
    ViewRepository,
};

#[tokio::test]
async fn create_view_should_enqueue_pending_sync_mutation_record() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
    let service = build_view_service(&database);
    let sync_repository = SyncRepository::new(database.connection().clone());

    let created = create_custom_task_view(&service, "同步视图").await;

    let pending = sync_repository
        .list_mutations_by_status("pending", 10)
        .await
        .expect("pending mutation query should succeed");

    assert_eq!(pending.len(), 1);
    assert_eq!(pending[0].entity_type, "view");
    assert_eq!(pending[0].entity_id, created.id);
    assert_eq!(pending[0].operation, "upsert");
    assert!(pending[0].payload.contains("\"name\":\"同步视图\""));
}

#[tokio::test]
async fn update_view_should_enqueue_pending_sync_mutation_record() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
    let service = build_view_service(&database);
    let sync_repository = SyncRepository::new(database.connection().clone());

    let created = create_custom_task_view(&service, "待更新视图").await;
    service
        .update_view(UpdateViewInput {
            view_id: created.id.clone(),
            name: Some("已更新视图".to_owned()),
            description: Some(Some("新的过滤说明".to_owned())),
            filters: Some(json!({
                "status": ["todo", "doing"],
                "archived": false,
                "deleted": false,
            })),
            sort: Some(vec![ViewSortRuleDto {
                field: "updatedAt".to_owned(),
                direction: ViewSortDirection::Desc,
            }]),
            group_by: Some(Some("priority".to_owned())),
        })
        .await
        .expect("update view should succeed");

    let pending = sync_repository
        .list_mutations_by_status("pending", 10)
        .await
        .expect("pending mutation query should succeed");

    assert_eq!(pending.len(), 2);
    let updated = pending
        .iter()
        .find(|record| {
            record.entity_type == "view"
                && record.entity_id == created.id
                && record.payload.contains("\"name\":\"已更新视图\"")
        })
        .expect("updated view mutation record should exist");
    assert_eq!(updated.operation, "upsert");
    assert!(updated.payload.contains("\"group_by\":\"priority\""));
}

#[tokio::test]
async fn delete_view_should_enqueue_delete_sync_mutation_record() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
    let service = build_view_service(&database);
    let sync_repository = SyncRepository::new(database.connection().clone());

    let created = create_custom_task_view(&service, "待删除视图").await;
    service
        .delete_view(DeleteViewInput {
            view_id: created.id.clone(),
        })
        .await
        .expect("delete view should succeed");

    let pending = sync_repository
        .list_mutations_by_status("pending", 10)
        .await
        .expect("pending mutation query should succeed");

    assert_eq!(pending.len(), 2);
    let deleted = pending
        .iter()
        .find(|record| {
            record.entity_type == "view"
                && record.entity_id == created.id
                && record.operation == "soft_delete"
        })
        .expect("deleted view mutation record should exist");
    assert!(deleted.payload.contains("\"name\":\"待删除视图\""));
}

#[tokio::test]
async fn toggle_view_visible_should_enqueue_pending_sync_mutation_record() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
    let service = build_view_service(&database);
    let sync_repository = SyncRepository::new(database.connection().clone());

    let created = create_custom_task_view(&service, "隐藏视图").await;
    service
        .toggle_view_visible(ToggleViewVisibleInput {
            view_id: created.id.clone(),
            visible: false,
        })
        .await
        .expect("toggle view visible should succeed");

    let pending = sync_repository
        .list_mutations_by_status("pending", 10)
        .await
        .expect("pending mutation query should succeed");

    assert_eq!(pending.len(), 2);
    let toggled = pending
        .iter()
        .find(|record| {
            record.entity_type == "view"
                && record.entity_id == created.id
                && record.payload.contains("\"is_visible\":false")
        })
        .expect("toggled view mutation record should exist");
    assert_eq!(toggled.operation, "upsert");
}

#[tokio::test]
async fn reorder_views_should_enqueue_pending_sync_mutation_records() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
    let service = build_view_service(&database);
    let sync_repository = SyncRepository::new(database.connection().clone());

    let first = create_custom_task_view(&service, "视图 A").await;
    let second = create_custom_task_view(&service, "视图 B").await;
    service
        .reorder_views(ReorderViewsInput {
            entity_type: ViewEntityKind::Task,
            ordered_ids: vec![second.id.clone(), first.id.clone()],
        })
        .await
        .expect("reorder views should succeed");

    let pending = sync_repository
        .list_mutations_by_status("pending", 10)
        .await
        .expect("pending mutation query should succeed");

    assert_eq!(pending.len(), 4);
    let second_reordered = pending
        .iter()
        .find(|record| {
            record.entity_type == "view"
                && record.entity_id == second.id
                && record.payload.contains("\"sort_order\":100")
        })
        .expect("second reordered mutation record should exist");
    assert_eq!(second_reordered.operation, "upsert");

    let first_reordered = pending
        .iter()
        .find(|record| {
            record.entity_type == "view"
                && record.entity_id == first.id
                && record.payload.contains("\"sort_order\":200")
        })
        .expect("first reordered mutation record should exist");
    assert_eq!(first_reordered.operation, "upsert");
}

fn build_view_service(database: &stoneflow_storage::database::DatabaseRuntimeState) -> ViewService {
    let connection = database.connection().clone();
    ViewService::new(
        ViewRepository::new(connection.clone()),
        SyncRepository::new(connection.clone()),
        SpaceRepository::new(connection.clone()),
        ProjectRepository::new(connection.clone()),
        TaskRepository::new(connection.clone()),
        ActivityService::new(ActivityRepository::new(connection)),
    )
}

async fn create_custom_task_view(service: &ViewService, name: &str) -> crate::services::ViewDto {
    service
        .create_view(CreateViewInput {
            entity_type: ViewEntityKind::Task,
            name: name.to_owned(),
            description: Some("同步测试视图".to_owned()),
            filters: json!({
                "status": ["todo"],
                "archived": false,
                "deleted": false,
            }),
            sort: vec![ViewSortRuleDto {
                field: "sortOrder".to_owned(),
                direction: ViewSortDirection::Asc,
            }],
            group_by: None,
        })
        .await
        .expect("create custom task view should succeed")
}

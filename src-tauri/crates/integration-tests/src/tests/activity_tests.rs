//! 阶段 2 Activity 基础设施回归测试。

use sea_orm::{ConnectionTrait, DatabaseBackend, Statement, TransactionTrait};
use serde_json::json;
use stoneflow_domain::{ActivityActorKind, ActivityEntityKind, ActivitySourceKind};
use stoneflow_schema::common::{
    ActivityActorKind as SchemaActivityActorKind, ActivityEntityKind as SchemaActivityEntityKind,
    ActivitySourceKind as SchemaActivitySourceKind,
};
use stoneflow_test_support::TestDatabase;

use crate::services::activity::{
    ActivityAction, ActivityChangeInput, ActivityService, GetEntityActivitiesInput,
    RecordActivityInput,
};
use stoneflow_storage::repositories::{
    ActivityChangeRecord, ActivityEventRecord, ActivityRepository,
};

#[tokio::test]
async fn record_activity_should_persist_event_and_changes_atomically() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
    let service = ActivityService::new(ActivityRepository::new(database.connection().clone()));

    service
        .record_activity(RecordActivityInput {
            entity_type: ActivityEntityKind::Task,
            entity_id: "task-1".to_owned(),
            action: ActivityAction::TaskStatusChanged,
            actor_type: Some(ActivityActorKind::User),
            source: Some(ActivitySourceKind::App),
            summary: Some("任务状态已更新".to_owned()),
            metadata: Some(json!({ "panel": "drawer" })),
            changes: vec![
                ActivityChangeInput {
                    field: "status".to_owned(),
                    old_value: Some(json!("todo")),
                    new_value: Some(json!("doing")),
                },
                ActivityChangeInput {
                    field: "status_changed_at".to_owned(),
                    old_value: Some(json!("2026-04-29T00:00:00Z")),
                    new_value: Some(json!("2026-04-29T01:00:00Z")),
                },
            ],
        })
        .await
        .expect("activity record should succeed");

    let event_count = scalar_i64(
        database.connection(),
        "SELECT COUNT(*) AS value FROM activity_events WHERE entity_id = 'task-1'",
    )
    .await
    .expect("event count query should succeed");
    let change_count = scalar_i64(
        database.connection(),
        "SELECT COUNT(*) AS value FROM activity_changes",
    )
    .await
    .expect("change count query should succeed");

    assert_eq!(event_count, 1);
    assert_eq!(change_count, 2);
}

#[tokio::test]
async fn record_activity_in_txn_should_rollback_with_outer_transaction() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
    let service = ActivityService::new(ActivityRepository::new(database.connection().clone()));
    let transaction = database
        .connection()
        .begin()
        .await
        .expect("transaction should begin");

    service
        .record_activity_in_txn(
            &transaction,
            RecordActivityInput {
                entity_type: ActivityEntityKind::Project,
                entity_id: "project-1".to_owned(),
                action: ActivityAction::ProjectArchived,
                actor_type: None,
                source: None,
                summary: Some("项目已归档".to_owned()),
                metadata: None,
                changes: vec![ActivityChangeInput {
                    field: "archived_at".to_owned(),
                    old_value: None,
                    new_value: Some(json!("2026-04-29T02:00:00Z")),
                }],
            },
        )
        .await
        .expect("activity record in transaction should succeed");

    transaction
        .rollback()
        .await
        .expect("rollback should succeed");

    let event_count = scalar_i64(
        database.connection(),
        "SELECT COUNT(*) AS value FROM activity_events WHERE entity_id = 'project-1'",
    )
    .await
    .expect("event count query should succeed");
    let change_count = scalar_i64(
        database.connection(),
        "SELECT COUNT(*) AS value FROM activity_changes",
    )
    .await
    .expect("change count query should succeed");

    assert_eq!(event_count, 0);
    assert_eq!(change_count, 0);
}

#[tokio::test]
async fn get_entity_activities_should_return_events_with_grouped_changes_in_desc_order() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
    let repository = ActivityRepository::new(database.connection().clone());
    let service = ActivityService::new(repository.clone());

    repository
        .insert_event_with_changes(
            repository.connection(),
            &ActivityEventRecord {
                id: "event-1".to_owned(),
                entity_type: SchemaActivityEntityKind::Task,
                entity_id: "task-2".to_owned(),
                action: "task.created".to_owned(),
                actor_type: SchemaActivityActorKind::User,
                source: SchemaActivitySourceKind::App,
                summary: Some("第一次创建".to_owned()),
                metadata: Some(json!({ "source": "seed" })),
                created_at: "2026-04-29T00:00:00Z".to_owned(),
            },
            &[ActivityChangeRecord {
                id: "change-1".to_owned(),
                event_id: "event-1".to_owned(),
                field: "title".to_owned(),
                old_value: None,
                new_value: Some(json!("任务一")),
                created_at: "2026-04-29T00:00:00Z".to_owned(),
            }],
        )
        .await
        .expect("first activity insert should succeed");
    repository
        .insert_event_with_changes(
            repository.connection(),
            &ActivityEventRecord {
                id: "event-2".to_owned(),
                entity_type: SchemaActivityEntityKind::Task,
                entity_id: "task-2".to_owned(),
                action: "task.status.changed".to_owned(),
                actor_type: SchemaActivityActorKind::System,
                source: SchemaActivitySourceKind::Automation,
                summary: Some("系统自动推进".to_owned()),
                metadata: Some(json!({ "job": "scheduler" })),
                created_at: "2026-04-29T01:00:00Z".to_owned(),
            },
            &[
                ActivityChangeRecord {
                    id: "change-2".to_owned(),
                    event_id: "event-2".to_owned(),
                    field: "status".to_owned(),
                    old_value: Some(json!("todo")),
                    new_value: Some(json!("doing")),
                    created_at: "2026-04-29T01:00:00Z".to_owned(),
                },
                ActivityChangeRecord {
                    id: "change-3".to_owned(),
                    event_id: "event-2".to_owned(),
                    field: "status_changed_at".to_owned(),
                    old_value: Some(json!("2026-04-29T00:00:00Z")),
                    new_value: Some(json!("2026-04-29T01:00:00Z")),
                    created_at: "2026-04-29T01:00:00Z".to_owned(),
                },
            ],
        )
        .await
        .expect("second activity insert should succeed");

    let timeline = service
        .get_entity_activities(GetEntityActivitiesInput {
            entity_type: ActivityEntityKind::Task,
            entity_id: "task-2".to_owned(),
            limit: Some(50),
        })
        .await
        .expect("activity list should succeed");

    assert_eq!(timeline.len(), 2);
    assert_eq!(timeline[0].id, "event-2");
    assert_eq!(timeline[0].changes.len(), 2);
    assert_eq!(timeline[0].changes[0].field, "status");
    assert_eq!(timeline[1].id, "event-1");
    assert_eq!(timeline[1].changes.len(), 1);
    assert_eq!(timeline[1].metadata, Some(json!({ "source": "seed" })));
}

#[tokio::test]
async fn record_activity_should_allow_event_without_changes_for_create_delete_actions() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
    let service = ActivityService::new(ActivityRepository::new(database.connection().clone()));

    service
        .record_activity(RecordActivityInput {
            entity_type: ActivityEntityKind::Task,
            entity_id: "task-3".to_owned(),
            action: ActivityAction::TaskCreated,
            actor_type: Some(ActivityActorKind::User),
            source: Some(ActivitySourceKind::Shortcut),
            summary: Some("通过快捷键创建任务".to_owned()),
            metadata: None,
            changes: Vec::new(),
        })
        .await
        .expect("activity record without changes should succeed");

    let timeline = service
        .get_entity_activities(GetEntityActivitiesInput {
            entity_type: ActivityEntityKind::Task,
            entity_id: "task-3".to_owned(),
            limit: None,
        })
        .await
        .expect("activity list should succeed");

    let change_count = scalar_i64(
        database.connection(),
        "SELECT COUNT(*) AS value FROM activity_changes",
    )
    .await
    .expect("change count query should succeed");

    assert_eq!(timeline.len(), 1);
    assert!(timeline[0].changes.is_empty());
    assert_eq!(change_count, 0);
}

async fn scalar_i64(
    connection: &sea_orm::DatabaseConnection,
    sql: &str,
) -> Result<i64, sea_orm::DbErr> {
    let row = connection
        .query_one(Statement::from_string(
            DatabaseBackend::Sqlite,
            sql.to_owned(),
        ))
        .await?
        .expect("scalar query should always return one row");

    row.try_get("", "value")
}

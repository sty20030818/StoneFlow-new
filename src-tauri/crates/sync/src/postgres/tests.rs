//! Postgres 云端副本集成测。
//!
//! 运行：
//! ```text
//! STONEFLOW_SYNC_DATABASE_URL=postgresql://… cargo test -p stoneflow-sync --lib postgres:: -- --ignored
//! ```

use std::collections::BTreeMap;

use serde_json::json;
use sqlx::Row;

use super::test_support::{base_database_url, drop_schema, open_isolated_cloud};
use super::{connect_ready, download_after, download_full, ensure_ready, health, upload_operation};
use crate::{
    EntityIdentity, EntityPatch, SyncEntityKind, SyncError, SyncMutation, SyncOperation, Tombstone,
};

fn require_pg() -> bool {
    base_database_url().is_some()
}

#[tokio::test]
#[ignore = "需要 STONEFLOW_SYNC_DATABASE_URL 或 DATABASE_URL"]
async fn ensure_ready_should_reject_incompatible_version() {
    if !require_pg() {
        return;
    }
    let (config, schema, base) = open_isolated_cloud().await.expect("cloud");
    {
        let mut conn = connect_ready(&config).await.expect("connect");
        sqlx::query("UPDATE sync_schema SET version = 999 WHERE name = 'stoneflow'")
            .execute(&mut conn)
            .await
            .expect("bump version");
        let err = ensure_ready(&mut conn).await.expect_err("incompatible");
        assert!(matches!(err, SyncError::Schema { .. }));
    }
    drop_schema(&base, &schema).await;
}

#[tokio::test]
#[ignore = "需要 STONEFLOW_SYNC_DATABASE_URL 或 DATABASE_URL"]
async fn upload_should_ack_retries_without_duplicate_changes() {
    if !require_pg() {
        return;
    }
    let (config, schema, base) = open_isolated_cloud().await.expect("cloud");
    {
        let mut conn = connect_ready(&config).await.expect("connect");
        let operation = operation("operation-1", patch(&[("title", json!("A"))]));
        let first = upload_operation(&mut conn, &operation)
            .await
            .expect("first");
        let retry = upload_operation(&mut conn, &operation)
            .await
            .expect("retry");
        assert!(!first.was_already_applied);
        assert!(retry.was_already_applied);
        assert_eq!(first.committed_seq, retry.committed_seq);
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM sync_change_log")
            .fetch_one(&mut conn)
            .await
            .expect("count");
        assert_eq!(count, 1);
    }
    drop_schema(&base, &schema).await;
}

#[tokio::test]
#[ignore = "需要 STONEFLOW_SYNC_DATABASE_URL 或 DATABASE_URL"]
async fn upload_should_merge_different_fields() {
    if !require_pg() {
        return;
    }
    let (config, schema, base) = open_isolated_cloud().await.expect("cloud");
    {
        let mut conn = connect_ready(&config).await.expect("connect");
        upload_operation(
            &mut conn,
            &operation("operation-title", patch(&[("title", json!("A"))])),
        )
        .await
        .expect("title");
        upload_operation(
            &mut conn,
            &operation("operation-priority", patch(&[("priority", json!(2))])),
        )
        .await
        .expect("priority");

        let row = sqlx::query("SELECT fields_json FROM sync_entity_state")
            .fetch_one(&mut conn)
            .await
            .expect("state");
        let fields: serde_json::Value = row.get("fields_json");
        assert_eq!(fields, json!({"priority": 2, "title": "A"}));
    }
    drop_schema(&base, &schema).await;
}

#[tokio::test]
#[ignore = "需要 STONEFLOW_SYNC_DATABASE_URL 或 DATABASE_URL"]
async fn upload_should_reject_patch_after_tombstone() {
    if !require_pg() {
        return;
    }
    let (config, schema, base) = open_isolated_cloud().await.expect("cloud");
    {
        let mut conn = connect_ready(&config).await.expect("connect");
        let entity = entity();
        upload_operation(
            &mut conn,
            &operation(
                "operation-delete",
                SyncMutation::Tombstone {
                    tombstone: Tombstone {
                        entity: entity.clone(),
                        deletion_seq: 0,
                        deleted_at: "2026-07-23T00:00:00Z".to_owned(),
                    },
                },
            ),
        )
        .await
        .expect("tombstone");

        let error = upload_operation(
            &mut conn,
            &operation("operation-stale", patch(&[("title", json!("old"))])),
        )
        .await
        .expect_err("stale");
        assert!(error.message().contains("entity-gone"));
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM sync_change_log")
            .fetch_one(&mut conn)
            .await
            .expect("count");
        assert_eq!(count, 1);
    }
    drop_schema(&base, &schema).await;
}

#[tokio::test]
#[ignore = "需要 STONEFLOW_SYNC_DATABASE_URL 或 DATABASE_URL"]
async fn download_after_should_return_changes_and_expire_cursor() {
    if !require_pg() {
        return;
    }
    let (config, schema, base) = open_isolated_cloud().await.expect("cloud");
    {
        let mut conn = connect_ready(&config).await.expect("connect");
        upload_operation(
            &mut conn,
            &operation("op-1", patch(&[("title", json!("A"))])),
        )
        .await
        .expect("upload");
        upload_operation(
            &mut conn,
            &operation("op-2", patch(&[("title", json!("B"))])),
        )
        .await
        .expect("upload2");

        let page = download_after(&mut conn, 0, 200).await.expect("download");
        assert_eq!(page.len(), 2);
        assert_eq!(page[0].server_seq, 1);

        sqlx::query("DELETE FROM sync_change_log WHERE server_seq = 1")
            .execute(&mut conn)
            .await
            .expect("prune");
        let err = download_after(&mut conn, 0, 200)
            .await
            .expect_err("expired");
        assert!(matches!(err, SyncError::CursorExpired));

        let baseline = download_full(&mut conn).await.expect("full");
        assert_eq!(baseline.cursor.server_seq, 2);
        assert_eq!(baseline.entities.len(), 1);
    }
    drop_schema(&base, &schema).await;
}

#[tokio::test]
#[ignore = "需要 STONEFLOW_SYNC_DATABASE_URL 或 DATABASE_URL"]
async fn health_should_report_schema_and_seq() {
    if !require_pg() {
        return;
    }
    let (config, schema, base) = open_isolated_cloud().await.expect("cloud");
    {
        let mut conn = connect_ready(&config).await.expect("connect");
        let probe = health(&mut conn).await.expect("health");
        assert_eq!(probe.schema_version, Some(1));
        assert_eq!(probe.latest_server_seq, None);

        upload_operation(&mut conn, &operation("op", patch(&[("t", json!(1))])))
            .await
            .expect("upload");
        let probe = health(&mut conn).await.expect("health2");
        assert_eq!(probe.latest_server_seq, Some(1));
    }
    drop_schema(&base, &schema).await;
}

#[tokio::test]
#[ignore = "需要 STONEFLOW_SYNC_DATABASE_URL 或 DATABASE_URL"]
async fn concurrent_upload_same_operation_should_converge() {
    if !require_pg() {
        return;
    }
    let (config, schema, base) = open_isolated_cloud().await.expect("cloud");
    let operation = operation("operation-1", patch(&[("title", json!("A"))]));
    let config_a = config.clone();
    let config_b = config.clone();
    let op_a = operation.clone();
    let op_b = operation.clone();

    let (first, second) = tokio::join!(
        async move {
            let mut conn = connect_ready(&config_a).await.expect("a");
            upload_operation(&mut conn, &op_a).await
        },
        async move {
            let mut conn = connect_ready(&config_b).await.expect("b");
            upload_operation(&mut conn, &op_b).await
        }
    );
    let first = first.expect("first");
    let second = second.expect("second");
    assert_eq!(first.committed_seq, second.committed_seq);
    assert!(first.was_already_applied || second.was_already_applied);

    {
        let mut conn = connect_ready(&config).await.expect("c");
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM sync_change_log")
            .fetch_one(&mut conn)
            .await
            .expect("count");
        assert_eq!(count, 1);
    }
    drop_schema(&base, &schema).await;
}

fn entity() -> EntityIdentity {
    EntityIdentity {
        entity_type: SyncEntityKind::Task,
        entity_id: "task-1".to_owned(),
        generation: 1,
    }
}

fn patch(values: &[(&str, serde_json::Value)]) -> SyncMutation {
    SyncMutation::Patch {
        patch: EntityPatch {
            entity: entity(),
            fields: values
                .iter()
                .map(|(key, value)| ((*key).to_owned(), value.clone()))
                .collect::<BTreeMap<_, _>>(),
        },
    }
}

fn operation(operation_id: &str, mutation: SyncMutation) -> SyncOperation {
    SyncOperation {
        device_id: "device-1".to_owned(),
        operation_id: operation_id.to_owned(),
        mutations: vec![mutation],
        created_at: "2026-07-23T00:00:00Z".to_owned(),
    }
}

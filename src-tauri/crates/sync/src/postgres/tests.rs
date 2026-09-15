//! Postgres 云端副本集成测。
//!
//! 运行：
//! ```text
//! STONEFLOW_SYNC_DATABASE_URL=postgresql://… cargo test -p stoneflow-sync --lib postgres:: -- --ignored
//! ```

use std::collections::BTreeMap;

use serde_json::json;
use sqlx::{Connection, PgConnection, Row};

use super::test_support::{base_database_url, drop_schema, open_empty_cloud, open_isolated_cloud};
use super::{
    connect_ready, download_after, download_full, ensure_ready, health, upload_operation,
    PROTOCOL_SCHEMA_VERSION,
};
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
        for version in [1_i64, 2, 999] {
            sqlx::query("UPDATE sync_schema SET version = $1 WHERE name = 'stoneflow'")
                .bind(version)
                .execute(&mut conn)
                .await
                .expect("change version");
            let err = ensure_ready(&mut conn).await.expect_err("incompatible");
            assert!(matches!(err, SyncError::Schema { .. }));
            let stored = super::schema::read_schema_version(&mut conn)
                .await
                .expect("version");
            assert_eq!(stored, version);
        }
    }
    drop_schema(&base, &schema).await;
}

#[tokio::test]
#[ignore = "需要 STONEFLOW_SYNC_DATABASE_URL 或 DATABASE_URL"]
async fn upload_rechecks_version_after_handshake_and_holds_it_until_commit() {
    let (config, schema, base) = open_isolated_cloud().await.unwrap();
    let mut conn = connect_ready(&config).await.unwrap();
    let mut admin = super::connect(&config).await.unwrap();
    let mut tx = conn.begin().await.unwrap();
    super::schema::lock_current_version(&mut tx).await.unwrap();
    sqlx::query("SET lock_timeout = '100ms'")
        .execute(&mut admin)
        .await
        .unwrap();
    let error = sqlx::query("UPDATE sync_schema SET version = 2")
        .execute(&mut admin)
        .await
        .unwrap_err();
    assert_eq!(
        error
            .as_database_error()
            .and_then(|error| error.code())
            .as_deref(),
        Some("55P03")
    );
    tx.commit().await.unwrap();
    sqlx::query("UPDATE sync_schema SET version = 2")
        .execute(&mut admin)
        .await
        .unwrap();
    let before = stored_state(&mut admin).await;
    let error = upload_operation(
        &mut conn,
        &operation("stale-ready", patch(&[("title", json!("拒绝旧连接写入"))])),
    )
    .await
    .unwrap_err();
    assert_eq!(error.kind(), crate::SyncErrorKind::Schema);
    assert_eq!(stored_state(&mut admin).await, before);
    drop(conn);
    drop(admin);
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
async fn empty_patch_after_tombstone_is_acknowledged_without_changing_entities() {
    let (config, schema, base) = open_isolated_cloud().await.unwrap();
    let mut conn = connect_ready(&config).await.unwrap();
    upload_operation(
        &mut conn,
        &operation("create-task", patch(&[("title", json!("保留"))])),
    )
    .await
    .unwrap();
    let deleted = EntityIdentity {
        entity_type: SyncEntityKind::View,
        entity_id: "deleted-view".to_owned(),
        generation: 2,
    };
    upload_operation(
        &mut conn,
        &operation(
            "delete-view",
            SyncMutation::Tombstone {
                tombstone: Tombstone {
                    entity: deleted.clone(),
                    deletion_seq: 0,
                    deleted_at: "2026-09-15T00:00:00Z".to_owned(),
                },
            },
        ),
    )
    .await
    .unwrap();
    let baseline = download_full(&mut conn).await.unwrap();
    let empty = operation(
        "empty-after-delete",
        SyncMutation::Patch {
            patch: EntityPatch {
                entity: EntityIdentity {
                    generation: 1,
                    ..deleted
                },
                fields: BTreeMap::new(),
            },
        },
    );
    let acknowledged = upload_operation(&mut conn, &empty).await.unwrap();
    assert_eq!(acknowledged.committed_seq, 3);
    let after = download_full(&mut conn).await.unwrap();
    assert_eq!(after.entities, baseline.entities);
    assert_eq!(after.tombstones, baseline.tombstones);
    let page = download_after(&mut conn, 2, 200).await.unwrap();
    assert_eq!(page.len(), 1);
    assert_eq!(page[0].server_seq, 3);
    assert!(matches!(&page[0].mutation, SyncMutation::Patch { patch } if patch.fields.is_empty()));
    drop(conn);
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
        assert_eq!(probe.schema_version, Some(PROTOCOL_SCHEMA_VERSION));
        assert_eq!(probe.latest_server_seq, None);
        assert!(!probe.remote_instance_id.is_empty());
        let instance_id = probe.remote_instance_id;

        upload_operation(&mut conn, &operation("op", patch(&[("t", json!(1))])))
            .await
            .expect("upload");
        let probe = health(&mut conn).await.expect("health2");
        assert_eq!(probe.latest_server_seq, Some(1));
        assert_eq!(probe.remote_instance_id, instance_id);
    }
    drop_schema(&base, &schema).await;
}

#[tokio::test]
#[ignore = "需要 STONEFLOW_SYNC_DATABASE_URL 或 DATABASE_URL"]
async fn ensure_ready_should_not_modify_existing_projection() {
    if !require_pg() {
        return;
    }
    let (config, schema, base) = open_isolated_cloud().await.expect("cloud");
    {
        let mut conn = connect_ready(&config).await.expect("connect");
        sqlx::query(
            r#"
            INSERT INTO sync_entity_state(
                entity_type, entity_id, generation, fields_json,
                field_versions_json, lifecycle_state, lifecycle_seq, updated_seq
            ) VALUES
                ('task', 'task-legacy', 1, '{}', '{}', 'active', 0, 1),
                ('task', 'task-legacy', 2, '{}', '{}', 'active', 0, 2)
            "#,
        )
        .execute(&mut conn)
        .await
        .expect("two generations should insert");
        drop(conn);

        connect_ready(&config)
            .await
            .expect("existing remote should be readable");

        let mut conn = super::connect(&config).await.expect("reconnect");
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM sync_entity_state WHERE entity_id = 'task-legacy'",
        )
        .fetch_one(&mut conn)
        .await
        .expect("generations should remain readable");
        assert_eq!(count, 2);
    }
    drop_schema(&base, &schema).await;
}

#[tokio::test]
#[ignore = "需要 STONEFLOW_SYNC_DATABASE_URL 或 DATABASE_URL"]
async fn ensure_ready_should_reject_v1_without_mutating_schema() {
    if !require_pg() {
        return;
    }
    let (config, schema, base) = open_isolated_cloud().await.expect("cloud");
    {
        let mut conn = connect_ready(&config).await.expect("connect");
        sqlx::query("ALTER TABLE sync_schema DROP COLUMN instance_id")
            .execute(&mut conn)
            .await
            .expect("remove identity");
        sqlx::query("UPDATE sync_schema SET version = 1 WHERE name = 'stoneflow'")
            .execute(&mut conn)
            .await
            .expect("v1 marker");

        let error = ensure_ready(&mut conn)
            .await
            .expect_err("v1 must be rejected");
        assert!(matches!(error, SyncError::Schema { .. }));
        assert_eq!(
            super::schema::read_schema_version(&mut conn)
                .await
                .expect("version"),
            1
        );
        let has_identity: bool = sqlx::query_scalar(
            "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'sync_schema' AND column_name = 'instance_id')"
        ).fetch_one(&mut conn).await.expect("column state");
        assert!(!has_identity);
    }
    drop_schema(&base, &schema).await;
}

#[tokio::test]
#[ignore = "需要 STONEFLOW_SYNC_DATABASE_URL 或 DATABASE_URL"]
async fn ensure_ready_should_reject_unversioned_and_partial_schema_without_repair() {
    if !require_pg() {
        return;
    }
    let (config, schema, base) = open_isolated_cloud().await.expect("cloud");
    {
        let mut conn = connect_ready(&config).await.expect("connect");
        upload_operation(
            &mut conn,
            &operation("op", patch(&[("title", json!("keep"))])),
        )
        .await
        .expect("upload");
        sqlx::query("DELETE FROM sync_schema")
            .execute(&mut conn)
            .await
            .expect("remove marker");
        let error = ensure_ready(&mut conn).await.expect_err("missing version");
        assert!(matches!(error, SyncError::Schema { .. }));
        let marker_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM sync_schema")
            .fetch_one(&mut conn)
            .await
            .expect("marker count");
        let change_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM sync_change_log")
            .fetch_one(&mut conn)
            .await
            .expect("change count");
        assert_eq!(marker_count, 0);
        assert_eq!(change_count, 1);

        sqlx::query("DROP TABLE sync_upload_acks")
            .execute(&mut conn)
            .await
            .expect("partial schema");
        let error = ensure_ready(&mut conn).await.expect_err("missing table");
        assert!(matches!(error, SyncError::Schema { .. }));
        let missing: bool = sqlx::query_scalar("SELECT to_regclass('sync_upload_acks') IS NULL")
            .fetch_one(&mut conn)
            .await
            .expect("table state");
        assert!(missing);
    }
    drop_schema(&base, &schema).await;
}

#[tokio::test]
#[ignore = "需要 STONEFLOW_SYNC_DATABASE_URL 或 DATABASE_URL"]
async fn facade_should_reject_a_connection_whose_instance_identity_changed() {
    if !require_pg() {
        return;
    }
    let (mut config, schema, base) = open_isolated_cloud().await.expect("cloud");
    let actual = crate::health(&config)
        .await
        .expect("initial health should succeed")
        .remote_instance_id;
    config.expected_instance_id = Some(format!("different-{actual}"));

    let error = crate::health(&config)
        .await
        .expect_err("mismatched identity must fail closed");

    assert!(matches!(error, SyncError::Validation { .. }));
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

#[tokio::test]
#[ignore = "需要 STONEFLOW_SYNC_DATABASE_URL 或 DATABASE_URL"]
async fn concurrent_first_handshakes_should_initialize_one_identity() {
    if !require_pg() {
        return;
    }
    let (config, schema, base) = open_empty_cloud().await.expect("empty cloud");
    let (first, second) = tokio::join!(crate::health(&config), crate::health(&config));
    let first = first.expect("first handshake");
    let second = second.expect("second handshake");
    assert_eq!(first.remote_instance_id, second.remote_instance_id);
    assert_eq!(first.schema_version, Some(PROTOCOL_SCHEMA_VERSION));
    assert_eq!(first.latest_server_seq, None);
    drop_schema(&base, &schema).await;
}

#[tokio::test]
#[ignore = "需要 STONEFLOW_SYNC_DATABASE_URL 或 DATABASE_URL"]
async fn identity_check_must_not_fall_through_to_another_schema() {
    if !require_pg() {
        return;
    }
    let (config, schema, base) = open_isolated_cloud().await.expect("cloud");
    let existing = crate::health(&config).await.expect("existing identity");
    let empty_schema = format!("{schema}_first");
    let mut conn = super::connect(&config).await.expect("connect");
    sqlx::query(sqlx::AssertSqlSafe(format!(
        "CREATE SCHEMA \"{empty_schema}\""
    )))
    .execute(&mut conn)
    .await
    .expect("empty first schema");
    let mut candidate = config.clone();
    candidate.database_url = config.database_url.replace(
        &format!("search_path%3D{schema}"),
        &format!("search_path%3D{empty_schema}%2C{schema}"),
    );
    candidate.expected_instance_id = Some(existing.remote_instance_id.clone());
    let error = crate::health(&candidate)
        .await
        .expect_err("identity belongs to another schema");
    assert!(matches!(error, SyncError::Validation { .. }));
    let mut first_schema_conn = super::connect(&candidate).await.expect("first schema");
    let has_sync_table: bool = sqlx::query_scalar("SELECT to_regclass('sync_schema') IS NOT NULL")
        .fetch_one(&mut first_schema_conn)
        .await
        .expect("table state");
    assert!(!has_sync_table);
    assert_eq!(
        crate::health(&config)
            .await
            .expect("unchanged remote")
            .remote_instance_id,
        existing.remote_instance_id
    );
    drop(first_schema_conn);
    drop(conn);
    drop_schema(&base, &empty_schema).await;
    drop_schema(&base, &schema).await;
}

async fn stored_state(conn: &mut PgConnection) -> serde_json::Value {
    sqlx::query_scalar(
        r#"SELECT jsonb_build_object(
            'schema', (SELECT jsonb_agg(to_jsonb(s)) FROM sync_schema s),
            'entities', (SELECT jsonb_agg(to_jsonb(s) ORDER BY entity_type, entity_id, generation) FROM sync_entity_state s),
            'changes', (SELECT jsonb_agg(to_jsonb(s) ORDER BY server_seq) FROM sync_change_log s),
            'acks', (SELECT jsonb_agg(to_jsonb(s) ORDER BY device_id, operation_id) FROM sync_upload_acks s),
            'tombstones', (SELECT jsonb_agg(to_jsonb(s) ORDER BY entity_type, entity_id, generation) FROM sync_tombstones s),
            'sequence', (SELECT jsonb_build_object('last_value', last_value, 'is_called', is_called) FROM sync_change_log_server_seq_seq)
        )"#,
    ).fetch_one(conn).await.unwrap()
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

//! View 用例、真实 Outbox 与同步物化之间的回归。

use super::*;
use stoneflow_application::{
    operation::OutboxPayload,
    view::{
        CreateViewInput, FilterQueryValue, ListViewsInput, TaskScopeInput, TaskScopeKind,
        TaskViewBaseKey, TaskViewContext, UpdateViewInput,
    },
};
use stoneflow_storage::{adapters::build_view_service, repositories::OutboxRepository};
use stoneflow_sync::{EntityPatch, SyncCursor};
use stoneflow_test_support::TestDatabase;

fn scope() -> TaskScopeInput {
    TaskScopeInput {
        kind: TaskScopeKind::All,
        space_id: None,
    }
}

fn filters(status: &str) -> FilterQueryValue {
    serde_json::from_value(json!({
        "clauses": [{"id": "status", "field": "status", "op": "is", "values": [status]}]
    }))
    .unwrap()
}

async fn create_view(database: &TestDatabase) -> String {
    build_view_service(database.connection().clone())
        .create_view(CreateViewInput {
            name: "待执行".into(),
            scope: scope(),
            context: TaskViewContext::All,
            base_view_key: TaskViewBaseKey::Active,
            filters: filters("todo"),
        })
        .await
        .unwrap()
        .id
}

fn update(view_id: &str) -> UpdateViewInput {
    UpdateViewInput {
        view_id: view_id.into(),
        name: None,
        scope: None,
        context: None,
        base_view_key: None,
        filters: None,
    }
}

async fn changes(database: &TestDatabase, first_sequence: i64) -> Vec<SequencedMutation> {
    let pending = OutboxRepository::new(database.connection().clone())
        .list_pending_operations(100)
        .await
        .unwrap();
    pending
        .into_iter()
        .flat_map(|operation| operation.entries)
        .enumerate()
        .map(|(index, entry)| {
            let server_seq = first_sequence + index as i64;
            let entity = EntityIdentity {
                entity_type: SyncEntityKind::View,
                entity_id: entry.entity_id,
                generation: entry.generation,
            };
            let mutation = match serde_json::from_str::<OutboxPayload>(&entry.payload_json).unwrap()
            {
                OutboxPayload::Patch { fields } => SyncMutation::Patch {
                    patch: EntityPatch {
                        entity,
                        fields: fields.into_iter().collect(),
                    },
                },
                OutboxPayload::Tombstone { deleted_at } => SyncMutation::Tombstone {
                    tombstone: Tombstone {
                        entity,
                        deletion_seq: server_seq,
                        deleted_at,
                    },
                },
                OutboxPayload::Lifecycle { .. } => panic!("View 不使用生命周期 patch"),
            };
            SequencedMutation {
                server_seq,
                mutation,
                committed_at: entry.created_at,
            }
        })
        .collect()
}

async fn restore(database: &TestDatabase, replica: &ReplicaEntity, sequence: i64) {
    apply_baseline(
        database,
        "test-remote",
        Baseline {
            cursor: SyncCursor {
                server_seq: sequence,
            },
            entities: replica.snapshot.iter().cloned().collect(),
            tombstones: replica.tombstone.iter().cloned().collect(),
        },
    )
    .await
    .unwrap();
}

async fn stored_view(database: &TestDatabase, id: &str) -> sea_orm::QueryResult {
    database
        .connection()
        .query_one_raw(statement(
            "SELECT * FROM views WHERE id = ?",
            vec![id.into()],
        ))
        .await
        .unwrap()
        .unwrap()
}

#[tokio::test]
async fn view_outbox_round_trip_stays_editable_and_can_bootstrap_a_new_replica() {
    let source = TestDatabase::bootstrap_in_memory().await.unwrap();
    let target = TestDatabase::bootstrap_in_memory().await.unwrap();
    let fresh = TestDatabase::bootstrap_in_memory().await.unwrap();
    let id = create_view(&source).await;
    let mut remote = ReplicaEntity::default();
    for change in changes(&source, 1).await {
        apply_mutation(&mut remote, &change.mutation, change.server_seq);
    }
    restore(&target, &remote, 1).await;
    assert_eq!(
        stored_view(&target, &id)
            .await
            .try_get::<String>("", "group_by_json")
            .unwrap(),
        "\"none\""
    );

    let service = build_view_service(target.connection().clone());
    service
        .update_view(UpdateViewInput {
            name: Some("重点事项".into()),
            ..update(&id)
        })
        .await
        .unwrap();
    service
        .update_view(UpdateViewInput {
            filters: Some(filters("doing")),
            ..update(&id)
        })
        .await
        .unwrap();
    let updates = changes(&target, 2).await;
    assert_eq!(updates.len(), 2);
    for change in &updates {
        apply_mutation(&mut remote, &change.mutation, change.server_seq);
    }
    restore(&fresh, &remote, 3).await;
    let view = build_view_service(fresh.connection().clone())
        .list_views(ListViewsInput { scope: scope() })
        .await
        .unwrap()
        .pop()
        .unwrap();
    assert_eq!(view.id, id);
    assert_eq!(view.name, "重点事项");
    assert_eq!(view.filters, filters("doing"));
    assert_eq!(view.base_view_key, TaskViewBaseKey::Active);

    build_view_service(fresh.connection().clone())
        .delete_view(&id)
        .await
        .unwrap();
    let deletion = changes(&fresh, 4).await;
    apply_page(&target, "test-remote", &deletion, 4)
        .await
        .unwrap();
    apply_page(&target, "test-remote", &deletion, 4)
        .await
        .unwrap();
    assert!(service
        .list_views(ListViewsInput { scope: scope() })
        .await
        .unwrap()
        .is_empty());
    assert_eq!(read_cursor(&target).await.unwrap(), Some(4));
}

#[tokio::test]
async fn view_legacy_delta_hydrates_cold_and_new_generation_protocols() {
    for warm in [false, true] {
        let database = TestDatabase::bootstrap_in_memory().await.unwrap();
        let id = create_view(&database).await;
        if warm {
            let initial = changes(&database, 1).await;
            apply_page(&database, "test-remote", &initial, 1)
                .await
                .unwrap();
        }
        let original = stored_view(&database, &id).await;
        let change = SequencedMutation {
            server_seq: 2,
            mutation: SyncMutation::Patch {
                patch: EntityPatch {
                    entity: EntityIdentity {
                        entity_type: SyncEntityKind::View,
                        entity_id: id.clone(),
                        generation: 2,
                    },
                    fields: BTreeMap::from([
                        ("name".into(), json!("同步重命名")),
                        ("updated_at".into(), json!("2026-09-13T00:00:00Z")),
                    ]),
                },
            },
            committed_at: "2026-09-13T00:00:00Z".into(),
        };
        apply_page(&database, "test-remote", std::slice::from_ref(&change), 2)
            .await
            .unwrap();
        let row = stored_view(&database, &id).await;
        assert_eq!(row.try_get::<String>("", "name").unwrap(), "同步重命名");
        assert_eq!(
            row.try_get::<String>("", "filters_json").unwrap(),
            original.try_get::<String>("", "filters_json").unwrap()
        );
        assert_eq!(
            row.try_get::<String>("", "created_at").unwrap(),
            original.try_get::<String>("", "created_at").unwrap()
        );
        assert_eq!(row.try_get::<i64>("", "generation").unwrap(), 2);
        let replica = load_replica(
            &database.connection().begin().await.unwrap(),
            change.mutation.entity(),
        )
        .await
        .unwrap();
        assert!(snapshot_has_required_business_fields(
            replica.snapshot.as_ref().unwrap()
        ));
        apply_page(&database, "test-remote", &[change], 2)
            .await
            .unwrap();
        assert_eq!(read_cursor(&database).await.unwrap(), Some(2));
    }
}

#[tokio::test]
async fn unresolvable_view_delta_rolls_back_business_protocol_and_cursor_then_replays() {
    let database = TestDatabase::bootstrap_in_memory().await.unwrap();
    let id = create_view(&database).await;
    let initial = changes(&database, 1).await;
    apply_page(&database, "test-remote", &initial, 1)
        .await
        .unwrap();
    let valid = SequencedMutation {
        server_seq: 2,
        committed_at: "2026-09-13T00:00:00Z".into(),
        mutation: SyncMutation::Patch {
            patch: EntityPatch {
                entity: initial[0].mutation.entity().clone(),
                fields: BTreeMap::from([("name".into(), json!("新名称"))]),
            },
        },
    };
    let missing = SequencedMutation {
        server_seq: 3,
        committed_at: valid.committed_at.clone(),
        mutation: SyncMutation::Patch {
            patch: EntityPatch {
                entity: EntityIdentity {
                    entity_type: SyncEntityKind::View,
                    entity_id: "missing-view".into(),
                    generation: 1,
                },
                fields: BTreeMap::from([("name".into(), json!("没有定义"))]),
            },
        },
    };
    let page = [valid, missing];
    assert!(apply_page(&database, "test-remote", &page, 3)
        .await
        .is_err());
    assert_eq!(read_cursor(&database).await.unwrap(), Some(1));
    assert_eq!(
        stored_view(&database, &id)
            .await
            .try_get::<String>("", "name")
            .unwrap(),
        "待执行"
    );
    let transaction = database.connection().begin().await.unwrap();
    let replica = load_replica(&transaction, initial[0].mutation.entity())
        .await
        .unwrap();
    assert_eq!(replica.snapshot.unwrap().fields["name"], json!("待执行"));
    let count: i64 = transaction
        .query_one_raw(statement(
            "SELECT COUNT(*) AS n FROM sync_protocol_entities",
            vec![],
        ))
        .await
        .unwrap()
        .unwrap()
        .try_get("", "n")
        .unwrap();
    assert_eq!(count, 1);
    transaction.rollback().await.unwrap();
    // 模拟从完整副本恢复缺失定义，再重放原页；不能靠丢掉失败 mutation 通过。
    database
        .connection()
        .execute_raw(statement(
            "INSERT INTO views SELECT 'missing-view', name, entity_kind, scope_json, filters_json, sort_json, group_by_json, position, generation, created_at, updated_at FROM views WHERE id = ?",
            vec![id.clone().into()],
        ))
        .await
        .unwrap();
    apply_page(&database, "test-remote", &page, 3)
        .await
        .unwrap();
    apply_page(&database, "test-remote", &page, 3)
        .await
        .unwrap();
    assert_eq!(read_cursor(&database).await.unwrap(), Some(3));
    assert_eq!(
        stored_view(&database, &id)
            .await
            .try_get::<String>("", "name")
            .unwrap(),
        "新名称"
    );
    assert_eq!(
        stored_view(&database, "missing-view")
            .await
            .try_get::<String>("", "name")
            .unwrap(),
        "没有定义"
    );
}

#[tokio::test]
async fn concurrent_view_edits_merge_fields_and_deleted_views_reject_old_edits() {
    let first = TestDatabase::bootstrap_in_memory().await.unwrap();
    let second = TestDatabase::bootstrap_in_memory().await.unwrap();
    let id = create_view(&first).await;
    let initial = changes(&first, 1).await;
    let mut remote = ReplicaEntity::default();
    apply_mutation(&mut remote, &initial[0].mutation, 1);
    restore(&second, &remote, 1).await;
    build_view_service(first.connection().clone())
        .update_view(UpdateViewInput {
            name: Some("设备 A 的名称".into()),
            ..update(&id)
        })
        .await
        .unwrap();
    build_view_service(second.connection().clone())
        .update_view(UpdateViewInput {
            filters: Some(filters("waiting")),
            ..update(&id)
        })
        .await
        .unwrap();
    let first_updates = changes(&first, 1).await;
    let second_updates = changes(&second, 3).await;
    let name_change = &first_updates[1];
    let filter_change = &second_updates[0];
    assert_eq!(
        name_change.mutation.entity().generation,
        initial[0].mutation.entity().generation
    );
    assert_eq!(
        filter_change.mutation.entity().generation,
        initial[0].mutation.entity().generation
    );
    apply_mutation(&mut remote, &name_change.mutation, 2);
    apply_mutation(&mut remote, &filter_change.mutation, 3);
    assert_eq!(
        remote.snapshot.as_ref().unwrap().fields["name"],
        json!("设备 A 的名称")
    );
    assert_eq!(
        remote.snapshot.as_ref().unwrap().fields["filters"]["filters"],
        json!(filters("waiting"))
    );
    let fresh = TestDatabase::bootstrap_in_memory().await.unwrap();
    restore(&fresh, &remote, 3).await;
    build_view_service(fresh.connection().clone())
        .delete_view(&id)
        .await
        .unwrap();
    let deletion = changes(&fresh, 4).await;
    apply_mutation(&mut remote, &deletion[0].mutation, 4);
    assert_eq!(
        apply_mutation(&mut remote, &name_change.mutation, 5),
        stoneflow_sync::ApplyOutcome::IgnoredByTombstone
    );
    assert!(remote.snapshot.is_none());
}

#[tokio::test]
async fn view_origin_seed_and_protocol_warmup_share_canonical_fields() {
    let database = TestDatabase::bootstrap_in_memory().await.unwrap();
    let id = create_view(&database).await;
    database
        .connection()
        .execute_raw(statement(
            "UPDATE views SET group_by_json = 'none' WHERE id = ?",
            vec![id.clone().into()],
        ))
        .await
        .unwrap();
    let before = stored_view(&database, &id).await;
    let seeded = crate::sync::origin_seed::seed_origin_outbox_if_needed(&database)
        .await
        .unwrap();
    assert!(seeded > 0);
    assert_eq!(
        crate::sync::origin_seed::seed_origin_outbox_if_needed(&database)
            .await
            .unwrap(),
        0
    );
    let operations = OutboxRepository::new(database.connection().clone())
        .list_pending_operations(100)
        .await
        .unwrap();
    let entry = operations
        .iter()
        .find(|operation| operation.operation_id == format!("origin-seed:view:{id}"))
        .unwrap()
        .entries
        .first()
        .unwrap();
    let OutboxPayload::Patch { fields } = serde_json::from_str(&entry.payload_json).unwrap() else {
        panic!("origin seed 必须包含完整字段");
    };
    assert_eq!(fields["group_by"], json!("none"));
    assert_eq!(fields["sort"], json!([]));
    assert_eq!(fields["filters"]["filters"], json!(filters("todo")));
    let transaction = database.connection().begin().await.unwrap();
    seed_protocol_views(&transaction, 0).await.unwrap();
    let replica = load_replica(
        &transaction,
        &EntityIdentity {
            entity_type: SyncEntityKind::View,
            entity_id: id.clone(),
            generation: 1,
        },
    )
    .await
    .unwrap();
    assert_eq!(
        replica.snapshot.unwrap().fields,
        fields.into_iter().collect()
    );
    transaction.commit().await.unwrap();
    let after = stored_view(&database, &id).await;
    for key in ["created_at", "updated_at", "filters_json"] {
        assert_eq!(
            before.try_get::<String>("", key).unwrap(),
            after.try_get::<String>("", key).unwrap()
        );
    }
    assert_eq!(
        before.try_get::<i64>("", "generation").unwrap(),
        after.try_get::<i64>("", "generation").unwrap()
    );
}

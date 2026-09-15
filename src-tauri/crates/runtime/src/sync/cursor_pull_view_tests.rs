//! View 用例、真实 Outbox 与同步物化之间的回归。

use super::*;
use stoneflow_application::{
    operation::OutboxPayload,
    view::{
        CreateViewInput, FilterQueryValue, ListViewsInput, TaskScopeInput, TaskScopeKind,
        TaskViewBaseKey, TaskViewContext, UpdateViewInput, ViewListItemDto,
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

const OTHER_SPACE_ID: &str = "01999000-0000-7000-8000-000000000001";

async fn mixed_view_page(database: &TestDatabase) -> Vec<SequencedMutation> {
    create_view(database).await;
    let initial = changes(database, 1).await.remove(0);
    (0..4)
        .map(|index| {
            let mut change = initial.clone();
            change.server_seq = index + 1;
            let SyncMutation::Patch { patch } = &mut change.mutation else {
                panic!("创建 View 应生成完整 patch");
            };
            patch.entity.entity_id = stoneflow_domain::create_id().to_string();
            patch.fields.insert("position".into(), json!(index * 1000));
            if index == 1 || index == 3 {
                patch.fields.insert(
                    "scope".into(),
                    json!({"type": "space", "spaceId": OTHER_SPACE_ID}),
                );
            }
            if index == 2 {
                patch.fields.insert(
                    "scope".into(),
                    json!({"type": "future-scope", "spaceId": OTHER_SPACE_ID}),
                );
            }
            if index == 3 {
                patch.fields.insert(
                    "filters".into(),
                    json!({"planned": {"mode": "between", "from": null, "to": null}}),
                );
            }
            change
        })
        .collect()
}

fn baseline_from_page(page: &[SequencedMutation]) -> Baseline {
    Baseline {
        cursor: SyncCursor {
            server_seq: page.last().unwrap().server_seq,
        },
        entities: page
            .iter()
            .map(|change| {
                let mut replica = ReplicaEntity::default();
                apply_mutation(&mut replica, &change.mutation, change.server_seq);
                replica.snapshot.unwrap()
            })
            .collect(),
        tombstones: vec![],
    }
}

#[tokio::test]
async fn mixed_view_download_retains_invalid_definitions_and_lists_each_scope_independently() {
    let source = TestDatabase::bootstrap_in_memory().await.unwrap();
    let page = mixed_view_page(&source).await;
    for baseline in [false, true] {
        let database = TestDatabase::bootstrap_in_memory().await.unwrap();
        if baseline {
            apply_baseline(&database, "test-remote", baseline_from_page(&page))
                .await
                .unwrap();
        } else {
            apply_page(&database, "test-remote", &page, 4)
                .await
                .unwrap();
        }

        for change in &page {
            let SyncMutation::Patch { patch } = &change.mutation else {
                unreachable!();
            };
            let row = stored_view(&database, &patch.entity.entity_id).await;
            for (field, column) in [("scope", "scope_json"), ("filters", "filters_json")] {
                let raw = row.try_get::<String>("", column).unwrap();
                assert_eq!(
                    serde_json::from_str::<Value>(&raw).unwrap(),
                    patch.fields[field]
                );
            }
            let transaction = database.connection().begin().await.unwrap();
            let replica = load_replica(&transaction, &patch.entity).await.unwrap();
            assert_eq!(replica.snapshot.unwrap().fields, patch.fields);
            transaction.rollback().await.unwrap();
        }
        assert_eq!(read_cursor(&database).await.unwrap(), Some(4));

        let service = build_view_service(database.connection().clone());
        let all = serde_json::to_value(
            service
                .list_views(ListViewsInput { scope: scope() })
                .await
                .unwrap(),
        )
        .unwrap();
        let all = all.as_array().unwrap();
        assert_eq!(all.len(), 2);
        assert_eq!(all[0]["id"], page[0].mutation.entity().entity_id);
        assert_eq!(all[0]["filters"], json!(filters("todo")));
        assert_eq!(all[1]["id"], page[2].mutation.entity().entity_id);
        assert!(all[1]["scope"].is_null());
        assert!(!all[1]["definitionError"].is_null());
        assert!(all[1].get("filters").is_none());

        let space = serde_json::to_value(
            service
                .list_views(ListViewsInput {
                    scope: TaskScopeInput {
                        kind: TaskScopeKind::Space,
                        space_id: Some(OTHER_SPACE_ID.into()),
                    },
                })
                .await
                .unwrap(),
        )
        .unwrap();
        let space = space.as_array().unwrap();
        assert_eq!(space.len(), 2);
        assert_eq!(space[0]["id"], page[1].mutation.entity().entity_id);
        assert_eq!(space[0]["filters"], json!(filters("todo")));
        assert_eq!(space[1]["id"], page[3].mutation.entity().entity_id);
        assert_eq!(space[1]["scope"]["spaceId"], OTHER_SPACE_ID);
        assert!(!space[1]["definitionError"].is_null());
        assert!(space[1].get("filters").is_none());
    }
}

#[tokio::test]
async fn retained_invalid_views_accept_later_patches_and_delete_through_real_outbox() {
    let source = TestDatabase::bootstrap_in_memory().await.unwrap();
    let page = mixed_view_page(&source).await;
    for protocol in ["warm", "cold-seed", "cold-delta"] {
        let database = TestDatabase::bootstrap_in_memory().await.unwrap();
        let replica = TestDatabase::bootstrap_in_memory().await.unwrap();
        apply_page(&database, "test-remote", &page, 4)
            .await
            .unwrap();
        apply_page(&replica, "test-remote", &page, 4).await.unwrap();
        if protocol != "warm" {
            database
                .connection()
                .execute_raw(statement("DELETE FROM sync_protocol_entities", vec![]))
                .await
                .unwrap();
        }
        if protocol == "cold-seed" {
            warm_local_protocol_if_needed(&database).await.unwrap();
        }
        let damaged_id = &page[2].mutation.entity().entity_id;
        let changed = SequencedMutation {
            server_seq: 5,
            committed_at: "2026-09-13T00:00:00Z".into(),
            mutation: SyncMutation::Patch {
                patch: EntityPatch {
                    entity: page[2].mutation.entity().clone(),
                    fields: BTreeMap::from([("name".into(), json!("仍可识别的坏视图"))]),
                },
            },
        };
        apply_page(&database, "test-remote", &[changed], 5)
            .await
            .unwrap();
        let row = stored_view(&database, damaged_id).await;
        assert_eq!(
            row.try_get::<String>("", "name").unwrap(),
            "仍可识别的坏视图"
        );
        let SyncMutation::Patch { patch } = &page[2].mutation else {
            unreachable!()
        };
        assert_eq!(
            serde_json::from_str::<Value>(&row.try_get::<String>("", "scope_json").unwrap())
                .unwrap(),
            patch.fields["scope"],
        );

        let service = build_view_service(database.connection().clone());
        for index in [2, 3] {
            service
                .delete_view(&page[index].mutation.entity().entity_id)
                .await
                .unwrap();
        }
        let deletions = changes(&database, 6).await;
        assert_eq!(deletions.len(), 2);
        apply_page(&replica, "test-remote", &deletions, 7)
            .await
            .unwrap();
        apply_page(&replica, "test-remote", &deletions, 7)
            .await
            .unwrap();
        for (index, original) in page[2..].iter().enumerate() {
            let mut stale = original.clone();
            stale.server_seq = 8 + index as i64;
            apply_page(&replica, "test-remote", &[stale], 8 + index as i64)
                .await
                .unwrap();
            assert!(View::find_by_id(&original.mutation.entity().entity_id)
                .one(replica.connection())
                .await
                .unwrap()
                .is_none());
            let transaction = replica.connection().begin().await.unwrap();
            let deleted = load_replica(&transaction, original.mutation.entity())
                .await
                .unwrap();
            assert!(deleted.snapshot.is_none());
            assert_eq!(deleted.tombstone.unwrap().entity.generation, 2);
            transaction.rollback().await.unwrap();
        }
        assert_eq!(read_cursor(&replica).await.unwrap(), Some(9));
    }
}

#[tokio::test]
async fn malformed_local_view_text_survives_origin_seed_and_protocol_warmup() {
    let database = TestDatabase::bootstrap_in_memory().await.unwrap();
    let id = create_view(&database).await;
    database
        .connection()
        .execute_raw(statement(
            "UPDATE views SET scope_json = ?, filters_json = ? WHERE id = ?",
            vec![
                "scope without json".into(),
                "{broken filters".into(),
                id.clone().into(),
            ],
        ))
        .await
        .unwrap();
    let before = stored_view(&database, &id).await;
    let seeded = crate::sync::origin_seed::seed_origin_outbox_if_needed(&database)
        .await
        .unwrap();
    assert!(seeded > 0);
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
        panic!("origin seed 必须保留完整字段");
    };
    assert_eq!(fields["scope"], json!("scope without json"));
    assert_eq!(fields["filters"], json!("{broken filters"));
    warm_local_protocol_if_needed(&database).await.unwrap();
    let transaction = database.connection().begin().await.unwrap();
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
        replica.snapshot.as_ref().unwrap().fields,
        fields.into_iter().collect()
    );
    transaction.rollback().await.unwrap();
    let after = stored_view(&database, &id).await;
    for column in ["scope_json", "filters_json", "created_at", "updated_at"] {
        assert_eq!(
            before.try_get::<String>("", column).unwrap(),
            after.try_get::<String>("", column).unwrap()
        );
    }
    let fresh = TestDatabase::bootstrap_in_memory().await.unwrap();
    restore(&fresh, &replica, 1).await;
    let unavailable = serde_json::to_value(
        build_view_service(fresh.connection().clone())
            .list_views(ListViewsInput { scope: scope() })
            .await
            .unwrap(),
    )
    .unwrap();
    assert_eq!(unavailable[0]["id"], id);
    assert!(unavailable[0]["scope"].is_null());
    assert!(!unavailable[0]["definitionError"].is_null());
    assert!(unavailable[0].get("filters").is_none());
    let stored = stored_view(&fresh, &id).await;
    assert_eq!(
        serde_json::from_str::<Value>(&stored.try_get::<String>("", "scope_json").unwrap())
            .unwrap(),
        json!("scope without json")
    );
    assert_eq!(
        serde_json::from_str::<Value>(&stored.try_get::<String>("", "filters_json").unwrap())
            .unwrap(),
        json!("{broken filters")
    );
    build_view_service(fresh.connection().clone())
        .delete_view(&id)
        .await
        .unwrap();
    assert!(View::find_by_id(&id)
        .one(fresh.connection())
        .await
        .unwrap()
        .is_none());
}

#[tokio::test]
async fn unrecoverable_view_or_storage_failure_rolls_back_page_and_baseline() {
    let source = TestDatabase::bootstrap_in_memory().await.unwrap();
    let page = mixed_view_page(&source).await;
    for invalid in [
        "missing-name",
        "negative-position",
        "unknown-entity-kind",
        "obsolete-sort",
        "obsolete-group",
        "missing-filters",
        "empty-id",
        "exhausted-generation",
        "storage-failure",
    ] {
        for baseline in [false, true] {
            let database = TestDatabase::bootstrap_in_memory().await.unwrap();
            apply_page(&database, "test-remote", &page[..1], 1)
                .await
                .unwrap();
            let mut replacement = page[0].clone();
            replacement.server_seq = 5;
            let SyncMutation::Patch { patch } = &mut replacement.mutation else {
                unreachable!()
            };
            patch.fields.insert("name".into(), json!("不应被部分写入"));
            let mut damaged = page[1].clone();
            damaged.server_seq = 6;
            let SyncMutation::Patch { patch } = &mut damaged.mutation else {
                unreachable!()
            };
            match invalid {
                "missing-name" => {
                    patch.fields.remove("name");
                }
                "negative-position" => {
                    patch.fields.insert("position".into(), json!(-1));
                }
                "unknown-entity-kind" => {
                    patch
                        .fields
                        .insert("entity_kind".into(), json!("future-kind"));
                }
                "obsolete-sort" => {
                    patch.fields.insert("sort".into(), json!([]));
                }
                "obsolete-group" => {
                    patch.fields.insert("group_by".into(), json!("none"));
                }
                "missing-filters" => {
                    patch.fields.remove("filters");
                }
                "empty-id" => {
                    patch.entity.entity_id.clear();
                }
                "exhausted-generation" => {
                    patch.entity.generation = i64::MAX;
                }
                "storage-failure" => {
                    database.connection().execute_raw(statement(
                        &format!(
                            "CREATE TRIGGER reject_view_materialization BEFORE INSERT ON views WHEN NEW.id = '{}' BEGIN SELECT RAISE(ABORT, '拒绝测试物化'); END",
                            patch.entity.entity_id,
                        ),
                        vec![],
                    )).await.unwrap();
                }
                _ => unreachable!(),
            }
            let invalid_page = [replacement, damaged];
            let result = if baseline {
                apply_baseline(&database, "test-remote", baseline_from_page(&invalid_page)).await
            } else {
                apply_page(&database, "test-remote", &invalid_page, 6).await
            };
            assert!(result.is_err(), "{invalid}, baseline={baseline}");
            assert_eq!(read_cursor(&database).await.unwrap(), Some(1));
            assert_eq!(
                View::find().all(database.connection()).await.unwrap().len(),
                1
            );
            assert_eq!(
                stored_view(&database, &page[0].mutation.entity().entity_id)
                    .await
                    .try_get::<String>("", "name")
                    .unwrap(),
                "待执行"
            );
            let transaction = database.connection().begin().await.unwrap();
            let existing = load_replica(&transaction, page[0].mutation.entity())
                .await
                .unwrap();
            assert_eq!(existing.snapshot.unwrap().fields["name"], json!("待执行"));
            let protocol_count: i64 = transaction
                .query_one_raw(statement(
                    "SELECT COUNT(*) AS n FROM sync_protocol_entities",
                    vec![],
                ))
                .await
                .unwrap()
                .unwrap()
                .try_get("", "n")
                .unwrap();
            assert_eq!(protocol_count, 1);
            transaction.rollback().await.unwrap();
        }
    }
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
    let item = build_view_service(fresh.connection().clone())
        .list_views(ListViewsInput { scope: scope() })
        .await
        .unwrap()
        .pop()
        .unwrap();
    let ViewListItemDto::Available(view) = item else {
        panic!("合法同步定义必须保持可编辑");
    };
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
async fn view_current_delta_hydrates_cold_and_warm_protocols() {
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
                        generation: 1,
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
        assert_eq!(row.try_get::<i64>("", "generation").unwrap(), 1);
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

fn empty_view_patch(id: &str, generation: i64, server_seq: i64) -> SequencedMutation {
    SequencedMutation {
        server_seq,
        committed_at: "2026-09-15T00:00:00Z".to_owned(),
        mutation: SyncMutation::Patch {
            patch: EntityPatch {
                entity: EntityIdentity {
                    entity_type: SyncEntityKind::View,
                    entity_id: id.to_owned(),
                    generation,
                },
                fields: BTreeMap::new(),
            },
        },
    }
}

#[tokio::test]
async fn empty_view_patch_does_not_block_cold_pages() {
    let source = TestDatabase::bootstrap_in_memory().await.unwrap();
    let id = create_view(&source).await;
    for with_valid_sibling in [false, true] {
        let target = TestDatabase::bootstrap_in_memory().await.unwrap();
        let mut page = vec![empty_view_patch("missing-view", 42, 1)];
        if with_valid_sibling {
            page.extend(changes(&source, 2).await);
        }
        let cursor = page.last().unwrap().server_seq;
        apply_page(&target, "test-remote", &page, cursor)
            .await
            .unwrap();
        assert_eq!(read_cursor(&target).await.unwrap(), Some(cursor));
        let binding = super::super::binding::read_remote_binding(target.connection())
            .await
            .unwrap();
        assert_eq!(binding.remote_instance_id.as_deref(), Some("test-remote"));
        assert_eq!(
            View::find().all(target.connection()).await.unwrap().len(),
            usize::from(with_valid_sibling)
        );
        if with_valid_sibling {
            assert_eq!(
                stored_view(&target, &id)
                    .await
                    .try_get::<String>("", "name")
                    .unwrap(),
                "待执行"
            );
        }
        let transaction = target.connection().begin().await.unwrap();
        assert_eq!(
            load_replica(&transaction, page[0].mutation.entity())
                .await
                .unwrap(),
            ReplicaEntity::default()
        );
        let protocol_count: i64 = transaction
            .query_one_raw(statement(
                "SELECT COUNT(*) AS n FROM sync_protocol_entities",
                vec![],
            ))
            .await
            .unwrap()
            .unwrap()
            .try_get("", "n")
            .unwrap();
        assert_eq!(protocol_count, i64::from(with_valid_sibling));
        transaction.rollback().await.unwrap();
    }
}

#[tokio::test]
async fn empty_view_patch_preserves_warm_and_deleted_replicas() {
    for deleted in [false, true] {
        let database = TestDatabase::bootstrap_in_memory().await.unwrap();
        let id = create_view(&database).await;
        let initial = changes(&database, 1).await;
        apply_page(&database, "test-remote", &initial, 1)
            .await
            .unwrap();
        if deleted {
            let deletion = SequencedMutation {
                server_seq: 2,
                committed_at: "2026-09-15T00:00:00Z".to_owned(),
                mutation: SyncMutation::Tombstone {
                    tombstone: Tombstone {
                        entity: EntityIdentity {
                            generation: 2,
                            ..initial[0].mutation.entity().clone()
                        },
                        deletion_seq: 2,
                        deleted_at: "2026-09-15T00:00:00Z".to_owned(),
                    },
                },
            };
            apply_page(&database, "test-remote", &[deletion], 2)
                .await
                .unwrap();
        }
        let transaction = database.connection().begin().await.unwrap();
        let before = load_replica(&transaction, initial[0].mutation.entity())
            .await
            .unwrap();
        transaction.rollback().await.unwrap();
        let empty = empty_view_patch(&id, 42, 3);
        apply_page(&database, "test-remote", &[empty], 3)
            .await
            .unwrap();
        assert_eq!(read_cursor(&database).await.unwrap(), Some(3));
        assert_eq!(
            View::find().all(database.connection()).await.unwrap().len(),
            usize::from(!deleted)
        );
        let transaction = database.connection().begin().await.unwrap();
        assert_eq!(
            load_replica(&transaction, initial[0].mutation.entity())
                .await
                .unwrap(),
            before
        );
        transaction.rollback().await.unwrap();
    }
}

#[tokio::test]
async fn new_generation_partial_view_patch_cannot_inherit_an_old_definition() {
    for warm in [false, true] {
        let database = TestDatabase::bootstrap_in_memory().await.unwrap();
        let id = create_view(&database).await;
        let initial = changes(&database, 1).await;
        if warm {
            apply_page(&database, "test-remote", &initial, 1)
                .await
                .unwrap();
        }
        let before_cursor = read_cursor(&database).await.unwrap();
        let original = stored_view(&database, &id).await;
        let change = SequencedMutation {
            server_seq: 2,
            committed_at: "2026-09-13T00:00:00Z".into(),
            mutation: SyncMutation::Patch {
                patch: EntityPatch {
                    entity: EntityIdentity {
                        entity_type: SyncEntityKind::View,
                        entity_id: id.clone(),
                        generation: 2,
                    },
                    fields: BTreeMap::from([("name".into(), json!("新代残缺定义"))]),
                },
            },
        };
        assert!(apply_page(&database, "test-remote", &[change], 2)
            .await
            .is_err());
        let restored = stored_view(&database, &id).await;
        for field in ["name", "filters_json", "created_at", "updated_at"] {
            assert_eq!(
                restored.try_get::<String>("", field).unwrap(),
                original.try_get::<String>("", field).unwrap()
            );
        }
        assert_eq!(restored.try_get::<i64>("", "generation").unwrap(), 1);
        assert_eq!(read_cursor(&database).await.unwrap(), before_cursor);
        let transaction = database.connection().begin().await.unwrap();
        let replica = load_replica(&transaction, initial[0].mutation.entity())
            .await
            .unwrap();
        if warm {
            let snapshot = replica.snapshot.unwrap();
            assert_eq!(snapshot.entity.generation, 1);
            assert_eq!(snapshot.fields["name"], json!("待执行"));
        } else {
            assert!(replica.snapshot.is_none());
        }
        transaction.rollback().await.unwrap();
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
            "INSERT INTO views SELECT 'missing-view', name, entity_kind, scope_json, filters_json, position, generation, created_at, updated_at FROM views WHERE id = ?",
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
    assert_eq!(fields.len(), 7);
    assert!(!fields.contains_key("sort"));
    assert!(!fields.contains_key("group_by"));
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

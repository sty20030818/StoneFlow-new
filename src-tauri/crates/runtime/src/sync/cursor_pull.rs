//! Cursor pull：本地协议态是文档事实源，业务表是其投影。
//!
//! 不变量：
//! 1. `sync_protocol_entities` 必须在应用增量 patch 前具备完整业务文档
//!    （全量 baseline 写入，或 origin-adopt / 冷启动时从本机业务表预热）。
//! 2. 物化按 mutation 语义分支，禁止用残缺 snapshot 做全量 UPSERT：
//!    - Tombstone → 物理删除业务行
//!    - Lifecycle → 只更新 lifecycle 列（不要求业务字段）
//!    - Patch → 对合并后的完整文档做 UPSERT
//! 3. 禁止反向 hydrate（业务表回填协议）作为主路径；那是把投影当真相。

use std::collections::BTreeMap;
use std::time::Instant;

use sea_orm::{ConnectionTrait, DatabaseBackend, DatabaseTransaction, Statement, TransactionTrait};
use serde_json::{json, Value};
use stoneflow_storage::database::DatabaseRuntimeState;
use stoneflow_sync::{
    apply_mutation, Baseline, EntityIdentity, EntitySnapshot, LifecycleState, ReplicaEntity,
    SequencedMutation, SyncCloudConfig, SyncEntityKind, SyncError, SyncMutation, Tombstone,
};

use crate::app::error::AppError;

use super::{engine::map_sync_error, types::SyncRemoteConfig as RuntimeRemoteConfig};

const SERVER_SEQ_CURSOR_SCOPE: &str = "sync:last_pulled_server_seq";
const LAST_RESTORE_AT_SCOPE: &str = "sync:last_restore_at";

/// 拉取远端变更并将每一页原子物化到本地。
pub async fn pull_remote_changes(
    database: &DatabaseRuntimeState,
    remote: &RuntimeRemoteConfig,
) -> Result<usize, AppError> {
    let started_at = Instant::now();
    let remote = to_cloud_config(remote);
    let Some(cursor) = read_cursor(database).await? else {
        let baseline = stoneflow_sync::download_full(&remote)
            .await
            .map_err(map_sync_error)?;
        // 本机已有业务数据：以本机为准建立同步位置，禁止 reset_replica 清空本机。
        // 同时预热本地协议文档，保证后续增量 patch 有完整 merge 基底。
        if local_has_user_content(database).await? {
            let seq = baseline.cursor.server_seq;
            let entities = baseline.entities.len();
            adopt_remote_cursor_keep_local(database, seq).await?;
            log::info!("同步:本机优先落位 序号={seq} 远端实体={entities}");
            return Ok(0);
        }
        let seq = baseline.cursor.server_seq;
        let entities = baseline.entities.len();
        apply_baseline(database, baseline).await?;
        log::info!("同步:全量基线 序号={seq} 实体={entities}");
        return Ok(0);
    };

    // 修复历史：已 adopt cursor 但协议表仍空 → 增量 patch 会变成残缺文档。
    warm_local_protocol_if_needed(database).await?;

    let mut applied = 0;
    let mut after = cursor;
    loop {
        let changes = match stoneflow_sync::download_after(&remote, after).await {
            Ok(changes) => changes,
            Err(SyncError::CursorExpired) => {
                let baseline = stoneflow_sync::download_full(&remote)
                    .await
                    .map_err(map_sync_error)?;
                let seq = baseline.cursor.server_seq;
                apply_baseline(database, baseline).await?;
                log::info!("同步:位置过期改全量 序号={seq}");
                return Ok(applied);
            }
            Err(error) => return Err(map_sync_error(error)),
        };
        if changes.is_empty() {
            break;
        }
        after = changes
            .last()
            .map(|change| change.server_seq)
            .ok_or_else(|| AppError::internal("非空 pull page 缺少末尾 sequence"))?;
        apply_page(database, &changes, after).await?;
        applied += changes.len();
    }
    if applied > 0 {
        log::info!(
            "同步:下载 {} 条 耗时ms={}",
            applied,
            started_at.elapsed().as_millis()
        );
    }
    Ok(applied)
}

/// 供 bootstrap 分类使用（与 pull 内判断一致）。
pub(super) async fn local_has_user_content_for_plan(
    database: &DatabaseRuntimeState,
) -> Result<bool, AppError> {
    local_has_user_content(database).await
}

async fn local_has_user_content(database: &DatabaseRuntimeState) -> Result<bool, AppError> {
    let row = database
        .connection()
        .query_one_raw(statement(
            r#"
            SELECT
                (SELECT COUNT(*) FROM tasks WHERE deleted_at IS NULL) AS tasks,
                (SELECT COUNT(*) FROM projects WHERE deleted_at IS NULL) AS projects,
                (SELECT COUNT(*) FROM task_links) AS task_links,
                (SELECT COUNT(*) FROM spaces WHERE is_default = 0 AND deleted_at IS NULL) AS spaces,
                (SELECT COUNT(*) FROM views) AS views,
                (SELECT COUNT(*) FROM outbox) AS outbox
            "#,
            vec![],
        ))
        .await?;
    let Some(row) = row else {
        return Ok(false);
    };
    let tasks: i64 = row.try_get("", "tasks").unwrap_or(0);
    let projects: i64 = row.try_get("", "projects").unwrap_or(0);
    let task_links: i64 = row.try_get("", "task_links").unwrap_or(0);
    let spaces: i64 = row.try_get("", "spaces").unwrap_or(0);
    let views: i64 = row.try_get("", "views").unwrap_or(0);
    let outbox: i64 = row.try_get("", "outbox").unwrap_or(0);
    Ok(tasks + projects + task_links + spaces + views + outbox > 0)
}

/// 本机优先：落 cursor，并把业务表投影成完整协议文档（不 wipe 业务表）。
async fn adopt_remote_cursor_keep_local(
    database: &DatabaseRuntimeState,
    server_seq: i64,
) -> Result<(), AppError> {
    let transaction = database.connection().begin().await?;
    let restored_at = stoneflow_domain::now_utc().to_rfc3339();
    seed_local_protocol_from_business(&transaction, server_seq).await?;
    write_cursor(&transaction, server_seq, &restored_at).await?;
    write_setting(
        &transaction,
        LAST_RESTORE_AT_SCOPE,
        &restored_at,
        &restored_at,
    )
    .await?;
    transaction.commit().await?;
    Ok(())
}

/// 已有 cursor 但协议表为空时补预热（修复历史 adopt 路径）。
async fn warm_local_protocol_if_needed(database: &DatabaseRuntimeState) -> Result<(), AppError> {
    let row = database
        .connection()
        .query_one_raw(statement(
            "SELECT COUNT(*) AS n FROM sync_protocol_entities",
            vec![],
        ))
        .await?;
    let n: i64 = row
        .map(|row| row.try_get::<i64>("", "n"))
        .transpose()?
        .unwrap_or(0);
    if n > 0 {
        return Ok(());
    }
    if !local_has_user_content(database).await? {
        return Ok(());
    }
    let cursor = read_cursor(database).await?.unwrap_or(0);
    let transaction = database.connection().begin().await?;
    let seeded = seed_local_protocol_from_business(&transaction, cursor).await?;
    transaction.commit().await?;
    if seeded > 0 {
        log::info!("同步:协议预热 {seeded} 条（业务→协议文档）");
    }
    Ok(())
}

/// 把本机业务行写成完整 `EntitySnapshot`，作为后续字段 LWW 的 merge 基底。
/// `field_sequences` 统一记为 `base_seq`，任意更新的 server_seq 都会覆盖。
async fn seed_local_protocol_from_business(
    transaction: &DatabaseTransaction,
    base_seq: i64,
) -> Result<usize, AppError> {
    let mut seeded = 0usize;
    seeded += seed_protocol_spaces(transaction, base_seq).await?;
    seeded += seed_protocol_projects(transaction, base_seq).await?;
    seeded += seed_protocol_tasks(transaction, base_seq).await?;
    seeded += seed_protocol_task_links(transaction, base_seq).await?;
    seeded += seed_protocol_views(transaction, base_seq).await?;
    Ok(seeded)
}

async fn seed_protocol_spaces(
    transaction: &DatabaseTransaction,
    base_seq: i64,
) -> Result<usize, AppError> {
    let rows = transaction
        .query_all_raw(statement(
            r#"
            SELECT id, name, icon_key, color_key, position, generation,
                   archived_at, deleted_at, created_at, updated_at
            FROM spaces
            ORDER BY position ASC, id ASC
            "#,
            vec![],
        ))
        .await?;
    let mut count = 0;
    for row in rows {
        let id: String = row.try_get("", "id")?;
        let archived_at: Option<String> = row.try_get("", "archived_at")?;
        let deleted_at: Option<String> = row.try_get("", "deleted_at")?;
        let fields = bmap([
            ("name", json!(row.try_get::<String>("", "name")?)),
            ("icon_key", json!(row.try_get::<String>("", "icon_key")?)),
            ("color_key", json!(row.try_get::<String>("", "color_key")?)),
            ("position", json!(row.try_get::<i64>("", "position")?)),
            (
                "created_at",
                json!(row.try_get::<String>("", "created_at")?),
            ),
            (
                "updated_at",
                json!(row.try_get::<String>("", "updated_at")?),
            ),
        ]);
        persist_seeded_snapshot(
            transaction,
            SyncEntityKind::Space,
            &id,
            row.try_get("", "generation")?,
            fields,
            lifecycle_from_columns(archived_at.as_deref(), deleted_at.as_deref()),
            base_seq,
        )
        .await?;
        count += 1;
    }
    Ok(count)
}

async fn seed_protocol_projects(
    transaction: &DatabaseTransaction,
    base_seq: i64,
) -> Result<usize, AppError> {
    let rows = transaction
        .query_all_raw(statement(
            r#"
            SELECT id, space_id, name, description, status, priority, planned_at, due_at, remind_at,
                   status_changed_at, completed_at, position, generation,
                   archived_at, deleted_at, created_at, updated_at
            FROM projects
            ORDER BY position ASC, id ASC
            "#,
            vec![],
        ))
        .await?;
    let mut count = 0;
    for row in rows {
        let id: String = row.try_get("", "id")?;
        let created_at: String = row.try_get("", "created_at")?;
        let status_changed_at: String = row
            .try_get::<Option<String>>("", "status_changed_at")?
            .unwrap_or_else(|| created_at.clone());
        let archived_at: Option<String> = row.try_get("", "archived_at")?;
        let deleted_at: Option<String> = row.try_get("", "deleted_at")?;
        let fields = bmap([
            ("space_id", json!(row.try_get::<String>("", "space_id")?)),
            ("name", json!(row.try_get::<String>("", "name")?)),
            (
                "description",
                json!(row.try_get::<Option<String>>("", "description")?),
            ),
            ("status", json!(row.try_get::<String>("", "status")?)),
            ("priority", json!(row.try_get::<i64>("", "priority")?)),
            (
                "planned_at",
                json!(row.try_get::<Option<String>>("", "planned_at")?),
            ),
            (
                "due_at",
                json!(row.try_get::<Option<String>>("", "due_at")?),
            ),
            (
                "remind_at",
                json!(row.try_get::<Option<String>>("", "remind_at")?),
            ),
            ("status_changed_at", json!(status_changed_at)),
            (
                "completed_at",
                json!(row.try_get::<Option<String>>("", "completed_at")?),
            ),
            ("position", json!(row.try_get::<i64>("", "position")?)),
            ("created_at", json!(created_at)),
            (
                "updated_at",
                json!(row.try_get::<String>("", "updated_at")?),
            ),
        ]);
        persist_seeded_snapshot(
            transaction,
            SyncEntityKind::Project,
            &id,
            row.try_get("", "generation")?,
            fields,
            lifecycle_from_columns(archived_at.as_deref(), deleted_at.as_deref()),
            base_seq,
        )
        .await?;
        count += 1;
    }
    Ok(count)
}

async fn seed_protocol_tasks(
    transaction: &DatabaseTransaction,
    base_seq: i64,
) -> Result<usize, AppError> {
    let rows = transaction
        .query_all_raw(statement(
            r#"
            SELECT id, space_id, project_id, title, note, status, priority, planned_at, due_at,
                   remind_at, status_changed_at, completed_at, position, generation,
                   archived_at, deleted_at, created_at, updated_at
            FROM tasks
            ORDER BY position ASC, id ASC
            "#,
            vec![],
        ))
        .await?;
    let mut count = 0;
    for row in rows {
        let id: String = row.try_get("", "id")?;
        let created_at: String = row.try_get("", "created_at")?;
        let status_changed_at: String = row
            .try_get::<Option<String>>("", "status_changed_at")?
            .unwrap_or_else(|| created_at.clone());
        let archived_at: Option<String> = row.try_get("", "archived_at")?;
        let deleted_at: Option<String> = row.try_get("", "deleted_at")?;
        let fields = bmap([
            ("space_id", json!(row.try_get::<String>("", "space_id")?)),
            (
                "project_id",
                json!(row.try_get::<Option<String>>("", "project_id")?),
            ),
            ("title", json!(row.try_get::<String>("", "title")?)),
            ("note", json!(row.try_get::<Option<String>>("", "note")?)),
            ("status", json!(row.try_get::<String>("", "status")?)),
            ("priority", json!(row.try_get::<i64>("", "priority")?)),
            (
                "planned_at",
                json!(row.try_get::<Option<String>>("", "planned_at")?),
            ),
            (
                "due_at",
                json!(row.try_get::<Option<String>>("", "due_at")?),
            ),
            (
                "remind_at",
                json!(row.try_get::<Option<String>>("", "remind_at")?),
            ),
            ("status_changed_at", json!(status_changed_at)),
            (
                "completed_at",
                json!(row.try_get::<Option<String>>("", "completed_at")?),
            ),
            ("position", json!(row.try_get::<i64>("", "position")?)),
            ("created_at", json!(created_at)),
            (
                "updated_at",
                json!(row.try_get::<String>("", "updated_at")?),
            ),
        ]);
        persist_seeded_snapshot(
            transaction,
            SyncEntityKind::Task,
            &id,
            row.try_get("", "generation")?,
            fields,
            lifecycle_from_columns(archived_at.as_deref(), deleted_at.as_deref()),
            base_seq,
        )
        .await?;
        count += 1;
    }
    Ok(count)
}

async fn seed_protocol_task_links(
    transaction: &DatabaseTransaction,
    base_seq: i64,
) -> Result<usize, AppError> {
    let rows = transaction
        .query_all_raw(statement(
            r#"
            SELECT id, task_id, title, url, position, created_at, updated_at
            FROM task_links
            ORDER BY position ASC, id ASC
            "#,
            vec![],
        ))
        .await?;
    let mut count = 0;
    for row in rows {
        let id: String = row.try_get("", "id")?;
        let fields = bmap([
            ("task_id", json!(row.try_get::<String>("", "task_id")?)),
            ("title", json!(row.try_get::<String>("", "title")?)),
            ("url", json!(row.try_get::<String>("", "url")?)),
            ("position", json!(row.try_get::<i64>("", "position")?)),
            (
                "created_at",
                json!(row.try_get::<String>("", "created_at")?),
            ),
            (
                "updated_at",
                json!(row.try_get::<String>("", "updated_at")?),
            ),
        ]);
        persist_seeded_snapshot(
            transaction,
            SyncEntityKind::TaskLink,
            &id,
            1,
            fields,
            LifecycleState::Active,
            base_seq,
        )
        .await?;
        count += 1;
    }
    Ok(count)
}

async fn seed_protocol_views(
    transaction: &DatabaseTransaction,
    base_seq: i64,
) -> Result<usize, AppError> {
    let rows = transaction
        .query_all_raw(statement(
            r#"
            SELECT id, name, entity_kind, scope_json, filters_json, sort_json, group_by_json,
                   position, generation, created_at, updated_at
            FROM views
            ORDER BY position ASC, id ASC
            "#,
            vec![],
        ))
        .await?;
    let mut count = 0;
    for row in rows {
        let id: String = row.try_get("", "id")?;
        let scope: String = row.try_get("", "scope_json")?;
        let filters: String = row.try_get("", "filters_json")?;
        let sort: String = row.try_get("", "sort_json")?;
        let group_by: Option<String> = row.try_get("", "group_by_json")?;
        let fields = bmap([
            ("name", json!(row.try_get::<String>("", "name")?)),
            (
                "entity_kind",
                json!(row.try_get::<String>("", "entity_kind")?),
            ),
            ("scope", parse_json_value(&scope)?),
            ("filters", parse_json_value(&filters)?),
            ("sort", parse_json_value(&sort)?),
            (
                "group_by",
                group_by
                    .map(|raw| parse_json_value(&raw))
                    .transpose()?
                    .unwrap_or(Value::Null),
            ),
            ("position", json!(row.try_get::<i64>("", "position")?)),
            (
                "created_at",
                json!(row.try_get::<String>("", "created_at")?),
            ),
            (
                "updated_at",
                json!(row.try_get::<String>("", "updated_at")?),
            ),
        ]);
        persist_seeded_snapshot(
            transaction,
            SyncEntityKind::View,
            &id,
            row.try_get("", "generation")?,
            fields,
            LifecycleState::Active,
            base_seq,
        )
        .await?;
        count += 1;
    }
    Ok(count)
}

async fn persist_seeded_snapshot(
    transaction: &DatabaseTransaction,
    entity_type: SyncEntityKind,
    entity_id: &str,
    generation: i64,
    fields: BTreeMap<String, Value>,
    lifecycle: LifecycleState,
    base_seq: i64,
) -> Result<(), AppError> {
    let field_sequences = fields
        .keys()
        .map(|key| (key.clone(), base_seq))
        .collect::<BTreeMap<_, _>>();
    let snapshot = EntitySnapshot {
        entity: EntityIdentity {
            entity_type,
            entity_id: entity_id.to_owned(),
            generation,
        },
        fields,
        field_sequences,
        lifecycle,
        lifecycle_seq: base_seq,
        updated_seq: base_seq,
    };
    // 仅在协议表尚无该实体时写入；已有 baseline/增量结果不覆盖。
    let existing = transaction
        .query_one_raw(statement(
            "SELECT 1 AS ok FROM sync_protocol_entities WHERE entity_type = ? AND entity_id = ?",
            vec![entity_label(entity_type).into(), entity_id.into()],
        ))
        .await?;
    if existing.is_some() {
        return Ok(());
    }
    persist_replica(
        transaction,
        &ReplicaEntity {
            snapshot: Some(snapshot),
            tombstone: None,
        },
    )
    .await
}

fn lifecycle_from_columns(archived_at: Option<&str>, deleted_at: Option<&str>) -> LifecycleState {
    if deleted_at.is_some() {
        LifecycleState::Trashed
    } else if archived_at.is_some() {
        LifecycleState::Archived
    } else {
        LifecycleState::Active
    }
}

fn bmap(entries: impl IntoIterator<Item = (&'static str, Value)>) -> BTreeMap<String, Value> {
    entries
        .into_iter()
        .map(|(k, v)| (k.to_owned(), v))
        .collect()
}

fn parse_json_value(raw: &str) -> Result<Value, AppError> {
    serde_json::from_str(raw)
        .map_err(|error| AppError::internal(format!("解析 JSON 字段失败: {error}")))
}

async fn apply_baseline(
    database: &DatabaseRuntimeState,
    baseline: Baseline,
) -> Result<(), AppError> {
    let transaction = database.connection().begin().await?;
    // 全量基线以云端为准：清空本机业务（含空壳默认 Space），避免新机叠出两个「个人」。
    reset_replica(&transaction).await?;
    let mut entities = baseline.entities;
    entities.sort_by_key(|snapshot| entity_rank(snapshot.entity.entity_type));
    for snapshot in entities {
        persist_replica(
            &transaction,
            &ReplicaEntity {
                snapshot: Some(snapshot.clone()),
                tombstone: None,
            },
        )
        .await?;
        materialize_document(&transaction, &snapshot, "baseline").await?;
    }
    for tombstone in baseline.tombstones {
        persist_replica(
            &transaction,
            &ReplicaEntity {
                snapshot: None,
                tombstone: Some(tombstone.clone()),
            },
        )
        .await?;
        materialize_tombstone(&transaction, &tombstone).await?;
    }
    // is_default 不进协议：在物化结果上为本机指一个默认 Space。
    ensure_local_default_space(&transaction).await?;
    write_cursor(&transaction, baseline.cursor.server_seq, "baseline").await?;
    let restored_at = stoneflow_domain::now_utc().to_rfc3339();
    write_setting(
        &transaction,
        LAST_RESTORE_AT_SCOPE,
        &restored_at,
        &restored_at,
    )
    .await?;
    transaction.commit().await?;
    Ok(())
}

async fn apply_page(
    database: &DatabaseRuntimeState,
    changes: &[SequencedMutation],
    cursor: i64,
) -> Result<(), AppError> {
    let transaction = database.connection().begin().await?;
    for change in changes {
        let entity = change.mutation.entity();
        let mut replica = load_replica(&transaction, entity).await?;
        let outcome = apply_mutation(&mut replica, &change.mutation, change.server_seq);
        persist_replica(&transaction, &replica).await?;
        if !matches!(outcome, stoneflow_sync::ApplyOutcome::Applied) {
            continue;
        }
        materialize_applied_mutation(
            &transaction,
            &change.mutation,
            &replica,
            &change.committed_at,
            change.server_seq,
        )
        .await
        .map_err(|error| {
            AppError::internal(format!(
                "物化失败 seq={} type={} id={}: {error}",
                change.server_seq,
                entity_label(entity.entity_type),
                entity.entity_id
            ))
        })?;
    }
    let Some(last_change) = changes.last() else {
        return Err(AppError::internal("pull page 不能为空"));
    };
    write_cursor(&transaction, cursor, &last_change.committed_at).await?;
    transaction.commit().await?;
    Ok(())
}

/// 按 mutation 语义投影，而不是一律全量 UPSERT。
async fn materialize_applied_mutation(
    transaction: &DatabaseTransaction,
    mutation: &SyncMutation,
    replica: &ReplicaEntity,
    committed_at: &str,
    server_seq: i64,
) -> Result<(), AppError> {
    match mutation {
        SyncMutation::Tombstone { .. } => {
            let Some(tombstone) = &replica.tombstone else {
                return Err(AppError::internal(
                    "tombstone mutation 后 replica 缺少 tombstone",
                ));
            };
            materialize_tombstone(transaction, tombstone).await
        }
        SyncMutation::Lifecycle { .. } => {
            let Some(snapshot) = &replica.snapshot else {
                // 本机已永久删除后仍可能收到过期 lifecycle；跳过即可。
                log::warn!("同步:跳过 lifecycle 物化（无协议文档）seq={}", server_seq);
                return Ok(());
            };
            materialize_lifecycle(transaction, snapshot, committed_at).await
        }
        SyncMutation::Patch { .. } => {
            let Some(snapshot) = &replica.snapshot else {
                return Err(AppError::internal(
                    "patch mutation 后 replica 缺少 snapshot",
                ));
            };
            if !snapshot_has_required_business_fields(snapshot) {
                // 协议预热后不应发生。若仍残缺：有业务行则报错（数据问题），无行则跳过
                // （常见：已 tombstone 本机行，或远端残缺投影），避免整页毒丸卡住 cursor。
                if business_row_exists(transaction, snapshot).await? {
                    return Err(AppError::internal(format!(
                        "协议文档字段不全 type={} id={} keys={:?}",
                        entity_label(snapshot.entity.entity_type),
                        snapshot.entity.entity_id,
                        snapshot.fields.keys().collect::<Vec<_>>()
                    )));
                }
                log::warn!(
                    "同步:跳过残缺 patch 物化 seq={} type={} id={}",
                    server_seq,
                    entity_label(snapshot.entity.entity_type),
                    snapshot.entity.entity_id
                );
                return Ok(());
            }
            materialize_document(transaction, snapshot, committed_at).await
        }
    }
}

async fn read_cursor(database: &DatabaseRuntimeState) -> Result<Option<i64>, AppError> {
    let row = database
        .connection()
        .query_one_raw(statement(
            "SELECT cursor FROM sync_cursors WHERE scope = ?",
            vec![SERVER_SEQ_CURSOR_SCOPE.into()],
        ))
        .await?;
    row.map(|row| row.try_get::<Option<String>>("", "cursor"))
        .transpose()?
        .flatten()
        .map(|cursor| {
            cursor
                .parse()
                .map_err(|error| AppError::database(format!("解析 cursor 失败: {error}")))
        })
        .transpose()
}

async fn load_replica(
    transaction: &DatabaseTransaction,
    entity: &stoneflow_sync::EntityIdentity,
) -> Result<ReplicaEntity, AppError> {
    let row = transaction
        .query_one_raw(statement(
            "SELECT snapshot_json, tombstone_json FROM sync_protocol_entities WHERE entity_type = ? AND entity_id = ?",
            vec![entity_label(entity.entity_type).into(), entity.entity_id.clone().into()],
        ))
        .await?;
    let Some(row) = row else {
        return Ok(ReplicaEntity::default());
    };
    Ok(ReplicaEntity {
        snapshot: row
            .try_get::<Option<String>>("", "snapshot_json")?
            .map(parse_json)
            .transpose()?,
        tombstone: row
            .try_get::<Option<String>>("", "tombstone_json")?
            .map(parse_json)
            .transpose()?,
    })
}

async fn persist_replica(
    transaction: &DatabaseTransaction,
    replica: &ReplicaEntity,
) -> Result<(), AppError> {
    let entity = replica
        .snapshot
        .as_ref()
        .map(|snapshot| &snapshot.entity)
        .or_else(|| {
            replica
                .tombstone
                .as_ref()
                .map(|tombstone| &tombstone.entity)
        })
        .ok_or_else(|| AppError::internal("空 replica 不应持久化"))?;
    transaction.execute_raw(statement(
        "INSERT INTO sync_protocol_entities(entity_type, entity_id, generation, snapshot_json, tombstone_json) VALUES (?, ?, ?, ?, ?) ON CONFLICT(entity_type, entity_id) DO UPDATE SET generation=excluded.generation, snapshot_json=excluded.snapshot_json, tombstone_json=excluded.tombstone_json",
        vec![entity_label(entity.entity_type).into(), entity.entity_id.clone().into(), entity.generation.into(), replica.snapshot.as_ref().map(serialize_json).transpose()?.into(), replica.tombstone.as_ref().map(serialize_json).transpose()?.into()],
    )).await?;
    Ok(())
}

/// 完整协议文档 → 业务表 UPSERT。调用前必须保证字段齐全。
async fn materialize_document(
    transaction: &DatabaseTransaction,
    snapshot: &EntitySnapshot,
    committed_at: &str,
) -> Result<(), AppError> {
    let archived_at =
        matches!(snapshot.lifecycle, LifecycleState::Archived).then_some(committed_at.to_owned());
    let deleted_at =
        matches!(snapshot.lifecycle, LifecycleState::Trashed).then_some(committed_at.to_owned());
    let fields = &snapshot.fields;
    match snapshot.entity.entity_type {
        // `is_default` 是本机导航兜底，不是共享业务状态。
        SyncEntityKind::Space => execute_materialize(transaction, "INSERT INTO spaces(id,name,icon_key,color_key,is_default,position,generation,archived_at,deleted_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,icon_key=excluded.icon_key,color_key=excluded.color_key,position=excluded.position,generation=excluded.generation,archived_at=excluded.archived_at,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at", vec![snapshot.entity.entity_id.clone().into(), required_string(fields,"name")?.into(), required_string(fields,"icon_key")?.into(), required_string(fields,"color_key")?.into(), false.into(), required_i64(fields,"position")?.into(), snapshot.entity.generation.into(), archived_at.into(), deleted_at.into(), required_string(fields,"created_at")?.into(), required_string(fields,"updated_at")?.into()]).await,
        SyncEntityKind::Project => execute_materialize(transaction, "INSERT INTO projects(id,space_id,name,description,status,priority,planned_at,due_at,remind_at,status_changed_at,completed_at,position,generation,archived_at,deleted_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET space_id=excluded.space_id,name=excluded.name,description=excluded.description,status=excluded.status,priority=excluded.priority,planned_at=excluded.planned_at,due_at=excluded.due_at,remind_at=excluded.remind_at,status_changed_at=excluded.status_changed_at,completed_at=excluded.completed_at,position=excluded.position,generation=excluded.generation,archived_at=excluded.archived_at,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at", project_values(snapshot, archived_at, deleted_at)?).await,
        SyncEntityKind::Task => execute_materialize(transaction, "INSERT INTO tasks(id,space_id,project_id,title,note,status,priority,planned_at,due_at,remind_at,status_changed_at,completed_at,position,generation,archived_at,deleted_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET space_id=excluded.space_id,project_id=excluded.project_id,title=excluded.title,note=excluded.note,status=excluded.status,priority=excluded.priority,planned_at=excluded.planned_at,due_at=excluded.due_at,remind_at=excluded.remind_at,status_changed_at=excluded.status_changed_at,completed_at=excluded.completed_at,position=excluded.position,generation=excluded.generation,archived_at=excluded.archived_at,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at", task_values(snapshot, archived_at, deleted_at)?).await,
        SyncEntityKind::TaskLink => execute_materialize(transaction, "INSERT INTO task_links(id,task_id,title,url,position,created_at,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET task_id=excluded.task_id,title=excluded.title,url=excluded.url,position=excluded.position,updated_at=excluded.updated_at", vec![snapshot.entity.entity_id.clone().into(), required_string(fields,"task_id")?.into(), required_string(fields,"title")?.into(), required_string(fields,"url")?.into(), required_i64(fields,"position")?.into(), required_string(fields,"created_at")?.into(), required_string(fields,"updated_at")?.into()]).await,
        SyncEntityKind::View => execute_materialize(transaction, "INSERT INTO views(id,name,entity_kind,scope_json,filters_json,sort_json,group_by_json,position,generation,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,entity_kind=excluded.entity_kind,scope_json=excluded.scope_json,filters_json=excluded.filters_json,sort_json=excluded.sort_json,group_by_json=excluded.group_by_json,position=excluded.position,generation=excluded.generation,updated_at=excluded.updated_at", view_values(snapshot)?).await,
    }
}

/// Lifecycle 只碰生命周期列；不要求业务字段完整。
async fn materialize_lifecycle(
    transaction: &DatabaseTransaction,
    snapshot: &EntitySnapshot,
    committed_at: &str,
) -> Result<(), AppError> {
    let table = match snapshot.entity.entity_type {
        SyncEntityKind::Space => "spaces",
        SyncEntityKind::Project => "projects",
        SyncEntityKind::Task => "tasks",
        SyncEntityKind::TaskLink | SyncEntityKind::View => return Ok(()),
    };
    if !business_row_exists(transaction, snapshot).await? {
        // 本机已硬删：lifecycle 无目标，不算错误。
        return Ok(());
    }
    let archived_at =
        matches!(snapshot.lifecycle, LifecycleState::Archived).then_some(committed_at.to_owned());
    let deleted_at =
        matches!(snapshot.lifecycle, LifecycleState::Trashed).then_some(committed_at.to_owned());
    transaction
        .execute_raw(statement(
            &format!(
                "UPDATE {table} SET generation = ?, archived_at = ?, deleted_at = ?, updated_at = COALESCE(?, updated_at) WHERE id = ?"
            ),
            vec![
                snapshot.entity.generation.into(),
                archived_at.clone().into(),
                deleted_at.clone().into(),
                deleted_at
                    .or(archived_at)
                    .unwrap_or_else(|| committed_at.to_owned())
                    .into(),
                snapshot.entity.entity_id.clone().into(),
            ],
        ))
        .await?;
    Ok(())
}

fn snapshot_has_required_business_fields(snapshot: &EntitySnapshot) -> bool {
    let f = &snapshot.fields;
    let has_str = |key: &str| f.get(key).and_then(Value::as_str).is_some();
    let has_i64 = |key: &str| f.get(key).and_then(Value::as_i64).is_some();
    match snapshot.entity.entity_type {
        SyncEntityKind::Task => {
            has_str("space_id")
                && has_str("title")
                && has_str("status")
                && has_str("status_changed_at")
                && has_str("created_at")
                && has_str("updated_at")
                && has_i64("priority")
                && has_i64("position")
        }
        SyncEntityKind::Project => {
            has_str("space_id")
                && has_str("name")
                && has_str("status")
                && has_str("status_changed_at")
                && has_str("created_at")
                && has_str("updated_at")
                && has_i64("priority")
                && has_i64("position")
        }
        SyncEntityKind::Space => {
            has_str("name")
                && has_str("icon_key")
                && has_str("color_key")
                && has_i64("position")
                && has_str("created_at")
                && has_str("updated_at")
        }
        SyncEntityKind::TaskLink => {
            has_str("task_id")
                && has_str("title")
                && has_str("url")
                && has_i64("position")
                && has_str("created_at")
                && has_str("updated_at")
        }
        SyncEntityKind::View => {
            has_str("name")
                && has_str("entity_kind")
                && f.contains_key("scope")
                && f.contains_key("filters")
                && f.contains_key("sort")
                && has_i64("position")
                && has_str("created_at")
                && has_str("updated_at")
        }
    }
}

async fn business_row_exists(
    transaction: &DatabaseTransaction,
    snapshot: &EntitySnapshot,
) -> Result<bool, AppError> {
    let table = match snapshot.entity.entity_type {
        SyncEntityKind::Space => "spaces",
        SyncEntityKind::Project => "projects",
        SyncEntityKind::Task => "tasks",
        SyncEntityKind::TaskLink => "task_links",
        SyncEntityKind::View => "views",
    };
    let row = transaction
        .query_one_raw(statement(
            &format!("SELECT 1 AS ok FROM {table} WHERE id = ? LIMIT 1"),
            vec![snapshot.entity.entity_id.clone().into()],
        ))
        .await?;
    Ok(row.is_some())
}

async fn materialize_tombstone(
    transaction: &DatabaseTransaction,
    tombstone: &Tombstone,
) -> Result<(), AppError> {
    match tombstone.entity.entity_type {
        // 远端可能只保留父级 tombstone；本地按依赖逆序删，避免外键打断事务。
        SyncEntityKind::Space => {
            transaction
                .execute_raw(statement(
                    "DELETE FROM task_links WHERE task_id IN (SELECT id FROM tasks WHERE space_id = ?)",
                    vec![tombstone.entity.entity_id.clone().into()],
                ))
                .await?;
            transaction
                .execute_raw(statement(
                    "DELETE FROM tasks WHERE space_id = ?",
                    vec![tombstone.entity.entity_id.clone().into()],
                ))
                .await?;
            transaction
                .execute_raw(statement(
                    "DELETE FROM projects WHERE space_id = ?",
                    vec![tombstone.entity.entity_id.clone().into()],
                ))
                .await?;
        }
        SyncEntityKind::Project => {
            transaction
                .execute_raw(statement(
                    "DELETE FROM task_links WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)",
                    vec![tombstone.entity.entity_id.clone().into()],
                ))
                .await?;
            transaction
                .execute_raw(statement(
                    "DELETE FROM tasks WHERE project_id = ?",
                    vec![tombstone.entity.entity_id.clone().into()],
                ))
                .await?;
        }
        _ => {}
    }
    let table = match tombstone.entity.entity_type {
        SyncEntityKind::Space => "spaces",
        SyncEntityKind::Project => "projects",
        SyncEntityKind::Task => "tasks",
        SyncEntityKind::TaskLink => "task_links",
        SyncEntityKind::View => "views",
    };
    transaction
        .execute_raw(statement(
            &format!("DELETE FROM {table} WHERE id = ?"),
            vec![tombstone.entity.entity_id.clone().into()],
        ))
        .await?;
    transaction.execute_raw(statement("INSERT INTO tombstones(entity_type,entity_id,generation,deletion_seq,deleted_at) VALUES (?,?,?,?,?) ON CONFLICT(entity_type,entity_id) DO UPDATE SET generation=excluded.generation,deletion_seq=excluded.deletion_seq,deleted_at=excluded.deleted_at", vec![entity_label(tombstone.entity.entity_type).into(), tombstone.entity.entity_id.clone().into(), tombstone.entity.generation.into(), tombstone.deletion_seq.into(), tombstone.deleted_at.clone().into()])).await?;
    Ok(())
}

async fn reset_replica(transaction: &DatabaseTransaction) -> Result<(), AppError> {
    for table in [
        "task_links",
        "tasks",
        "projects",
        "views",
        "tombstones",
        "sync_protocol_entities",
        // 含本机 seed 的默认 Space：占位 id 不得与云端业务 Space 并存。
        "spaces",
    ] {
        transaction
            .execute_raw(statement(&format!("DELETE FROM {table}"), vec![]))
            .await?;
    }
    Ok(())
}

/// 全量基线后为本机挑选 `is_default`（协议字段不含此项）。
/// 优先「个人」→ position 最小 → id；若云端无 Space 则重建本机空壳默认。
async fn ensure_local_default_space(transaction: &DatabaseTransaction) -> Result<(), AppError> {
    transaction
        .execute_raw(statement(
            "UPDATE spaces SET is_default = 0 WHERE is_default = 1",
            vec![],
        ))
        .await?;

    let row = transaction
        .query_one_raw(statement(
            r#"
            SELECT id FROM spaces
            WHERE archived_at IS NULL AND deleted_at IS NULL
            ORDER BY
                CASE WHEN name = '个人' THEN 0 ELSE 1 END,
                position ASC,
                id ASC
            LIMIT 1
            "#,
            vec![],
        ))
        .await?;

    if let Some(row) = row {
        let id: String = row.try_get("", "id")?;
        transaction
            .execute_raw(statement(
                "UPDATE spaces SET is_default = 1 WHERE id = ?",
                vec![id.into()],
            ))
            .await?;
        return Ok(());
    }

    // 云端无存活 Space：补本机兜底，保证 UI 可启动（与 bootstrap seed 字段对齐）。
    let id = stoneflow_domain::create_id().to_string();
    let now = stoneflow_domain::now_utc().to_rfc3339();
    transaction
        .execute_raw(statement(
            r#"
            INSERT INTO spaces(
                id, name, icon_key, color_key, is_default, position, generation,
                archived_at, deleted_at, archived_by_operation_id, deleted_by_operation_id,
                created_at, updated_at
            ) VALUES (?, '个人', 'home', 'blue', 1, ?, 1, NULL, NULL, NULL, NULL, ?, ?)
            "#,
            vec![
                id.into(),
                stoneflow_domain::POSITION_STEP.into(),
                now.clone().into(),
                now.into(),
            ],
        ))
        .await?;
    log::info!("同步:全量基线后重建本机默认 Space");
    Ok(())
}

async fn write_cursor(
    transaction: &DatabaseTransaction,
    cursor: i64,
    updated_at: &str,
) -> Result<(), AppError> {
    write_setting(
        transaction,
        SERVER_SEQ_CURSOR_SCOPE,
        &cursor.to_string(),
        updated_at,
    )
    .await?;
    Ok(())
}

async fn write_setting(
    transaction: &DatabaseTransaction,
    scope: &str,
    cursor: &str,
    updated_at: &str,
) -> Result<(), AppError> {
    transaction
        .execute_raw(statement(
            "INSERT INTO sync_cursors(scope,cursor,updated_at) VALUES (?,?,?) ON CONFLICT(scope) DO UPDATE SET cursor=excluded.cursor,updated_at=excluded.updated_at",
            vec![scope.into(), cursor.into(), updated_at.into()],
        ))
        .await?;
    Ok(())
}

async fn execute_materialize(
    transaction: &DatabaseTransaction,
    sql: &str,
    values: Vec<sea_orm::Value>,
) -> Result<(), AppError> {
    transaction
        .execute_raw(statement(sql, values))
        .await
        .map(|_| ())
        .map_err(Into::into)
}

fn statement(sql: &str, values: Vec<sea_orm::Value>) -> Statement {
    Statement::from_sql_and_values(DatabaseBackend::Sqlite, sql, values)
}

fn entity_label(kind: SyncEntityKind) -> &'static str {
    match kind {
        SyncEntityKind::Space => "space",
        SyncEntityKind::Project => "project",
        SyncEntityKind::Task => "task",
        SyncEntityKind::TaskLink => "task_link",
        SyncEntityKind::View => "view",
    }
}

fn entity_rank(kind: SyncEntityKind) -> u8 {
    match kind {
        SyncEntityKind::Space => 0,
        SyncEntityKind::Project => 1,
        SyncEntityKind::Task => 2,
        SyncEntityKind::TaskLink => 3,
        SyncEntityKind::View => 4,
    }
}

fn parse_json<T: serde::de::DeserializeOwned>(raw: String) -> Result<T, AppError> {
    serde_json::from_str(&raw)
        .map_err(|error| AppError::internal(format!("解析 本地协议状态失败: {error}")))
}

fn serialize_json(value: &impl serde::Serialize) -> Result<String, AppError> {
    serde_json::to_string(value)
        .map_err(|error| AppError::internal(format!("序列化 本地协议状态失败: {error}")))
}

fn required_string(fields: &BTreeMap<String, Value>, key: &str) -> Result<String, AppError> {
    fields
        .get(key)
        .and_then(Value::as_str)
        .map(str::to_owned)
        .ok_or_else(|| AppError::internal(format!("entity 缺少字符串字段 {key}")))
}

fn required_i64(fields: &BTreeMap<String, Value>, key: &str) -> Result<i64, AppError> {
    fields
        .get(key)
        .and_then(Value::as_i64)
        .ok_or_else(|| AppError::internal(format!("entity 缺少整数字段 {key}")))
}

fn nullable_string(
    fields: &BTreeMap<String, Value>,
    key: &str,
) -> Result<Option<String>, AppError> {
    match fields.get(key) {
        Some(Value::Null) | None => Ok(None),
        Some(value) => value
            .as_str()
            .map(|value| Some(value.to_owned()))
            .ok_or_else(|| AppError::internal(format!("entity 字段 {key} 必须是字符串或 null"))),
    }
}

fn json_field(fields: &BTreeMap<String, Value>, key: &str) -> Result<String, AppError> {
    fields
        .get(key)
        .map(serde_json::to_string)
        .transpose()
        .map_err(|error| AppError::internal(format!("序列化 字段 {key} 失败: {error}")))?
        .ok_or_else(|| AppError::internal(format!("entity 缺少 JSON 字段 {key}")))
}

fn project_values(
    snapshot: &EntitySnapshot,
    archived_at: Option<String>,
    deleted_at: Option<String>,
) -> Result<Vec<sea_orm::Value>, AppError> {
    let f = &snapshot.fields;
    Ok(vec![
        snapshot.entity.entity_id.clone().into(),
        required_string(f, "space_id")?.into(),
        required_string(f, "name")?.into(),
        nullable_string(f, "description")?.into(),
        required_string(f, "status")?.into(),
        required_i64(f, "priority")?.into(),
        nullable_string(f, "planned_at")?.into(),
        nullable_string(f, "due_at")?.into(),
        nullable_string(f, "remind_at")?.into(),
        required_string(f, "status_changed_at")?.into(),
        nullable_string(f, "completed_at")?.into(),
        required_i64(f, "position")?.into(),
        snapshot.entity.generation.into(),
        archived_at.into(),
        deleted_at.into(),
        required_string(f, "created_at")?.into(),
        required_string(f, "updated_at")?.into(),
    ])
}

fn task_values(
    snapshot: &EntitySnapshot,
    archived_at: Option<String>,
    deleted_at: Option<String>,
) -> Result<Vec<sea_orm::Value>, AppError> {
    let f = &snapshot.fields;
    Ok(vec![
        snapshot.entity.entity_id.clone().into(),
        required_string(f, "space_id")?.into(),
        nullable_string(f, "project_id")?.into(),
        required_string(f, "title")?.into(),
        nullable_string(f, "note")?.into(),
        required_string(f, "status")?.into(),
        required_i64(f, "priority")?.into(),
        nullable_string(f, "planned_at")?.into(),
        nullable_string(f, "due_at")?.into(),
        nullable_string(f, "remind_at")?.into(),
        required_string(f, "status_changed_at")?.into(),
        nullable_string(f, "completed_at")?.into(),
        required_i64(f, "position")?.into(),
        snapshot.entity.generation.into(),
        archived_at.into(),
        deleted_at.into(),
        required_string(f, "created_at")?.into(),
        required_string(f, "updated_at")?.into(),
    ])
}

fn view_values(snapshot: &EntitySnapshot) -> Result<Vec<sea_orm::Value>, AppError> {
    let f = &snapshot.fields;
    Ok(vec![
        snapshot.entity.entity_id.clone().into(),
        required_string(f, "name")?.into(),
        required_string(f, "entity_kind")?.into(),
        json_field(f, "scope")?.into(),
        json_field(f, "filters")?.into(),
        json_field(f, "sort")?.into(),
        nullable_string(f, "group_by")?.into(),
        required_i64(f, "position")?.into(),
        snapshot.entity.generation.into(),
        required_string(f, "created_at")?.into(),
        required_string(f, "updated_at")?.into(),
    ])
}

fn to_cloud_config(remote: &RuntimeRemoteConfig) -> SyncCloudConfig {
    SyncCloudConfig {
        database_url: remote.database_url.clone(),
    }
}

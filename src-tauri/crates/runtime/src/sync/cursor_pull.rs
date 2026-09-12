//! Cursor pull：本地协议态是文档事实源，业务表是其投影。
//!
//! 不变量：
//! 1. `sync_protocol_entities` 必须在应用增量 patch 前具备完整业务文档
//!    （全量 baseline 写入，或 origin-adopt / 冷启动时从本机业务表预热）。
//! 2. 物化按 mutation 语义分支，禁止用残缺 snapshot 做全量 UPSERT：
//!    - Tombstone → 物理删除业务行
//!    - Lifecycle → 只更新 lifecycle 列（不要求业务字段）
//!    - Patch → 对合并后的完整文档做 UPSERT
//! 3. 协议文档优先；仅当增量 patch 合并后仍残缺时，才用本机业务行补全缺失键（修复冷协议）。

use std::collections::BTreeMap;
use std::time::Instant;

use sea_orm::{
    ActiveEnum, ConnectionTrait, DatabaseBackend, DatabaseTransaction, EntityTrait, QueryOrder,
    SqliteTransactionMode, Statement, TransactionOptions, TransactionTrait,
};
use serde_json::{json, Value};
use stoneflow_application::view::codec::{
    view_record_from_sync_fields, view_sync_fields_preserving_definition,
};
use stoneflow_storage::{
    database::DatabaseRuntimeState,
    entities::{prelude::View, view},
    mappers::view_entity_kind_to_schema,
    repositories::map_view,
};
use stoneflow_sync::{
    apply_mutation, Baseline, EntityIdentity, EntitySnapshot, LifecycleState, ReplicaEntity,
    SequencedMutation, SyncCloudConfig, SyncEntityKind, SyncError, SyncMutation, Tombstone,
};

use crate::app::error::AppError;

use super::{
    binding::{
        write_bound_cursor, write_remote_identity, LAST_RESTORE_AT_SCOPE, ORIGIN_SEED_SCOPE,
        REMOTE_INSTANCE_ID_SCOPE, SERVER_SEQ_CURSOR_SCOPE,
    },
    engine::map_sync_error,
    types::SyncRemoteConfig as RuntimeRemoteConfig,
};

/// 拉取远端变更并将每一页原子物化到本地。
pub(super) async fn pull_remote_changes(
    database: &DatabaseRuntimeState,
    remote: &RuntimeRemoteConfig,
    remote_instance_id: &str,
) -> Result<usize, AppError> {
    let started_at = Instant::now();
    let remote = to_cloud_config(remote, remote_instance_id);
    let Some(cursor) = read_cursor(database).await? else {
        let baseline = stoneflow_sync::download_full(&remote)
            .await
            .map_err(map_sync_error)?;
        // 本机已有业务数据：以本机为准建立同步位置，禁止 reset_replica 清空本机。
        // 同时预热本地协议文档，保证后续增量 patch 有完整 merge 基底。
        if local_has_user_content(database).await? {
            let seq = baseline.cursor.server_seq;
            let entities = baseline.entities.len();
            adopt_remote_cursor_keep_local(database, remote_instance_id, seq).await?;
            log::info!("同步:本机优先落位 序号={seq} 远端实体={entities}");
            return Ok(0);
        }
        let seq = baseline.cursor.server_seq;
        let entities = baseline.entities.len();
        apply_baseline(database, remote_instance_id, baseline).await?;
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
                apply_baseline(database, remote_instance_id, baseline).await?;
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
        apply_page(database, remote_instance_id, &changes, after).await?;
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

/// 显式重绑使用 IMMEDIATE 事务，把 pending 检查、本地重置和身份落盘串成一个写边界。
pub(super) async fn begin_explicit_rebind(
    database: &DatabaseRuntimeState,
) -> Result<DatabaseTransaction, AppError> {
    database
        .connection()
        .begin_with_options(TransactionOptions {
            sqlite_transaction_mode: Some(SqliteTransactionMode::Immediate),
            ..Default::default()
        })
        .await
        .map_err(Into::into)
}

pub(super) async fn preflight_explicit_rebind(
    database: &DatabaseRuntimeState,
) -> Result<(), AppError> {
    ensure_no_pending_outbox(database.connection()).await
}

pub(super) async fn ensure_explicit_rebind_allowed(
    transaction: &DatabaseTransaction,
) -> Result<(), AppError> {
    ensure_no_pending_outbox(transaction).await
}

async fn ensure_no_pending_outbox(connection: &impl ConnectionTrait) -> Result<(), AppError> {
    let row = connection
        .query_one_raw(statement("SELECT COUNT(*) AS n FROM outbox", vec![]))
        .await?
        .ok_or_else(|| AppError::database("检查待上传变更时缺少结果行"))?;
    let pending: i64 = row.try_get("", "n")?;
    if pending > 0 {
        return Err(AppError::conflict(format!(
            "本机仍有 {pending} 条待上传变更，不能重新绑定远端；请先同步到当前远端或处理这些变更。"
        )));
    }
    Ok(())
}

/// 用户确认后的本地重绑：非空远端替换本地副本，空远端保留本机业务并等待 origin seed。
pub(super) async fn apply_explicit_rebind(
    transaction: &DatabaseTransaction,
    remote_instance_id: &str,
    baseline: Baseline,
) -> Result<(), AppError> {
    let remote_has_content = !baseline.entities.is_empty() || !baseline.tombstones.is_empty();
    clear_remote_owned_metadata(transaction).await?;

    if remote_has_content {
        apply_baseline_in_transaction(transaction, remote_instance_id, baseline).await?;
    } else {
        let updated_at = stoneflow_domain::now_utc().to_rfc3339();
        write_remote_identity(transaction, remote_instance_id, &updated_at).await?;
    }
    Ok(())
}

async fn clear_remote_owned_metadata(transaction: &DatabaseTransaction) -> Result<(), AppError> {
    for table in [
        "applied_operations",
        "sync_changes",
        "sync_protocol_entities",
        "tombstones",
    ] {
        transaction
            .execute_raw(statement(&format!("DELETE FROM {table}"), vec![]))
            .await?;
    }
    transaction
        .execute_raw(statement(
            "DELETE FROM sync_cursors WHERE scope IN (?, ?, ?, ?)",
            vec![
                SERVER_SEQ_CURSOR_SCOPE.into(),
                REMOTE_INSTANCE_ID_SCOPE.into(),
                ORIGIN_SEED_SCOPE.into(),
                LAST_RESTORE_AT_SCOPE.into(),
            ],
        ))
        .await?;
    Ok(())
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
    remote_instance_id: &str,
    server_seq: i64,
) -> Result<(), AppError> {
    let transaction = database.connection().begin().await?;
    let restored_at = stoneflow_domain::now_utc().to_rfc3339();
    seed_local_protocol_from_business(&transaction, server_seq).await?;
    write_bound_cursor(&transaction, remote_instance_id, server_seq, &restored_at).await?;
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
    let rows = View::find()
        .order_by_asc(view::Column::Position)
        .order_by_asc(view::Column::Id)
        .all(transaction)
        .await?;
    let mut count = 0;
    for row in rows {
        let record = map_view(row);
        let fields = view_sync_fields_preserving_definition(&record)?
            .into_iter()
            .collect();
        persist_seeded_snapshot(
            transaction,
            SyncEntityKind::View,
            &record.id,
            record.generation,
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

async fn apply_baseline(
    database: &DatabaseRuntimeState,
    remote_instance_id: &str,
    baseline: Baseline,
) -> Result<(), AppError> {
    let transaction = database.connection().begin().await?;
    apply_baseline_in_transaction(&transaction, remote_instance_id, baseline).await?;
    transaction.commit().await?;
    Ok(())
}

async fn apply_baseline_in_transaction(
    transaction: &DatabaseTransaction,
    remote_instance_id: &str,
    baseline: Baseline,
) -> Result<(), AppError> {
    // 全量基线以云端为准：清空本机业务（含空壳默认 Space），避免新机叠出两个「个人」。
    reset_replica(transaction).await?;
    let mut entities = baseline.entities;
    entities.sort_by_key(|snapshot| entity_rank(snapshot.entity.entity_type));
    for snapshot in entities {
        persist_replica(
            transaction,
            &ReplicaEntity {
                snapshot: Some(snapshot.clone()),
                tombstone: None,
            },
        )
        .await?;
        materialize_document(transaction, &snapshot, "baseline").await?;
    }
    for tombstone in baseline.tombstones {
        persist_replica(
            transaction,
            &ReplicaEntity {
                snapshot: None,
                tombstone: Some(tombstone.clone()),
            },
        )
        .await?;
        materialize_tombstone(transaction, &tombstone).await?;
    }
    // is_default 不进协议：在物化结果上为本机指一个默认 Space。
    ensure_local_default_space(transaction).await?;
    write_bound_cursor(
        transaction,
        remote_instance_id,
        baseline.cursor.server_seq,
        "baseline",
    )
    .await?;
    let restored_at = stoneflow_domain::now_utc().to_rfc3339();
    write_setting(
        transaction,
        LAST_RESTORE_AT_SCOPE,
        &restored_at,
        &restored_at,
    )
    .await?;
    Ok(())
}

async fn apply_page(
    database: &DatabaseRuntimeState,
    remote_instance_id: &str,
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
    write_bound_cursor(
        &transaction,
        remote_instance_id,
        cursor,
        &last_change.committed_at,
    )
    .await?;
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
            // 脏字段 patch 常见；冷协议时合并结果残缺。先从本机业务行补缺失键，再投影。
            let mut snapshot = snapshot.clone();
            if !snapshot_has_required_business_fields(&snapshot) {
                let filled =
                    hydrate_missing_fields_from_business(transaction, &mut snapshot).await?;
                if filled {
                    let mut repaired = replica.clone();
                    repaired.snapshot = Some(snapshot.clone());
                    persist_replica(transaction, &repaired).await?;
                }
            }
            if snapshot_has_required_business_fields(&snapshot) {
                return materialize_document(transaction, &snapshot, committed_at).await;
            }
            if snapshot.entity.entity_type == SyncEntityKind::View {
                // 不得把未投影的 View 当作成功并推进 cursor；整页回滚后仍可重放。
                return Err(AppError::validation(
                    "View 同步定义不完整，需要完整定义才能恢复",
                ));
            }
            if business_row_exists(transaction, &snapshot).await? {
                // 仍不全：只更新 patch 里带的已知列（如 status 完成），绝不阻断整页。
                return materialize_partial_fields(transaction, &snapshot).await;
            }
            log::warn!(
                "同步:跳过残缺 patch 物化（本机无此行）seq={} type={} id={} keys={:?}",
                server_seq,
                entity_label(snapshot.entity.entity_type),
                snapshot.entity.entity_id,
                snapshot.fields.keys().collect::<Vec<_>>()
            );
            Ok(())
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
                && has_i64("position")
                && has_str("created_at")
                && has_str("updated_at")
        }
    }
}

/// 仅补「缺失」键，不覆盖 patch 已写入的字段。返回是否补过任何键。
async fn hydrate_missing_fields_from_business(
    transaction: &DatabaseTransaction,
    snapshot: &mut EntitySnapshot,
) -> Result<bool, AppError> {
    let id = snapshot.entity.entity_id.clone();
    let before = snapshot.fields.len();

    match snapshot.entity.entity_type {
        SyncEntityKind::Task => {
            let Some(row) = transaction
                .query_one_raw(statement(
                    r#"
                    SELECT space_id, project_id, title, note, status, priority, planned_at, due_at,
                           remind_at, status_changed_at, completed_at, position, created_at, updated_at
                    FROM tasks WHERE id = ?
                    "#,
                    vec![id.into()],
                ))
                .await?
            else {
                return Ok(false);
            };
            let f = &mut snapshot.fields;
            insert_str_if_missing(f, "space_id", row.try_get("", "space_id")?);
            insert_opt_str_if_missing(f, "project_id", row.try_get("", "project_id")?);
            insert_str_if_missing(f, "title", row.try_get("", "title")?);
            insert_opt_str_if_missing(f, "note", row.try_get("", "note")?);
            insert_str_if_missing(f, "status", row.try_get("", "status")?);
            insert_i64_if_missing(f, "priority", row.try_get("", "priority")?);
            insert_opt_str_if_missing(f, "planned_at", row.try_get("", "planned_at")?);
            insert_opt_str_if_missing(f, "due_at", row.try_get("", "due_at")?);
            insert_opt_str_if_missing(f, "remind_at", row.try_get("", "remind_at")?);
            insert_str_if_missing(
                f,
                "status_changed_at",
                row.try_get("", "status_changed_at")?,
            );
            insert_opt_str_if_missing(f, "completed_at", row.try_get("", "completed_at")?);
            insert_i64_if_missing(f, "position", row.try_get("", "position")?);
            insert_str_if_missing(f, "created_at", row.try_get("", "created_at")?);
            insert_str_if_missing(f, "updated_at", row.try_get("", "updated_at")?);
        }
        SyncEntityKind::Project => {
            let Some(row) = transaction
                .query_one_raw(statement(
                    r#"
                    SELECT space_id, name, description, status, priority, planned_at, due_at,
                           remind_at, status_changed_at, completed_at, position, created_at, updated_at
                    FROM projects WHERE id = ?
                    "#,
                    vec![id.into()],
                ))
                .await?
            else {
                return Ok(false);
            };
            let f = &mut snapshot.fields;
            insert_str_if_missing(f, "space_id", row.try_get("", "space_id")?);
            insert_str_if_missing(f, "name", row.try_get("", "name")?);
            insert_opt_str_if_missing(f, "description", row.try_get("", "description")?);
            insert_str_if_missing(f, "status", row.try_get("", "status")?);
            insert_i64_if_missing(f, "priority", row.try_get("", "priority")?);
            insert_opt_str_if_missing(f, "planned_at", row.try_get("", "planned_at")?);
            insert_opt_str_if_missing(f, "due_at", row.try_get("", "due_at")?);
            insert_opt_str_if_missing(f, "remind_at", row.try_get("", "remind_at")?);
            insert_str_if_missing(
                f,
                "status_changed_at",
                row.try_get("", "status_changed_at")?,
            );
            insert_opt_str_if_missing(f, "completed_at", row.try_get("", "completed_at")?);
            insert_i64_if_missing(f, "position", row.try_get("", "position")?);
            insert_str_if_missing(f, "created_at", row.try_get("", "created_at")?);
            insert_str_if_missing(f, "updated_at", row.try_get("", "updated_at")?);
        }
        SyncEntityKind::Space => {
            let Some(row) = transaction
                .query_one_raw(statement(
                    r#"
                    SELECT name, icon_key, color_key, position, created_at, updated_at
                    FROM spaces WHERE id = ?
                    "#,
                    vec![id.into()],
                ))
                .await?
            else {
                return Ok(false);
            };
            let f = &mut snapshot.fields;
            insert_str_if_missing(f, "name", row.try_get("", "name")?);
            insert_str_if_missing(f, "icon_key", row.try_get("", "icon_key")?);
            insert_str_if_missing(f, "color_key", row.try_get("", "color_key")?);
            insert_i64_if_missing(f, "position", row.try_get("", "position")?);
            insert_str_if_missing(f, "created_at", row.try_get("", "created_at")?);
            insert_str_if_missing(f, "updated_at", row.try_get("", "updated_at")?);
        }
        SyncEntityKind::TaskLink => {
            let Some(row) = transaction
                .query_one_raw(statement(
                    r#"
                    SELECT task_id, title, url, position, created_at, updated_at
                    FROM task_links WHERE id = ?
                    "#,
                    vec![id.into()],
                ))
                .await?
            else {
                return Ok(false);
            };
            let f = &mut snapshot.fields;
            insert_str_if_missing(f, "task_id", row.try_get("", "task_id")?);
            insert_str_if_missing(f, "title", row.try_get("", "title")?);
            insert_str_if_missing(f, "url", row.try_get("", "url")?);
            insert_i64_if_missing(f, "position", row.try_get("", "position")?);
            insert_str_if_missing(f, "created_at", row.try_get("", "created_at")?);
            insert_str_if_missing(f, "updated_at", row.try_get("", "updated_at")?);
        }
        SyncEntityKind::View => {
            let Some(row) = View::find_by_id(&id).one(transaction).await? else {
                return Ok(false);
            };
            for (key, value) in view_sync_fields_preserving_definition(&map_view(row))? {
                snapshot.fields.entry(key).or_insert(value);
            }
        }
    }
    Ok(snapshot.fields.len() > before)
}

fn insert_str_if_missing(fields: &mut BTreeMap<String, Value>, key: &str, value: String) {
    fields
        .entry(key.to_owned())
        .or_insert_with(|| Value::String(value));
}

fn insert_opt_str_if_missing(
    fields: &mut BTreeMap<String, Value>,
    key: &str,
    value: Option<String>,
) {
    if fields.contains_key(key) {
        return;
    }
    fields.insert(
        key.to_owned(),
        value.map(Value::String).unwrap_or(Value::Null),
    );
}

fn insert_i64_if_missing(fields: &mut BTreeMap<String, Value>, key: &str, value: i64) {
    fields.entry(key.to_owned()).or_insert_with(|| json!(value));
}

/// 残缺 patch：只更新协议里出现的已知业务列 + generation。
async fn materialize_partial_fields(
    transaction: &DatabaseTransaction,
    snapshot: &EntitySnapshot,
) -> Result<(), AppError> {
    let f = &snapshot.fields;
    let id = snapshot.entity.entity_id.clone();
    match snapshot.entity.entity_type {
        SyncEntityKind::Task => {
            transaction
                .execute_raw(statement(
                    r#"
                    UPDATE tasks SET
                        generation = ?,
                        status = COALESCE(?, status),
                        status_changed_at = COALESCE(?, status_changed_at),
                        completed_at = CASE WHEN ? = 1 THEN ? ELSE completed_at END,
                        title = COALESCE(?, title),
                        note = CASE WHEN ? = 1 THEN ? ELSE note END,
                        priority = COALESCE(?, priority),
                        position = COALESCE(?, position),
                        planned_at = CASE WHEN ? = 1 THEN ? ELSE planned_at END,
                        due_at = CASE WHEN ? = 1 THEN ? ELSE due_at END,
                        remind_at = CASE WHEN ? = 1 THEN ? ELSE remind_at END,
                        project_id = CASE WHEN ? = 1 THEN ? ELSE project_id END,
                        space_id = COALESCE(?, space_id),
                        updated_at = COALESCE(?, updated_at)
                    WHERE id = ?
                    "#,
                    vec![
                        snapshot.entity.generation.into(),
                        optional_str_bind(f, "status").into(),
                        optional_str_bind(f, "status_changed_at").into(),
                        has_key(f, "completed_at").into(),
                        optional_str_bind(f, "completed_at").into(),
                        optional_str_bind(f, "title").into(),
                        has_key(f, "note").into(),
                        optional_str_bind(f, "note").into(),
                        optional_i64_bind(f, "priority").into(),
                        optional_i64_bind(f, "position").into(),
                        has_key(f, "planned_at").into(),
                        optional_str_bind(f, "planned_at").into(),
                        has_key(f, "due_at").into(),
                        optional_str_bind(f, "due_at").into(),
                        has_key(f, "remind_at").into(),
                        optional_str_bind(f, "remind_at").into(),
                        has_key(f, "project_id").into(),
                        optional_str_bind(f, "project_id").into(),
                        optional_str_bind(f, "space_id").into(),
                        optional_str_bind(f, "updated_at").into(),
                        id.into(),
                    ],
                ))
                .await?;
        }
        SyncEntityKind::Project => {
            transaction
                .execute_raw(statement(
                    r#"
                    UPDATE projects SET
                        generation = ?,
                        status = COALESCE(?, status),
                        status_changed_at = COALESCE(?, status_changed_at),
                        completed_at = CASE WHEN ? = 1 THEN ? ELSE completed_at END,
                        name = COALESCE(?, name),
                        description = CASE WHEN ? = 1 THEN ? ELSE description END,
                        priority = COALESCE(?, priority),
                        position = COALESCE(?, position),
                        space_id = COALESCE(?, space_id),
                        updated_at = COALESCE(?, updated_at)
                    WHERE id = ?
                    "#,
                    vec![
                        snapshot.entity.generation.into(),
                        optional_str_bind(f, "status").into(),
                        optional_str_bind(f, "status_changed_at").into(),
                        has_key(f, "completed_at").into(),
                        optional_str_bind(f, "completed_at").into(),
                        optional_str_bind(f, "name").into(),
                        has_key(f, "description").into(),
                        optional_str_bind(f, "description").into(),
                        optional_i64_bind(f, "priority").into(),
                        optional_i64_bind(f, "position").into(),
                        optional_str_bind(f, "space_id").into(),
                        optional_str_bind(f, "updated_at").into(),
                        id.into(),
                    ],
                ))
                .await?;
        }
        SyncEntityKind::Space => {
            transaction
                .execute_raw(statement(
                    r#"
                    UPDATE spaces SET
                        generation = ?,
                        name = COALESCE(?, name),
                        icon_key = COALESCE(?, icon_key),
                        color_key = COALESCE(?, color_key),
                        position = COALESCE(?, position),
                        updated_at = COALESCE(?, updated_at)
                    WHERE id = ?
                    "#,
                    vec![
                        snapshot.entity.generation.into(),
                        optional_str_bind(f, "name").into(),
                        optional_str_bind(f, "icon_key").into(),
                        optional_str_bind(f, "color_key").into(),
                        optional_i64_bind(f, "position").into(),
                        optional_str_bind(f, "updated_at").into(),
                        id.into(),
                    ],
                ))
                .await?;
        }
        SyncEntityKind::View => {
            return Err(AppError::validation("View 不允许残缺定义物化"));
        }
        SyncEntityKind::TaskLink => {
            // 结构简单；残缺又无完整文档时跳过，避免写坏行。
            log::warn!(
                "同步:跳过残缺 {} 局部物化 id={}",
                entity_label(snapshot.entity.entity_type),
                id
            );
        }
    }
    Ok(())
}

fn has_key(fields: &BTreeMap<String, Value>, key: &str) -> i64 {
    i64::from(fields.contains_key(key))
}

fn optional_str_bind(fields: &BTreeMap<String, Value>, key: &str) -> Option<String> {
    match fields.get(key) {
        Some(Value::Null) | None => None,
        Some(Value::String(s)) => Some(s.clone()),
        Some(other) => other.as_str().map(str::to_owned),
    }
}

fn optional_i64_bind(fields: &BTreeMap<String, Value>, key: &str) -> Option<i64> {
    fields.get(key).and_then(Value::as_i64)
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
    let record = view_record_from_sync_fields(
        &snapshot.entity.entity_id,
        snapshot.entity.generation,
        &snapshot.fields,
    )?;
    Ok(vec![
        record.id.into(),
        record.name.into(),
        view_entity_kind_to_schema(record.entity_kind)
            .to_value()
            .into(),
        record.scope_json.into(),
        record.filters_json.into(),
        record.sort_json.into(),
        record.group_by_json.into(),
        record.position.into(),
        record.generation.into(),
        record.created_at.into(),
        record.updated_at.into(),
    ])
}

fn to_cloud_config(remote: &RuntimeRemoteConfig, remote_instance_id: &str) -> SyncCloudConfig {
    SyncCloudConfig {
        database_url: remote.database_url.clone(),
        expected_instance_id: Some(remote_instance_id.to_owned()),
    }
}

#[cfg(test)]
#[path = "cursor_pull_view_tests.rs"]
mod view_tests;

#[cfg(test)]
mod tests {
    use sea_orm::{ConnectionTrait, DatabaseBackend, Statement};
    use stoneflow_sync::{Baseline, EntityIdentity, SyncCursor, SyncEntityKind, Tombstone};
    use stoneflow_test_support::TestDatabase;

    use super::{apply_explicit_rebind, begin_explicit_rebind, ensure_explicit_rebind_allowed};
    use crate::{
        app::error::AppError,
        sync::binding::{ensure_remote_binding, read_remote_binding, SERVER_SEQ_CURSOR_SCOPE},
    };

    #[tokio::test]
    async fn explicit_rebind_should_refuse_when_outbox_has_pending_changes() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        database
            .connection()
            .execute_raw(Statement::from_sql_and_values(
                DatabaseBackend::Sqlite,
                r#"
                INSERT INTO outbox(
                    id, operation_id, entity_type, entity_id, generation,
                    operation_type, payload_json, created_at, available_at
                ) VALUES ('outbox-1', 'operation-1', 'task', 'task-1', 1, 'patch', '{}', 'now', 'now')
                "#,
                [],
            ))
            .await
            .expect("pending outbox should insert");

        let transaction = begin_explicit_rebind(&database)
            .await
            .expect("rebind transaction should begin");
        let error = ensure_explicit_rebind_allowed(&transaction)
            .await
            .expect_err("pending outbox must block rebind");

        assert!(matches!(error, AppError::Conflict(_)));
        transaction
            .rollback()
            .await
            .expect("transaction should roll back");
    }

    #[tokio::test]
    async fn explicit_rebind_to_empty_remote_should_replace_binding_and_keep_local_content() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        ensure_remote_binding(&database, "remote-a")
            .await
            .expect("initial binding should persist");
        database
            .connection()
            .execute_raw(Statement::from_sql_and_values(
                DatabaseBackend::Sqlite,
                "INSERT INTO sync_cursors(scope, cursor, updated_at) VALUES (?, '12', 'now')",
                [SERVER_SEQ_CURSOR_SCOPE.into()],
            ))
            .await
            .expect("cursor should insert");
        let spaces_before: i64 = scalar_count(&database, "spaces").await;

        let transaction = begin_explicit_rebind(&database)
            .await
            .expect("rebind transaction should begin");
        ensure_explicit_rebind_allowed(&transaction)
            .await
            .expect("empty outbox should allow rebind");
        apply_explicit_rebind(
            &transaction,
            "remote-b",
            Baseline {
                cursor: SyncCursor { server_seq: 0 },
                entities: vec![],
                tombstones: vec![],
            },
        )
        .await
        .expect("empty remote should rebind");
        transaction.commit().await.expect("rebind should commit");

        let binding = read_remote_binding(database.connection())
            .await
            .expect("binding should load");
        assert_eq!(binding.remote_instance_id.as_deref(), Some("remote-b"));
        assert_eq!(binding.server_seq, None);
        assert_eq!(scalar_count(&database, "spaces").await, spaces_before);
    }

    #[tokio::test]
    async fn explicit_rebind_to_nonempty_remote_should_replace_local_replica() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        ensure_remote_binding(&database, "remote-a")
            .await
            .expect("initial binding should persist");
        database
            .connection()
            .execute_raw(Statement::from_string(
                DatabaseBackend::Sqlite,
                r#"
                INSERT INTO views(
                    id, name, entity_kind, scope_json, filters_json, sort_json,
                    group_by_json, position, generation, created_at, updated_at
                ) VALUES (
                    'local-view', 'Local', 'task', '{}', '[]', '[]',
                    NULL, 0, 1, 'now', 'now'
                )
                "#,
            ))
            .await
            .expect("local view should insert");

        let transaction = begin_explicit_rebind(&database)
            .await
            .expect("rebind transaction should begin");
        ensure_explicit_rebind_allowed(&transaction)
            .await
            .expect("empty outbox should allow rebind");
        apply_explicit_rebind(
            &transaction,
            "remote-b",
            Baseline {
                cursor: SyncCursor { server_seq: 9 },
                entities: vec![],
                tombstones: vec![Tombstone {
                    entity: EntityIdentity {
                        entity_type: SyncEntityKind::View,
                        entity_id: "remote-deleted-view".to_owned(),
                        generation: 1,
                    },
                    deletion_seq: 9,
                    deleted_at: "now".to_owned(),
                }],
            },
        )
        .await
        .expect("nonempty remote should replace the local replica");
        transaction.commit().await.expect("rebind should commit");

        let binding = read_remote_binding(database.connection())
            .await
            .expect("binding should load");
        assert_eq!(binding.remote_instance_id.as_deref(), Some("remote-b"));
        assert_eq!(binding.server_seq, Some(9));
        assert_eq!(scalar_count(&database, "views").await, 0);
        assert_eq!(scalar_count(&database, "tombstones").await, 1);
    }

    async fn scalar_count(
        database: &stoneflow_storage::database::DatabaseRuntimeState,
        table: &str,
    ) -> i64 {
        database
            .connection()
            .query_one_raw(Statement::from_string(
                DatabaseBackend::Sqlite,
                format!("SELECT COUNT(*) AS n FROM {table}"),
            ))
            .await
            .expect("count query should succeed")
            .expect("count row should exist")
            .try_get("", "n")
            .expect("count should parse")
    }
}

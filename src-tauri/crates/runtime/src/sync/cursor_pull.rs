//! Cursor pull：协议状态是事实来源，业务表是其物化结果。

use std::time::Instant;

use sea_orm::{ConnectionTrait, DatabaseBackend, DatabaseTransaction, Statement, TransactionTrait};
use serde_json::Value;
use stoneflow_storage::database::DatabaseRuntimeState;
use stoneflow_sync::{
    apply_mutation, Baseline, EntitySnapshot, LifecycleState, ReplicaEntity, SequencedMutation,
    SyncEntityKind, SyncError, SyncRemoteConfig, Tombstone,
};

use crate::app::error::AppError;

use super::{engine::map_sync_error, types::SyncRemoteConfig as RuntimeRemoteConfig};

const SERVER_SEQ_CURSOR_SCOPE: &str = "sync:last_pulled_server_seq";
const LAST_RESTORE_AT_SCOPE: &str = "sync:last_restore_at";

/// 拉取 远端变更并将每一页原子物化到本地。
pub async fn pull_remote_changes(
    database: &DatabaseRuntimeState,
    remote: &RuntimeRemoteConfig,
) -> Result<usize, AppError> {
    let started_at = Instant::now();
    let remote = to_sync_remote(remote);
    let Some(cursor) = read_cursor(database).await? else {
        let baseline = stoneflow_sync::fetch_protocol_baseline(&remote)
            .await
            .map_err(map_sync_error)?;
        apply_baseline(database, baseline).await?;
        log::info!(
            "sync:r7 pull baseline=true changes=0 elapsed_ms={}",
            started_at.elapsed().as_millis()
        );
        return Ok(0);
    };

    let mut applied = 0;
    let mut after = cursor;
    loop {
        let changes = match stoneflow_sync::fetch_protocol_changes(&remote, after).await {
            Ok(changes) => changes,
            Err(SyncError::CursorExpired) => {
                let baseline = stoneflow_sync::fetch_protocol_baseline(&remote)
                    .await
                    .map_err(map_sync_error)?;
                apply_baseline(database, baseline).await?;
                log::info!(
                    "sync:r7 pull baseline=true reason=cursor_expired elapsed_ms={}",
                    started_at.elapsed().as_millis()
                );
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
    log::info!(
        "sync:r7 pull baseline=false changes={applied} elapsed_ms={}",
        started_at.elapsed().as_millis()
    );
    Ok(applied)
}

async fn apply_baseline(
    database: &DatabaseRuntimeState,
    baseline: Baseline,
) -> Result<(), AppError> {
    let transaction = database.connection().begin().await?;
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
        materialize_snapshot(&transaction, &snapshot, "baseline").await?;
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
        let mut replica = load_replica(&transaction, change.mutation.entity()).await?;
        let outcome = apply_mutation(&mut replica, &change.mutation, change.server_seq);
        persist_replica(&transaction, &replica).await?;
        if matches!(outcome, stoneflow_sync::ApplyOutcome::Applied) {
            materialize_replica(&transaction, &replica, &change.committed_at).await?;
        }
    }
    let Some(last_change) = changes.last() else {
        return Err(AppError::internal("pull page 不能为空"));
    };
    write_cursor(&transaction, cursor, &last_change.committed_at).await?;
    transaction.commit().await?;
    Ok(())
}

async fn read_cursor(database: &DatabaseRuntimeState) -> Result<Option<i64>, AppError> {
    let row = database
        .connection()
        .query_one(statement(
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
        .query_one(statement(
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
    transaction.execute(statement(
        "INSERT INTO sync_protocol_entities(entity_type, entity_id, generation, snapshot_json, tombstone_json) VALUES (?, ?, ?, ?, ?) ON CONFLICT(entity_type, entity_id) DO UPDATE SET generation=excluded.generation, snapshot_json=excluded.snapshot_json, tombstone_json=excluded.tombstone_json",
        vec![entity_label(entity.entity_type).into(), entity.entity_id.clone().into(), entity.generation.into(), replica.snapshot.as_ref().map(serialize_json).transpose()?.into(), replica.tombstone.as_ref().map(serialize_json).transpose()?.into()],
    )).await?;
    Ok(())
}

async fn materialize_replica(
    transaction: &DatabaseTransaction,
    replica: &ReplicaEntity,
    committed_at: &str,
) -> Result<(), AppError> {
    if let Some(snapshot) = &replica.snapshot {
        materialize_snapshot(transaction, snapshot, committed_at).await?;
    }
    if let Some(tombstone) = &replica.tombstone {
        materialize_tombstone(transaction, tombstone).await?;
    }
    Ok(())
}

async fn materialize_snapshot(
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
        // `is_default` 是本机导航兜底，不是共享业务状态。首次 INSERT 的远端
        // Space 不能抢占当前设备默认值，已有 Space 也不能被其他设备改写默认选择。
        SyncEntityKind::Space => execute_materialize(transaction, "INSERT INTO spaces(id,name,icon_key,color_key,is_default,position,generation,archived_at,deleted_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,icon_key=excluded.icon_key,color_key=excluded.color_key,position=excluded.position,generation=excluded.generation,archived_at=excluded.archived_at,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at", vec![snapshot.entity.entity_id.clone().into(), required_string(fields,"name")?.into(), required_string(fields,"icon_key")?.into(), required_string(fields,"color_key")?.into(), false.into(), required_i64(fields,"position")?.into(), snapshot.entity.generation.into(), archived_at.into(), deleted_at.into(), required_string(fields,"created_at")?.into(), required_string(fields,"updated_at")?.into()]).await,
        SyncEntityKind::Project => execute_materialize(transaction, "INSERT INTO projects(id,space_id,name,description,status,priority,planned_at,due_at,remind_at,status_changed_at,completed_at,position,generation,archived_at,deleted_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET space_id=excluded.space_id,name=excluded.name,description=excluded.description,status=excluded.status,priority=excluded.priority,planned_at=excluded.planned_at,due_at=excluded.due_at,remind_at=excluded.remind_at,status_changed_at=excluded.status_changed_at,completed_at=excluded.completed_at,position=excluded.position,generation=excluded.generation,archived_at=excluded.archived_at,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at", project_values(snapshot, archived_at, deleted_at)?).await,
        SyncEntityKind::Task => execute_materialize(transaction, "INSERT INTO tasks(id,space_id,project_id,title,note,status,priority,planned_at,due_at,remind_at,status_changed_at,completed_at,position,generation,archived_at,deleted_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET space_id=excluded.space_id,project_id=excluded.project_id,title=excluded.title,note=excluded.note,status=excluded.status,priority=excluded.priority,planned_at=excluded.planned_at,due_at=excluded.due_at,remind_at=excluded.remind_at,status_changed_at=excluded.status_changed_at,completed_at=excluded.completed_at,position=excluded.position,generation=excluded.generation,archived_at=excluded.archived_at,deleted_at=excluded.deleted_at,updated_at=excluded.updated_at", task_values(snapshot, archived_at, deleted_at)?).await,
        SyncEntityKind::TaskLink => execute_materialize(transaction, "INSERT INTO task_links(id,task_id,title,url,position,created_at,updated_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET task_id=excluded.task_id,title=excluded.title,url=excluded.url,position=excluded.position,updated_at=excluded.updated_at", vec![snapshot.entity.entity_id.clone().into(), required_string(fields,"task_id")?.into(), required_string(fields,"title")?.into(), required_string(fields,"url")?.into(), required_i64(fields,"position")?.into(), required_string(fields,"created_at")?.into(), required_string(fields,"updated_at")?.into()]).await,
        SyncEntityKind::View => execute_materialize(transaction, "INSERT INTO views(id,name,entity_kind,scope_json,filters_json,sort_json,group_by_json,position,generation,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,entity_kind=excluded.entity_kind,scope_json=excluded.scope_json,filters_json=excluded.filters_json,sort_json=excluded.sort_json,group_by_json=excluded.group_by_json,position=excluded.position,generation=excluded.generation,updated_at=excluded.updated_at", view_values(snapshot)?).await,
    }
}

async fn materialize_tombstone(
    transaction: &DatabaseTransaction,
    tombstone: &Tombstone,
) -> Result<(), AppError> {
    match tombstone.entity.entity_type {
        // 远端可能只保留父级 tombstone；本地需要先按依赖逆序删除，
        // 否则 SQLite 外键会让一个本应可恢复的基线或增量事务失败。
        SyncEntityKind::Space => {
            transaction
                .execute(statement(
                    "DELETE FROM task_links WHERE task_id IN (SELECT id FROM tasks WHERE space_id = ?)",
                    vec![tombstone.entity.entity_id.clone().into()],
                ))
                .await?;
            transaction
                .execute(statement(
                    "DELETE FROM tasks WHERE space_id = ?",
                    vec![tombstone.entity.entity_id.clone().into()],
                ))
                .await?;
            transaction
                .execute(statement(
                    "DELETE FROM projects WHERE space_id = ?",
                    vec![tombstone.entity.entity_id.clone().into()],
                ))
                .await?;
        }
        SyncEntityKind::Project => {
            transaction
                .execute(statement(
                    "DELETE FROM task_links WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)",
                    vec![tombstone.entity.entity_id.clone().into()],
                ))
                .await?;
            transaction
                .execute(statement(
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
        .execute(statement(
            &format!("DELETE FROM {table} WHERE id = ?"),
            vec![tombstone.entity.entity_id.clone().into()],
        ))
        .await?;
    transaction.execute(statement("INSERT INTO tombstones(entity_type,entity_id,generation,deletion_seq,deleted_at) VALUES (?,?,?,?,?) ON CONFLICT(entity_type,entity_id) DO UPDATE SET generation=excluded.generation,deletion_seq=excluded.deletion_seq,deleted_at=excluded.deleted_at", vec![entity_label(tombstone.entity.entity_type).into(), tombstone.entity.entity_id.clone().into(), tombstone.entity.generation.into(), tombstone.deletion_seq.into(), tombstone.deleted_at.clone().into()])).await?;
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
    ] {
        transaction
            .execute(statement(&format!("DELETE FROM {table}"), vec![]))
            .await?;
    }
    // 保留本机默认 Space 作为空远端或中断 baseline 的最小可用兜底。
    // 已同步的同 ID Space 会在后续 snapshot upsert 时更新其他业务字段。
    transaction
        .execute(statement(
            "DELETE FROM spaces WHERE is_default = 0 OR archived_at IS NOT NULL OR deleted_at IS NOT NULL",
            vec![],
        ))
        .await?;
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
        .execute(statement(
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
        .execute(statement(sql, values))
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
fn required_string(
    fields: &std::collections::BTreeMap<String, Value>,
    key: &str,
) -> Result<String, AppError> {
    fields
        .get(key)
        .and_then(Value::as_str)
        .map(str::to_owned)
        .ok_or_else(|| AppError::internal(format!("{} 缺少字符串字段 {key}", "entity")))
}
fn required_i64(
    fields: &std::collections::BTreeMap<String, Value>,
    key: &str,
) -> Result<i64, AppError> {
    fields
        .get(key)
        .and_then(Value::as_i64)
        .ok_or_else(|| AppError::internal(format!("entity 缺少整数字段 {key}")))
}
fn nullable_string(
    fields: &std::collections::BTreeMap<String, Value>,
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
fn json_field(
    fields: &std::collections::BTreeMap<String, Value>,
    key: &str,
) -> Result<String, AppError> {
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
fn to_sync_remote(remote: &RuntimeRemoteConfig) -> SyncRemoteConfig {
    SyncRemoteConfig {
        url: remote.url.clone(),
        token: remote.token.clone(),
    }
}

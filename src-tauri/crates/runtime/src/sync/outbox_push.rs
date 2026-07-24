//! Outbox push：本地读取与远端提交之间不持有 SQLite 事务。

use std::{collections::BTreeMap, time::Instant};

use sea_orm::{ConnectionTrait, DatabaseBackend, Statement};
use serde_json::json;
use stoneflow_application::operation::{OutboxLifecycleState, OutboxPayload};
use stoneflow_storage::{
    database::DatabaseRuntimeState,
    entities::common::SyncEntityType,
    repositories::{OutboxRepository, PendingOutboxOperation, SyncRepository},
};
use stoneflow_sync::{
    EntityIdentity, EntityPatch, LifecycleState, SyncEntityKind, SyncMutation, SyncOperation,
    Tombstone,
};

use crate::app::error::AppError;

use super::{engine::map_sync_error, types::SyncRemoteConfig};

const PUSH_OPERATION_LIMIT: u64 = 100;

/// 推送当前本地 Outbox。远端 operation 成功后才删除对应本地记录。
pub async fn push_pending_outbox(
    database: &DatabaseRuntimeState,
    remote: &SyncRemoteConfig,
) -> Result<usize, AppError> {
    let started_at = Instant::now();
    let outbox = OutboxRepository::new(database.connection().clone());
    let device_id = SyncRepository::new(database.connection().clone())
        .get_or_create_device_id(&stoneflow_domain::now_utc().to_rfc3339())
        .await?;
    let mut pushed = 0;
    loop {
        let groups = outbox.list_pending_operations(PUSH_OPERATION_LIMIT).await?;
        if groups.is_empty() {
            break;
        }
        ensure_default_space_is_remote(database, remote, &device_id).await?;
        let operations = groups
            .iter()
            .map(|group| to_sync_operation(&device_id, group))
            .collect::<Result<Vec<_>, _>>()?;
        stoneflow_sync::upload_operations(
            &stoneflow_sync::SyncCloudConfig {
                database_url: remote.database_url.clone(),
            },
            &operations,
        )
        .await
        .map_err(map_sync_error)?;
        for group in groups {
            outbox.acknowledge_operation(&group.operation_id).await?;
            pushed += 1;
        }
    }

    if pushed > 0 {
        log::info!(
            "同步:上传 {} 条 耗时ms={}",
            pushed,
            started_at.elapsed().as_millis()
        );
    }
    Ok(pushed)
}

/// 默认 Space 是本机兜底，但其实体必须先于引用它的任务存在于远端。
/// 远端回放不会把 `is_default` 写回其他设备，因此不同设备的兜底选择不会互相覆盖。
///
/// 本机若只有空壳默认（无业务数据）：**禁止**把占位「个人」推上云，否则新机会污染云端并叠同名 Space。
async fn ensure_default_space_is_remote(
    database: &DatabaseRuntimeState,
    remote: &SyncRemoteConfig,
    device_id: &str,
) -> Result<(), AppError> {
    if !super::cursor_pull::local_has_user_content_for_plan(database).await? {
        log::info!("同步:跳过默认 Space 上传（本机仅空壳占位）");
        return Ok(());
    }
    let row = database
        .connection()
        .query_one_raw(Statement::from_string(
            DatabaseBackend::Sqlite,
            "SELECT id, name, icon_key, color_key, position, generation, created_at, updated_at FROM spaces WHERE is_default = 1 AND archived_at IS NULL AND deleted_at IS NULL LIMIT 1".to_owned(),
        ))
        .await?
        .ok_or_else(|| AppError::initialization("本机缺少可用默认 Space，无法建立 同步基线"))?;
    let id: String = row.try_get("", "id")?;
    let created_at: String = row.try_get("", "created_at")?;
    let operation = SyncOperation {
        device_id: device_id.to_owned(),
        operation_id: format!("r7-default-space:{id}"),
        mutations: vec![SyncMutation::Patch {
            patch: EntityPatch {
                entity: EntityIdentity {
                    entity_type: SyncEntityKind::Space,
                    entity_id: id,
                    generation: row.try_get("", "generation")?,
                },
                fields: BTreeMap::from([
                    ("name".to_owned(), json!(row.try_get::<String>("", "name")?)),
                    (
                        "icon_key".to_owned(),
                        json!(row.try_get::<String>("", "icon_key")?),
                    ),
                    (
                        "color_key".to_owned(),
                        json!(row.try_get::<String>("", "color_key")?),
                    ),
                    (
                        "position".to_owned(),
                        json!(row.try_get::<i64>("", "position")?),
                    ),
                    ("created_at".to_owned(), json!(created_at)),
                    (
                        "updated_at".to_owned(),
                        json!(row.try_get::<String>("", "updated_at")?),
                    ),
                ]),
            },
        }],
        created_at,
    };
    stoneflow_sync::upload_operations(
        &stoneflow_sync::SyncCloudConfig {
            database_url: remote.database_url.clone(),
        },
        &[operation],
    )
    .await
    .map_err(map_sync_error)?;
    Ok(())
}

fn to_sync_operation(
    device_id: &str,
    group: &PendingOutboxOperation,
) -> Result<SyncOperation, AppError> {
    let created_at = group
        .entries
        .first()
        .map(|entry| entry.created_at.clone())
        .ok_or_else(|| AppError::internal("空 Outbox operation 不应进入 push"))?;
    let mut mutations: Vec<SyncMutation> = Vec::new();
    'entries: for entry in &group.entries {
        let mutation = to_mutation(entry)?;
        match mutation {
            SyncMutation::Patch { patch } => {
                for existing in mutations.iter_mut().rev() {
                    if existing.entity() != &patch.entity {
                        continue;
                    }
                    if let SyncMutation::Patch { patch: previous } = existing {
                        previous.fields.extend(patch.fields);
                        continue 'entries;
                    }
                    break;
                }
                mutations.push(SyncMutation::Patch { patch });
            }
            mutation => mutations.push(mutation),
        }
    }
    Ok(SyncOperation {
        device_id: device_id.to_owned(),
        operation_id: group.operation_id.clone(),
        mutations,
        created_at,
    })
}

fn to_mutation(
    entry: &stoneflow_storage::entities::outbox::Model,
) -> Result<SyncMutation, AppError> {
    let entity = EntityIdentity {
        entity_type: map_entity_type(entry.entity_type)?,
        entity_id: entry.entity_id.clone(),
        generation: entry.generation,
    };
    let payload: OutboxPayload = serde_json::from_str(&entry.payload_json)
        .map_err(|error| AppError::internal(format!("解析 Outbox payload 失败: {error}")))?;
    Ok(match payload {
        OutboxPayload::Patch { fields } => SyncMutation::Patch {
            patch: EntityPatch {
                entity,
                fields: fields.into_iter().collect::<BTreeMap<_, _>>(),
            },
        },
        OutboxPayload::Lifecycle { state } => SyncMutation::Lifecycle {
            entity,
            state: match state {
                OutboxLifecycleState::Active => LifecycleState::Active,
                OutboxLifecycleState::Archived => LifecycleState::Archived,
                OutboxLifecycleState::Trashed => LifecycleState::Trashed,
            },
        },
        OutboxPayload::Tombstone { deleted_at } => SyncMutation::Tombstone {
            tombstone: Tombstone {
                entity,
                deletion_seq: 0,
                deleted_at,
            },
        },
    })
}

fn map_entity_type(value: SyncEntityType) -> Result<SyncEntityKind, AppError> {
    match value {
        SyncEntityType::Space => Ok(SyncEntityKind::Space),
        SyncEntityType::Project => Ok(SyncEntityKind::Project),
        SyncEntityType::Task => Ok(SyncEntityKind::Task),
        SyncEntityType::TaskLink => Ok(SyncEntityKind::TaskLink),
        SyncEntityType::View => Ok(SyncEntityKind::View),
        SyncEntityType::Setting | SyncEntityType::Activity => {
            Err(AppError::internal("非同步业务实体不应进入 Outbox push"))
        }
    }
}

#[cfg(test)]
mod tests {
    use stoneflow_storage::{
        entities::{
            common::{OutboxOperationType, SyncEntityType},
            outbox,
        },
        repositories::PendingOutboxOperation,
    };

    use super::to_sync_operation;
    use stoneflow_sync::SyncMutation;

    #[test]
    fn operation_group_should_merge_adjacent_patch_fields() {
        let group = PendingOutboxOperation {
            operation_id: "operation-1".to_owned(),
            entries: vec![
                entry(r#"{"kind":"patch","fields":{"title":"A"}}"#),
                entry(r#"{"kind":"patch","fields":{"priority":2}}"#),
            ],
        };

        let operation = to_sync_operation("device-1", &group).expect("group should map");

        assert_eq!(operation.mutations.len(), 1);
        let SyncMutation::Patch { patch } = &operation.mutations[0] else {
            panic!("mutation should be a patch");
        };
        assert_eq!(patch.fields.len(), 2);
    }

    #[test]
    fn operation_group_should_merge_non_adjacent_patch_fields_for_same_entity() {
        let group = PendingOutboxOperation {
            operation_id: "operation-1".to_owned(),
            entries: vec![
                entry(r#"{"kind":"patch","fields":{"title":"A"}}"#),
                entry_for("task-2", r#"{"kind":"patch","fields":{"title":"B"}}"#),
                entry(r#"{"kind":"patch","fields":{"priority":2}}"#),
            ],
        };

        let operation = to_sync_operation("device-1", &group).expect("group should map");

        assert_eq!(operation.mutations.len(), 2);
        let SyncMutation::Patch { patch } = &operation.mutations[0] else {
            panic!("first mutation should be a patch");
        };
        assert_eq!(patch.entity.entity_id, "task-1");
        assert_eq!(patch.fields.len(), 2);
    }

    #[test]
    fn operation_group_should_preserve_lifecycle_boundary_before_following_patch() {
        let group = PendingOutboxOperation {
            operation_id: "operation-1".to_owned(),
            entries: vec![
                entry(r#"{"kind":"patch","fields":{"title":"A"}}"#),
                entry(r#"{"kind":"lifecycle","state":"archived"}"#),
                entry(r#"{"kind":"patch","fields":{"priority":2}}"#),
            ],
        };

        let operation = to_sync_operation("device-1", &group).expect("group should map");

        assert_eq!(operation.mutations.len(), 3);
        assert!(matches!(
            operation.mutations[1],
            SyncMutation::Lifecycle { .. }
        ));
    }

    #[test]
    fn operation_group_should_map_tombstone_without_business_fields() {
        let group = PendingOutboxOperation {
            operation_id: "operation-1".to_owned(),
            entries: vec![entry(
                r#"{"kind":"tombstone","deleted_at":"2026-07-23T01:00:00Z"}"#,
            )],
        };

        let operation = to_sync_operation("device-1", &group).expect("group should map");

        let [SyncMutation::Tombstone { tombstone }] = operation.mutations.as_slice() else {
            panic!("operation should contain one tombstone");
        };
        assert_eq!(tombstone.entity.entity_id, "task-1");
        assert_eq!(tombstone.deleted_at, "2026-07-23T01:00:00Z");
    }

    fn entry(payload_json: &str) -> outbox::Model {
        entry_for("task-1", payload_json)
    }

    fn entry_for(entity_id: &str, payload_json: &str) -> outbox::Model {
        outbox::Model {
            id: "entry".to_owned(),
            operation_id: "operation-1".to_owned(),
            entity_type: SyncEntityType::Task,
            entity_id: entity_id.to_owned(),
            generation: 1,
            operation_type: OutboxOperationType::Patch,
            payload_json: payload_json.to_owned(),
            created_at: "2026-07-23T00:00:00Z".to_owned(),
            available_at: "2026-07-23T00:00:00Z".to_owned(),
        }
    }
}

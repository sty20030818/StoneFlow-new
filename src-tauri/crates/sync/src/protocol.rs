//! 同步协议的纯数据模型与冲突规则。
//!
//! 该模块不认识 SQLite、Turso 或 Tauri。服务端为每个 mutation 分配单调 sequence，
//! 因而不同字段可合并，同字段与生命周期均可由一个确定的纯函数裁决。

use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;

/// 允许进入同步协议的业务实体类型。
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncEntityKind {
    Space,
    Project,
    Task,
    TaskLink,
    View,
}

/// 实体 identity 加 generation。永久删除后的旧 generation 永远不能复活。
#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub struct EntityIdentity {
    pub entity_type: SyncEntityKind,
    pub entity_id: String,
    pub generation: i64,
}

/// 一次普通编辑携带的字段级 patch。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct EntityPatch {
    pub entity: EntityIdentity,
    pub fields: BTreeMap<String, Value>,
}

/// 可见实体的生命周期。永久删除用 [`Tombstone`] 表达，避免混入业务正文。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum LifecycleState {
    Active,
    Archived,
    Trashed,
}

/// 删除的最小 metadata，不能包含业务字段或正文。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Tombstone {
    pub entity: EntityIdentity,
    pub deletion_seq: i64,
    pub deleted_at: String,
}

/// 远端 change log 的最小 mutation 单位。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum SyncMutation {
    Patch {
        patch: EntityPatch,
    },
    Lifecycle {
        entity: EntityIdentity,
        state: LifecycleState,
    },
    Tombstone {
        tombstone: Tombstone,
    },
}

impl SyncMutation {
    pub fn entity(&self) -> &EntityIdentity {
        match self {
            Self::Patch { patch } => &patch.entity,
            Self::Lifecycle { entity, .. } => entity,
            Self::Tombstone { tombstone } => &tombstone.entity,
        }
    }
}

/// 本地一个原子操作提交给远端的完整描述。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SyncOperation {
    pub device_id: String,
    pub operation_id: String,
    pub mutations: Vec<SyncMutation>,
    pub created_at: String,
}

/// 增量同步游标。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct SyncCursor {
    pub server_seq: i64,
}

/// 远端当前实体状态。字段版本只保存 sequence，不重复保存字段正文。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct EntitySnapshot {
    pub entity: EntityIdentity,
    pub fields: BTreeMap<String, Value>,
    pub field_sequences: BTreeMap<String, i64>,
    pub lifecycle: LifecycleState,
    pub lifecycle_seq: i64,
    pub updated_seq: i64,
}

/// 全量基线只在首次设备或 cursor 过期时使用。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Baseline {
    pub cursor: SyncCursor,
    pub entities: Vec<EntitySnapshot>,
    pub tombstones: Vec<Tombstone>,
}

/// 带服务端顺序的增量变更。`committed_at` 仅用于本地生命周期物化，
/// 不参与协议冲突裁决。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct SequencedMutation {
    pub server_seq: i64,
    pub mutation: SyncMutation,
    pub committed_at: String,
}

/// 单个 identity 的本地/远端回放状态。
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
pub struct ReplicaEntity {
    pub snapshot: Option<EntitySnapshot>,
    pub tombstone: Option<Tombstone>,
}

/// 回放结果，供 pull 与测试观察而非猜测协议结果。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ApplyOutcome {
    Applied,
    IgnoredStale,
    IgnoredByLifecycle,
    IgnoredByTombstone,
}

/// 以服务端 sequence 将 mutation 回放到单个实体。
pub fn apply_mutation(
    replica: &mut ReplicaEntity,
    mutation: &SyncMutation,
    server_seq: i64,
) -> ApplyOutcome {
    let entity = mutation.entity();
    if replica
        .tombstone
        .as_ref()
        .is_some_and(|tombstone| tombstone.entity.generation >= entity.generation)
    {
        return ApplyOutcome::IgnoredByTombstone;
    }
    if replica
        .snapshot
        .as_ref()
        .is_some_and(|snapshot| snapshot.entity.generation > entity.generation)
    {
        return ApplyOutcome::IgnoredStale;
    }

    match mutation {
        SyncMutation::Tombstone { tombstone } => {
            if replica
                .tombstone
                .as_ref()
                .is_some_and(|current| current.deletion_seq >= tombstone.deletion_seq)
            {
                return ApplyOutcome::IgnoredStale;
            }
            replica.snapshot = None;
            replica.tombstone = Some(tombstone.clone());
            ApplyOutcome::Applied
        }
        SyncMutation::Patch { patch } => {
            let snapshot = ensure_snapshot(replica, &patch.entity, server_seq);
            if snapshot.lifecycle != LifecycleState::Active {
                return ApplyOutcome::IgnoredByLifecycle;
            }

            let mut changed = false;
            for (field, value) in &patch.fields {
                if snapshot
                    .field_sequences
                    .get(field)
                    .copied()
                    .unwrap_or_default()
                    >= server_seq
                {
                    continue;
                }
                snapshot.fields.insert(field.clone(), value.clone());
                snapshot.field_sequences.insert(field.clone(), server_seq);
                changed = true;
            }
            if changed {
                snapshot.updated_seq = server_seq;
                ApplyOutcome::Applied
            } else {
                ApplyOutcome::IgnoredStale
            }
        }
        SyncMutation::Lifecycle { entity, state } => {
            let snapshot = ensure_snapshot(replica, entity, server_seq);
            if snapshot.lifecycle_seq >= server_seq {
                return ApplyOutcome::IgnoredStale;
            }
            snapshot.lifecycle = *state;
            snapshot.lifecycle_seq = server_seq;
            snapshot.updated_seq = server_seq;
            ApplyOutcome::Applied
        }
    }
}

fn ensure_snapshot<'a>(
    replica: &'a mut ReplicaEntity,
    entity: &EntityIdentity,
    server_seq: i64,
) -> &'a mut EntitySnapshot {
    let requires_new_snapshot = replica
        .snapshot
        .as_ref()
        .is_none_or(|snapshot| snapshot.entity.generation < entity.generation);
    if requires_new_snapshot {
        replica.snapshot = None;
    }
    replica.snapshot.get_or_insert_with(|| EntitySnapshot {
        entity: entity.clone(),
        fields: BTreeMap::new(),
        field_sequences: BTreeMap::new(),
        lifecycle: LifecycleState::Active,
        lifecycle_seq: 0,
        updated_seq: server_seq,
    })
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    fn entity() -> EntityIdentity {
        EntityIdentity {
            entity_type: SyncEntityKind::Task,
            entity_id: "task-1".to_owned(),
            generation: 1,
        }
    }

    fn patch(fields: &[(&str, Value)]) -> SyncMutation {
        SyncMutation::Patch {
            patch: EntityPatch {
                entity: entity(),
                fields: fields
                    .iter()
                    .map(|(key, value)| ((*key).to_owned(), value.clone()))
                    .collect(),
            },
        }
    }

    #[test]
    fn apply_mutation_should_merge_different_fields() {
        let mut replica = ReplicaEntity::default();
        apply_mutation(&mut replica, &patch(&[("title", json!("A"))]), 10);
        apply_mutation(&mut replica, &patch(&[("priority", json!(2))]), 11);

        assert_eq!(
            replica.snapshot.expect("snapshot should exist").fields,
            BTreeMap::from([
                ("priority".to_owned(), json!(2)),
                ("title".to_owned(), json!("A")),
            ])
        );
    }

    #[test]
    fn apply_mutation_should_keep_latest_sequence_for_same_field() {
        let mut replica = ReplicaEntity::default();
        apply_mutation(&mut replica, &patch(&[("title", json!("new"))]), 20);
        apply_mutation(&mut replica, &patch(&[("title", json!("old"))]), 19);

        assert_eq!(
            replica.snapshot.expect("snapshot should exist").fields["title"],
            json!("new")
        );
    }

    #[test]
    fn apply_mutation_should_prioritize_lifecycle_over_normal_patch() {
        let mut replica = ReplicaEntity::default();
        apply_mutation(
            &mut replica,
            &SyncMutation::Lifecycle {
                entity: entity(),
                state: LifecycleState::Trashed,
            },
            30,
        );

        assert_eq!(
            apply_mutation(&mut replica, &patch(&[("title", json!("ignored"))]), 31),
            ApplyOutcome::IgnoredByLifecycle
        );
    }

    #[test]
    fn apply_mutation_should_reject_patch_at_tombstoned_generation() {
        let mut replica = ReplicaEntity::default();
        apply_mutation(
            &mut replica,
            &SyncMutation::Tombstone {
                tombstone: Tombstone {
                    entity: entity(),
                    deletion_seq: 40,
                    deleted_at: "2026-07-23T00:00:00Z".to_owned(),
                },
            },
            40,
        );

        assert_eq!(
            apply_mutation(&mut replica, &patch(&[("title", json!("stale"))]), 41),
            ApplyOutcome::IgnoredByTombstone
        );
    }

    #[test]
    fn apply_mutation_should_reject_older_generation_after_restore() {
        let mut replica = ReplicaEntity::default();
        let mut restored_entity = entity();
        restored_entity.generation = 2;
        apply_mutation(
            &mut replica,
            &SyncMutation::Lifecycle {
                entity: restored_entity,
                state: LifecycleState::Active,
            },
            50,
        );

        assert_eq!(
            apply_mutation(&mut replica, &patch(&[("title", json!("old"))]), 51),
            ApplyOutcome::IgnoredStale
        );
    }
}

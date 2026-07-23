//! 同进程逻辑同步引擎。
//!
//! 负责 Turso 协议与远端诊断；不依赖 Tauri。
//! 调度与 UI 事件由 runtime 负责。

mod diagnose;
mod error;
mod protocol;
mod protocol_pull;
mod protocol_push;
mod remote;
mod remote_schema;
mod types;

pub use diagnose::{RemoteSyncDiagnosticsOutput, SyncDiagnosticsCountsOutput, SyncProbeOutput};
pub use error::{SyncError, SyncErrorKind};
pub use protocol::{
    apply_mutation, ApplyOutcome, Baseline, EntityIdentity, EntityPatch, EntitySnapshot,
    LifecycleState, ReplicaEntity, SequencedMutation, SyncCursor, SyncEntityKind, SyncMutation,
    SyncOperation, Tombstone,
};
pub use protocol_pull::{fetch_protocol_baseline, fetch_protocol_changes, PROTOCOL_PULL_PAGE_SIZE};
pub use protocol_push::{submit_operation, PushResult};
pub use remote_schema::{bootstrap_protocol_schema, PROTOCOL_SCHEMA_VERSION};
pub use types::SyncRemoteConfig;

use diagnose::{collect_sync_probe, collect_sync_remote_diagnostics};
use remote::open_remote;

/// 提交已由 runtime 从本地 Outbox 归并好的 operations。
pub async fn push_operations(
    remote_config: &SyncRemoteConfig,
    operations: &[SyncOperation],
) -> Result<Vec<PushResult>, SyncError> {
    let remote = open_remote(remote_config).await?;
    bootstrap_protocol_schema(&remote).await?;
    let mut results = Vec::with_capacity(operations.len());
    for operation in operations {
        results.push(submit_operation(&remote, operation).await?);
    }
    Ok(results)
}

/// 远端 head check。
pub async fn probe(remote: &SyncRemoteConfig) -> Result<SyncProbeOutput, SyncError> {
    let remote = open_remote(remote).await?;
    bootstrap_protocol_schema(&remote).await?;
    collect_sync_probe(&remote).await
}

/// 远端只读诊断。本地诊断属于 runtime 的 SQLite 边界。
pub async fn diagnose_remote(
    remote: &SyncRemoteConfig,
) -> Result<RemoteSyncDiagnosticsOutput, SyncError> {
    let remote = open_remote(remote).await?;
    bootstrap_protocol_schema(&remote).await?;
    collect_sync_remote_diagnostics(&remote).await
}

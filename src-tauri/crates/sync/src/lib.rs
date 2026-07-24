//! 同进程逻辑同步引擎。
//!
//! - 纯协议：`protocol`（无 IO）
//! - 云端副本：`postgres`（用户自备 Postgres，sqlx）
//!
//! 调度与 UI 事件由 runtime 负责；本 crate 不依赖 Tauri。

mod error;
mod postgres;
mod protocol;
mod types;

pub use error::{SyncError, SyncErrorKind};
pub use postgres::{DOWNLOAD_PAGE_SIZE, PROTOCOL_SCHEMA_VERSION};
pub use protocol::{
    apply_mutation, ApplyOutcome, Baseline, EntityIdentity, EntityPatch, EntitySnapshot,
    LifecycleState, ReplicaEntity, SequencedMutation, SyncCursor, SyncEntityKind, SyncMutation,
    SyncOperation, Tombstone,
};
pub use types::{PushResult, SyncCloudConfig, UploadResult};

/// 与旧 pull 分页常量同值，供 runtime 对照。
pub const PROTOCOL_PULL_PAGE_SIZE: i64 = DOWNLOAD_PAGE_SIZE;

/// 上传一批 operations（逐条事务；整批非单事务）。
pub async fn upload_operations(
    config: &SyncCloudConfig,
    operations: &[SyncOperation],
) -> Result<Vec<UploadResult>, SyncError> {
    let mut conn = postgres::connect_ready(config).await?;
    let mut results = Vec::with_capacity(operations.len());
    for operation in operations {
        results.push(postgres::upload_operation(&mut conn, operation).await?);
    }
    Ok(results)
}

/// 按同步位置下载增量页。
pub async fn download_after(
    config: &SyncCloudConfig,
    after_server_seq: i64,
) -> Result<Vec<SequencedMutation>, SyncError> {
    let mut conn = postgres::connect_ready(config).await?;
    postgres::download_after(&mut conn, after_server_seq, DOWNLOAD_PAGE_SIZE).await
}

/// 全量同步。
pub async fn download_full(config: &SyncCloudConfig) -> Result<Baseline, SyncError> {
    let mut conn = postgres::connect_ready(config).await?;
    postgres::download_full(&mut conn).await
}

/// 连通检查。
pub async fn health(config: &SyncCloudConfig) -> Result<SyncProbeOutput, SyncError> {
    let mut conn = postgres::connect_ready(config).await?;
    let probe = postgres::health(&mut conn).await?;
    Ok(probe)
}

/// 云端只读诊断。
pub async fn diagnose_cloud(
    config: &SyncCloudConfig,
) -> Result<RemoteSyncDiagnosticsOutput, SyncError> {
    let mut conn = postgres::connect_ready(config).await?;
    postgres::diagnose(&mut conn).await
}

// 诊断 DTO 放在 lib 以便 postgres/health 与门面共用。

use serde::Serialize;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteSyncDiagnosticsOutput {
    pub latest_server_seq: Option<i64>,
    pub counts: SyncDiagnosticsCountsOutput,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncDiagnosticsCountsOutput {
    pub spaces: i64,
    pub projects: i64,
    pub tasks: i64,
    pub task_links: i64,
    pub views: i64,
    pub settings: i64,
    pub total_items: i64,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncProbeOutput {
    pub latest_server_seq: Option<i64>,
    pub schema_version: Option<i64>,
}

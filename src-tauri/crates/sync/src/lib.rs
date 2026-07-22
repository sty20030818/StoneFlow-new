//! 同进程逻辑同步引擎。
//!
//! 负责 Turso 协议、push/pull/migrate 与诊断；不依赖 Tauri。
//! 调度与 UI 事件由 runtime 负责。

mod apply;
mod diagnose;
mod error;
mod local;
mod migrate;
mod pull;
mod push;
mod remote;
mod schema;
mod types;

pub use diagnose::{
    LocalSyncDiagnosticsOutput, RemoteSyncDiagnosticsOutput, SyncDiagnosticsCountsOutput,
    SyncDiagnosticsOutput, SyncProbeOutput,
};
pub use error::{SyncError, SyncErrorKind};
pub use types::{SyncRemoteConfig, SyncRunMode};

use diagnose::{collect_sync_diagnostics, collect_sync_probe};
use migrate::migrate_baseline;
use pull::pull_remote_changes;
use push::push_local_changes;
use remote::{bootstrap_remote_schema, open_local_sqlite, open_remote};

/// 同步请求：由 runtime 传入 owned 配置，避免跨 await 借用。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SyncRequest {
    pub database_path: String,
    pub remote: SyncRemoteConfig,
    pub mode: SyncRunMode,
}

/// 执行 push / pull / migrate。
pub async fn run(request: SyncRequest) -> Result<(), SyncError> {
    let local = open_local_sqlite(&request.database_path).await?;
    let remote = open_remote(&request.remote).await?;
    bootstrap_remote_schema(&remote).await?;

    match request.mode {
        SyncRunMode::Push => push_local_changes(&local, &remote).await,
        SyncRunMode::Pull => pull_remote_changes(&local, &remote).await,
        SyncRunMode::Migrate => migrate_baseline(&local, &remote).await,
        SyncRunMode::Probe | SyncRunMode::Diagnose => Err(SyncError::validation(
            "probe/diagnose 请使用专用入口，不要走 run()",
        )),
    }
}

/// 远端 head check。
pub async fn probe(remote: &SyncRemoteConfig) -> Result<SyncProbeOutput, SyncError> {
    let remote = open_remote(remote).await?;
    bootstrap_remote_schema(&remote).await?;
    collect_sync_probe(&remote).await
}

/// 本地与远端只读诊断。
pub async fn diagnose(
    database_path: &str,
    remote: &SyncRemoteConfig,
) -> Result<SyncDiagnosticsOutput, SyncError> {
    let local = open_local_sqlite(database_path).await?;
    let remote = open_remote(remote).await?;
    bootstrap_remote_schema(&remote).await?;
    collect_sync_diagnostics(&local, &remote).await
}

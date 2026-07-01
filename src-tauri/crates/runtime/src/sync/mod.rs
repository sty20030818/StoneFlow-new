//! 云同步运行时边界：主进程只负责状态、调度与 sidecar 拉起。

mod config;
mod engine;
mod local;
mod policy;
mod state;
mod types;

pub use engine::{
    configure_sync, get_sync_diagnostics, get_sync_status, initialize_state, note_local_write,
    run_sync, trigger_resume_sync, trigger_startup_sync, update_sync_policy,
};
pub use policy::{SyncPolicy, SyncPolicyMode};
pub use state::SyncRuntimeState;
pub use types::{
    ConfigureSyncInput, SyncDiagnosticsCountsPayload, SyncDiagnosticsPayload,
    SyncLocalDiagnosticsPayload, SyncRemoteDiagnosticsPayload, SyncReplicaState, SyncStatusPayload,
    UpdateSyncPolicyInput,
};

//! 云同步运行时边界：主进程负责状态、调度与协议编排。

mod binding;
mod bootstrap_plan;
mod config;
mod cursor_pull;
mod engine;
mod local;
mod origin_seed;
mod outbox_push;
mod policy;
mod scheduler;
mod state;
mod types;

pub use engine::{
    adopt_legacy_sync_remote, configure_sync, flush_before_exit, get_sync_diagnostics,
    get_sync_status, initialize_state, note_local_write, rebind_sync, run_sync,
    trigger_resume_sync, trigger_startup_sync, update_sync_policy,
};
pub use policy::{SyncPolicy, SyncPolicyMode};
pub use scheduler::start_scheduler;
pub use state::SyncRuntimeState;
pub use types::{
    ConfigureSyncInput, RebindSyncInput, SyncDiagnosticsCountsPayload, SyncDiagnosticsPayload,
    SyncLocalDiagnosticsPayload, SyncRemoteDiagnosticsPayload, SyncReplicaState, SyncStatusPayload,
    UpdateSyncPolicyInput,
};

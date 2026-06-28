//! 云同步运行时边界：主进程只负责状态、调度与 sidecar 拉起。

mod config;
mod engine;
mod local;
mod state;
mod types;

pub use engine::{
    configure_sync, force_sync, get_sync_status, initialize_state, note_local_write,
    trigger_resume_pull, trigger_startup_pull,
};
pub use state::SyncRuntimeState;
pub use types::{ConfigureSyncInput, SyncReplicaState, SyncStatusPayload};

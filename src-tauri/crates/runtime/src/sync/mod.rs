//! 云同步 Phase 1：本地库是真相源，sync 层只负责脏标记与 push/pull 调度。

mod config;
mod engine;
mod state;
mod types;

pub use engine::{
    configure_sync, force_sync, get_sync_status, initialize_state, note_local_write,
    trigger_resume_pull, trigger_startup_pull,
};
pub use state::SyncRuntimeState;
pub use types::{ConfigureSyncInput, SyncStatusPayload};

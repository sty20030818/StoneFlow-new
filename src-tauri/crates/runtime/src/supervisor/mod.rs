//! HelperSupervisor 最终态：actor 单点持有 helper 生命周期。

mod actor;
mod binary_resolver;
mod command;
mod log_forwarder;
pub mod restart_policy;
mod shutdown;
mod state;

pub use actor::spawn_supervisor;
pub use command::SupervisorHandle;


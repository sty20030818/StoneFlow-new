use std::time::Instant;

use tokio::process::Child;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SupervisorStage {
    Idle,
    WaitingForHello,
    WaitingForWindow,
    Ready,
    Restarting,
    ShuttingDown,
    CircuitOpen,
}

#[derive(Debug)]
pub struct ChildProcess {
    pub child: Child,
    pub pid: u32,
}

#[derive(Debug)]
pub struct RestartPlan {
    pub reason: String,
    pub restart_at: Instant,
}

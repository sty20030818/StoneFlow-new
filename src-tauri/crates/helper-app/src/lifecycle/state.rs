use std::sync::Arc;

use tokio::sync::RwLock;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HelperLifecyclePhase {
    Running,
    ShuttingDown,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct HelperLifecycleSnapshot {
    pub phase: HelperLifecyclePhase,
    pub shutdown_phase: Option<String>,
    pub frontend_ready: bool,
}

impl Default for HelperLifecycleSnapshot {
    fn default() -> Self {
        Self {
            phase: HelperLifecyclePhase::Running,
            shutdown_phase: None,
            frontend_ready: false,
        }
    }
}

#[derive(Debug, Clone, Default)]
pub struct HelperLifecycleState {
    inner: Arc<RwLock<HelperLifecycleSnapshot>>,
}

impl HelperLifecycleState {
    pub async fn snapshot(&self) -> HelperLifecycleSnapshot {
        self.inner.read().await.clone()
    }

    pub async fn is_shutting_down(&self) -> bool {
        self.inner.read().await.phase == HelperLifecyclePhase::ShuttingDown
    }

    pub async fn is_frontend_ready(&self) -> bool {
        self.inner.read().await.frontend_ready
    }

    pub async fn mark_frontend_ready(&self) {
        let mut guard = self.inner.write().await;
        guard.frontend_ready = true;
    }

    pub async fn mark_frontend_unready(&self) {
        let mut guard = self.inner.write().await;
        guard.frontend_ready = false;
    }

    pub async fn begin_shutdown(&self) -> String {
        let mut guard = self.inner.write().await;
        if guard.phase == HelperLifecyclePhase::ShuttingDown {
            return guard
                .shutdown_phase
                .clone()
                .unwrap_or_else(|| "shutting_down".to_owned());
        }

        guard.phase = HelperLifecyclePhase::ShuttingDown;
        guard.shutdown_phase = Some("shutdown_requested".to_owned());
        guard.frontend_ready = false;
        "shutdown_requested".to_owned()
    }

    pub async fn advance_shutdown_phase(&self, phase: impl Into<String>) {
        let mut guard = self.inner.write().await;
        guard.phase = HelperLifecyclePhase::ShuttingDown;
        guard.shutdown_phase = Some(phase.into());
    }

    pub async fn guard_running(&self, action: &str) -> Result<(), &'static str> {
        let guard = self.inner.read().await;
        if guard.phase == HelperLifecyclePhase::ShuttingDown {
            return Err(match action {
                "shortcut" => "helper 正在关闭，忽略全局快捷键",
                "prepare_session" => "helper 正在关闭，无法准备 quick create session",
                "present_session" => "helper 正在关闭，无法显示 quick create session",
                _ => "helper 正在关闭",
            });
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn lifecycle_should_start_running() {
        let lifecycle = HelperLifecycleState::default();
        let snapshot = lifecycle.snapshot().await;
        assert_eq!(snapshot.phase, HelperLifecyclePhase::Running);
        assert!(!snapshot.frontend_ready);
        assert_eq!(snapshot.shutdown_phase, None);
    }

    #[tokio::test]
    async fn lifecycle_shutdown_should_be_idempotent() {
        let lifecycle = HelperLifecycleState::default();
        assert_eq!(lifecycle.begin_shutdown().await, "shutdown_requested");
        assert_eq!(lifecycle.begin_shutdown().await, "shutdown_requested");
        assert!(lifecycle.is_shutting_down().await);
    }
}


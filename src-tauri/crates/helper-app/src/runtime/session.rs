use std::sync::Arc;

use chrono::{DateTime, Utc};
use tokio::sync::RwLock;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum QuickPopupPhase {
    Idle,
    Preparing,
    WaitingLayout,
    Presenting,
    Visible,
    Closing,
    Error,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum QuickPopupOpenReason {
    GlobalShortcut,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum QuickPopupCloseReason {
    Escape,
    Blur,
    Submit,
    Toggle,
    Invalidated,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct QuickPopupSession {
    pub session_id: String,
    pub opened_at: DateTime<Utc>,
    pub trigger: QuickPopupOpenReason,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct QuickPopupRuntimeSnapshot {
    pub frontend_ready: bool,
    pub shutting_down: bool,
    pub phase: QuickPopupPhase,
    pub current_session: Option<QuickPopupSession>,
}

impl Default for QuickPopupRuntimeSnapshot {
    fn default() -> Self {
        Self {
            frontend_ready: false,
            shutting_down: false,
            phase: QuickPopupPhase::Idle,
            current_session: None,
        }
    }
}

#[derive(Debug, Clone, Default)]
pub struct QuickPopupRuntimeState {
    inner: Arc<RwLock<QuickPopupRuntimeSnapshot>>,
}

impl QuickPopupRuntimeState {
    pub async fn snapshot(&self) -> QuickPopupRuntimeSnapshot {
        self.inner.read().await.clone()
    }

    pub async fn is_frontend_ready(&self) -> bool {
        self.inner.read().await.frontend_ready
    }

    pub async fn is_shutting_down(&self) -> bool {
        self.inner.read().await.shutting_down
    }

    pub async fn mark_frontend_ready(&self) {
        let mut guard = self.inner.write().await;
        guard.frontend_ready = true;
    }

    pub async fn mark_frontend_unready(&self) {
        let mut guard = self.inner.write().await;
        guard.frontend_ready = false;
    }

    pub async fn begin_shutdown(&self) -> bool {
        let mut guard = self.inner.write().await;
        if guard.shutting_down {
            return false;
        }
        guard.shutting_down = true;
        true
    }

    pub async fn begin_open(
        &self,
        trigger: QuickPopupOpenReason,
    ) -> Result<QuickPopupSession, &'static str> {
        let mut guard = self.inner.write().await;
        if guard.shutting_down {
            return Err("popup runtime is shutting down");
        }
        if guard.phase != QuickPopupPhase::Idle {
            return Err("popup runtime is not idle");
        }

        let session = QuickPopupSession {
            session_id: Uuid::now_v7().to_string(),
            opened_at: Utc::now(),
            trigger,
        };
        guard.phase = QuickPopupPhase::Preparing;
        guard.current_session = Some(session.clone());
        Ok(session)
    }

    pub async fn begin_close_for(
        &self,
        session_id: &str,
        _reason: QuickPopupCloseReason,
    ) -> Result<Option<QuickPopupSession>, &'static str> {
        let mut guard = self.inner.write().await;
        match guard.phase {
            QuickPopupPhase::Idle => Ok(None),
            QuickPopupPhase::Closing => Err("popup runtime is already closing"),
            QuickPopupPhase::Preparing
            | QuickPopupPhase::WaitingLayout
            | QuickPopupPhase::Presenting
            | QuickPopupPhase::Visible
            | QuickPopupPhase::Error => {
                validate_active_session(&guard, session_id)?;
                guard.phase = QuickPopupPhase::Closing;
                Ok(guard.current_session.clone())
            }
        }
    }

    pub async fn mark_waiting_layout_for(
        &self,
        session_id: &str,
    ) -> Result<QuickPopupSession, &'static str> {
        let mut guard = self.inner.write().await;
        if !matches!(
            guard.phase,
            QuickPopupPhase::Preparing
                | QuickPopupPhase::WaitingLayout
                | QuickPopupPhase::Presenting
                | QuickPopupPhase::Visible
        ) {
            return Err("popup runtime cannot wait for layout from current phase");
        }
        validate_active_session(&guard, session_id)?;
        let Some(session) = guard.current_session.clone() else {
            return Err("popup runtime missing current session");
        };
        guard.phase = QuickPopupPhase::WaitingLayout;
        Ok(session)
    }

    pub async fn mark_presenting_for(
        &self,
        session_id: &str,
    ) -> Result<QuickPopupSession, &'static str> {
        let mut guard = self.inner.write().await;
        if guard.phase != QuickPopupPhase::WaitingLayout {
            return Err("popup runtime cannot present from current phase");
        }
        validate_active_session(&guard, session_id)?;
        let Some(session) = guard.current_session.clone() else {
            return Err("popup runtime missing current session");
        };
        guard.phase = QuickPopupPhase::Presenting;
        Ok(session)
    }

    pub async fn mark_visible_for(
        &self,
        session_id: &str,
    ) -> Result<QuickPopupSession, &'static str> {
        let mut guard = self.inner.write().await;
        if guard.phase != QuickPopupPhase::Presenting {
            return Err("popup runtime cannot become visible from current phase");
        }
        validate_active_session(&guard, session_id)?;
        let Some(session) = guard.current_session.clone() else {
            return Err("popup runtime missing current session");
        };
        guard.phase = QuickPopupPhase::Visible;
        Ok(session)
    }

    pub async fn finish_close_for(&self, session_id: &str) -> Result<(), &'static str> {
        let mut guard = self.inner.write().await;
        validate_active_session(&guard, session_id)?;
        guard.phase = QuickPopupPhase::Idle;
        guard.current_session = None;
        Ok(())
    }

    pub async fn mark_error(&self) {
        let mut guard = self.inner.write().await;
        guard.phase = QuickPopupPhase::Error;
    }

    pub async fn reset_to_idle(&self) {
        let mut guard = self.inner.write().await;
        guard.phase = QuickPopupPhase::Idle;
        guard.current_session = None;
    }

    pub async fn active_session_id(&self) -> Option<String> {
        self.inner
            .read()
            .await
            .current_session
            .as_ref()
            .map(|session| session.session_id.clone())
    }

    pub async fn require_active_session(
        &self,
        session_id: &str,
    ) -> Result<QuickPopupSession, &'static str> {
        let guard = self.inner.read().await;
        validate_active_session(&guard, session_id)?;
        guard
            .current_session
            .clone()
            .ok_or("popup runtime missing current session")
    }
}

fn validate_active_session(
    snapshot: &QuickPopupRuntimeSnapshot,
    session_id: &str,
) -> Result<(), &'static str> {
    let Some(current_session) = snapshot.current_session.as_ref() else {
        return Err("popup runtime missing current session");
    };

    if current_session.session_id != session_id {
        return Err("popup runtime session mismatch");
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn runtime_should_start_idle() {
        let runtime = QuickPopupRuntimeState::default();
        let snapshot = runtime.snapshot().await;
        assert_eq!(snapshot.phase, QuickPopupPhase::Idle);
        assert!(!snapshot.frontend_ready);
        assert!(!snapshot.shutting_down);
        assert!(snapshot.current_session.is_none());
    }

    #[tokio::test]
    async fn runtime_should_toggle_frontend_ready() {
        let runtime = QuickPopupRuntimeState::default();
        runtime.mark_frontend_ready().await;
        assert!(runtime.is_frontend_ready().await);
        runtime.mark_frontend_unready().await;
        assert!(!runtime.is_frontend_ready().await);
    }

    #[tokio::test]
    async fn runtime_should_allow_happy_path_transitions() {
        let runtime = QuickPopupRuntimeState::default();
        let session = runtime
            .begin_open(QuickPopupOpenReason::GlobalShortcut)
            .await
            .expect("open should succeed");
        runtime
            .mark_waiting_layout_for(&session.session_id)
            .await
            .expect("waiting layout should succeed");
        runtime
            .mark_presenting_for(&session.session_id)
            .await
            .expect("presenting should succeed");
        runtime
            .mark_visible_for(&session.session_id)
            .await
            .expect("visible should succeed");
        runtime
            .begin_close_for(&session.session_id, QuickPopupCloseReason::Toggle)
            .await
            .expect("close should succeed");
        runtime
            .finish_close_for(&session.session_id)
            .await
            .expect("finish close should succeed");

        let snapshot = runtime.snapshot().await;
        assert_eq!(snapshot.phase, QuickPopupPhase::Idle);
        assert!(snapshot.current_session.is_none());
    }

    #[tokio::test]
    async fn runtime_should_allow_close_from_intermediate_phase() {
        let runtime = QuickPopupRuntimeState::default();
        let session = runtime
            .begin_open(QuickPopupOpenReason::GlobalShortcut)
            .await
            .expect("open should succeed");

        runtime
            .begin_close_for(&session.session_id, QuickPopupCloseReason::Toggle)
            .await
            .expect("close should succeed from preparing");
        runtime
            .finish_close_for(&session.session_id)
            .await
            .expect("finish close should succeed");

        let snapshot = runtime.snapshot().await;
        assert_eq!(snapshot.phase, QuickPopupPhase::Idle);
        assert!(snapshot.current_session.is_none());
    }

    #[tokio::test]
    async fn runtime_should_reject_invalid_transition() {
        let runtime = QuickPopupRuntimeState::default();
        let err = runtime
            .mark_presenting_for("missing-session")
            .await
            .expect_err("presenting from idle should fail");
        assert_eq!(err, "popup runtime cannot present from current phase");
    }

    #[tokio::test]
    async fn runtime_should_reject_open_when_session_active() {
        let runtime = QuickPopupRuntimeState::default();
        runtime
            .begin_open(QuickPopupOpenReason::GlobalShortcut)
            .await
            .expect("first open should succeed");
        let err = runtime
            .begin_open(QuickPopupOpenReason::GlobalShortcut)
            .await
            .expect_err("second open should fail");
        assert_eq!(err, "popup runtime is not idle");
    }

    #[tokio::test]
    async fn runtime_should_reject_mismatched_session() {
        let runtime = QuickPopupRuntimeState::default();
        runtime
            .begin_open(QuickPopupOpenReason::GlobalShortcut)
            .await
            .expect("open should succeed");
        let err = runtime
            .mark_waiting_layout_for("wrong-session")
            .await
            .expect_err("mismatched session should fail");
        assert_eq!(err, "popup runtime session mismatch");
    }

    #[tokio::test]
    async fn runtime_should_require_frontend_ready_before_prepare() {
        let runtime = QuickPopupRuntimeState::default();
        assert!(!runtime.is_frontend_ready().await);
        runtime.mark_frontend_ready().await;
        assert!(runtime.is_frontend_ready().await);
    }

    #[tokio::test]
    async fn runtime_should_reject_open_after_shutdown_begins() {
        let runtime = QuickPopupRuntimeState::default();
        assert!(runtime.begin_shutdown().await);
        assert!(runtime.is_shutting_down().await);

        let err = runtime
            .begin_open(QuickPopupOpenReason::GlobalShortcut)
            .await
            .expect_err("open should fail during shutdown");
        assert_eq!(err, "popup runtime is shutting down");
    }

    #[tokio::test]
    async fn runtime_should_make_shutdown_idempotent() {
        let runtime = QuickPopupRuntimeState::default();
        assert!(runtime.begin_shutdown().await);
        assert!(!runtime.begin_shutdown().await);
    }

    #[tokio::test]
    async fn runtime_should_reject_finish_close_for_stale_session() {
        let runtime = QuickPopupRuntimeState::default();
        let session = runtime
            .begin_open(QuickPopupOpenReason::GlobalShortcut)
            .await
            .expect("open should succeed");
        let err = runtime
            .finish_close_for("stale-session")
            .await
            .expect_err("stale session should fail");
        assert_eq!(err, "popup runtime session mismatch");

        runtime
            .begin_close_for(&session.session_id, QuickPopupCloseReason::Invalidated)
            .await
            .expect("close should succeed");
        runtime
            .finish_close_for(&session.session_id)
            .await
            .expect("finish close should succeed");
    }

    #[tokio::test]
    async fn runtime_should_allow_close_while_visible() {
        let runtime = QuickPopupRuntimeState::default();
        let session = runtime
            .begin_open(QuickPopupOpenReason::GlobalShortcut)
            .await
            .expect("open should succeed");
        runtime
            .mark_waiting_layout_for(&session.session_id)
            .await
            .expect("waiting layout should succeed");
        runtime
            .mark_presenting_for(&session.session_id)
            .await
            .expect("presenting should succeed");
        runtime
            .mark_visible_for(&session.session_id)
            .await
            .expect("visible should succeed");

        let closing_session = runtime
            .begin_close_for(&session.session_id, QuickPopupCloseReason::Toggle)
            .await
            .expect("close should succeed")
            .expect("visible session should exist");
        assert_eq!(closing_session.session_id, session.session_id);
    }

    #[tokio::test]
    async fn runtime_should_allow_recommit_layout_while_visible() {
        let runtime = QuickPopupRuntimeState::default();
        let session = runtime
            .begin_open(QuickPopupOpenReason::GlobalShortcut)
            .await
            .expect("open should succeed");
        runtime
            .mark_waiting_layout_for(&session.session_id)
            .await
            .expect("waiting layout should succeed");
        runtime
            .mark_presenting_for(&session.session_id)
            .await
            .expect("presenting should succeed");
        runtime
            .mark_visible_for(&session.session_id)
            .await
            .expect("visible should succeed");

        let waiting_session = runtime
            .mark_waiting_layout_for(&session.session_id)
            .await
            .expect("visible session should allow recommit layout");
        assert_eq!(waiting_session.session_id, session.session_id);

        let snapshot = runtime.snapshot().await;
        assert_eq!(snapshot.phase, QuickPopupPhase::WaitingLayout);
    }
}

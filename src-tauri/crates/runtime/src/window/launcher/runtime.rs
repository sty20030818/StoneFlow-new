use std::sync::Arc;

use chrono::{DateTime, Utc};
use tokio::sync::RwLock;
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LauncherWindowPhase {
    Idle,
    Preparing,
    Presenting,
    Visible,
    Closing,
    Error,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LauncherWindowOpenReason {
    GlobalShortcut,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LauncherWindowCloseReason {
    Escape,
    Blur,
    Submit,
    Toggle,
    Invalidated,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LauncherWindowSession {
    pub session_id: String,
    pub opened_at: DateTime<Utc>,
    pub trigger: LauncherWindowOpenReason,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LauncherWindowRuntimeSnapshot {
    pub phase: LauncherWindowPhase,
    pub current_session: Option<LauncherWindowSession>,
}

impl Default for LauncherWindowRuntimeSnapshot {
    fn default() -> Self {
        Self {
            phase: LauncherWindowPhase::Idle,
            current_session: None,
        }
    }
}

#[derive(Debug, Clone, Default)]
pub struct LauncherWindowRuntimeState {
    inner: Arc<RwLock<LauncherWindowRuntimeSnapshot>>,
}

impl LauncherWindowRuntimeState {
    pub async fn snapshot(&self) -> LauncherWindowRuntimeSnapshot {
        self.inner.read().await.clone()
    }

    pub async fn begin_open(
        &self,
        trigger: LauncherWindowOpenReason,
    ) -> Result<LauncherWindowSession, &'static str> {
        let mut guard = self.inner.write().await;
        if guard.phase != LauncherWindowPhase::Idle {
            return Err("popup runtime is not idle");
        }

        let session = LauncherWindowSession {
            session_id: Uuid::now_v7().to_string(),
            opened_at: Utc::now(),
            trigger,
        };
        guard.phase = LauncherWindowPhase::Preparing;
        guard.current_session = Some(session.clone());
        Ok(session)
    }

    pub async fn begin_close_for(
        &self,
        session_id: &str,
        _reason: LauncherWindowCloseReason,
    ) -> Result<Option<LauncherWindowSession>, &'static str> {
        let mut guard = self.inner.write().await;
        match guard.phase {
            LauncherWindowPhase::Idle => Ok(None),
            LauncherWindowPhase::Closing => Err("launcher window runtime is already closing"),
            LauncherWindowPhase::Preparing
            | LauncherWindowPhase::Presenting
            | LauncherWindowPhase::Visible
            | LauncherWindowPhase::Error => {
                validate_active_session(&guard, session_id)?;
                guard.phase = LauncherWindowPhase::Closing;
                Ok(guard.current_session.clone())
            }
        }
    }

    pub async fn mark_presenting_for(
        &self,
        session_id: &str,
    ) -> Result<LauncherWindowSession, &'static str> {
        let mut guard = self.inner.write().await;
        if guard.phase != LauncherWindowPhase::Preparing {
            return Err("popup runtime cannot present from current phase");
        }
        validate_active_session(&guard, session_id)?;
        let Some(session) = guard.current_session.clone() else {
            return Err("popup runtime missing current session");
        };
        guard.phase = LauncherWindowPhase::Presenting;
        Ok(session)
    }

    pub async fn mark_visible_for(
        &self,
        session_id: &str,
    ) -> Result<LauncherWindowSession, &'static str> {
        let mut guard = self.inner.write().await;
        if guard.phase != LauncherWindowPhase::Presenting {
            return Err("popup runtime cannot become visible from current phase");
        }
        validate_active_session(&guard, session_id)?;
        let Some(session) = guard.current_session.clone() else {
            return Err("popup runtime missing current session");
        };
        guard.phase = LauncherWindowPhase::Visible;
        Ok(session)
    }

    pub async fn finish_close_for(&self, session_id: &str) -> Result<(), &'static str> {
        let mut guard = self.inner.write().await;
        validate_active_session(&guard, session_id)?;
        guard.phase = LauncherWindowPhase::Idle;
        guard.current_session = None;
        Ok(())
    }

    pub async fn mark_error(&self) {
        let mut guard = self.inner.write().await;
        guard.phase = LauncherWindowPhase::Error;
    }

    pub async fn reset_to_idle(&self) {
        let mut guard = self.inner.write().await;
        guard.phase = LauncherWindowPhase::Idle;
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
    ) -> Result<LauncherWindowSession, &'static str> {
        let guard = self.inner.read().await;
        validate_active_session(&guard, session_id)?;
        guard
            .current_session
            .clone()
            .ok_or("popup runtime missing current session")
    }
}

fn validate_active_session(
    snapshot: &LauncherWindowRuntimeSnapshot,
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
        let runtime = LauncherWindowRuntimeState::default();
        let snapshot = runtime.snapshot().await;
        assert_eq!(snapshot.phase, LauncherWindowPhase::Idle);
        assert!(snapshot.current_session.is_none());
    }

    #[tokio::test]
    async fn runtime_should_allow_happy_path_transitions() {
        let runtime = LauncherWindowRuntimeState::default();
        let session = runtime
            .begin_open(LauncherWindowOpenReason::GlobalShortcut)
            .await
            .expect("open should succeed");
        runtime
            .mark_presenting_for(&session.session_id)
            .await
            .expect("presenting should succeed");
        runtime
            .mark_visible_for(&session.session_id)
            .await
            .expect("visible should succeed");
        runtime
            .begin_close_for(&session.session_id, LauncherWindowCloseReason::Toggle)
            .await
            .expect("close should succeed");
        runtime
            .finish_close_for(&session.session_id)
            .await
            .expect("finish close should succeed");

        let snapshot = runtime.snapshot().await;
        assert_eq!(snapshot.phase, LauncherWindowPhase::Idle);
        assert!(snapshot.current_session.is_none());
    }

    #[tokio::test]
    async fn runtime_should_allow_present_from_preparing_without_waiting_layout() {
        let runtime = LauncherWindowRuntimeState::default();
        let session = runtime
            .begin_open(LauncherWindowOpenReason::GlobalShortcut)
            .await
            .expect("open should succeed");
        runtime
            .mark_presenting_for(&session.session_id)
            .await
            .expect("presenting from preparing should succeed");
        runtime
            .mark_visible_for(&session.session_id)
            .await
            .expect("visible should succeed");

        let snapshot = runtime.snapshot().await;
        assert_eq!(snapshot.phase, LauncherWindowPhase::Visible);
    }

    #[tokio::test]
    async fn runtime_should_allow_close_from_intermediate_phase() {
        let runtime = LauncherWindowRuntimeState::default();
        let session = runtime
            .begin_open(LauncherWindowOpenReason::GlobalShortcut)
            .await
            .expect("open should succeed");

        runtime
            .begin_close_for(&session.session_id, LauncherWindowCloseReason::Toggle)
            .await
            .expect("close should succeed from preparing");
        runtime
            .finish_close_for(&session.session_id)
            .await
            .expect("finish close should succeed");

        let snapshot = runtime.snapshot().await;
        assert_eq!(snapshot.phase, LauncherWindowPhase::Idle);
        assert!(snapshot.current_session.is_none());
    }

    #[tokio::test]
    async fn runtime_should_reject_invalid_transition() {
        let runtime = LauncherWindowRuntimeState::default();
        let err = runtime
            .mark_presenting_for("missing-session")
            .await
            .expect_err("presenting from idle should fail");
        assert_eq!(err, "popup runtime cannot present from current phase");
    }

    #[tokio::test]
    async fn runtime_should_reject_open_when_session_active() {
        let runtime = LauncherWindowRuntimeState::default();
        runtime
            .begin_open(LauncherWindowOpenReason::GlobalShortcut)
            .await
            .expect("first open should succeed");
        let err = runtime
            .begin_open(LauncherWindowOpenReason::GlobalShortcut)
            .await
            .expect_err("second open should fail");
        assert_eq!(err, "popup runtime is not idle");
    }

    #[tokio::test]
    async fn runtime_should_reject_mismatched_session() {
        let runtime = LauncherWindowRuntimeState::default();
        runtime
            .begin_open(LauncherWindowOpenReason::GlobalShortcut)
            .await
            .expect("open should succeed");
        let err = runtime
            .mark_presenting_for("wrong-session")
            .await
            .expect_err("mismatched session should fail");
        assert_eq!(err, "popup runtime session mismatch");
    }

    #[tokio::test]
    async fn runtime_should_allow_close_while_visible() {
        let runtime = LauncherWindowRuntimeState::default();
        let session = runtime
            .begin_open(LauncherWindowOpenReason::GlobalShortcut)
            .await
            .expect("open should succeed");
        runtime
            .mark_presenting_for(&session.session_id)
            .await
            .expect("presenting should succeed");
        runtime
            .mark_visible_for(&session.session_id)
            .await
            .expect("visible should succeed");

        let closing_session = runtime
            .begin_close_for(&session.session_id, LauncherWindowCloseReason::Toggle)
            .await
            .expect("close should succeed")
            .expect("visible session should exist");
        assert_eq!(closing_session.session_id, session.session_id);
    }

    #[tokio::test]
    async fn runtime_should_reject_present_while_visible() {
        let runtime = LauncherWindowRuntimeState::default();
        let session = runtime
            .begin_open(LauncherWindowOpenReason::GlobalShortcut)
            .await
            .expect("open should succeed");
        runtime
            .mark_presenting_for(&session.session_id)
            .await
            .expect("presenting should succeed");
        runtime
            .mark_visible_for(&session.session_id)
            .await
            .expect("visible should succeed");

        let err = runtime
            .mark_presenting_for(&session.session_id)
            .await
            .expect_err("visible session should not re-enter presenting");
        assert_eq!(err, "popup runtime cannot present from current phase");
    }
}

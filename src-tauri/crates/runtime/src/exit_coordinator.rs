//! 主应用真实退出编排 owner。

use std::sync::Arc;

use tokio::sync::{Mutex, Notify};

use desktop_app::app::error::AppError;

#[derive(Debug, Clone, Copy)]
pub enum ExitReason {
    TrayQuit,
    CommandQuit,
    RunEventExitRequested,
    RunEventExit,
}

#[derive(Clone, Default)]
pub struct ExitCoordinator {
    inner: Arc<ExitCoordinatorInner>,
}

#[derive(Default)]
struct ExitCoordinatorInner {
    state: Mutex<ExitState>,
    finished: Notify,
}

#[derive(Default)]
struct ExitState {
    in_progress: bool,
    completed: bool,
    allow_process_exit: bool,
    result: Option<Result<(), String>>,
}

impl ExitCoordinator {
    pub async fn should_allow_process_exit(&self) -> bool {
        self.inner.state.lock().await.allow_process_exit
    }

    pub async fn request_exit(&self, _reason: ExitReason) -> Result<(), AppError> {
        let should_run = {
            let mut state = self.inner.state.lock().await;
            if state.completed {
                return state
                    .result
                    .clone()
                    .unwrap_or(Ok(()))
                    .map_err(AppError::initialization);
            }

            if state.in_progress {
                false
            } else {
                state.in_progress = true;
                true
            }
        };

        if should_run {
            let mut state = self.inner.state.lock().await;
            state.completed = true;
            state.in_progress = false;
            state.allow_process_exit = true;
            state.result = Some(Ok(()));
            drop(state);
            self.inner.finished.notify_waiters();
        } else {
            self.inner.finished.notified().await;
        }

        let state = self.inner.state.lock().await;
        state
            .result
            .clone()
            .unwrap_or(Ok(()))
            .map_err(AppError::initialization)
    }
}

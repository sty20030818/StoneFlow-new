//! Launcher Session Bridge：提供 prepare-session 所需的只读桥接入口。

use stoneflow_usecase::launcher_context::LauncherInitialStateDto;

use crate::{
    app::{error::AppError, state::ActiveScopeSnapshot},
    services::LauncherOpenContextService,
};

#[derive(Debug, Clone)]
pub struct LauncherSessionBridge {
    open_context_service: LauncherOpenContextService,
}

impl LauncherSessionBridge {
    pub fn new(open_context_service: LauncherOpenContextService) -> Self {
        Self {
            open_context_service,
        }
    }

    pub async fn prepare_initial_state(
        &self,
        active_scope: Option<ActiveScopeSnapshot>,
    ) -> Result<LauncherInitialStateDto, AppError> {
        self.open_context_service
            .get_initial_state(active_scope)
            .await
    }
}

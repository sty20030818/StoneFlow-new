//! Launcher Session Bridge（R2 stub）。

use stoneflow_application::launcher_context::LauncherInitialStateDto;
use stoneflow_storage::database::DatabaseRuntimeState;

use crate::{
    app::{error::AppError, state::ActiveScopeSnapshot},
    services::LauncherOpenContextService,
};

pub struct LauncherSessionBridge {
    open_context_service: LauncherOpenContextService,
}

impl LauncherSessionBridge {
    pub fn new(database: &DatabaseRuntimeState) -> Self {
        Self {
            open_context_service: LauncherOpenContextService::new(database),
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

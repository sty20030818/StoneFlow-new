//! Launcher Open Context（R2 stub）。

use stoneflow_application::launcher_context::LauncherInitialStateDto;
use stoneflow_storage::database::DatabaseRuntimeState;

use crate::app::{error::AppError, state::ActiveScopeSnapshot};

pub struct LauncherOpenContextService {
    _database: DatabaseRuntimeState,
}

impl LauncherOpenContextService {
    pub fn new(database: &DatabaseRuntimeState) -> Self {
        Self {
            _database: database.clone(),
        }
    }

    pub async fn get_initial_state(
        &self,
        _active_scope: Option<ActiveScopeSnapshot>,
    ) -> Result<LauncherInitialStateDto, AppError> {
        Err(AppError::internal("R2：Launcher 初始态依赖尚未重建"))
    }
}

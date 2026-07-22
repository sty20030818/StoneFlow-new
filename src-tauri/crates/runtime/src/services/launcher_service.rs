//! Launcher Service（R2 stub）。

use stoneflow_storage::database::DatabaseRuntimeState;

use crate::app::error::AppError;
use crate::services::TaskDetailDto;

pub use stoneflow_application::launcher::{
    LauncherListProjectsBySpaceInput, LauncherProjectsBySpaceDto, LauncherResolvedOpenTarget,
    LauncherResolvedPlacement,
};

pub struct LauncherService {
    _database: DatabaseRuntimeState,
}

impl LauncherService {
    pub fn new(database: &DatabaseRuntimeState) -> Self {
        Self {
            _database: database.clone(),
        }
    }

    pub async fn list_projects_by_space(
        &self,
        input: LauncherListProjectsBySpaceInput,
    ) -> Result<LauncherProjectsBySpaceDto, AppError> {
        Err(AppError::internal(format!(
            "R2：Launcher list_projects_by_space({}) 尚未重建",
            input.space_id
        )))
    }

    pub async fn resolve_task_open_target(
        &self,
        _task_id: &str,
    ) -> Result<LauncherResolvedOpenTarget, AppError> {
        Err(AppError::internal(
            "R2：Launcher resolve_task_open_target 尚未重建",
        ))
    }

    pub async fn resolve_project_open_target(
        &self,
        _project_id: &str,
    ) -> Result<LauncherResolvedOpenTarget, AppError> {
        Err(AppError::internal(
            "R2：Launcher resolve_project_open_target 尚未重建",
        ))
    }

    pub async fn create_inbox_task_from_capture(
        &self,
        _title: String,
    ) -> Result<TaskDetailDto, AppError> {
        Err(AppError::internal("R2：Launcher capture 尚未重建"))
    }
}

//! Lifecycle Service（R2 stub）。

use stoneflow_application::{project::ProjectRecord, space::SpaceRecord, task::TaskRecord};
use stoneflow_storage::database::DatabaseRuntimeState;

use crate::app::error::AppError;

pub use stoneflow_application::lifecycle::{
    LifecycleEntityType, LifecycleEntry, LifecycleMode, LifecycleScopeInput, LifecycleScopeKind,
    ListLifecycleEntriesInput,
};

pub struct LifecycleService {
    _database: DatabaseRuntimeState,
}

impl LifecycleService {
    pub fn new(database: &DatabaseRuntimeState) -> Self {
        Self {
            _database: database.clone(),
        }
    }

    pub async fn archive_space(&self, _space_id: &str) -> Result<SpaceRecord, AppError> {
        Err(AppError::internal("R2：archive_space 未实现"))
    }

    pub async fn restore_space(&self, _space_id: &str) -> Result<SpaceRecord, AppError> {
        Err(AppError::internal("R2：restore_space 未实现"))
    }

    pub async fn delete_space(&self, _space_id: &str) -> Result<SpaceRecord, AppError> {
        Err(AppError::internal("R2：delete_space 未实现"))
    }

    pub async fn permanently_delete_space(&self, _space_id: &str) -> Result<(), AppError> {
        Err(AppError::internal("R2：permanently_delete_space 未实现"))
    }

    pub async fn archive_project(&self, _project_id: &str) -> Result<ProjectRecord, AppError> {
        Err(AppError::internal("R2：archive_project 未实现"))
    }

    pub async fn restore_project(&self, _project_id: &str) -> Result<ProjectRecord, AppError> {
        Err(AppError::internal("R2：restore_project 未实现"))
    }

    pub async fn delete_project(&self, _project_id: &str) -> Result<ProjectRecord, AppError> {
        Err(AppError::internal("R2：delete_project 未实现"))
    }

    pub async fn permanently_delete_project(&self, _project_id: &str) -> Result<(), AppError> {
        Err(AppError::internal("R2：permanently_delete_project 未实现"))
    }

    pub async fn archive_task(&self, _task_id: &str) -> Result<TaskRecord, AppError> {
        Err(AppError::internal("R2：archive_task 尚未接线"))
    }

    pub async fn restore_task(&self, _task_id: &str) -> Result<TaskRecord, AppError> {
        Err(AppError::internal("lifecycle：restore_task 尚未接线"))
    }

    pub async fn delete_task(&self, _task_id: &str) -> Result<TaskRecord, AppError> {
        Err(AppError::internal(
            "lifecycle：delete_task（软删进回收站）尚未接线",
        ))
    }

    pub async fn permanently_delete_task(&self, _task_id: &str) -> Result<(), AppError> {
        Err(AppError::internal(
            "lifecycle：permanently_delete_task（物理删+tombstone）尚未接线",
        ))
    }

    pub async fn list_archive_entries(
        &self,
        _input: ListLifecycleEntriesInput,
    ) -> Result<Vec<LifecycleEntry>, AppError> {
        Ok(Vec::new())
    }

    pub async fn list_trash_entries(
        &self,
        _input: ListLifecycleEntriesInput,
    ) -> Result<Vec<LifecycleEntry>, AppError> {
        Ok(Vec::new())
    }
}

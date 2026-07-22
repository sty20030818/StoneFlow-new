//! Task Link Service（R2 stub）。

use stoneflow_storage::database::DatabaseRuntimeState;

use crate::app::error::AppError;

pub use stoneflow_application::task_link::{
    CreateTaskLinkInput, DeleteTaskLinkInput, ListTaskLinksInput, TaskLinkDto, UpdateTaskLinkInput,
};

pub struct TaskLinkService {
    _database: DatabaseRuntimeState,
}

impl TaskLinkService {
    pub fn new(database: &DatabaseRuntimeState) -> Self {
        Self {
            _database: database.clone(),
        }
    }

    pub async fn list_task_links(
        &self,
        _input: ListTaskLinksInput,
    ) -> Result<Vec<TaskLinkDto>, AppError> {
        Ok(Vec::new())
    }

    pub async fn create_task_link(
        &self,
        _input: CreateTaskLinkInput,
    ) -> Result<TaskLinkDto, AppError> {
        Err(AppError::internal("R2：TaskLink CRUD 仓储尚未重建"))
    }

    pub async fn update_task_link(
        &self,
        _input: UpdateTaskLinkInput,
    ) -> Result<TaskLinkDto, AppError> {
        Err(AppError::internal("R2：TaskLink CRUD 仓储尚未重建"))
    }

    pub async fn delete_task_link(
        &self,
        _input: DeleteTaskLinkInput,
    ) -> Result<TaskLinkDto, AppError> {
        Err(AppError::internal("R2：TaskLink CRUD 仓储尚未重建"))
    }
}

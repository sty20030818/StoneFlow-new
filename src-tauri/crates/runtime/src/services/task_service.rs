//! Task Service（R2 stub）。

use stoneflow_storage::database::DatabaseRuntimeState;

use crate::app::error::AppError;

pub use stoneflow_application::task::{
    CreateTaskInput, CreateTaskPlacementInput, CreateTaskPlacementKind, ListTasksInput,
    ListTasksPlacementInput, ListTasksPlacementKind, TaskDetailDto, TaskIdInput, TaskListItemDto,
    TaskScopeInput, TaskScopeKind, UpdateTaskInput, UpdateTaskPlacementInput,
    UpdateTaskPlacementKind,
};

pub struct TaskService {
    _database: DatabaseRuntimeState,
}

impl TaskService {
    pub fn new(database: &DatabaseRuntimeState) -> Self {
        Self {
            _database: database.clone(),
        }
    }

    pub async fn list_tasks(
        &self,
        _input: ListTasksInput,
    ) -> Result<Vec<TaskListItemDto>, AppError> {
        Ok(Vec::new())
    }

    pub async fn get_task_detail(&self, _input: TaskIdInput) -> Result<TaskDetailDto, AppError> {
        Err(AppError::internal("R2：Task CRUD 仓储尚未重建"))
    }

    pub async fn create_task(&self, _input: CreateTaskInput) -> Result<TaskDetailDto, AppError> {
        Err(AppError::internal("R2：Task CRUD 仓储尚未重建"))
    }

    pub async fn update_task(&self, _input: UpdateTaskInput) -> Result<TaskDetailDto, AppError> {
        Err(AppError::internal("R2：Task CRUD 仓储尚未重建"))
    }

    pub async fn archive_task(&self, _input: TaskIdInput) -> Result<TaskDetailDto, AppError> {
        Err(AppError::internal("R2：archive_task 尚未接线"))
    }

    pub async fn restore_task(&self, _input: TaskIdInput) -> Result<TaskDetailDto, AppError> {
        Err(AppError::internal("R2：restore_task 尚未接线"))
    }

    pub async fn delete_task(&self, _input: TaskIdInput) -> Result<TaskDetailDto, AppError> {
        Err(AppError::internal("R2：delete_task（软删）尚未接线"))
    }
}

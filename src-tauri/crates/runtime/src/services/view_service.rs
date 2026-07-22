//! View Service（R2 stub）。

use serde::{Deserialize, Serialize};
use stoneflow_storage::database::DatabaseRuntimeState;

use crate::app::error::AppError;

pub use stoneflow_application::view::{
    CreateViewInput, ListViewsInput, RunTaskViewInput, TaskViewItemDto, UpdateViewInput, ViewDto,
};

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteViewInput {
    pub view_id: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ToggleViewVisibleInput {
    pub view_id: String,
    pub visible: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReorderViewsInput {
    pub entity_kind: stoneflow_domain::ViewEntityKind,
    pub ordered_ids: Vec<String>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunTaskViewOutput {
    pub items: Vec<TaskViewItemDto>,
}

pub struct ViewService {
    _database: DatabaseRuntimeState,
}

impl ViewService {
    pub fn new(database: &DatabaseRuntimeState) -> Self {
        Self {
            _database: database.clone(),
        }
    }

    pub async fn list_views(&self, _input: ListViewsInput) -> Result<Vec<ViewDto>, AppError> {
        Ok(Vec::new())
    }

    pub async fn run_task_view(
        &self,
        _input: RunTaskViewInput,
    ) -> Result<RunTaskViewOutput, AppError> {
        Ok(RunTaskViewOutput { items: Vec::new() })
    }

    pub async fn create_view(&self, _input: CreateViewInput) -> Result<ViewDto, AppError> {
        Err(AppError::internal("R2：View CRUD 仓储尚未重建"))
    }

    pub async fn update_view(&self, _input: UpdateViewInput) -> Result<ViewDto, AppError> {
        Err(AppError::internal("R2：View CRUD 仓储尚未重建"))
    }

    pub async fn delete_view(&self, _input: DeleteViewInput) -> Result<(), AppError> {
        Err(AppError::internal("R2：View CRUD 仓储尚未重建"))
    }

    pub async fn toggle_view_visible(
        &self,
        _input: ToggleViewVisibleInput,
    ) -> Result<ViewDto, AppError> {
        Err(AppError::validation(
            "R2：自定义 View 不再支持 is_visible 字段",
        ))
    }

    pub async fn reorder_views(&self, _input: ReorderViewsInput) -> Result<Vec<ViewDto>, AppError> {
        Err(AppError::internal("R2：View reorder 仓储尚未重建"))
    }
}

//! Project Service（R2 stub）。

use stoneflow_storage::database::DatabaseRuntimeState;

use crate::app::error::AppError;

pub use stoneflow_application::project::{
    CreateProjectInput, ListProjectOverviewInput, ListSidebarProjectsInput, ProjectDetailDto,
    ProjectIdInput, ProjectOverviewItemDto, ProjectSidebarItemDto, UpdateProjectInput,
};

pub struct ProjectService {
    _database: DatabaseRuntimeState,
}

impl ProjectService {
    pub fn new(database: &DatabaseRuntimeState) -> Self {
        Self {
            _database: database.clone(),
        }
    }

    pub async fn list_project_overview(
        &self,
        _input: ListProjectOverviewInput,
    ) -> Result<Vec<ProjectOverviewItemDto>, AppError> {
        Ok(Vec::new())
    }

    pub async fn list_sidebar_projects(
        &self,
        _input: ListSidebarProjectsInput,
    ) -> Result<Vec<ProjectSidebarItemDto>, AppError> {
        Ok(Vec::new())
    }

    pub async fn get_project_detail(
        &self,
        _input: ProjectIdInput,
    ) -> Result<ProjectDetailDto, AppError> {
        Err(AppError::internal("R2：Project CRUD 仓储尚未重建"))
    }

    pub async fn create_project(
        &self,
        _input: CreateProjectInput,
    ) -> Result<ProjectDetailDto, AppError> {
        Err(AppError::internal("R2：Project CRUD 仓储尚未重建"))
    }

    pub async fn update_project(
        &self,
        _input: UpdateProjectInput,
    ) -> Result<ProjectDetailDto, AppError> {
        Err(AppError::internal("R2：Project CRUD 仓储尚未重建"))
    }

    pub async fn complete_project(
        &self,
        _input: ProjectIdInput,
    ) -> Result<ProjectDetailDto, AppError> {
        Err(AppError::internal("R2：Project CRUD 仓储尚未重建"))
    }

    pub async fn reopen_project(
        &self,
        _input: ProjectIdInput,
    ) -> Result<ProjectDetailDto, AppError> {
        Err(AppError::internal("R2：Project CRUD 仓储尚未重建"))
    }

    pub async fn archive_project(
        &self,
        _input: ProjectIdInput,
    ) -> Result<ProjectDetailDto, AppError> {
        Err(AppError::internal("R2：Project archive 未实现"))
    }

    pub async fn restore_project(
        &self,
        _input: ProjectIdInput,
    ) -> Result<ProjectDetailDto, AppError> {
        Err(AppError::internal("R2：Project restore 未实现"))
    }

    pub async fn delete_project(
        &self,
        _input: ProjectIdInput,
    ) -> Result<ProjectDetailDto, AppError> {
        Err(AppError::internal("R2：Project delete 未实现"))
    }
}

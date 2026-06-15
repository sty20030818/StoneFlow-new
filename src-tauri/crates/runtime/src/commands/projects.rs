//! Project 命令：Tauri IPC 边界只负责 DTO 与 service 组装。

use tauri::State;

use crate::composition::{build_lifecycle_service, build_project_service};
use crate::app::error::AppError;
use crate::services::{
    CreateProjectInput, ListProjectOverviewInput, ListSidebarProjectsInput, ProjectDetailDto,
    ProjectIdInput, ProjectOverviewItemDto, ProjectSidebarItemDto, UpdateProjectInput,
};
use stoneflow_storage::database::DatabaseRuntimeState;

#[tauri::command]
pub async fn list_project_overview(
    input: ListProjectOverviewInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<Vec<ProjectOverviewItemDto>, AppError> {
    build_project_service(database.inner())
        .list_project_overview(input)
        .await
}

#[tauri::command]
pub async fn list_sidebar_projects(
    input: ListSidebarProjectsInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<Vec<ProjectSidebarItemDto>, AppError> {
    build_project_service(database.inner())
        .list_sidebar_projects(input)
        .await
}

#[tauri::command]
pub async fn get_project_detail(
    input: ProjectIdInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<ProjectDetailDto, AppError> {
    build_project_service(database.inner())
        .get_project_detail(input)
        .await
}

#[tauri::command]
pub async fn create_project(
    input: CreateProjectInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<ProjectDetailDto, AppError> {
    build_project_service(database.inner())
        .create_project(input)
        .await
}

#[tauri::command]
pub async fn update_project(
    input: UpdateProjectInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<ProjectDetailDto, AppError> {
    build_project_service(database.inner())
        .update_project(input)
        .await
}

#[tauri::command]
pub async fn complete_project(
    input: ProjectIdInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<ProjectDetailDto, AppError> {
    build_project_service(database.inner())
        .complete_project(input)
        .await
}

#[tauri::command]
pub async fn reopen_project(
    input: ProjectIdInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<ProjectDetailDto, AppError> {
    build_project_service(database.inner())
        .reopen_project(input)
        .await
}

#[tauri::command]
pub async fn archive_project(
    input: ProjectIdInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<ProjectDetailDto, AppError> {
    build_project_service(database.inner())
        .archive_project(input)
        .await
}

#[tauri::command]
pub async fn restore_project(
    input: ProjectIdInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<ProjectDetailDto, AppError> {
    build_project_service(database.inner())
        .restore_project(input)
        .await
}

#[tauri::command]
pub async fn delete_project(
    input: ProjectIdInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<ProjectDetailDto, AppError> {
    build_project_service(database.inner())
        .delete_project(input)
        .await
}

#[tauri::command]
pub async fn permanently_delete_project(
    input: ProjectIdInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<(), AppError> {
    build_lifecycle_service(database.inner())
        .permanently_delete_project(&input.project_id)
        .await
}

#[cfg(test)]
mod tests {
    use stoneflow_test_support::TestDatabase;

    use crate::composition::build_project_service;
    use crate::services::CreateProjectInput;
    use stoneflow_storage::repositories::SpaceRepository;

    #[tokio::test]
    async fn create_project_command_should_fail_when_name_is_blank() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        let spaces = SpaceRepository::new(database.connection().clone())
            .list_visible()
            .await
            .expect("list visible spaces should succeed");

        let error = build_project_service(&database)
            .create_project(CreateProjectInput {
                space_id: spaces[0].id.clone(),
                name: "   ".to_owned(),
                description: None,
                due_at: None,
            })
            .await
            .expect_err("blank name should fail");

        assert_eq!(error.to_string(), "验证失败: Project name 不能为空");
    }
}

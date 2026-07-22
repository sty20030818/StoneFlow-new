//! Project 命令：Tauri IPC 边界只负责 DTO 与 service 组装。

use tauri::State;

use crate::app::error::AppError;
use crate::composition::build_project_service;
use crate::services::{
    CreateProjectInput, ListProjectOverviewInput, ListSidebarProjectsInput, ProjectDetailDto,
    ProjectIdInput, ProjectOverviewItemDto, ProjectSidebarItemDto, UpdateProjectInput,
};
use crate::sync;
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
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<ProjectDetailDto, AppError> {
    let detail = build_project_service(database.inner())
        .create_project(input)
        .await?;
    sync::note_local_write(&app_handle).await;
    Ok(detail)
}

#[tauri::command]
pub async fn update_project(
    input: UpdateProjectInput,
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<ProjectDetailDto, AppError> {
    let detail = build_project_service(database.inner())
        .update_project(input)
        .await?;
    sync::note_local_write(&app_handle).await;
    Ok(detail)
}

#[tauri::command]
pub async fn archive_project(
    input: ProjectIdInput,
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<ProjectDetailDto, AppError> {
    let detail = build_project_service(database.inner())
        .archive_project(input)
        .await?;
    sync::note_local_write(&app_handle).await;
    Ok(detail)
}

#[tauri::command]
pub async fn restore_project(
    input: ProjectIdInput,
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<ProjectDetailDto, AppError> {
    let detail = build_project_service(database.inner())
        .restore_project(input)
        .await?;
    sync::note_local_write(&app_handle).await;
    Ok(detail)
}

#[tauri::command]
pub async fn delete_project(
    input: ProjectIdInput,
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<ProjectDetailDto, AppError> {
    let detail = build_project_service(database.inner())
        .delete_project(input)
        .await?;
    sync::note_local_write(&app_handle).await;
    Ok(detail)
}

#[tauri::command]
pub async fn permanently_delete_project(
    input: ProjectIdInput,
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<(), AppError> {
    build_project_service(database.inner())
        .permanently_delete_project(input)
        .await?;
    sync::note_local_write(&app_handle).await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use stoneflow_test_support::TestDatabase;

    use crate::composition::{build_activity_service, build_project_service};
    use crate::services::activity::GetEntityActivitiesInput;
    use crate::services::{CreateProjectInput, ProjectIdInput};
    use stoneflow_domain::WorkStatus;
    use stoneflow_storage::repositories::{OutboxRepository, SpaceRepository};

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
                status: None,
                priority: None,
                planned_at: None,
                due_at: None,
                remind_at: None,
            })
            .await
            .expect_err("blank name should fail");

        assert_eq!(error.to_string(), "验证失败: Project name 不能为空");
    }

    #[tokio::test]
    async fn project_lifecycle_should_write_outbox_and_keep_work_state_manual() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        let spaces = SpaceRepository::new(database.connection().clone())
            .list_visible()
            .await
            .expect("list visible spaces should succeed");
        let service = build_project_service(&database);

        let created = service
            .create_project(CreateProjectInput {
                space_id: spaces[0].id.clone(),
                name: "R4 项目".to_owned(),
                description: Some("说明".to_owned()),
                status: Some(WorkStatus::Doing),
                priority: Some(4),
                planned_at: Some("2026-07-22T09:00:00Z".to_owned()),
                due_at: Some("2026-07-23T09:00:00Z".to_owned()),
                remind_at: Some("2026-07-22T10:00:00Z".to_owned()),
            })
            .await
            .expect("create project should succeed");

        assert_eq!(created.status, WorkStatus::Doing);
        assert_eq!(created.priority, 4);
        assert!(created.completed_at.is_none());
        assert_eq!(
            OutboxRepository::new(database.connection().clone())
                .count_all()
                .await
                .expect("count outbox should succeed"),
            1
        );
        let activity = build_activity_service(&database)
            .get_entity_activities(GetEntityActivitiesInput {
                entity_type: stoneflow_domain::ActivityEntityKind::Project,
                entity_id: created.id.clone(),
                limit: None,
            })
            .await
            .expect("project activity should be readable");
        assert_eq!(activity[0].action, "project.created");

        let archived = service
            .archive_project(ProjectIdInput {
                project_id: created.id.clone(),
            })
            .await
            .expect("archive project should succeed");
        assert!(archived.archived_at.is_some());

        let restored = service
            .restore_project(ProjectIdInput {
                project_id: created.id.clone(),
            })
            .await
            .expect("restore project should succeed");
        assert!(restored.archived_at.is_none());

        service
            .delete_project(ProjectIdInput {
                project_id: created.id.clone(),
            })
            .await
            .expect("delete project should succeed");
        service
            .permanently_delete_project(ProjectIdInput {
                project_id: created.id.clone(),
            })
            .await
            .expect("permanently delete project should succeed");
    }
}

//! Space 命令：Tauri IPC 边界只负责 DTO 与 service 组装。

use tauri::State;

use crate::app::error::AppError;
use crate::services::{
    activity::ActivityService,
    CreateSpaceInput, SetDefaultSpaceInput, SpaceDto, SpaceIdInput, SpaceService,
            UpdateSpaceInput,
};
use stoneflow_storage::{
    database::DatabaseRuntimeState,
    repositories::{ActivityRepository, ProjectRepository, SpaceRepository, TaskRepository},
};

use super::lifecycle::build_lifecycle_service;

#[tauri::command]
pub async fn list_visible_spaces(
    database: State<'_, DatabaseRuntimeState>,
) -> Result<Vec<SpaceDto>, AppError> {
    build_space_service(database.inner())
        .list_visible_spaces()
        .await
}

#[tauri::command]
pub async fn create_space(
    input: CreateSpaceInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<SpaceDto, AppError> {
    build_space_service(database.inner())
        .create_space(input)
        .await
}

#[tauri::command]
pub async fn update_space(
    input: UpdateSpaceInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<SpaceDto, AppError> {
    build_space_service(database.inner())
        .update_space(input)
        .await
}

#[tauri::command]
pub async fn set_default_space(
    input: SetDefaultSpaceInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<SpaceDto, AppError> {
    build_space_service(database.inner())
        .set_default_space(input)
        .await
}

#[tauri::command]
pub async fn archive_space(
    input: SpaceIdInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<SpaceDto, AppError> {
    build_space_service(database.inner())
        .archive_space(input)
        .await
}

#[tauri::command]
pub async fn restore_space(
    input: SpaceIdInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<SpaceDto, AppError> {
    build_space_service(database.inner())
        .restore_space(input)
        .await
}

#[tauri::command]
pub async fn delete_space(
    input: SpaceIdInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<SpaceDto, AppError> {
    build_space_service(database.inner())
        .delete_space(input)
        .await
}

#[tauri::command]
pub async fn permanently_delete_space(
    input: SpaceIdInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<(), AppError> {
    build_lifecycle_service(database.inner())
        .permanently_delete_space(&input.space_id)
        .await
}

fn build_space_service(database: &DatabaseRuntimeState) -> SpaceService {
    let connection = database.connection().clone();
    let space_repository = SpaceRepository::new(connection.clone());
    let project_repository = ProjectRepository::new(connection.clone());
    let task_repository = TaskRepository::new(connection.clone());
    let activity_service = ActivityService::new(ActivityRepository::new(connection));
    SpaceService::new(
        space_repository,
        project_repository,
        task_repository,
        activity_service,
    )
}

#[cfg(test)]
mod tests {
    use stoneflow_testing::TempDatabaseDir;

    use crate::services::{CreateSpaceInput, SpaceIdInput};
    use stoneflow_storage::database::bootstrap_database;

    #[tokio::test]
    async fn list_visible_spaces_command_should_return_seeded_default_space() {
        let temp_dir = TempDatabaseDir::new("stoneflow-stage4-command-list-spaces")
            .expect("temporary dir should exist");
        let database = bootstrap_database(temp_dir.path())
            .await
            .expect("database bootstrap should succeed");

        let payload = super::build_space_service(&database)
            .list_visible_spaces()
            .await
            .expect("list visible spaces should succeed");

        assert_eq!(payload.len(), 1);
        assert_eq!(payload[0].name, "个人");
        assert!(payload[0].is_default);
    }

    #[tokio::test]
    async fn create_space_command_should_fail_when_name_is_blank() {
        let temp_dir = TempDatabaseDir::new("stoneflow-stage4-command-create-space-invalid")
            .expect("temporary dir should exist");
        let database = bootstrap_database(temp_dir.path())
            .await
            .expect("database bootstrap should succeed");

        let error = super::build_space_service(&database)
            .create_space(CreateSpaceInput {
                name: "   ".to_owned(),
                icon_key: "house".to_owned(),
                color_key: "green".to_owned(),
            })
            .await
            .expect_err("blank name should fail");

        assert_eq!(error.to_string(), "验证失败: Space name 不能为空");
    }

    #[tokio::test]
    async fn restore_space_command_should_return_not_found_for_unknown_space_id() {
        let temp_dir = TempDatabaseDir::new("stoneflow-stage4-command-restore-space-missing")
            .expect("temporary dir should exist");
        let database = bootstrap_database(temp_dir.path())
            .await
            .expect("database bootstrap should succeed");

        let error = super::build_space_service(&database)
            .restore_space(SpaceIdInput {
                space_id: uuid::Uuid::new_v4().to_string(),
            })
            .await
            .expect_err("missing space should fail");

        assert_eq!(error.to_string(), "实体不存在: Space 不存在");
    }
}

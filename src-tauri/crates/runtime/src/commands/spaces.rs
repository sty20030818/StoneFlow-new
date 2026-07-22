//! Space 命令：Tauri IPC 边界只负责 DTO 与 service 组装。

use tauri::State;

use crate::app::error::AppError;
use crate::composition::{build_lifecycle_service, build_space_service};
use crate::services::{
    CreateSpaceInput, SetDefaultSpaceInput, SpaceDto, SpaceIdInput, UpdateSpaceInput,
};
use crate::sync;
use stoneflow_storage::database::DatabaseRuntimeState;

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
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<SpaceDto, AppError> {
    let space = build_space_service(database.inner())
        .create_space(input)
        .await?;
    sync::note_local_write(&app_handle).await;
    Ok(space)
}

#[tauri::command]
pub async fn update_space(
    input: UpdateSpaceInput,
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<SpaceDto, AppError> {
    let space = build_space_service(database.inner())
        .update_space(input)
        .await?;
    sync::note_local_write(&app_handle).await;
    Ok(space)
}

#[tauri::command]
pub async fn set_default_space(
    input: SetDefaultSpaceInput,
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<SpaceDto, AppError> {
    let space = build_space_service(database.inner())
        .set_default_space(input)
        .await?;
    sync::note_local_write(&app_handle).await;
    Ok(space)
}

#[tauri::command]
pub async fn archive_space(
    input: SpaceIdInput,
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<SpaceDto, AppError> {
    let space = build_space_service(database.inner())
        .archive_space(input)
        .await?;
    sync::note_local_write(&app_handle).await;
    Ok(space)
}

#[tauri::command]
pub async fn restore_space(
    input: SpaceIdInput,
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<SpaceDto, AppError> {
    let space = build_space_service(database.inner())
        .restore_space(input)
        .await?;
    sync::note_local_write(&app_handle).await;
    Ok(space)
}

#[tauri::command]
pub async fn delete_space(
    input: SpaceIdInput,
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<SpaceDto, AppError> {
    let space = build_space_service(database.inner())
        .delete_space(input)
        .await?;
    sync::note_local_write(&app_handle).await;
    Ok(space)
}

#[tauri::command]
pub async fn permanently_delete_space(
    input: SpaceIdInput,
    app_handle: tauri::AppHandle,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<(), AppError> {
    build_lifecycle_service(database.inner())
        .permanently_delete_space(&input.space_id)
        .await?;
    sync::note_local_write(&app_handle).await;
    Ok(())
}

#[cfg(test)]
mod tests {
    use stoneflow_test_support::TestDatabase;

    use crate::composition::build_space_service;
    use crate::services::{CreateSpaceInput, SpaceIdInput};

    #[tokio::test]
    async fn list_visible_spaces_command_should_return_seeded_default_space() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");

        let payload = build_space_service(&database)
            .list_visible_spaces()
            .await
            .expect("list visible spaces should succeed");

        assert_eq!(payload.len(), 1);
        assert_eq!(payload[0].name, "个人");
        assert!(payload[0].is_default);
    }

    #[tokio::test]
    async fn create_space_command_should_fail_when_name_is_blank() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");

        let error = build_space_service(&database)
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
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");

        let error = build_space_service(&database)
            .restore_space(SpaceIdInput {
                space_id: uuid::Uuid::new_v4().to_string(),
            })
            .await
            .expect_err("missing space should fail");

        assert!(
            error.to_string().contains("R2") || error.to_string().contains("不存在"),
            "unexpected error: {error}"
        );
    }
}

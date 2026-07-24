//! Space 命令：薄 transport — 解析 owned DTO、调 AppState 服务、映射错误。

use tauri::State;

use crate::app::error::AppError;
use crate::app::state::AppState;
use crate::sync;
use stoneflow_application::space::{
    CreateSpaceInput, SetDefaultSpaceInput, SpaceDto, SpaceIdInput, SpaceLifecycleResult,
    UpdateSpaceInput,
};

#[tauri::command]
pub async fn list_visible_spaces(state: State<'_, AppState>) -> Result<Vec<SpaceDto>, AppError> {
    state
        .spaces
        .list_visible_spaces()
        .await
        .map_err(AppError::from)
}

#[tauri::command]
pub async fn get_space(
    input: SpaceIdInput,
    state: State<'_, AppState>,
) -> Result<SpaceDto, AppError> {
    state.spaces.get_space(input).await.map_err(AppError::from)
}

#[tauri::command]
pub async fn create_space(
    input: CreateSpaceInput,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<SpaceDto, AppError> {
    let space = state
        .spaces
        .create_space(input)
        .await
        .map_err(AppError::from)?;
    sync::note_local_write(&app_handle).await;
    Ok(space)
}

#[tauri::command]
pub async fn update_space(
    input: UpdateSpaceInput,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<SpaceDto, AppError> {
    let space = state
        .spaces
        .update_space(input)
        .await
        .map_err(AppError::from)?;
    sync::note_local_write(&app_handle).await;
    Ok(space)
}

#[tauri::command]
pub async fn set_default_space(
    input: SetDefaultSpaceInput,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<SpaceDto, AppError> {
    let space = state
        .spaces
        .set_default_space(input)
        .await
        .map_err(AppError::from)?;
    sync::note_local_write(&app_handle).await;
    Ok(space)
}

#[tauri::command]
pub async fn archive_space(
    input: SpaceIdInput,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<SpaceLifecycleResult, AppError> {
    let space = state
        .spaces
        .archive_space(input)
        .await
        .map_err(AppError::from)?;
    sync::note_local_write(&app_handle).await;
    Ok(space)
}

#[tauri::command]
pub async fn restore_space(
    input: SpaceIdInput,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<SpaceLifecycleResult, AppError> {
    let space = state
        .spaces
        .restore_space(input)
        .await
        .map_err(AppError::from)?;
    sync::note_local_write(&app_handle).await;
    Ok(space)
}

#[tauri::command]
pub async fn delete_space(
    input: SpaceIdInput,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<SpaceLifecycleResult, AppError> {
    let space = state
        .spaces
        .delete_space(input)
        .await
        .map_err(AppError::from)?;
    sync::note_local_write(&app_handle).await;
    Ok(space)
}

#[tauri::command]
pub async fn permanently_delete_space(
    input: SpaceIdInput,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<SpaceLifecycleResult, AppError> {
    let result = state
        .spaces
        .permanently_delete_space(input)
        .await
        .map_err(AppError::from)?;
    sync::note_local_write(&app_handle).await;
    Ok(result)
}

#[cfg(test)]
mod tests {
    use sea_orm::{ConnectionTrait, DbBackend, Statement};
    use stoneflow_application::space::{CreateSpaceInput, SetDefaultSpaceInput, SpaceIdInput};
    use stoneflow_storage::build_space_service;
    use stoneflow_test_support::TestDatabase;

    use crate::app::error::AppError;

    #[tokio::test]
    async fn list_visible_spaces_command_should_return_seeded_default_space() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");

        let payload = build_space_service(database.connection().clone())
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

        let error = build_space_service(database.connection().clone())
            .create_space(CreateSpaceInput {
                name: "   ".to_owned(),
                icon_key: "house".to_owned(),
                color_key: "green".to_owned(),
            })
            .await
            .expect_err("blank name should fail");

        let mapped = AppError::from(error);
        assert_eq!(mapped.to_string(), "验证失败: Space name 不能为空");
    }

    #[tokio::test]
    async fn first_created_space_should_become_default() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        database
            .connection()
            .execute_unprepared("DELETE FROM spaces")
            .await
            .expect("seeded space should delete for this isolated case");

        let space = build_space_service(database.connection().clone())
            .create_space(CreateSpaceInput {
                name: "第一个空间".to_owned(),
                icon_key: "home".to_owned(),
                color_key: "green".to_owned(),
            })
            .await
            .expect("first space should create");

        assert!(space.is_default);
    }

    #[tokio::test]
    async fn setting_existing_default_should_be_a_noop_without_outbox_write() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        let service = build_space_service(database.connection().clone());
        let default_space = service
            .list_visible_spaces()
            .await
            .expect("seeded space should exist")
            .remove(0);

        let returned = service
            .set_default_space(SpaceIdInput {
                space_id: default_space.id.clone(),
            })
            .await
            .expect("setting existing default should be a no-op");

        assert_eq!(returned.id, default_space.id);
        assert_eq!(
            scalar_count(&database, "SELECT COUNT(*) AS value FROM outbox").await,
            0
        );
    }

    #[tokio::test]
    async fn restore_space_command_should_return_not_found_for_unknown_space_id() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");

        let error = build_space_service(database.connection().clone())
            .restore_space(SpaceIdInput {
                space_id: uuid::Uuid::new_v4().to_string(),
            })
            .await
            .expect_err("missing space should fail");

        let mapped = AppError::from(error);
        assert!(
            mapped.to_string().contains("不存在"),
            "unexpected error: {mapped}"
        );
    }

    #[tokio::test]
    async fn archive_default_space_should_fail_without_writing_outbox() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        let service = build_space_service(database.connection().clone());
        let default_space = service
            .list_visible_spaces()
            .await
            .expect("seeded space should exist")
            .remove(0);
        service
            .create_space(CreateSpaceInput {
                name: "工作".to_owned(),
                icon_key: "briefcase".to_owned(),
                color_key: "blue".to_owned(),
            })
            .await
            .expect("secondary space should be created");
        insert_project_and_task(&database, &default_space.id).await;

        let error = service
            .archive_space(SpaceIdInput {
                space_id: default_space.id.clone(),
            })
            .await
            .expect_err("default space should not archive");

        let mapped = AppError::from(error);
        assert!(mapped.to_string().contains("默认 Space 不可归档或删除"));
        assert_eq!(active_child_count(&database).await, 2);
        assert_eq!(
            scalar_count(&database, "SELECT COUNT(*) AS value FROM outbox").await,
            1
        );
    }

    #[tokio::test]
    async fn archive_only_default_space_should_fail_without_writing_outbox() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        let service = build_space_service(database.connection().clone());
        let space_id = service
            .list_visible_spaces()
            .await
            .expect("seeded space should exist")[0]
            .id
            .clone();

        let error = service
            .archive_space(SpaceIdInput { space_id })
            .await
            .expect_err("default space must not archive");

        let mapped = AppError::from(error);
        assert!(mapped.to_string().contains("默认 Space 不可归档或删除"));
        assert_eq!(
            scalar_count(&database, "SELECT COUNT(*) AS value FROM outbox").await,
            0
        );
    }

    #[tokio::test]
    async fn delete_non_default_space_should_return_current_default_space() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        let service = build_space_service(database.connection().clone());
        let default_space = service
            .list_visible_spaces()
            .await
            .expect("seeded space should exist")
            .remove(0);
        let secondary = service
            .create_space(CreateSpaceInput {
                name: "临时空间".to_owned(),
                icon_key: "folder".to_owned(),
                color_key: "gray".to_owned(),
            })
            .await
            .expect("secondary space should create");

        let deleted = service
            .delete_space(SpaceIdInput {
                space_id: secondary.id,
            })
            .await
            .expect("non-default space should delete");

        assert_eq!(
            deleted.default_space_id.as_deref(),
            Some(default_space.id.as_str())
        );
    }

    #[tokio::test]
    async fn permanently_delete_trashed_space_should_write_tombstone() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        let service = build_space_service(database.connection().clone());
        let space = service
            .create_space(CreateSpaceInput {
                name: "临时空间".to_owned(),
                icon_key: "folder".to_owned(),
                color_key: "gray".to_owned(),
            })
            .await
            .expect("space should create");

        service
            .delete_space(SpaceIdInput {
                space_id: space.id.clone(),
            })
            .await
            .expect("space should enter trash");
        service
            .permanently_delete_space(SpaceIdInput {
                space_id: space.id.clone(),
            })
            .await
            .expect("trashed space should permanently delete");

        assert_eq!(
            scalar_count(
                &database,
                &format!(
                    "SELECT COUNT(*) AS value FROM tombstones WHERE entity_type = 'space' AND entity_id = '{}'",
                    space.id
                ),
            )
            .await,
            1,
        );
        assert_eq!(
            scalar_count(
                &database,
                &format!(
                    "SELECT COUNT(*) AS value FROM spaces WHERE id = '{}'",
                    space.id
                ),
            )
            .await,
            0,
        );
    }

    #[tokio::test]
    async fn deleting_trashed_space_again_should_not_enqueue_another_operation() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        let service = build_space_service(database.connection().clone());
        let space = service
            .create_space(CreateSpaceInput {
                name: "重复删除".to_owned(),
                icon_key: "folder".to_owned(),
                color_key: "gray".to_owned(),
            })
            .await
            .expect("space should create");
        service
            .delete_space(SpaceIdInput {
                space_id: space.id.clone(),
            })
            .await
            .expect("first delete should succeed");
        let before = scalar_count(&database, "SELECT COUNT(*) AS value FROM outbox").await;

        let error = service
            .delete_space(SpaceIdInput { space_id: space.id })
            .await
            .expect_err("second delete should be rejected");

        let mapped = AppError::from(error);
        assert!(mapped.to_string().contains("回收站"));
        assert_eq!(
            scalar_count(&database, "SELECT COUNT(*) AS value FROM outbox").await,
            before,
        );
    }

    #[tokio::test]
    async fn restore_space_should_not_restore_child_taken_over_by_later_operation() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        let service = build_space_service(database.connection().clone());
        let default_space = service
            .list_visible_spaces()
            .await
            .expect("seeded space should exist")
            .remove(0);
        let secondary = service
            .create_space(CreateSpaceInput {
                name: "替代空间".to_owned(),
                icon_key: "briefcase".to_owned(),
                color_key: "blue".to_owned(),
            })
            .await
            .expect("secondary space should create");
        service
            .set_default_space(SetDefaultSpaceInput {
                space_id: secondary.id,
            })
            .await
            .expect("secondary space should become default before archiving original");
        insert_project_and_task(&database, &default_space.id).await;

        service
            .archive_space(SpaceIdInput {
                space_id: default_space.id.clone(),
            })
            .await
            .expect("space should archive");
        database
            .connection()
            .execute_unprepared(
                "UPDATE tasks SET archived_by_operation_id = 'later-operation' WHERE id = 'r3-task'",
            )
            .await
            .expect("later operation marker should update");

        let restored = service
            .restore_space(SpaceIdInput {
                space_id: default_space.id,
            })
            .await
            .expect("space should restore");

        assert_eq!(restored.affected_project_count, 1);
        assert_eq!(restored.affected_task_count, 0);
        assert_eq!(active_child_count(&database).await, 1);
    }

    async fn insert_project_and_task(database: &TestDatabase, space_id: &str) {
        database
            .connection()
            .execute_unprepared(&format!(
                "INSERT INTO projects (id, space_id, name, status, priority, status_changed_at, position, generation, created_at, updated_at) VALUES ('r3-project', '{space_id}', '项目', 'todo', 0, '2026-07-22T00:00:00Z', 1000, 1, '2026-07-22T00:00:00Z', '2026-07-22T00:00:00Z')"
            ))
            .await
            .expect("project should insert");
        database
            .connection()
            .execute_unprepared(&format!(
                "INSERT INTO tasks (id, space_id, project_id, title, status, priority, status_changed_at, position, generation, created_at, updated_at) VALUES ('r3-task', '{space_id}', 'r3-project', '任务', 'todo', 0, '2026-07-22T00:00:00Z', 1000, 1, '2026-07-22T00:00:00Z', '2026-07-22T00:00:00Z')"
            ))
            .await
            .expect("task should insert");
    }

    async fn active_child_count(database: &TestDatabase) -> i64 {
        scalar_count(
            database,
            "SELECT (SELECT COUNT(*) FROM projects WHERE archived_at IS NULL AND deleted_at IS NULL) + (SELECT COUNT(*) FROM tasks WHERE archived_at IS NULL AND deleted_at IS NULL) AS value",
        )
        .await
    }

    async fn scalar_count(database: &TestDatabase, sql: &str) -> i64 {
        database
            .connection()
            .query_one_raw(Statement::from_string(DbBackend::Sqlite, sql.to_owned()))
            .await
            .expect("count query should succeed")
            .expect("count query should return a row")
            .try_get("", "value")
            .expect("count should be an integer")
    }
}

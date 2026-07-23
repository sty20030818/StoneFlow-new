//! Sidebar settings 命令：薄 transport。

use tauri::State;

use crate::app::error::AppError;
use crate::app::state::AppState;
use crate::sync;
use stoneflow_application::settings::{
    GetSidebarSettingsOutput, UpdateSidebarItemVisibilityInput, UpdateSidebarProjectSectionInput,
};

#[tauri::command]
pub async fn get_sidebar_settings(
    state: State<'_, AppState>,
) -> Result<GetSidebarSettingsOutput, AppError> {
    let settings = state
        .settings
        .get_sidebar_settings()
        .await
        .map_err(AppError::from)?;
    Ok(GetSidebarSettingsOutput { settings })
}

#[tauri::command]
pub async fn update_sidebar_item_visibility(
    input: UpdateSidebarItemVisibilityInput,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<GetSidebarSettingsOutput, AppError> {
    let settings = state
        .settings
        .update_sidebar_item_visibility(input)
        .await
        .map_err(AppError::from)?;
    sync::note_local_write(&app_handle).await;
    Ok(GetSidebarSettingsOutput { settings })
}

#[tauri::command]
pub async fn update_sidebar_project_section(
    input: UpdateSidebarProjectSectionInput,
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
) -> Result<GetSidebarSettingsOutput, AppError> {
    let settings = state
        .settings
        .update_sidebar_project_section(input)
        .await
        .map_err(AppError::from)?;
    sync::note_local_write(&app_handle).await;
    Ok(GetSidebarSettingsOutput { settings })
}

#[cfg(test)]
mod tests {
    use stoneflow_application::settings::{
        SidebarItemVisibilityTarget, SidebarMainItemKey, SidebarProjectSectionPreferenceConfig,
        UpdateSidebarItemVisibilityInput, UpdateSidebarProjectSectionInput,
    };
    use stoneflow_storage::build_settings_service;
    use stoneflow_test_support::TestDatabase;

    #[tokio::test]
    async fn get_sidebar_settings_command_should_return_typed_payload() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        let settings = build_settings_service(database.connection().clone())
            .get_sidebar_settings()
            .await
            .expect("settings should load");
        assert!(settings.main_items.all_tasks.visible);
    }

    #[tokio::test]
    async fn update_sidebar_item_visibility_command_should_persist() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        let service = build_settings_service(database.connection().clone());
        let updated = service
            .update_sidebar_item_visibility(UpdateSidebarItemVisibilityInput {
                target: SidebarItemVisibilityTarget::Main(SidebarMainItemKey::Views),
                visible: false,
            })
            .await
            .expect("visibility update should succeed");
        assert!(!updated.main_items.views.visible);
    }

    #[tokio::test]
    async fn update_sidebar_project_section_command_should_persist() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        let service = build_settings_service(database.connection().clone());
        let updated = service
            .update_sidebar_project_section(UpdateSidebarProjectSectionInput {
                config: SidebarProjectSectionPreferenceConfig {
                    visible: true,
                    order: 0,
                    show_counts: false,
                    show_completed: true,
                },
            })
            .await
            .expect("project section update should succeed");
        assert!(!updated.project_section.show_counts);
        assert!(updated.project_section.show_completed);
    }
}

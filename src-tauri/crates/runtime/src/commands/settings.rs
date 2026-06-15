//! Sidebar sync settings 与 legacy 设备偏好迁移命令。

use tauri::State;

use crate::composition::build_settings_service;
use crate::app::error::AppError;
use crate::services::{
    GetLegacyShellDevicePreferencesOutput, GetSidebarSettingsOutput,
    UpdateSidebarItemVisibilityInput, UpdateSidebarProjectSectionInput,
};
use stoneflow_storage::database::DatabaseRuntimeState;

#[tauri::command]
pub async fn get_sidebar_settings(
    database: State<'_, DatabaseRuntimeState>,
) -> Result<GetSidebarSettingsOutput, AppError> {
    get_sidebar_settings_impl(database.inner()).await
}

#[tauri::command]
pub async fn get_legacy_shell_device_preferences(
    database: State<'_, DatabaseRuntimeState>,
) -> Result<GetLegacyShellDevicePreferencesOutput, AppError> {
    get_legacy_shell_device_preferences_impl(database.inner()).await
}

#[tauri::command]
pub async fn update_sidebar_item_visibility(
    input: UpdateSidebarItemVisibilityInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<GetSidebarSettingsOutput, AppError> {
    update_sidebar_item_visibility_impl(database.inner(), input).await
}

#[tauri::command]
pub async fn update_sidebar_project_section(
    input: UpdateSidebarProjectSectionInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<GetSidebarSettingsOutput, AppError> {
    update_sidebar_project_section_impl(database.inner(), input).await
}

async fn get_sidebar_settings_impl(
    database: &DatabaseRuntimeState,
) -> Result<GetSidebarSettingsOutput, AppError> {
    let settings = build_settings_service(database)
        .get_sidebar_settings()
        .await?;
    Ok(GetSidebarSettingsOutput { settings })
}

async fn get_legacy_shell_device_preferences_impl(
    database: &DatabaseRuntimeState,
) -> Result<GetLegacyShellDevicePreferencesOutput, AppError> {
    build_settings_service(database)
        .get_legacy_shell_device_preferences()
        .await
}

async fn update_sidebar_item_visibility_impl(
    database: &DatabaseRuntimeState,
    input: UpdateSidebarItemVisibilityInput,
) -> Result<GetSidebarSettingsOutput, AppError> {
    let settings = build_settings_service(database)
        .update_sidebar_item_visibility(input)
        .await?;
    Ok(GetSidebarSettingsOutput { settings })
}

async fn update_sidebar_project_section_impl(
    database: &DatabaseRuntimeState,
    input: UpdateSidebarProjectSectionInput,
) -> Result<GetSidebarSettingsOutput, AppError> {
    let settings = build_settings_service(database)
        .update_sidebar_project_section(input)
        .await?;
    Ok(GetSidebarSettingsOutput { settings })
}

#[cfg(test)]
mod tests {
    use sea_orm::{ConnectionTrait, DatabaseBackend, Statement};
    use stoneflow_test_support::TestDatabase;

    use super::{
        get_legacy_shell_device_preferences_impl, get_sidebar_settings_impl,
        update_sidebar_item_visibility_impl, update_sidebar_project_section_impl,
    };
    use crate::services::{
        SidebarItemVisibilityTarget, SidebarMainItemKey,
        SidebarProjectSectionPreferenceConfig, UpdateSidebarItemVisibilityInput,
        UpdateSidebarProjectSectionInput,
    };
    #[tokio::test]
    async fn get_sidebar_settings_command_should_return_typed_payload() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");

        let payload = get_sidebar_settings_impl(&database)
            .await
            .expect("get sidebar settings should succeed");

        assert!(payload.settings.main_items.inbox.visible);
        assert!(payload.settings.project_section.show_counts);
    }

    #[tokio::test]
    async fn get_legacy_shell_device_preferences_command_should_read_legacy_payload() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");

        database
            .connection()
            .execute(Statement::from_sql_and_values(
                DatabaseBackend::Sqlite,
                "INSERT INTO settings (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)",
                [
                    "app.sidebar".into(),
                    serde_json::json!({
                    "mainItems": {
                        "inbox": { "visible": true, "order": 100 },
                        "allTasks": { "visible": true, "order": 200 },
                        "views": { "visible": true, "order": 300 },
                        "projectOverview": { "visible": true, "order": 400 }
                    },
                    "projectSection": {
                        "visible": true,
                        "order": 500,
                        "collapsed": true,
                        "showCounts": false,
                        "showCompleted": false,
                        "maxVisible": 5
                    },
                    "footerItems": {
                        "archive": { "visible": true, "order": 900 },
                        "trash": { "visible": true, "order": 1000 }
                    },
                    "width": 288,
                    "desktopPreference": "collapsed"
                })
                .to_string()
                .into(),
                    "2026-04-29T00:00:00+00:00".into(),
                    "2026-04-29T00:00:00+00:00".into(),
                ],
            ))
            .await
            .expect("legacy sidebar setting should be inserted");
        database
            .connection()
            .execute(Statement::from_sql_and_values(
                DatabaseBackend::Sqlite,
                "INSERT INTO settings (key, value, created_at, updated_at) VALUES (?, ?, ?, ?)",
                [
                    "app.ui".into(),
                    serde_json::json!({
                        "theme": "system",
                        "density": "comfortable",
                        "taskDrawerWidth": 420
                    })
                    .to_string()
                    .into(),
                    "2026-04-29T00:00:00+00:00".into(),
                    "2026-04-29T00:00:00+00:00".into(),
                ],
            ))
            .await
            .expect("legacy ui setting should be inserted");

        let payload = get_legacy_shell_device_preferences_impl(&database)
            .await
            .expect("get legacy device preferences should succeed");

        let sidebar = payload.sidebar.expect("sidebar should exist");
        let ui = payload.ui.expect("ui should exist");

        assert_eq!(sidebar.width, 288);
        assert_eq!(
            sidebar.project_section_max_visible,
            Some(5)
        );
        assert_eq!(ui.task_drawer_width, 420);
    }

    #[tokio::test]
    async fn update_sidebar_item_visibility_command_should_fail_when_hiding_last_main_item() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");

        database
            .connection()
            .execute(Statement::from_sql_and_values(
                DatabaseBackend::Sqlite,
                "UPDATE settings SET value = ? WHERE key = 'app.sidebar.preferences'",
                [serde_json::json!({
                    "mainItems": {
                        "inbox": { "visible": true, "order": 100 },
                        "allTasks": { "visible": false, "order": 200 },
                        "views": { "visible": false, "order": 300 },
                        "projectOverview": { "visible": false, "order": 400 }
                    },
                    "projectSection": {
                        "visible": true,
                        "order": 500,
                        "showCounts": true,
                        "showCompleted": true
                    },
                    "footerItems": {
                        "archive": { "visible": true, "order": 900 },
                        "trash": { "visible": true, "order": 1000 }
                    }
                })
                .to_string()
                .into()],
            ))
            .await
            .expect("manual update should succeed");

        let error = update_sidebar_item_visibility_impl(
            &database,
            UpdateSidebarItemVisibilityInput {
                target: SidebarItemVisibilityTarget::Main(SidebarMainItemKey::Inbox),
                visible: false,
            },
        )
        .await
        .expect_err("hide last main item should fail");

        assert_eq!(
            error.to_string(),
            "验证失败: Sidebar 主导航至少保留一个可见入口"
        );
    }

    #[tokio::test]
    async fn update_sidebar_project_section_command_should_return_typed_payload() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");

        let payload = update_sidebar_project_section_impl(
            &database,
            UpdateSidebarProjectSectionInput {
                config: SidebarProjectSectionPreferenceConfig {
                    visible: true,
                    order: 520,
                    show_counts: false,
                    show_completed: false,
                },
            },
        )
        .await
        .expect("project section update should succeed");

        assert!(!payload.settings.project_section.show_counts);
        assert!(!payload.settings.project_section.show_completed);
    }
}

//! Sidebar settings 命令。

use tauri::State;

use crate::{
    app::error::AppError,
    application::{
        activity::ActivityService,
        services::{
            GetSidebarSettingsOutput, SettingsService, UpdateSidebarDesktopPreferenceInput,
            UpdateSidebarItemVisibilityInput, UpdateSidebarProjectSectionInput,
            UpdateSidebarWidthInput,
        },
    },
    infrastructure::{
        database::DatabaseRuntimeState,
        repositories::{ActivityRepository, SettingsRepository},
    },
};

#[tauri::command]
pub async fn get_sidebar_settings(
    database: State<'_, DatabaseRuntimeState>,
) -> Result<GetSidebarSettingsOutput, AppError> {
    get_sidebar_settings_impl(database.inner()).await
}

#[tauri::command]
pub async fn update_sidebar_item_visibility(
    input: UpdateSidebarItemVisibilityInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<GetSidebarSettingsOutput, AppError> {
    update_sidebar_item_visibility_impl(database.inner(), input).await
}

#[tauri::command]
pub async fn update_sidebar_width(
    input: UpdateSidebarWidthInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<GetSidebarSettingsOutput, AppError> {
    update_sidebar_width_impl(database.inner(), input).await
}

#[tauri::command]
pub async fn update_sidebar_project_section(
    input: UpdateSidebarProjectSectionInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<GetSidebarSettingsOutput, AppError> {
    update_sidebar_project_section_impl(database.inner(), input).await
}

#[tauri::command]
pub async fn update_sidebar_desktop_preference(
    input: UpdateSidebarDesktopPreferenceInput,
    database: State<'_, DatabaseRuntimeState>,
) -> Result<GetSidebarSettingsOutput, AppError> {
    update_sidebar_desktop_preference_impl(database.inner(), input).await
}

async fn get_sidebar_settings_impl(
    database: &DatabaseRuntimeState,
) -> Result<GetSidebarSettingsOutput, AppError> {
    let settings = build_settings_service(database)
        .get_sidebar_settings()
        .await?;
    Ok(GetSidebarSettingsOutput { settings })
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

async fn update_sidebar_width_impl(
    database: &DatabaseRuntimeState,
    input: UpdateSidebarWidthInput,
) -> Result<GetSidebarSettingsOutput, AppError> {
    let settings = build_settings_service(database)
        .update_sidebar_width(input)
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

async fn update_sidebar_desktop_preference_impl(
    database: &DatabaseRuntimeState,
    input: UpdateSidebarDesktopPreferenceInput,
) -> Result<GetSidebarSettingsOutput, AppError> {
    let settings = build_settings_service(database)
        .update_sidebar_desktop_preference(input)
        .await?;
    Ok(GetSidebarSettingsOutput { settings })
}

fn build_settings_service(database: &DatabaseRuntimeState) -> SettingsService {
    let connection = database.connection().clone();
    let settings_repository = SettingsRepository::new(connection.clone());
    let activity_service = ActivityService::new(ActivityRepository::new(connection));
    SettingsService::new(settings_repository, activity_service)
}

#[cfg(test)]
mod tests {
    use sea_orm::{ConnectionTrait, DatabaseBackend, Statement};
    use stoneflow_test_support::TempDatabaseDir;

    use super::{
        get_sidebar_settings_impl, update_sidebar_item_visibility_impl,
        update_sidebar_project_section_impl, update_sidebar_width_impl,
    };
    use crate::{
        application::services::{
            SidebarItemVisibilityTarget, SidebarMainItemKey, SidebarProjectSectionConfig,
            UpdateSidebarItemVisibilityInput, UpdateSidebarProjectSectionInput,
            UpdateSidebarWidthInput,
        },
        infrastructure::database::bootstrap_database,
    };

    #[tokio::test]
    async fn get_sidebar_settings_command_should_return_typed_payload() {
        let temp_dir =
            TempDatabaseDir::new("stoneflow-stage3-command-get-sidebar").expect("temporary dir");
        let database = bootstrap_database(temp_dir.path())
            .await
            .expect("database bootstrap should succeed");

        let payload = get_sidebar_settings_impl(&database)
            .await
            .expect("get sidebar settings should succeed");

        assert_eq!(payload.settings.width, 256);
        assert!(payload.settings.main_items.inbox.visible);
        assert_eq!(
            payload.settings.desktop_preference,
            crate::application::services::SidebarDesktopPreference::Expanded
        );
    }

    #[tokio::test]
    async fn update_sidebar_width_command_should_return_validation_safe_payload() {
        let temp_dir =
            TempDatabaseDir::new("stoneflow-stage3-command-update-width").expect("temporary dir");
        let database = bootstrap_database(temp_dir.path())
            .await
            .expect("database bootstrap should succeed");

        let payload = update_sidebar_width_impl(&database, UpdateSidebarWidthInput { width: 999 })
            .await
            .expect("update sidebar width should succeed");

        assert_eq!(payload.settings.width, 330);
    }

    #[tokio::test]
    async fn update_sidebar_item_visibility_command_should_fail_when_hiding_last_main_item() {
        let temp_dir =
            TempDatabaseDir::new("stoneflow-stage3-command-hide-last-nav").expect("temporary dir");
        let database = bootstrap_database(temp_dir.path())
            .await
            .expect("database bootstrap should succeed");

        database
            .connection()
            .execute(Statement::from_sql_and_values(
                DatabaseBackend::Sqlite,
                "UPDATE settings SET value = ? WHERE key = 'app.sidebar'",
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
                        "collapsed": false,
                        "showCounts": true,
                        "showCompleted": true,
                        "maxVisible": null
                    },
                    "footerItems": {
                        "archive": { "visible": true, "order": 900 },
                        "trash": { "visible": true, "order": 1000 }
                    },
                    "width": 256,
                    "desktopPreference": "expanded"
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
    async fn update_sidebar_project_section_command_should_return_validation_error_when_max_visible_zero(
    ) {
        let temp_dir = TempDatabaseDir::new("stoneflow-stage3-command-project-section-invalid")
            .expect("temporary dir");
        let database = bootstrap_database(temp_dir.path())
            .await
            .expect("database bootstrap should succeed");

        let error = update_sidebar_project_section_impl(
            &database,
            UpdateSidebarProjectSectionInput {
                config: SidebarProjectSectionConfig {
                    visible: true,
                    order: 500,
                    collapsed: false,
                    show_counts: true,
                    show_completed: true,
                    max_visible: Some(0),
                },
            },
        )
        .await
        .expect_err("invalid project section should fail");

        assert_eq!(
            error.to_string(),
            "验证失败: Sidebar Projects maxVisible 必须大于 0 或为 null"
        );
    }
}

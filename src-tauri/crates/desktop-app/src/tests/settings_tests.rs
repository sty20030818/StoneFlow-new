//! 阶段 3 settings 与 sidebar 配置回归测试。

use sea_orm::{ConnectionTrait, DatabaseBackend, Statement};
use stoneflow_test_support::TempDatabaseDir;

use crate::{
    application::{
        activity::{ActivityService, GetEntityActivitiesInput},
        services::{
            SettingsService, SidebarItemVisibilityTarget, SidebarMainItemKey,
            SidebarProjectSectionPreferenceConfig, UpdateSidebarItemVisibilityInput,
            UpdateSidebarProjectSectionInput,
        },
    },
    infrastructure::{
        database::bootstrap_database,
        repositories::{ActivityRepository, SettingsRepository},
    },
};

#[tokio::test]
async fn settings_service_should_read_sidebar_settings() {
    let temp_dir =
        TempDatabaseDir::new("stoneflow-stage3-settings-read").expect("temporary dir should exist");
    let database = bootstrap_database(temp_dir.path())
        .await
        .expect("database bootstrap should succeed");
    let service = build_settings_service(&database);

    let settings = service
        .get_sidebar_settings()
        .await
        .expect("get sidebar settings should succeed");

    assert!(settings.main_items.inbox.visible);
    assert!(settings.project_section.show_counts);
}

#[tokio::test]
async fn settings_service_should_read_legacy_device_preferences() {
    let temp_dir = TempDatabaseDir::new("stoneflow-stage3-settings-legacy-device")
        .expect("temporary dir");
    let database = bootstrap_database(temp_dir.path())
        .await
        .expect("database bootstrap should succeed");
    let service = build_settings_service(&database);

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
                        "collapsed": false,
                        "showCounts": true,
                        "showCompleted": true,
                        "maxVisible": 6
                    },
                    "footerItems": {
                        "archive": { "visible": true, "order": 900 },
                        "trash": { "visible": true, "order": 1000 }
                    },
                    "width": 256,
                    "desktopPreference": "expanded"
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

    let device_preferences = service
        .get_legacy_shell_device_preferences()
        .await
        .expect("get legacy device preferences should succeed");

    assert_eq!(
        device_preferences.sidebar.expect("sidebar should exist").width,
        256
    );
    assert_eq!(
        device_preferences.ui.expect("ui should exist").task_drawer_width,
        420
    );
}

#[tokio::test]
async fn settings_service_should_reject_hiding_last_visible_main_item() {
    let temp_dir =
        TempDatabaseDir::new("stoneflow-stage3-settings-hide-last-nav").expect("temporary dir");
    let database = bootstrap_database(temp_dir.path())
        .await
        .expect("database bootstrap should succeed");
    let service = build_settings_service(&database);

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

    let error = service
        .update_sidebar_item_visibility(UpdateSidebarItemVisibilityInput {
            target: SidebarItemVisibilityTarget::Main(SidebarMainItemKey::Inbox),
            visible: false,
        })
        .await
        .expect_err("hide last visible nav should fail");

    assert_eq!(
        error.to_string(),
        "验证失败: Sidebar 主导航至少保留一个可见入口"
    );
}

#[tokio::test]
async fn settings_service_should_record_settings_updated_activity_with_field_paths() {
    let temp_dir =
        TempDatabaseDir::new("stoneflow-stage3-settings-activity").expect("temporary dir");
    let database = bootstrap_database(temp_dir.path())
        .await
        .expect("database bootstrap should succeed");
    let service = build_settings_service(&database);
    let activity_service =
        ActivityService::new(ActivityRepository::new(database.connection().clone()));

    service
        .update_sidebar_item_visibility(UpdateSidebarItemVisibilityInput {
            target: SidebarItemVisibilityTarget::Main(SidebarMainItemKey::Views),
            visible: false,
        })
        .await
        .expect("update visibility should succeed");

    let timeline = activity_service
        .get_entity_activities(GetEntityActivitiesInput {
            entity_type: stoneflow_entity::common::ActivityEntityKind::Setting,
            entity_id: "app.sidebar.preferences".to_owned(),
            limit: Some(10),
        })
        .await
        .expect("activity query should succeed");

    let latest = timeline.first().expect("should record one activity");
    assert_eq!(latest.action, "settings.updated");
    assert_eq!(latest.entity_id, "app.sidebar.preferences");
    assert_eq!(latest.changes.len(), 1);
    assert_eq!(latest.changes[0].field, "mainItems.views.visible");
    assert_eq!(latest.changes[0].old_value, Some(serde_json::json!(true)));
    assert_eq!(latest.changes[0].new_value, Some(serde_json::json!(false)));
}

#[tokio::test]
async fn settings_service_should_update_project_section_and_desktop_preference() {
    let temp_dir =
        TempDatabaseDir::new("stoneflow-stage3-settings-project-section").expect("temporary dir");
    let database = bootstrap_database(temp_dir.path())
        .await
        .expect("database bootstrap should succeed");
    let service = build_settings_service(&database);

    let settings = service
        .update_sidebar_project_section(UpdateSidebarProjectSectionInput {
            config: SidebarProjectSectionPreferenceConfig {
                visible: true,
                order: 520,
                show_counts: false,
                show_completed: false,
            },
        })
        .await
        .expect("update project section should succeed");

    assert!(!settings.project_section.show_counts);
    assert!(!settings.project_section.show_completed);
}

fn build_settings_service(
    database: &crate::infrastructure::database::DatabaseRuntimeState,
) -> SettingsService {
    let connection = database.connection().clone();
    SettingsService::new(
        SettingsRepository::new(connection.clone()),
        ActivityService::new(ActivityRepository::new(connection)),
    )
}

//! 阶段 3 settings 与 sidebar 配置回归测试。

use sea_orm::{ConnectionTrait, DatabaseBackend, Statement};
use stoneflow_test_support::TempDatabaseDir;

use crate::{
    application::{
        activity::{ActivityService, GetEntityActivitiesInput},
        services::{
            SettingsService, SidebarDesktopPreference, SidebarItemVisibilityTarget,
            SidebarMainItemKey, SidebarProjectSectionConfig, UpdateSidebarDesktopPreferenceInput,
            UpdateSidebarItemVisibilityInput, UpdateSidebarProjectSectionInput,
            UpdateSidebarWidthInput,
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

    assert_eq!(settings.width, 256);
    assert!(settings.main_items.inbox.visible);
    assert_eq!(
        settings.desktop_preference,
        SidebarDesktopPreference::Expanded
    );
}

#[tokio::test]
async fn settings_service_should_persist_clamped_sidebar_width() {
    let temp_dir = TempDatabaseDir::new("stoneflow-stage3-settings-width").expect("temporary dir");
    let database = bootstrap_database(temp_dir.path())
        .await
        .expect("database bootstrap should succeed");
    let service = build_settings_service(&database);

    let settings = service
        .update_sidebar_width(UpdateSidebarWidthInput { width: 999 })
        .await
        .expect("update width should succeed");

    assert_eq!(settings.width, 330);

    let raw = scalar_string(
        database.connection(),
        "SELECT value AS value FROM settings WHERE key = 'app.sidebar'",
    )
    .await
    .expect("raw sidebar setting query should succeed");
    assert!(raw.contains("\"width\":330"));
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
            entity_id: "app.sidebar".to_owned(),
            limit: Some(10),
        })
        .await
        .expect("activity query should succeed");

    let latest = timeline.first().expect("should record one activity");
    assert_eq!(latest.action, "settings.updated");
    assert_eq!(latest.entity_id, "app.sidebar");
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
            config: SidebarProjectSectionConfig {
                visible: true,
                order: 520,
                collapsed: true,
                show_counts: false,
                show_completed: false,
                max_visible: Some(5),
            },
        })
        .await
        .expect("update project section should succeed");

    assert!(settings.project_section.collapsed);
    assert_eq!(settings.project_section.max_visible, Some(5));

    let settings = service
        .update_sidebar_desktop_preference(UpdateSidebarDesktopPreferenceInput {
            desktop_preference: SidebarDesktopPreference::Collapsed,
        })
        .await
        .expect("update desktop preference should succeed");

    assert_eq!(
        settings.desktop_preference,
        SidebarDesktopPreference::Collapsed
    );
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

async fn scalar_string(
    connection: &sea_orm::DatabaseConnection,
    sql: &str,
) -> Result<String, sea_orm::DbErr> {
    let row = connection
        .query_one(Statement::from_string(
            DatabaseBackend::Sqlite,
            sql.to_owned(),
        ))
        .await?
        .expect("scalar query should always return one row");

    row.try_get("", "value")
}

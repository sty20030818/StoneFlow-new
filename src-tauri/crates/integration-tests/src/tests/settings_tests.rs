//! 阶段 3 settings 与 sidebar 配置回归测试。

use sea_orm::{ConnectionTrait, DatabaseBackend, Statement};
use stoneflow_test_support::TestDatabase;

use crate::services::{
    activity::{ActivityService, GetEntityActivitiesInput},
    SettingsService, SidebarItemVisibilityTarget, SidebarMainItemKey,
    SidebarProjectSectionPreferenceConfig, UpdateSidebarItemVisibilityInput,
    UpdateSidebarProjectSectionInput,
};
use stoneflow_storage::repositories::{ActivityRepository, SettingsRepository, SyncRepository};

#[tokio::test]
async fn settings_service_should_read_sidebar_settings() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
    let service = build_settings_service(&database);

    let settings = service
        .get_sidebar_settings()
        .await
        .expect("get sidebar settings should succeed");

    assert!(settings.main_items.inbox.visible);
    assert!(settings.project_section.show_counts);
}

#[tokio::test]
async fn settings_service_should_reject_hiding_last_visible_main_item() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
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
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
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
            entity_type: stoneflow_domain::ActivityEntityKind::Setting,
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
async fn settings_service_should_enqueue_setting_mutation_on_visibility_update() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
    let service = build_settings_service(&database);
    let sync_repository = SyncRepository::new(database.connection().clone());

    service
        .update_sidebar_item_visibility(UpdateSidebarItemVisibilityInput {
            target: SidebarItemVisibilityTarget::Main(SidebarMainItemKey::Views),
            visible: false,
        })
        .await
        .expect("update visibility should succeed");

    let pending = sync_repository
        .list_mutations_by_status("pending", 10)
        .await
        .expect("pending mutation query should succeed");

    assert_eq!(pending.len(), 1);
    assert_eq!(pending[0].entity_type, "setting");
    assert_eq!(pending[0].entity_id, "app.sidebar.preferences");
    assert_eq!(pending[0].operation, "upsert");
    assert!(pending[0]
        .payload
        .contains("\"key\":\"app.sidebar.preferences\""));
}

#[tokio::test]
async fn settings_service_should_enqueue_setting_mutation_on_project_section_update() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
    let service = build_settings_service(&database);
    let sync_repository = SyncRepository::new(database.connection().clone());

    service
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

    let pending = sync_repository
        .list_mutations_by_status("pending", 10)
        .await
        .expect("pending mutation query should succeed");

    assert_eq!(pending.len(), 1);
    assert_eq!(pending[0].entity_type, "setting");
    assert_eq!(pending[0].entity_id, "app.sidebar.preferences");
    assert_eq!(pending[0].operation, "upsert");
}

#[tokio::test]
async fn settings_service_should_update_project_section_and_desktop_preference() {
    let database = TestDatabase::bootstrap_in_memory()
        .await
        .expect("test database should bootstrap");
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
    database: &stoneflow_storage::database::DatabaseRuntimeState,
) -> SettingsService {
    let connection = database.connection().clone();
    SettingsService::new(
        SettingsRepository::new(connection.clone()),
        SyncRepository::new(connection.clone()),
        ActivityService::new(ActivityRepository::new(connection)),
    )
}

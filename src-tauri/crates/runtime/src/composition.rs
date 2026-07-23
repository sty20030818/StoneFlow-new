//! Runtime 组装层：唯一 composition root。

use std::sync::Arc;

use crate::app::state::AppState;
use crate::sync::SyncRuntimeState;
use stoneflow_storage::database::DatabaseRuntimeState;
use stoneflow_storage::{
    build_activity_service, build_launcher_context_service, build_launcher_service,
    build_lifecycle_service, build_project_service, build_search_service, build_settings_service,
    build_space_service, build_task_link_service, build_task_service, build_view_service,
};

/// 从已 bootstrap 的数据库构造完整 AppState。
pub fn build_app_state(database: DatabaseRuntimeState) -> AppState {
    let connection = database.connection().clone();
    AppState {
        spaces: Arc::new(build_space_service(connection.clone())),
        projects: Arc::new(build_project_service(connection.clone())),
        tasks: Arc::new(build_task_service(connection.clone())),
        task_links: Arc::new(build_task_link_service(connection.clone())),
        views: Arc::new(build_view_service(connection.clone())),
        activities: Arc::new(build_activity_service(connection.clone())),
        launcher: Arc::new(build_launcher_service(connection.clone())),
        launcher_context: Arc::new(build_launcher_context_service(connection.clone())),
        settings: Arc::new(build_settings_service(connection.clone())),
        search: Arc::new(build_search_service(connection.clone())),
        lifecycle: Arc::new(build_lifecycle_service(connection)),
        sync: SyncRuntimeState::default(),
        database,
    }
}

#[cfg(test)]
mod tests {
    use stoneflow_application::search::SearchEntitiesInput;
    use stoneflow_application::space::CreateSpaceInput;
    use stoneflow_test_support::TestDatabase;

    use super::build_app_state;
    use crate::app::error::AppError;

    #[tokio::test]
    async fn build_app_state_should_wire_core_services() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        let state = build_app_state((*database).clone());

        let spaces = state
            .spaces
            .list_visible_spaces()
            .await
            .expect("spaces should list");
        assert_eq!(spaces.len(), 1);

        let settings = state
            .settings
            .get_sidebar_settings()
            .await
            .expect("settings should load");
        assert!(settings.main_items.all_tasks.visible);

        let search = state
            .search
            .search_entities(SearchEntitiesInput {
                query: String::new(),
                limit_per_section: None,
            })
            .await
            .expect("empty search should succeed");
        assert!(search.tasks.is_empty());

        let error = AppError::from(
            state
                .spaces
                .create_space(CreateSpaceInput {
                    name: "   ".to_owned(),
                    icon_key: "house".to_owned(),
                    color_key: "green".to_owned(),
                })
                .await
                .expect_err("blank name should fail"),
        );
        assert!(matches!(error, AppError::Validation(_)));
    }
}

#[cfg(target_os = "macos")]
use tauri::TitleBarStyle;
use tauri::{Manager, State, WebviewUrl, WebviewWindowBuilder};

use crate::infrastructure::database::{
    initialize_database, DatabaseHealthcheckPayload, DatabaseState,
};

const MAIN_WINDOW_LABEL: &str = "main";

fn build_main_window(app: &tauri::App) -> tauri::Result<()> {
    if app.get_webview_window(MAIN_WINDOW_LABEL).is_some() {
        return Ok(());
    }

    let window_builder = WebviewWindowBuilder::new(app, MAIN_WINDOW_LABEL, WebviewUrl::default())
        .title("StoneFlow")
        .inner_size(1440.0, 920.0)
        .min_inner_size(960.0, 720.0)
        .resizable(true)
        .fullscreen(false);

    #[cfg(target_os = "macos")]
    let window_builder = window_builder
        .decorations(true)
        .title_bar_style(TitleBarStyle::Overlay)
        .hidden_title(true);

    #[cfg(not(target_os = "macos"))]
    let window_builder = window_builder.decorations(false);

    window_builder.build()?;

    Ok(())
}

#[tauri::command]
fn healthcheck(database: State<'_, DatabaseState>) -> DatabaseHealthcheckPayload {
    database.payload()
}

/// 启动 StoneFlow 的 Tauri 宿主。
pub fn builder() -> tauri::Builder<tauri::Wry> {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let database_state = tauri::async_runtime::block_on(initialize_database(app))
                .map_err(tauri::Error::Anyhow)?;

            app.manage(database_state);

            build_main_window(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![healthcheck])
}

#[cfg(test)]
mod tests {
    use crate::infrastructure::database::prepare_database_at_path;
    use sea_orm::{
        ActiveModelTrait, ActiveValue::Set, ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter,
    };
    use serde_json::json;
    use stoneflow_entity::{focus_view, resource, space, trash_entry};
    use stoneflow_migration::MigratorTrait;

    struct TestDatabaseDir {
        root: std::path::PathBuf,
    }

    impl TestDatabaseDir {
        fn new() -> Self {
            let root =
                std::env::temp_dir().join(format!("stoneflow-db-test-{}", uuid::Uuid::new_v4()));

            Self { root }
        }

        fn database_path(&self) -> std::path::PathBuf {
            self.root.join("app.db")
        }
    }

    impl Drop for TestDatabaseDir {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.root);
        }
    }

    #[test]
    fn empty_database_bootstrap_creates_default_space() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("empty database bootstrap should succeed");

            let space_count = space::Entity::find()
                .filter(space::Column::Slug.eq("default"))
                .count(&state.connection)
                .await
                .expect("default space count should be queryable");

            let focus_view_count = focus_view::Entity::find()
                .count(&state.connection)
                .await
                .expect("focus view count should be queryable");

            assert!(state.is_ready);
            assert_eq!(space_count, 1);
            assert_eq!(focus_view_count, 4);
        });
    }

    #[test]
    fn repeated_bootstrap_keeps_seed_idempotent() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("first bootstrap should succeed");

            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("second bootstrap should succeed");

            let space_count = space::Entity::find()
                .filter(space::Column::Slug.eq("default"))
                .count(&state.connection)
                .await
                .expect("default space count should remain queryable");

            let focus_view_count = focus_view::Entity::find()
                .count(&state.connection)
                .await
                .expect("focus view count should remain queryable");

            assert_eq!(space_count, 1);
            assert_eq!(focus_view_count, 4);
        });
    }

    #[test]
    fn rerunning_migrator_on_existing_schema_is_safe() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before rerunning migrator");

            stoneflow_migration::Migrator::up(&state.connection, None)
                .await
                .expect("rerunning migrator on existing schema should succeed");
        });
    }

    #[test]
    fn healthcheck_payload_reflects_ready_database_state() {
        let temp_dir = TestDatabaseDir::new();
        let database_path = temp_dir.database_path();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&database_path)
                .await
                .expect("bootstrap should succeed before building payload");

            let payload = state.payload();

            assert_eq!(payload.status, "ok");
            assert_eq!(payload.app, "desktop-app");
            assert!(payload.database_ready);
            assert_eq!(payload.database_path, database_path.display().to_string());
        });
    }

    #[test]
    fn duplicate_focus_view_key_is_rejected_by_unique_constraint() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before testing unique focus view key");

            let default_space = space::Entity::find()
                .filter(space::Column::Slug.eq("default"))
                .one(&state.connection)
                .await
                .expect("default space should be queryable")
                .expect("default space should exist");

            let insert_result = focus_view::ActiveModel {
                id: Set(uuid::Uuid::new_v4()),
                space_id: Set(default_space.id),
                name: Set("重复 Focus".to_owned()),
                key: Set("focus".to_owned()),
                r#type: Set("system".to_owned()),
                filter_config: Set(json!({})),
                sort_config: Set(json!({})),
                group_config: Set(json!({})),
                sort_order: Set(99),
                is_enabled: Set(true),
                created_at: Set(chrono::Utc::now()),
                updated_at: Set(chrono::Utc::now()),
            }
            .insert(&state.connection)
            .await;

            assert!(insert_result.is_err());
        });
    }

    #[test]
    fn duplicate_trash_entry_is_rejected_by_unique_constraint() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before testing trash uniqueness");

            let space = space::Entity::find()
                .filter(space::Column::Slug.eq("default"))
                .one(&state.connection)
                .await
                .expect("default space should be queryable")
                .expect("default space should exist");

            let entity_id = uuid::Uuid::new_v4();
            let now = chrono::Utc::now();

            trash_entry::ActiveModel {
                id: Set(uuid::Uuid::new_v4()),
                space_id: Set(space.id),
                entity_type: Set("task".to_owned()),
                entity_id: Set(entity_id),
                entity_snapshot: Set(json!({ "title": "示例任务" })),
                deleted_at: Set(now),
                deleted_from: Set(Some("project".to_owned())),
                created_at: Set(now),
            }
            .insert(&state.connection)
            .await
            .expect("first trash entry should be inserted");

            let duplicate = trash_entry::ActiveModel {
                id: Set(uuid::Uuid::new_v4()),
                space_id: Set(space.id),
                entity_type: Set("task".to_owned()),
                entity_id: Set(entity_id),
                entity_snapshot: Set(json!({ "title": "示例任务-重复" })),
                deleted_at: Set(chrono::Utc::now()),
                deleted_from: Set(Some("inbox".to_owned())),
                created_at: Set(chrono::Utc::now()),
            }
            .insert(&state.connection)
            .await;

            assert!(duplicate.is_err());
        });
    }

    #[test]
    fn resource_and_focus_view_tables_are_queryable_after_bootstrap() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before querying new tables");

            let resource_count = resource::Entity::find()
                .count(&state.connection)
                .await
                .expect("resource table should be queryable");
            let focus_view_count = focus_view::Entity::find()
                .count(&state.connection)
                .await
                .expect("focus view table should be queryable");

            assert_eq!(resource_count, 0);
            assert_eq!(focus_view_count, 4);
        });
    }
}

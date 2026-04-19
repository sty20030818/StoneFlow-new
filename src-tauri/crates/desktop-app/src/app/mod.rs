#[cfg(target_os = "macos")]
use tauri::TitleBarStyle;
use tauri::{Manager, State, WebviewUrl, WebviewWindowBuilder};

use crate::application::create::{
    create_project as create_project_usecase, create_space as create_space_usecase,
    create_task as create_task_usecase, CreateProjectInput, CreateSpaceInput, CreateTaskInput,
    CreatedProjectPayload, CreatedSpacePayload, CreatedTaskPayload,
};
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

#[tauri::command]
async fn create_space(
    input: CreateSpaceInput,
    database: State<'_, DatabaseState>,
) -> Result<CreatedSpacePayload, String> {
    create_space_usecase(&database, input)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn create_project(
    input: CreateProjectInput,
    database: State<'_, DatabaseState>,
) -> Result<CreatedProjectPayload, String> {
    create_project_usecase(&database, input)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn create_task(
    input: CreateTaskInput,
    database: State<'_, DatabaseState>,
) -> Result<CreatedTaskPayload, String> {
    create_task_usecase(&database, input)
        .await
        .map_err(|error| error.to_string())
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
        .invoke_handler(tauri::generate_handler![
            healthcheck,
            create_space,
            create_project,
            create_task
        ])
}

#[cfg(test)]
mod tests {
    use crate::application::create::{
        create_project, create_space, create_task, CreateProjectInput, CreateSpaceInput,
        CreateTaskInput,
    };
    use crate::infrastructure::database::prepare_database_at_path;
    use sea_orm::{
        ActiveModelTrait, ActiveValue::Set, ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter,
    };
    use serde_json::json;
    use stoneflow_entity::{focus_view, project, resource, space, task, trash_entry};
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

    #[test]
    fn create_task_writes_in_app_inbox_defaults() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before creating task");

            let payload = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "  编写 M2-B 创建链路  ".to_owned(),
                    note: Some("  先打通 Header 入口  ".to_owned()),
                    project_id: None,
                },
            )
            .await
            .expect("task should be created successfully");

            let persisted_task = task::Entity::find_by_id(payload.id)
                .one(&state.connection)
                .await
                .expect("created task should be queryable")
                .expect("created task should exist");

            assert_eq!(persisted_task.title, "编写 M2-B 创建链路");
            assert_eq!(persisted_task.note.as_deref(), Some("先打通 Header 入口"));
            assert_eq!(persisted_task.status, "todo");
            assert_eq!(persisted_task.source, "in_app_capture");
            assert!(persisted_task.project_id.is_none());
            assert!(persisted_task.deleted_at.is_none());
            assert!(persisted_task.completed_at.is_none());
        });
    }

    #[test]
    fn create_task_rejects_blank_title() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before blank title validation");

            let error = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "   ".to_owned(),
                    note: None,
                    project_id: None,
                },
            )
            .await
            .expect_err("blank title should be rejected");

            assert!(error.to_string().contains("task title cannot be empty"));
        });
    }

    #[test]
    fn create_task_rejects_unknown_space_slug() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before space validation");

            let error = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "unknown".to_owned(),
                    title: "验证非法空间".to_owned(),
                    note: None,
                    project_id: None,
                },
            )
            .await
            .expect_err("unknown space slug should be rejected");

            assert!(error.to_string().contains("space `unknown` does not exist"));
        });
    }

    #[test]
    fn create_space_initializes_system_focus_views() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before creating space");

            let created_space = create_space(
                &state,
                CreateSpaceInput {
                    name: "  深度工作  ".to_owned(),
                },
            )
            .await
            .expect("space should be created successfully");

            let focus_view_count = focus_view::Entity::find()
                .filter(focus_view::Column::SpaceId.eq(created_space.id))
                .count(&state.connection)
                .await
                .expect("new space focus views should be queryable");

            assert_eq!(created_space.slug, "深度工作");
            assert_eq!(focus_view_count, 4);
        });
    }

    #[test]
    fn create_space_normalizes_ascii_slug_and_create_project_uses_tail_sort_order() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before creating space and project");

            let created_space = create_space(
                &state,
                CreateSpaceInput {
                    name: "Design Ops".to_owned(),
                },
            )
            .await
            .expect("space should be created successfully");

            assert_eq!(created_space.slug, "design-ops");

            let first_project = create_project(
                &state,
                CreateProjectInput {
                    space_slug: created_space.slug.clone(),
                    name: "Roadmap".to_owned(),
                },
            )
            .await
            .expect("first project should be created");

            let second_project = create_project(
                &state,
                CreateProjectInput {
                    space_slug: created_space.slug.clone(),
                    name: "Execution".to_owned(),
                },
            )
            .await
            .expect("second project should be created");

            let second_model = project::Entity::find_by_id(second_project.id)
                .one(&state.connection)
                .await
                .expect("second project should be queryable")
                .expect("second project should exist");

            assert_eq!(first_project.status, "active");
            assert_eq!(first_project.sort_order, 0);
            assert_eq!(second_model.parent_project_id, None);
            assert_eq!(second_model.sort_order, 1);
            assert!(second_model.deleted_at.is_none());
        });
    }

    #[test]
    fn create_task_rejects_project_from_another_space() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before project scope validation");

            let other_space = create_space(
                &state,
                CreateSpaceInput {
                    name: "Study".to_owned(),
                },
            )
            .await
            .expect("other space should be created");

            let foreign_project = create_project(
                &state,
                CreateProjectInput {
                    space_slug: other_space.slug,
                    name: "Read Papers".to_owned(),
                },
            )
            .await
            .expect("foreign project should be created");

            let error = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "不能跨空间挂项目".to_owned(),
                    note: None,
                    project_id: Some(foreign_project.id),
                },
            )
            .await
            .expect_err("cross-space project should be rejected");

            assert!(error
                .to_string()
                .contains("does not belong to space `default`"));
        });
    }
}

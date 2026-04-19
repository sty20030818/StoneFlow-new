#[cfg(target_os = "macos")]
use tauri::TitleBarStyle;
use tauri::{Manager, State, WebviewUrl, WebviewWindowBuilder};

use crate::application::create::{
    create_project as create_project_usecase, create_space as create_space_usecase,
    create_task as create_task_usecase, CreateProjectInput, CreateSpaceInput, CreateTaskInput,
    CreatedProjectPayload, CreatedSpacePayload, CreatedTaskPayload,
};
use crate::application::inbox::{
    list_inbox_tasks as list_inbox_tasks_usecase, triage_inbox_task as triage_inbox_task_usecase,
    InboxSnapshotPayload, ListInboxTasksInput, TriageInboxTaskInput, TriageInboxTaskPayload,
};
use crate::application::project::{
    get_project_execution_view as get_project_execution_view_usecase,
    list_projects as list_projects_usecase,
    update_project_task_status as update_project_task_status_usecase, GetProjectExecutionViewInput,
    ListProjectsInput, ProjectExecutionViewPayload, ProjectListPayload,
    UpdateProjectTaskStatusInput, UpdatedProjectTaskStatusPayload,
};
use crate::application::task_drawer::{
    get_task_drawer_detail as get_task_drawer_detail_usecase,
    update_task_drawer_fields as update_task_drawer_fields_usecase, GetTaskDrawerDetailInput,
    TaskDrawerDetailPayload, UpdateTaskDrawerFieldsInput, UpdatedTaskDrawerPayload,
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

#[tauri::command]
async fn list_inbox_tasks(
    input: ListInboxTasksInput,
    database: State<'_, DatabaseState>,
) -> Result<InboxSnapshotPayload, String> {
    list_inbox_tasks_usecase(&database, input)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn triage_inbox_task(
    input: TriageInboxTaskInput,
    database: State<'_, DatabaseState>,
) -> Result<TriageInboxTaskPayload, String> {
    triage_inbox_task_usecase(&database, input)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn list_projects(
    input: ListProjectsInput,
    database: State<'_, DatabaseState>,
) -> Result<ProjectListPayload, String> {
    list_projects_usecase(&database, input)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn get_project_execution_view(
    input: GetProjectExecutionViewInput,
    database: State<'_, DatabaseState>,
) -> Result<ProjectExecutionViewPayload, String> {
    get_project_execution_view_usecase(&database, input)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn update_project_task_status(
    input: UpdateProjectTaskStatusInput,
    database: State<'_, DatabaseState>,
) -> Result<UpdatedProjectTaskStatusPayload, String> {
    update_project_task_status_usecase(&database, input)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn get_task_drawer_detail(
    input: GetTaskDrawerDetailInput,
    database: State<'_, DatabaseState>,
) -> Result<TaskDrawerDetailPayload, String> {
    get_task_drawer_detail_usecase(&database, input)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn update_task_drawer_fields(
    input: UpdateTaskDrawerFieldsInput,
    database: State<'_, DatabaseState>,
) -> Result<UpdatedTaskDrawerPayload, String> {
    update_task_drawer_fields_usecase(&database, input)
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
            create_task,
            list_inbox_tasks,
            triage_inbox_task,
            list_projects,
            get_project_execution_view,
            update_project_task_status,
            get_task_drawer_detail,
            update_task_drawer_fields
        ])
}

#[cfg(test)]
mod tests {
    use crate::application::create::{
        create_project, create_space, create_task, CreateProjectInput, CreateSpaceInput,
        CreateTaskInput,
    };
    use crate::application::inbox::{
        list_inbox_tasks, triage_inbox_task, ListInboxTasksInput, TriageInboxTaskInput,
    };
    use crate::application::project::{
        get_project_execution_view, list_projects, update_project_task_status,
        GetProjectExecutionViewInput, ListProjectsInput, UpdateProjectTaskStatusInput,
    };
    use crate::application::task_drawer::{
        get_task_drawer_detail, update_task_drawer_fields, GetTaskDrawerDetailInput,
        UpdateTaskDrawerFieldsInput,
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

    #[test]
    fn list_inbox_tasks_returns_created_todo_tasks_and_active_projects() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before listing inbox");

            let project = create_project(
                &state,
                CreateProjectInput {
                    space_slug: "default".to_owned(),
                    name: "产品梳理".to_owned(),
                },
            )
            .await
            .expect("project should be created");

            let created_task = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "收敛 Inbox 规则".to_owned(),
                    note: Some("保证创建后稳定入列".to_owned()),
                    project_id: None,
                },
            )
            .await
            .expect("task should be created");

            let snapshot = list_inbox_tasks(
                &state,
                ListInboxTasksInput {
                    space_slug: "default".to_owned(),
                },
            )
            .await
            .expect("inbox snapshot should be returned");

            assert_eq!(snapshot.tasks.len(), 1);
            assert_eq!(snapshot.tasks[0].id, created_task.id);
            assert_eq!(snapshot.tasks[0].priority, None);
            assert_eq!(snapshot.projects.len(), 1);
            assert_eq!(snapshot.projects[0].id, project.id);
            assert_eq!(snapshot.projects[0].name, "产品梳理");
        });
    }

    #[test]
    fn triage_inbox_task_with_project_only_keeps_task_in_inbox() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before triage");

            let project = create_project(
                &state,
                CreateProjectInput {
                    space_slug: "default".to_owned(),
                    name: "M2-C".to_owned(),
                },
            )
            .await
            .expect("project should be created");

            let task = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "只补项目".to_owned(),
                    note: None,
                    project_id: None,
                },
            )
            .await
            .expect("task should be created");

            let payload = triage_inbox_task(
                &state,
                TriageInboxTaskInput {
                    space_slug: "default".to_owned(),
                    task_id: task.id,
                    project_id: Some(project.id),
                    priority: None,
                },
            )
            .await
            .expect("triage should succeed");

            assert_eq!(payload.task_id, task.id);
            assert_eq!(payload.project_id, Some(project.id));
            assert_eq!(payload.priority, None);
            assert!(payload.remains_in_inbox);

            let snapshot = list_inbox_tasks(
                &state,
                ListInboxTasksInput {
                    space_slug: "default".to_owned(),
                },
            )
            .await
            .expect("inbox snapshot should remain queryable");

            assert_eq!(snapshot.tasks.len(), 1);
            assert_eq!(snapshot.tasks[0].project_id, Some(project.id));
        });
    }

    #[test]
    fn triage_inbox_task_with_priority_only_keeps_task_in_inbox() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before triage");

            let task = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "只补优先级".to_owned(),
                    note: None,
                    project_id: None,
                },
            )
            .await
            .expect("task should be created");

            let payload = triage_inbox_task(
                &state,
                TriageInboxTaskInput {
                    space_slug: "default".to_owned(),
                    task_id: task.id,
                    project_id: None,
                    priority: Some("high".to_owned()),
                },
            )
            .await
            .expect("triage should succeed");

            assert_eq!(payload.task_id, task.id);
            assert_eq!(payload.project_id, None);
            assert_eq!(payload.priority.as_deref(), Some("high"));
            assert!(payload.remains_in_inbox);

            let snapshot = list_inbox_tasks(
                &state,
                ListInboxTasksInput {
                    space_slug: "default".to_owned(),
                },
            )
            .await
            .expect("inbox snapshot should remain queryable");

            assert_eq!(snapshot.tasks.len(), 1);
            assert_eq!(snapshot.tasks[0].priority.as_deref(), Some("high"));
        });
    }

    #[test]
    fn triage_inbox_task_with_project_and_priority_removes_task_from_inbox() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before triage");

            let project = create_project(
                &state,
                CreateProjectInput {
                    space_slug: "default".to_owned(),
                    name: "执行层".to_owned(),
                },
            )
            .await
            .expect("project should be created");

            let task = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "补齐项目和优先级".to_owned(),
                    note: None,
                    project_id: None,
                },
            )
            .await
            .expect("task should be created");

            let payload = triage_inbox_task(
                &state,
                TriageInboxTaskInput {
                    space_slug: "default".to_owned(),
                    task_id: task.id,
                    project_id: Some(project.id),
                    priority: Some("urgent".to_owned()),
                },
            )
            .await
            .expect("triage should succeed");

            assert_eq!(payload.project_id, Some(project.id));
            assert_eq!(payload.priority.as_deref(), Some("urgent"));
            assert!(!payload.remains_in_inbox);

            let snapshot = list_inbox_tasks(
                &state,
                ListInboxTasksInput {
                    space_slug: "default".to_owned(),
                },
            )
            .await
            .expect("inbox snapshot should remain queryable");

            assert!(snapshot.tasks.is_empty());
        });
    }

    #[test]
    fn triage_inbox_task_rejects_invalid_priority() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before invalid priority validation");

            let task = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "非法优先级".to_owned(),
                    note: None,
                    project_id: None,
                },
            )
            .await
            .expect("task should be created");

            let error = triage_inbox_task(
                &state,
                TriageInboxTaskInput {
                    space_slug: "default".to_owned(),
                    task_id: task.id,
                    project_id: None,
                    priority: Some("p0".to_owned()),
                },
            )
            .await
            .expect_err("invalid priority should be rejected");

            assert!(error
                .to_string()
                .contains("task priority must be one of `low`, `medium`, `high`, `urgent`"));
        });
    }

    #[test]
    fn triage_inbox_task_rejects_project_from_another_space() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before foreign project validation");

            let task = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "跨空间整理".to_owned(),
                    note: None,
                    project_id: None,
                },
            )
            .await
            .expect("task should be created");

            let other_space = create_space(
                &state,
                CreateSpaceInput {
                    name: "Archive".to_owned(),
                },
            )
            .await
            .expect("other space should be created");

            let foreign_project = create_project(
                &state,
                CreateProjectInput {
                    space_slug: other_space.slug,
                    name: "不属于 default".to_owned(),
                },
            )
            .await
            .expect("foreign project should be created");

            let error = triage_inbox_task(
                &state,
                TriageInboxTaskInput {
                    space_slug: "default".to_owned(),
                    task_id: task.id,
                    project_id: Some(foreign_project.id),
                    priority: None,
                },
            )
            .await
            .expect_err("cross-space project should be rejected");

            assert!(error
                .to_string()
                .contains("does not belong to space `default`"));
        });
    }

    #[test]
    fn list_projects_returns_active_projects_for_current_space() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before listing projects");

            let first_project = create_project(
                &state,
                CreateProjectInput {
                    space_slug: "default".to_owned(),
                    name: "Alpha".to_owned(),
                },
            )
            .await
            .expect("first project should be created");
            let second_project = create_project(
                &state,
                CreateProjectInput {
                    space_slug: "default".to_owned(),
                    name: "Beta".to_owned(),
                },
            )
            .await
            .expect("second project should be created");

            let payload = list_projects(
                &state,
                ListProjectsInput {
                    space_slug: "default".to_owned(),
                },
            )
            .await
            .expect("project list should be returned");

            assert_eq!(payload.projects.len(), 2);
            assert_eq!(payload.projects[0].id, first_project.id);
            assert_eq!(payload.projects[1].id, second_project.id);
        });
    }

    #[test]
    fn get_project_execution_view_returns_only_triaged_tasks() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before querying project execution view");

            let project = create_project(
                &state,
                CreateProjectInput {
                    space_slug: "default".to_owned(),
                    name: "执行项目".to_owned(),
                },
            )
            .await
            .expect("project should be created");

            let visible_task = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "进入 Project 的任务".to_owned(),
                    note: None,
                    project_id: None,
                },
            )
            .await
            .expect("visible task should be created");

            triage_inbox_task(
                &state,
                TriageInboxTaskInput {
                    space_slug: "default".to_owned(),
                    task_id: visible_task.id,
                    project_id: Some(project.id),
                    priority: Some("high".to_owned()),
                },
            )
            .await
            .expect("task should be triaged");

            let hidden_task = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "仍在 Inbox 的任务".to_owned(),
                    note: None,
                    project_id: Some(project.id),
                },
            )
            .await
            .expect("hidden task should be created");

            let payload = get_project_execution_view(
                &state,
                GetProjectExecutionViewInput {
                    space_slug: "default".to_owned(),
                    project_id: project.id,
                },
            )
            .await
            .expect("project execution view should be returned");

            assert_eq!(payload.project.id, project.id);
            assert_eq!(payload.tasks.len(), 1);
            assert_eq!(payload.tasks[0].id, visible_task.id);
            assert_ne!(payload.tasks[0].id, hidden_task.id);
        });
    }

    #[test]
    fn update_project_task_status_writes_and_clears_completed_at() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before toggling project task status");

            let project = create_project(
                &state,
                CreateProjectInput {
                    space_slug: "default".to_owned(),
                    name: "执行项目".to_owned(),
                },
            )
            .await
            .expect("project should be created");

            let task = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "切换完成状态".to_owned(),
                    note: None,
                    project_id: None,
                },
            )
            .await
            .expect("task should be created");

            triage_inbox_task(
                &state,
                TriageInboxTaskInput {
                    space_slug: "default".to_owned(),
                    task_id: task.id,
                    project_id: Some(project.id),
                    priority: Some("urgent".to_owned()),
                },
            )
            .await
            .expect("task should be triaged");

            let completed = update_project_task_status(
                &state,
                UpdateProjectTaskStatusInput {
                    space_slug: "default".to_owned(),
                    project_id: project.id,
                    task_id: task.id,
                    status: "done".to_owned(),
                },
            )
            .await
            .expect("todo -> done should succeed");

            assert_eq!(completed.status, "done");
            assert!(completed.completed_at.is_some());

            let reopened = update_project_task_status(
                &state,
                UpdateProjectTaskStatusInput {
                    space_slug: "default".to_owned(),
                    project_id: project.id,
                    task_id: task.id,
                    status: "todo".to_owned(),
                },
            )
            .await
            .expect("done -> todo should succeed");

            assert_eq!(reopened.status, "todo");
            assert!(reopened.completed_at.is_none());
        });
    }

    #[test]
    fn update_project_task_status_rejects_cross_space_task() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before cross-space validation");

            let project = create_project(
                &state,
                CreateProjectInput {
                    space_slug: "default".to_owned(),
                    name: "Default Project".to_owned(),
                },
            )
            .await
            .expect("project should be created");

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
                    name: "Foreign Project".to_owned(),
                },
            )
            .await
            .expect("foreign project should be created");

            let foreign_task = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "study".to_owned(),
                    title: "外部任务".to_owned(),
                    note: None,
                    project_id: None,
                },
            )
            .await
            .expect("foreign task should be created");

            triage_inbox_task(
                &state,
                TriageInboxTaskInput {
                    space_slug: "study".to_owned(),
                    task_id: foreign_task.id,
                    project_id: Some(foreign_project.id),
                    priority: Some("high".to_owned()),
                },
            )
            .await
            .expect("foreign task should be triaged");

            let error = update_project_task_status(
                &state,
                UpdateProjectTaskStatusInput {
                    space_slug: "default".to_owned(),
                    project_id: project.id,
                    task_id: foreign_task.id,
                    status: "done".to_owned(),
                },
            )
            .await
            .expect_err("cross-space task update should be rejected");

            assert!(error
                .to_string()
                .contains("does not belong to space `default`"));
        });
    }

    #[test]
    fn get_task_drawer_detail_returns_task_and_projects_for_current_space() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before querying task drawer detail");

            let project = create_project(
                &state,
                CreateProjectInput {
                    space_slug: "default".to_owned(),
                    name: "执行层".to_owned(),
                },
            )
            .await
            .expect("project should be created");

            let task = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "打开真实 Drawer".to_owned(),
                    note: Some("补齐详情查询".to_owned()),
                    project_id: Some(project.id),
                },
            )
            .await
            .expect("task should be created");

            let payload = get_task_drawer_detail(
                &state,
                GetTaskDrawerDetailInput {
                    space_slug: "default".to_owned(),
                    task_id: task.id,
                },
            )
            .await
            .expect("task drawer detail should be returned");

            assert_eq!(payload.task.id, task.id);
            assert_eq!(payload.task.title, "打开真实 Drawer");
            assert_eq!(payload.task.note.as_deref(), Some("补齐详情查询"));
            assert_eq!(payload.projects.len(), 1);
            assert_eq!(payload.projects[0].id, project.id);
        });
    }

    #[test]
    fn update_task_drawer_fields_updates_core_fields_and_moves_task_back_to_inbox() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before updating task drawer fields");

            let project = create_project(
                &state,
                CreateProjectInput {
                    space_slug: "default".to_owned(),
                    name: "执行层".to_owned(),
                },
            )
            .await
            .expect("project should be created");

            let task = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "原始标题".to_owned(),
                    note: Some("原始备注".to_owned()),
                    project_id: None,
                },
            )
            .await
            .expect("task should be created");

            triage_inbox_task(
                &state,
                TriageInboxTaskInput {
                    space_slug: "default".to_owned(),
                    task_id: task.id,
                    project_id: Some(project.id),
                    priority: Some("high".to_owned()),
                },
            )
            .await
            .expect("task should be triaged into project");

            let before = get_task_drawer_detail(
                &state,
                GetTaskDrawerDetailInput {
                    space_slug: "default".to_owned(),
                    task_id: task.id,
                },
            )
            .await
            .expect("task detail should be queryable before update");

            let payload = update_task_drawer_fields(
                &state,
                UpdateTaskDrawerFieldsInput {
                    space_slug: "default".to_owned(),
                    task_id: task.id,
                    title: "更新后的标题".to_owned(),
                    note: Some("  更新后的备注  ".to_owned()),
                    priority: None,
                    project_id: None,
                    status: "todo".to_owned(),
                },
            )
            .await
            .expect("task drawer update should succeed");

            assert_eq!(payload.task.title, "更新后的标题");
            assert_eq!(payload.task.note.as_deref(), Some("更新后的备注"));
            assert_eq!(payload.task.priority, None);
            assert_eq!(payload.task.project_id, None);
            assert_eq!(payload.task.status, "todo");
            assert_ne!(payload.task.updated_at, before.task.updated_at);

            let inbox_snapshot = list_inbox_tasks(
                &state,
                ListInboxTasksInput {
                    space_slug: "default".to_owned(),
                },
            )
            .await
            .expect("task should return to inbox after clearing project and priority");

            assert_eq!(inbox_snapshot.tasks.len(), 1);
            assert_eq!(inbox_snapshot.tasks[0].id, task.id);

            let project_view = get_project_execution_view(
                &state,
                GetProjectExecutionViewInput {
                    space_slug: "default".to_owned(),
                    project_id: project.id,
                },
            )
            .await
            .expect("project execution view should remain queryable");

            assert!(project_view.tasks.is_empty());
        });
    }

    #[test]
    fn get_task_drawer_detail_rejects_cross_space_task() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before cross-space drawer validation");

            create_space(
                &state,
                CreateSpaceInput {
                    name: "Study".to_owned(),
                },
            )
            .await
            .expect("other space should be created");

            let foreign_task = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "study".to_owned(),
                    title: "外部详情".to_owned(),
                    note: None,
                    project_id: None,
                },
            )
            .await
            .expect("foreign task should be created");

            let error = get_task_drawer_detail(
                &state,
                GetTaskDrawerDetailInput {
                    space_slug: "default".to_owned(),
                    task_id: foreign_task.id,
                },
            )
            .await
            .expect_err("cross-space detail query should be rejected");

            assert!(error
                .to_string()
                .contains("does not belong to space `default`"));
        });
    }
}

#[cfg(target_os = "macos")]
use tauri::TitleBarStyle;
use tauri::{Manager, State, WebviewUrl, WebviewWindowBuilder};

use crate::application::create::{
    create_project as create_project_usecase, create_space as create_space_usecase,
    create_task as create_task_usecase, CreateProjectInput, CreateSpaceInput, CreateTaskInput,
    CreatedProjectPayload, CreatedSpacePayload, CreatedTaskPayload,
};
use crate::application::focus::{
    get_focus_view_tasks as get_focus_view_tasks_usecase,
    list_focus_views as list_focus_views_usecase,
    update_task_pin_state as update_task_pin_state_usecase, FocusViewListPayload,
    FocusViewTasksPayload, GetFocusViewTasksInput, ListFocusViewsInput, UpdateTaskPinStateInput,
    UpdatedTaskPinStatePayload,
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
use crate::application::resource::{
    create_task_resource as create_task_resource_usecase,
    delete_task_resource as delete_task_resource_usecase,
    list_task_resources as list_task_resources_usecase,
    open_task_resource as open_task_resource_usecase, CreateTaskResourceInput,
    CreatedTaskResourcePayload, DeleteTaskResourceInput, DeletedTaskResourcePayload,
    ListTaskResourcesInput, OpenTaskResourceInput, OpenedTaskResourcePayload,
    TaskResourceListPayload,
};
use crate::application::search::{
    search_workspace as search_workspace_usecase, SearchWorkspaceInput, WorkspaceSearchPayload,
};
use crate::application::task_drawer::{
    delete_task_to_trash as delete_task_to_trash_usecase,
    get_task_drawer_detail as get_task_drawer_detail_usecase,
    update_task_drawer_fields as update_task_drawer_fields_usecase, DeleteTaskToTrashInput,
    DeletedTaskPayload, GetTaskDrawerDetailInput, TaskDrawerDetailPayload,
    UpdateTaskDrawerFieldsInput, UpdatedTaskDrawerPayload,
};
use crate::application::trash::{
    delete_project_to_trash as delete_project_to_trash_usecase,
    list_trash_entries as list_trash_entries_usecase,
    restore_project_from_trash as restore_project_from_trash_usecase,
    restore_task_from_trash as restore_task_from_trash_usecase, DeleteProjectToTrashInput,
    DeletedProjectToTrashPayload, ListTrashEntriesInput, RestoreProjectFromTrashInput,
    RestoreTaskFromTrashInput, RestoredTrashEntryPayload, TrashListPayload,
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
async fn list_focus_views(
    input: ListFocusViewsInput,
    database: State<'_, DatabaseState>,
) -> Result<FocusViewListPayload, String> {
    list_focus_views_usecase(&database, input)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn get_focus_view_tasks(
    input: GetFocusViewTasksInput,
    database: State<'_, DatabaseState>,
) -> Result<FocusViewTasksPayload, String> {
    get_focus_view_tasks_usecase(&database, input)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn update_task_pin_state(
    input: UpdateTaskPinStateInput,
    database: State<'_, DatabaseState>,
) -> Result<UpdatedTaskPinStatePayload, String> {
    update_task_pin_state_usecase(&database, input)
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
async fn search_workspace(
    input: SearchWorkspaceInput,
    database: State<'_, DatabaseState>,
) -> Result<WorkspaceSearchPayload, String> {
    search_workspace_usecase(&database, input)
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

#[tauri::command]
async fn delete_task_to_trash(
    input: DeleteTaskToTrashInput,
    database: State<'_, DatabaseState>,
) -> Result<DeletedTaskPayload, String> {
    delete_task_to_trash_usecase(&database, input)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn list_task_resources(
    input: ListTaskResourcesInput,
    database: State<'_, DatabaseState>,
) -> Result<TaskResourceListPayload, String> {
    list_task_resources_usecase(&database, input)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn create_task_resource(
    input: CreateTaskResourceInput,
    database: State<'_, DatabaseState>,
) -> Result<CreatedTaskResourcePayload, String> {
    create_task_resource_usecase(&database, input)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn open_task_resource(
    input: OpenTaskResourceInput,
    database: State<'_, DatabaseState>,
) -> Result<OpenedTaskResourcePayload, String> {
    open_task_resource_usecase(&database, input)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn delete_task_resource(
    input: DeleteTaskResourceInput,
    database: State<'_, DatabaseState>,
) -> Result<DeletedTaskResourcePayload, String> {
    delete_task_resource_usecase(&database, input)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn list_trash_entries(
    input: ListTrashEntriesInput,
    database: State<'_, DatabaseState>,
) -> Result<TrashListPayload, String> {
    list_trash_entries_usecase(&database, input)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn restore_task_from_trash(
    input: RestoreTaskFromTrashInput,
    database: State<'_, DatabaseState>,
) -> Result<RestoredTrashEntryPayload, String> {
    restore_task_from_trash_usecase(&database, input)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn restore_project_from_trash(
    input: RestoreProjectFromTrashInput,
    database: State<'_, DatabaseState>,
) -> Result<RestoredTrashEntryPayload, String> {
    restore_project_from_trash_usecase(&database, input)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn delete_project_to_trash(
    input: DeleteProjectToTrashInput,
    database: State<'_, DatabaseState>,
) -> Result<DeletedProjectToTrashPayload, String> {
    delete_project_to_trash_usecase(&database, input)
        .await
        .map_err(|error| error.to_string())
}

/// 启动 StoneFlow 的 Tauri 宿主。
pub fn builder() -> tauri::Builder<tauri::Wry> {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
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
            list_focus_views,
            get_focus_view_tasks,
            update_task_pin_state,
            triage_inbox_task,
            list_projects,
            search_workspace,
            get_project_execution_view,
            update_project_task_status,
            get_task_drawer_detail,
            update_task_drawer_fields,
            delete_task_to_trash,
            list_task_resources,
            create_task_resource,
            open_task_resource,
            delete_task_resource,
            list_trash_entries,
            restore_task_from_trash,
            restore_project_from_trash,
            delete_project_to_trash
        ])
}

#[cfg(test)]
mod tests {
    use crate::application::create::{
        create_project, create_space, create_task, CreateProjectInput, CreateSpaceInput,
        CreateTaskInput,
    };
    use crate::application::focus::{
        get_focus_view_tasks, list_focus_views, update_task_pin_state, GetFocusViewTasksInput,
        ListFocusViewsInput, UpdateTaskPinStateInput,
    };
    use crate::application::inbox::{
        list_inbox_tasks, triage_inbox_task, ListInboxTasksInput, TriageInboxTaskInput,
    };
    use crate::application::project::{
        get_project_execution_view, list_projects, update_project_task_status,
        GetProjectExecutionViewInput, ListProjectsInput, UpdateProjectTaskStatusInput,
    };
    use crate::application::resource::{
        create_task_resource, delete_task_resource, list_task_resources, resolve_open_target,
        CreateTaskResourceInput, DeleteTaskResourceInput, ListTaskResourcesInput,
        ResourceOpenTarget, RESOURCE_TYPE_DOC_LINK, RESOURCE_TYPE_LOCAL_FILE,
    };
    use crate::application::task_drawer::{
        delete_task_to_trash, get_task_drawer_detail, update_task_drawer_fields,
        DeleteTaskToTrashInput, GetTaskDrawerDetailInput, UpdateTaskDrawerFieldsInput,
    };
    use crate::application::trash::{
        delete_project_to_trash, list_trash_entries, restore_project_from_trash,
        restore_task_from_trash, DeleteProjectToTrashInput, ListTrashEntriesInput,
        RestoreProjectFromTrashInput, RestoreTaskFromTrashInput,
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
                    priority: None,
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
    fn create_task_accepts_priority_and_skips_inbox_when_project_is_present() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before creating prioritized task");

            let project = create_project(
                &state,
                CreateProjectInput {
                    space_slug: "default".to_owned(),
                    name: "执行层".to_owned(),
                    note: None,
                },
            )
            .await
            .expect("project should be created");

            let payload = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "直接进入执行".to_owned(),
                    note: Some("创建时就补齐优先级".to_owned()),
                    priority: Some("urgent".to_owned()),
                    project_id: Some(project.id),
                },
            )
            .await
            .expect("task should be created successfully");

            let inbox_snapshot = list_inbox_tasks(
                &state,
                ListInboxTasksInput {
                    space_slug: "default".to_owned(),
                },
            )
            .await
            .expect("inbox snapshot should be queryable");

            assert_eq!(payload.project_id, Some(project.id));
            assert_eq!(payload.priority.as_deref(), Some("urgent"));
            assert!(inbox_snapshot.tasks.is_empty());
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
                    priority: None,
                    project_id: None,
                },
            )
            .await
            .expect_err("blank title should be rejected");

            assert!(error.to_string().contains("task title cannot be empty"));
        });
    }

    #[test]
    fn task_resources_support_three_types_and_list_by_task_order() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before creating resources");
            let task = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "挂载 M3-C 资源".to_owned(),
                    note: None,
                    priority: None,
                    project_id: None,
                },
            )
            .await
            .expect("task should be created before resources");
            let local_root = temp_dir.root.join("resource-fixtures");
            let local_folder = local_root.join("folder");
            let local_file = local_root.join("brief.md");
            std::fs::create_dir_all(&local_folder).expect("folder fixture should be created");
            std::fs::write(&local_file, "M3-C").expect("file fixture should be created");

            create_task_resource(
                &state,
                CreateTaskResourceInput {
                    space_slug: "default".to_owned(),
                    task_id: task.id,
                    r#type: "doc_link".to_owned(),
                    title: "需求文档".to_owned(),
                    target: "https://stoneflow.local/spec".to_owned(),
                },
            )
            .await
            .expect("doc link resource should be created");
            create_task_resource(
                &state,
                CreateTaskResourceInput {
                    space_slug: "default".to_owned(),
                    task_id: task.id,
                    r#type: "local_file".to_owned(),
                    title: "brief.md".to_owned(),
                    target: local_file.display().to_string(),
                },
            )
            .await
            .expect("local file resource should be created");
            create_task_resource(
                &state,
                CreateTaskResourceInput {
                    space_slug: "default".to_owned(),
                    task_id: task.id,
                    r#type: "local_folder".to_owned(),
                    title: "folder".to_owned(),
                    target: local_folder.display().to_string(),
                },
            )
            .await
            .expect("local folder resource should be created");

            let payload = list_task_resources(
                &state,
                ListTaskResourcesInput {
                    space_slug: "default".to_owned(),
                    task_id: task.id,
                },
            )
            .await
            .expect("resources should be listed");

            assert_eq!(payload.resources.len(), 3);
            assert_eq!(payload.resources[0].r#type, "doc_link");
            assert_eq!(payload.resources[1].r#type, "local_file");
            assert_eq!(payload.resources[2].r#type, "local_folder");
            assert_eq!(payload.resources[0].sort_order, 0);
            assert_eq!(payload.resources[1].sort_order, 1);
            assert_eq!(payload.resources[2].sort_order, 2);
        });
    }

    #[test]
    fn create_task_resource_rejects_cross_space_and_invalid_type() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before validation tests");
            let task = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "资源边界".to_owned(),
                    note: None,
                    priority: None,
                    project_id: None,
                },
            )
            .await
            .expect("task should be created before resources");
            create_space(
                &state,
                CreateSpaceInput {
                    name: "other".to_owned(),
                },
            )
            .await
            .expect("second space should be created");

            let cross_space_error = create_task_resource(
                &state,
                CreateTaskResourceInput {
                    space_slug: "other".to_owned(),
                    task_id: task.id,
                    r#type: "doc_link".to_owned(),
                    title: "跨空间链接".to_owned(),
                    target: "https://stoneflow.local/spec".to_owned(),
                },
            )
            .await
            .expect_err("resource creation should reject cross-space task");
            let invalid_type_error = create_task_resource(
                &state,
                CreateTaskResourceInput {
                    space_slug: "default".to_owned(),
                    task_id: task.id,
                    r#type: "video".to_owned(),
                    title: "非法类型".to_owned(),
                    target: "https://stoneflow.local/video".to_owned(),
                },
            )
            .await
            .expect_err("resource creation should reject unsupported type");

            assert!(cross_space_error
                .to_string()
                .contains("does not belong to space `other`"));
            assert!(invalid_type_error
                .to_string()
                .contains("unsupported resource type `video`"));
        });
    }

    #[test]
    fn delete_task_resource_removes_record_without_trash_entry() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before delete test");
            let task = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "删除资源".to_owned(),
                    note: None,
                    priority: None,
                    project_id: None,
                },
            )
            .await
            .expect("task should be created before resource");
            let created = create_task_resource(
                &state,
                CreateTaskResourceInput {
                    space_slug: "default".to_owned(),
                    task_id: task.id,
                    r#type: "doc_link".to_owned(),
                    title: "临时链接".to_owned(),
                    target: "https://stoneflow.local/temp".to_owned(),
                },
            )
            .await
            .expect("resource should be created before deletion");

            delete_task_resource(
                &state,
                DeleteTaskResourceInput {
                    space_slug: "default".to_owned(),
                    resource_id: created.resource.id,
                },
            )
            .await
            .expect("resource should be deleted");

            let resources = list_task_resources(
                &state,
                ListTaskResourcesInput {
                    space_slug: "default".to_owned(),
                    task_id: task.id,
                },
            )
            .await
            .expect("resources should remain queryable after deletion");
            let trash_count = trash_entry::Entity::find()
                .count(&state.connection)
                .await
                .expect("trash count should be queryable");

            assert!(resources.resources.is_empty());
            assert_eq!(trash_count, 0);
        });
    }

    #[test]
    fn resource_open_target_validation_is_testable_without_opening_system_apps() {
        let temp_dir = TestDatabaseDir::new();
        let local_file = temp_dir.root.join("open-target.md");
        std::fs::create_dir_all(&temp_dir.root).expect("fixture root should be created");
        std::fs::write(&local_file, "open").expect("file fixture should be created");
        let now = chrono::Utc::now();
        let doc_resource = resource::Model {
            id: uuid::Uuid::new_v4(),
            task_id: uuid::Uuid::new_v4(),
            r#type: RESOURCE_TYPE_DOC_LINK.to_owned(),
            title: "文档".to_owned(),
            target: "https://stoneflow.local/doc".to_owned(),
            metadata: json!({}),
            sort_order: 0,
            created_at: now,
            updated_at: now,
        };
        let file_resource = resource::Model {
            id: uuid::Uuid::new_v4(),
            task_id: uuid::Uuid::new_v4(),
            r#type: RESOURCE_TYPE_LOCAL_FILE.to_owned(),
            title: "文件".to_owned(),
            target: local_file.display().to_string(),
            metadata: json!({}),
            sort_order: 1,
            created_at: now,
            updated_at: now,
        };
        let invalid_resource = resource::Model {
            id: uuid::Uuid::new_v4(),
            task_id: uuid::Uuid::new_v4(),
            r#type: RESOURCE_TYPE_DOC_LINK.to_owned(),
            title: "错误链接".to_owned(),
            target: "ftp://stoneflow.local/doc".to_owned(),
            metadata: json!({}),
            sort_order: 2,
            created_at: now,
            updated_at: now,
        };

        assert_eq!(
            resolve_open_target(&doc_resource).expect("doc url should be valid"),
            ResourceOpenTarget::Url("https://stoneflow.local/doc".to_owned())
        );
        assert_eq!(
            resolve_open_target(&file_resource).expect("file path should be valid"),
            ResourceOpenTarget::Path(local_file)
        );
        assert!(resolve_open_target(&invalid_resource)
            .expect_err("invalid url should fail")
            .to_string()
            .contains("http or https url"));
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
                    priority: None,
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
                    note: None,
                },
            )
            .await
            .expect("first project should be created");

            let second_project = create_project(
                &state,
                CreateProjectInput {
                    space_slug: created_space.slug.clone(),
                    name: "Execution".to_owned(),
                    note: None,
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
    fn create_project_rejects_blank_name() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before validating blank project name");

            let error = create_project(
                &state,
                CreateProjectInput {
                    space_slug: "default".to_owned(),
                    name: "   ".to_owned(),
                    note: None,
                },
            )
            .await
            .expect_err("blank project name should be rejected");

            assert!(error.to_string().contains("project name cannot be empty"));
        });
    }

    #[test]
    fn create_project_persists_optional_note() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before creating project with note");

            let payload = create_project(
                &state,
                CreateProjectInput {
                    space_slug: "default".to_owned(),
                    name: "执行层收口".to_owned(),
                    note: Some("承接当前需要推进的执行任务".to_owned()),
                },
            )
            .await
            .expect("project should be created");

            let persisted_project = project::Entity::find_by_id(payload.id)
                .one(&state.connection)
                .await
                .expect("created project should be queryable")
                .expect("created project should exist");

            assert_eq!(
                persisted_project.note.as_deref(),
                Some("承接当前需要推进的执行任务")
            );
            assert_eq!(payload.note.as_deref(), Some("承接当前需要推进的执行任务"));
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
                    note: None,
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
                    priority: None,
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
                    note: None,
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
                    priority: None,
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
                    note: None,
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
                    priority: None,
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
                    priority: None,
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
                    note: None,
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
                    priority: None,
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
                    priority: None,
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
                    priority: None,
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
                    note: None,
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
                    note: None,
                },
            )
            .await
            .expect("first project should be created");
            let second_project = create_project(
                &state,
                CreateProjectInput {
                    space_slug: "default".to_owned(),
                    name: "Beta".to_owned(),
                    note: None,
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
                    note: None,
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
                    priority: None,
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
                    priority: None,
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
    fn search_workspace_groups_results_and_applies_basic_ranking() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before workspace search");

            let project = create_project(
                &state,
                CreateProjectInput {
                    space_slug: "default".to_owned(),
                    name: "Alpha 项目".to_owned(),
                    note: Some("项目备注".to_owned()),
                },
            )
            .await
            .expect("alpha project should be created");
            create_project(
                &state,
                CreateProjectInput {
                    space_slug: "default".to_owned(),
                    name: "执行层".to_owned(),
                    note: Some("包含 alpha 线索".to_owned()),
                },
            )
            .await
            .expect("note match project should be created");

            let prefix_task = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "Alpha 任务".to_owned(),
                    note: Some("标题前缀命中".to_owned()),
                    priority: Some("high".to_owned()),
                    project_id: Some(project.id),
                },
            )
            .await
            .expect("prefix task should be created");
            let infix_task = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "收口 Alpha 搜索".to_owned(),
                    note: Some("标题中间命中".to_owned()),
                    priority: Some("medium".to_owned()),
                    project_id: None,
                },
            )
            .await
            .expect("infix task should be created");
            let note_task = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "备注命中任务".to_owned(),
                    note: Some("这里带有 alpha 提示".to_owned()),
                    priority: None,
                    project_id: None,
                },
            )
            .await
            .expect("note task should be created");

            let other_space = create_space(
                &state,
                CreateSpaceInput {
                    name: "Study".to_owned(),
                },
            )
            .await
            .expect("other space should be created");

            create_project(
                &state,
                CreateProjectInput {
                    space_slug: other_space.slug.clone(),
                    name: "Alpha Foreign".to_owned(),
                    note: None,
                },
            )
            .await
            .expect("foreign project should be created");
            create_task(
                &state,
                CreateTaskInput {
                    space_slug: other_space.slug,
                    title: "Alpha Foreign Task".to_owned(),
                    note: None,
                    priority: None,
                    project_id: None,
                },
            )
            .await
            .expect("foreign task should be created");

            let payload = crate::application::search::search_workspace(
                &state,
                crate::application::search::SearchWorkspaceInput {
                    space_slug: "default".to_owned(),
                    query: "alpha".to_owned(),
                    limit: 5,
                },
            )
            .await
            .expect("workspace search should succeed");

            assert_eq!(payload.tasks.len(), 3);
            assert_eq!(payload.tasks[0].id, prefix_task.id);
            assert_eq!(payload.tasks[1].id, infix_task.id);
            assert_eq!(payload.tasks[2].id, note_task.id);
            assert_eq!(payload.tasks[0].project_id, Some(project.id));
            assert_eq!(payload.tasks[0].project_name.as_deref(), Some("Alpha 项目"));
            assert_eq!(payload.projects.len(), 2);
            assert_eq!(payload.projects[0].name, "Alpha 项目");
            assert_eq!(payload.projects[1].name, "执行层");
        });
    }

    #[test]
    fn search_workspace_respects_limit_and_returns_empty_for_blank_query() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before workspace search limit checks");

            create_project(
                &state,
                CreateProjectInput {
                    space_slug: "default".to_owned(),
                    name: "Alpha 项目".to_owned(),
                    note: None,
                },
            )
            .await
            .expect("project should be created");
            create_project(
                &state,
                CreateProjectInput {
                    space_slug: "default".to_owned(),
                    name: "Alpha 扩展".to_owned(),
                    note: None,
                },
            )
            .await
            .expect("second project should be created");

            create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "Alpha 任务 A".to_owned(),
                    note: None,
                    priority: None,
                    project_id: None,
                },
            )
            .await
            .expect("first task should be created");
            create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "Alpha 任务 B".to_owned(),
                    note: None,
                    priority: None,
                    project_id: None,
                },
            )
            .await
            .expect("second task should be created");

            let limited_payload = crate::application::search::search_workspace(
                &state,
                crate::application::search::SearchWorkspaceInput {
                    space_slug: "default".to_owned(),
                    query: "alpha".to_owned(),
                    limit: 1,
                },
            )
            .await
            .expect("limited workspace search should succeed");

            assert_eq!(limited_payload.tasks.len(), 1);
            assert_eq!(limited_payload.projects.len(), 1);

            let empty_payload = crate::application::search::search_workspace(
                &state,
                crate::application::search::SearchWorkspaceInput {
                    space_slug: "default".to_owned(),
                    query: "   ".to_owned(),
                    limit: 5,
                },
            )
            .await
            .expect("blank query should be accepted");

            assert!(empty_payload.tasks.is_empty());
            assert!(empty_payload.projects.is_empty());
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
                    note: None,
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
                    priority: None,
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
                    note: None,
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
                    note: None,
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
                    priority: None,
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
                    note: None,
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
                    priority: None,
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
                    note: None,
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
                    priority: None,
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
                    priority: None,
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

    #[test]
    fn list_focus_views_returns_ordered_system_views_for_target_space() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before querying focus views");

            create_space(
                &state,
                CreateSpaceInput {
                    name: "Study".to_owned(),
                },
            )
            .await
            .expect("secondary space should be created");

            let payload = list_focus_views(
                &state,
                ListFocusViewsInput {
                    space_slug: "study".to_owned(),
                },
            )
            .await
            .expect("focus views should be queryable");

            let keys = payload
                .views
                .iter()
                .map(|view| view.key.as_str())
                .collect::<Vec<_>>();

            assert_eq!(keys, vec!["focus", "upcoming", "recent", "high_priority"]);
            assert!(payload.views.iter().all(|view| view.is_enabled));
            assert!(payload.views.iter().all(|view| view.sort_order >= 0));
        });
    }

    #[test]
    fn get_focus_view_tasks_applies_all_system_rules_and_space_isolation() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before querying focus tasks");

            let project = create_project(
                &state,
                CreateProjectInput {
                    space_slug: "default".to_owned(),
                    name: "执行层".to_owned(),
                    note: None,
                },
            )
            .await
            .expect("project should be created");

            let focus_task = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "Focus 任务".to_owned(),
                    note: None,
                    priority: None,
                    project_id: None,
                },
            )
            .await
            .expect("focus task should be created");
            triage_inbox_task(
                &state,
                TriageInboxTaskInput {
                    space_slug: "default".to_owned(),
                    task_id: focus_task.id,
                    project_id: Some(project.id),
                    priority: Some("high".to_owned()),
                },
            )
            .await
            .expect("focus task should be triaged");

            let upcoming_soon = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "即将到期".to_owned(),
                    note: None,
                    priority: None,
                    project_id: None,
                },
            )
            .await
            .expect("upcoming task should be created");
            triage_inbox_task(
                &state,
                TriageInboxTaskInput {
                    space_slug: "default".to_owned(),
                    task_id: upcoming_soon.id,
                    project_id: Some(project.id),
                    priority: Some("medium".to_owned()),
                },
            )
            .await
            .expect("upcoming task should be triaged");

            let upcoming_later = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "稍后到期".to_owned(),
                    note: None,
                    priority: None,
                    project_id: None,
                },
            )
            .await
            .expect("later upcoming task should be created");
            triage_inbox_task(
                &state,
                TriageInboxTaskInput {
                    space_slug: "default".to_owned(),
                    task_id: upcoming_later.id,
                    project_id: Some(project.id),
                    priority: Some("medium".to_owned()),
                },
            )
            .await
            .expect("later upcoming task should be triaged");

            let recent_old = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "较早创建".to_owned(),
                    note: None,
                    priority: None,
                    project_id: None,
                },
            )
            .await
            .expect("old recent task should be created");
            triage_inbox_task(
                &state,
                TriageInboxTaskInput {
                    space_slug: "default".to_owned(),
                    task_id: recent_old.id,
                    project_id: Some(project.id),
                    priority: Some("low".to_owned()),
                },
            )
            .await
            .expect("old recent task should be triaged");

            let recent_new = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "较晚创建".to_owned(),
                    note: None,
                    priority: None,
                    project_id: None,
                },
            )
            .await
            .expect("new recent task should be created");
            triage_inbox_task(
                &state,
                TriageInboxTaskInput {
                    space_slug: "default".to_owned(),
                    task_id: recent_new.id,
                    project_id: Some(project.id),
                    priority: Some("low".to_owned()),
                },
            )
            .await
            .expect("new recent task should be triaged");

            let urgent_task = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "紧急任务".to_owned(),
                    note: None,
                    priority: None,
                    project_id: None,
                },
            )
            .await
            .expect("urgent task should be created");
            triage_inbox_task(
                &state,
                TriageInboxTaskInput {
                    space_slug: "default".to_owned(),
                    task_id: urgent_task.id,
                    project_id: Some(project.id),
                    priority: Some("urgent".to_owned()),
                },
            )
            .await
            .expect("urgent task should be triaged");

            let inbox_only_task = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "仍在 Inbox".to_owned(),
                    note: None,
                    priority: None,
                    project_id: None,
                },
            )
            .await
            .expect("inbox task should be created");

            let done_task = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "已完成任务".to_owned(),
                    note: None,
                    priority: None,
                    project_id: None,
                },
            )
            .await
            .expect("done task should be created");
            triage_inbox_task(
                &state,
                TriageInboxTaskInput {
                    space_slug: "default".to_owned(),
                    task_id: done_task.id,
                    project_id: Some(project.id),
                    priority: Some("high".to_owned()),
                },
            )
            .await
            .expect("done task should be triaged");

            let foreign_space = create_space(
                &state,
                CreateSpaceInput {
                    name: "Study".to_owned(),
                },
            )
            .await
            .expect("foreign space should be created");
            let foreign_project = create_project(
                &state,
                CreateProjectInput {
                    space_slug: foreign_space.slug.clone(),
                    name: "外部项目".to_owned(),
                    note: None,
                },
            )
            .await
            .expect("foreign project should be created");
            let foreign_task = create_task(
                &state,
                CreateTaskInput {
                    space_slug: foreign_space.slug.clone(),
                    title: "外部 Focus 任务".to_owned(),
                    note: None,
                    priority: None,
                    project_id: None,
                },
            )
            .await
            .expect("foreign task should be created");
            triage_inbox_task(
                &state,
                TriageInboxTaskInput {
                    space_slug: foreign_space.slug.clone(),
                    task_id: foreign_task.id,
                    project_id: Some(foreign_project.id),
                    priority: Some("high".to_owned()),
                },
            )
            .await
            .expect("foreign task should be triaged");

            let focus_persisted = task::Entity::find_by_id(focus_task.id)
                .one(&state.connection)
                .await
                .expect("focus task should remain queryable")
                .expect("focus task should exist");
            let mut focus_active: task::ActiveModel = focus_persisted.into();
            focus_active.pinned = Set(true);
            focus_active.created_at = Set(parse_utc("2026-04-20T06:30:00Z"));
            focus_active.updated_at = Set(parse_utc("2026-04-20T09:00:00Z"));
            focus_active
                .update(&state.connection)
                .await
                .expect("focus task should be updated");

            let soon_persisted = task::Entity::find_by_id(upcoming_soon.id)
                .one(&state.connection)
                .await
                .expect("soon task should remain queryable")
                .expect("soon task should exist");
            let mut soon_active: task::ActiveModel = soon_persisted.into();
            soon_active.created_at = Set(parse_utc("2026-04-20T06:20:00Z"));
            soon_active.due_at = Set(Some(parse_utc("2026-04-21T08:00:00Z")));
            soon_active.updated_at = Set(parse_utc("2026-04-20T08:10:00Z"));
            soon_active
                .update(&state.connection)
                .await
                .expect("soon task should be updated");

            let later_persisted = task::Entity::find_by_id(upcoming_later.id)
                .one(&state.connection)
                .await
                .expect("later task should remain queryable")
                .expect("later task should exist");
            let mut later_active: task::ActiveModel = later_persisted.into();
            later_active.created_at = Set(parse_utc("2026-04-20T06:10:00Z"));
            later_active.due_at = Set(Some(parse_utc("2026-04-22T08:00:00Z")));
            later_active.updated_at = Set(parse_utc("2026-04-20T08:20:00Z"));
            later_active
                .update(&state.connection)
                .await
                .expect("later task should be updated");

            let recent_old_persisted = task::Entity::find_by_id(recent_old.id)
                .one(&state.connection)
                .await
                .expect("old recent task should remain queryable")
                .expect("old recent task should exist");
            let mut recent_old_active: task::ActiveModel = recent_old_persisted.into();
            recent_old_active.created_at = Set(parse_utc("2026-04-20T07:00:00Z"));
            recent_old_active.updated_at = Set(parse_utc("2026-04-20T07:30:00Z"));
            recent_old_active
                .update(&state.connection)
                .await
                .expect("old recent task should be updated");

            let recent_new_persisted = task::Entity::find_by_id(recent_new.id)
                .one(&state.connection)
                .await
                .expect("new recent task should remain queryable")
                .expect("new recent task should exist");
            let mut recent_new_active: task::ActiveModel = recent_new_persisted.into();
            recent_new_active.created_at = Set(parse_utc("2026-04-20T11:00:00Z"));
            recent_new_active.updated_at = Set(parse_utc("2026-04-20T11:30:00Z"));
            recent_new_active
                .update(&state.connection)
                .await
                .expect("new recent task should be updated");

            let urgent_persisted = task::Entity::find_by_id(urgent_task.id)
                .one(&state.connection)
                .await
                .expect("urgent task should remain queryable")
                .expect("urgent task should exist");
            let mut urgent_active: task::ActiveModel = urgent_persisted.into();
            urgent_active.created_at = Set(parse_utc("2026-04-20T06:00:00Z"));
            urgent_active.updated_at = Set(parse_utc("2026-04-20T12:00:00Z"));
            urgent_active
                .update(&state.connection)
                .await
                .expect("urgent task should be updated");

            let done_persisted = task::Entity::find_by_id(done_task.id)
                .one(&state.connection)
                .await
                .expect("done task should remain queryable")
                .expect("done task should exist");
            let mut done_active: task::ActiveModel = done_persisted.into();
            done_active.status = Set("done".to_owned());
            done_active.completed_at = Set(Some(parse_utc("2026-04-20T10:30:00Z")));
            done_active.updated_at = Set(parse_utc("2026-04-20T10:30:00Z"));
            done_active
                .update(&state.connection)
                .await
                .expect("done task should be updated");

            let focus_view = get_focus_view_tasks(
                &state,
                GetFocusViewTasksInput {
                    space_slug: "default".to_owned(),
                    view_key: "focus".to_owned(),
                },
            )
            .await
            .expect("focus view should be queryable");
            let upcoming_view = get_focus_view_tasks(
                &state,
                GetFocusViewTasksInput {
                    space_slug: "default".to_owned(),
                    view_key: "upcoming".to_owned(),
                },
            )
            .await
            .expect("upcoming view should be queryable");
            let recent_view = get_focus_view_tasks(
                &state,
                GetFocusViewTasksInput {
                    space_slug: "default".to_owned(),
                    view_key: "recent".to_owned(),
                },
            )
            .await
            .expect("recent view should be queryable");
            let high_priority_view = get_focus_view_tasks(
                &state,
                GetFocusViewTasksInput {
                    space_slug: "default".to_owned(),
                    view_key: "high_priority".to_owned(),
                },
            )
            .await
            .expect("high priority view should be queryable");

            assert_eq!(
                focus_view
                    .tasks
                    .iter()
                    .map(|task| task.id)
                    .collect::<Vec<_>>(),
                vec![focus_task.id]
            );
            assert_eq!(
                upcoming_view
                    .tasks
                    .iter()
                    .map(|task| task.id)
                    .collect::<Vec<_>>(),
                vec![upcoming_soon.id, upcoming_later.id]
            );
            let recent_new_index = recent_view
                .tasks
                .iter()
                .position(|task| task.id == recent_new.id)
                .expect("recent new task should be included");
            let recent_old_index = recent_view
                .tasks
                .iter()
                .position(|task| task.id == recent_old.id)
                .expect("recent old task should be included");
            assert!(recent_new_index < recent_old_index);
            assert_eq!(
                high_priority_view
                    .tasks
                    .iter()
                    .map(|task| task.id)
                    .collect::<Vec<_>>(),
                vec![urgent_task.id, focus_task.id]
            );
            assert!(recent_view
                .tasks
                .iter()
                .all(|task| task.id != inbox_only_task.id));
            assert!(recent_view.tasks.iter().all(|task| task.id != done_task.id));
            assert!(recent_view
                .tasks
                .iter()
                .all(|task| task.id != foreign_task.id));
        });
    }

    #[test]
    fn update_task_pin_state_updates_updated_at_and_focus_results() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before updating pin state");

            let project = create_project(
                &state,
                CreateProjectInput {
                    space_slug: "default".to_owned(),
                    name: "执行层".to_owned(),
                    note: None,
                },
            )
            .await
            .expect("project should be created");
            let task = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "切换 pin".to_owned(),
                    note: None,
                    priority: None,
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
            .expect("task should be triaged");

            let before = task::Entity::find_by_id(task.id)
                .one(&state.connection)
                .await
                .expect("task should remain queryable")
                .expect("task should exist");

            let pinned = update_task_pin_state(
                &state,
                UpdateTaskPinStateInput {
                    space_slug: "default".to_owned(),
                    task_id: task.id,
                    pinned: true,
                },
            )
            .await
            .expect("pin update should succeed");

            assert_eq!(pinned.task_id, task.id);
            assert!(pinned.pinned);
            assert!(pinned.updated_at > before.updated_at);

            let focus_view = get_focus_view_tasks(
                &state,
                GetFocusViewTasksInput {
                    space_slug: "default".to_owned(),
                    view_key: "focus".to_owned(),
                },
            )
            .await
            .expect("focus view should be queryable after pin");

            assert_eq!(focus_view.tasks.len(), 1);
            assert_eq!(focus_view.tasks[0].id, task.id);

            let unpinned = update_task_pin_state(
                &state,
                UpdateTaskPinStateInput {
                    space_slug: "default".to_owned(),
                    task_id: task.id,
                    pinned: false,
                },
            )
            .await
            .expect("unpin update should succeed");

            assert!(!unpinned.pinned);

            let focus_view_after_unpin = get_focus_view_tasks(
                &state,
                GetFocusViewTasksInput {
                    space_slug: "default".to_owned(),
                    view_key: "focus".to_owned(),
                },
            )
            .await
            .expect("focus view should be queryable after unpin");

            assert!(focus_view_after_unpin.tasks.is_empty());
        });
    }

    #[test]
    fn update_task_pin_state_rejects_cross_space_task() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before cross-space pin validation");

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
                    title: "外部 pin".to_owned(),
                    note: None,
                    priority: None,
                    project_id: None,
                },
            )
            .await
            .expect("foreign task should be created");

            let error = update_task_pin_state(
                &state,
                UpdateTaskPinStateInput {
                    space_slug: "default".to_owned(),
                    task_id: foreign_task.id,
                    pinned: true,
                },
            )
            .await
            .expect_err("cross-space pin update should be rejected");

            assert!(error
                .to_string()
                .contains("does not belong to space `default`"));
        });
    }

    #[test]
    fn delete_task_to_trash_soft_deletes_inbox_task_and_writes_trash_entry() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before deleting inbox task");

            let task = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "进入 Trash 的 Inbox 任务".to_owned(),
                    note: Some("保留最小快照".to_owned()),
                    priority: None,
                    project_id: None,
                },
            )
            .await
            .expect("task should be created");

            let payload = delete_task_to_trash(
                &state,
                DeleteTaskToTrashInput {
                    space_slug: "default".to_owned(),
                    task_id: task.id,
                },
            )
            .await
            .expect("delete to trash should succeed");

            let persisted_task = task::Entity::find_by_id(task.id)
                .one(&state.connection)
                .await
                .expect("deleted task should remain queryable")
                .expect("deleted task should exist");
            let trash_entry = trash_entry::Entity::find()
                .filter(trash_entry::Column::EntityType.eq("task"))
                .filter(trash_entry::Column::EntityId.eq(task.id))
                .one(&state.connection)
                .await
                .expect("trash entry should be queryable")
                .expect("trash entry should exist");
            let inbox_snapshot = list_inbox_tasks(
                &state,
                ListInboxTasksInput {
                    space_slug: "default".to_owned(),
                },
            )
            .await
            .expect("inbox snapshot should remain queryable");

            assert_eq!(payload.task_id, task.id);
            assert_eq!(persisted_task.deleted_at, Some(payload.deleted_at));
            assert_eq!(persisted_task.updated_at, payload.deleted_at);
            assert_eq!(trash_entry.deleted_at, payload.deleted_at);
            assert_eq!(trash_entry.deleted_from.as_deref(), Some("task_drawer"));
            assert_eq!(
                trash_entry.entity_snapshot["title"],
                "进入 Trash 的 Inbox 任务"
            );
            assert!(inbox_snapshot.tasks.is_empty());
        });
    }

    #[test]
    fn delete_task_to_trash_removes_project_task_from_execution_view() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before deleting project task");

            let project = create_project(
                &state,
                CreateProjectInput {
                    space_slug: "default".to_owned(),
                    name: "执行层".to_owned(),
                    note: None,
                },
            )
            .await
            .expect("project should be created");
            let task = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "从 Project 中删除".to_owned(),
                    note: None,
                    priority: None,
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
            .expect("task should be triaged");

            delete_task_to_trash(
                &state,
                DeleteTaskToTrashInput {
                    space_slug: "default".to_owned(),
                    task_id: task.id,
                },
            )
            .await
            .expect("delete to trash should succeed");

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
    fn delete_task_to_trash_rejects_cross_space_task() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before cross-space delete validation");

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
                    title: "外部删除".to_owned(),
                    note: None,
                    priority: None,
                    project_id: None,
                },
            )
            .await
            .expect("foreign task should be created");

            let error = delete_task_to_trash(
                &state,
                DeleteTaskToTrashInput {
                    space_slug: "default".to_owned(),
                    task_id: foreign_task.id,
                },
            )
            .await
            .expect_err("cross-space delete should be rejected");

            assert!(error
                .to_string()
                .contains("does not belong to space `default`"));
        });
    }

    #[test]
    fn list_trash_entries_maps_task_and_project_by_space_in_deleted_order() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before trash list test");
            let default_space = space::Entity::find()
                .filter(space::Column::Slug.eq("default"))
                .one(&state.connection)
                .await
                .expect("default space should be queryable")
                .expect("default space should exist");
            let other_space = create_space(
                &state,
                CreateSpaceInput {
                    name: "Study".to_owned(),
                },
            )
            .await
            .expect("other space should be created");

            let task_entity_id = uuid::Uuid::new_v4();
            let project_entity_id = uuid::Uuid::new_v4();
            let foreign_entity_id = uuid::Uuid::new_v4();

            trash_entry::ActiveModel {
                id: Set(uuid::Uuid::new_v4()),
                space_id: Set(default_space.id),
                entity_type: Set("task".to_owned()),
                entity_id: Set(task_entity_id),
                entity_snapshot: Set(json!({
                    "title": "旧任务",
                    "project_id": null
                })),
                deleted_at: Set(parse_utc("2026-04-20T08:00:00Z")),
                deleted_from: Set(Some("task_drawer".to_owned())),
                created_at: Set(parse_utc("2026-04-20T08:00:00Z")),
            }
            .insert(&state.connection)
            .await
            .expect("task trash entry should be inserted");
            trash_entry::ActiveModel {
                id: Set(uuid::Uuid::new_v4()),
                space_id: Set(default_space.id),
                entity_type: Set("project".to_owned()),
                entity_id: Set(project_entity_id),
                entity_snapshot: Set(json!({
                    "name": "旧项目",
                    "parent_project_id": null
                })),
                deleted_at: Set(parse_utc("2026-04-20T09:00:00Z")),
                deleted_from: Set(Some("project_page".to_owned())),
                created_at: Set(parse_utc("2026-04-20T09:00:00Z")),
            }
            .insert(&state.connection)
            .await
            .expect("project trash entry should be inserted");
            trash_entry::ActiveModel {
                id: Set(uuid::Uuid::new_v4()),
                space_id: Set(other_space.id),
                entity_type: Set("task".to_owned()),
                entity_id: Set(foreign_entity_id),
                entity_snapshot: Set(json!({ "title": "外部任务" })),
                deleted_at: Set(parse_utc("2026-04-20T10:00:00Z")),
                deleted_from: Set(Some("task_drawer".to_owned())),
                created_at: Set(parse_utc("2026-04-20T10:00:00Z")),
            }
            .insert(&state.connection)
            .await
            .expect("foreign trash entry should be inserted");

            let payload = list_trash_entries(
                &state,
                ListTrashEntriesInput {
                    space_slug: "default".to_owned(),
                },
            )
            .await
            .expect("trash entries should be listed");

            assert_eq!(payload.entries.len(), 2);
            assert_eq!(payload.entries[0].entity_type, "project");
            assert_eq!(payload.entries[0].title, "旧项目");
            assert_eq!(payload.entries[0].restore_hint, "恢复为顶层 Project");
            assert_eq!(payload.entries[1].entity_type, "task");
            assert_eq!(payload.entries[1].title, "旧任务");
            assert_eq!(payload.entries[1].restore_hint, "恢复到 Inbox");
        });
    }

    #[test]
    fn restore_task_from_trash_restores_inbox_task_and_removes_entry() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before task restore test");
            let task = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "恢复 Inbox Task".to_owned(),
                    note: None,
                    priority: None,
                    project_id: None,
                },
            )
            .await
            .expect("task should be created");

            delete_task_to_trash(
                &state,
                DeleteTaskToTrashInput {
                    space_slug: "default".to_owned(),
                    task_id: task.id,
                },
            )
            .await
            .expect("task should be deleted to trash");

            let trash_entry = trash_entry_for_entity(&state, task.id).await;

            let restored = restore_task_from_trash(
                &state,
                RestoreTaskFromTrashInput {
                    space_slug: "default".to_owned(),
                    trash_entry_id: trash_entry.id,
                },
            )
            .await
            .expect("task should restore from trash");

            let restored_task = task::Entity::find_by_id(task.id)
                .one(&state.connection)
                .await
                .expect("task should be queryable")
                .expect("task should exist");
            let trash_count = trash_entry::Entity::find()
                .filter(trash_entry::Column::EntityId.eq(task.id))
                .count(&state.connection)
                .await
                .expect("trash count should be queryable");

            assert_eq!(restored.trash_entry_id, trash_entry.id);
            assert_eq!(restored_task.deleted_at, None);
            assert_eq!(restored_task.project_id, None);
            assert_eq!(trash_count, 0);
        });
    }

    #[test]
    fn restore_task_from_trash_restores_original_active_project() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before task project restore test");
            let project = create_project(
                &state,
                CreateProjectInput {
                    space_slug: "default".to_owned(),
                    name: "原 Project".to_owned(),
                    note: None,
                },
            )
            .await
            .expect("project should be created");
            let task = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "恢复到原 Project".to_owned(),
                    note: None,
                    priority: Some("high".to_owned()),
                    project_id: Some(project.id),
                },
            )
            .await
            .expect("task should be created");

            delete_task_to_trash(
                &state,
                DeleteTaskToTrashInput {
                    space_slug: "default".to_owned(),
                    task_id: task.id,
                },
            )
            .await
            .expect("task should be deleted to trash");

            let trash_entry = trash_entry_for_entity(&state, task.id).await;

            restore_task_from_trash(
                &state,
                RestoreTaskFromTrashInput {
                    space_slug: "default".to_owned(),
                    trash_entry_id: trash_entry.id,
                },
            )
            .await
            .expect("task should restore to original project");

            let restored_task = task::Entity::find_by_id(task.id)
                .one(&state.connection)
                .await
                .expect("task should be queryable")
                .expect("task should exist");

            assert_eq!(restored_task.deleted_at, None);
            assert_eq!(restored_task.project_id, Some(project.id));
        });
    }

    #[test]
    fn restore_task_from_trash_rejects_deleted_original_project_and_keeps_entry() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before deleted project restore test");
            let project = create_project(
                &state,
                CreateProjectInput {
                    space_slug: "default".to_owned(),
                    name: "原项目".to_owned(),
                    note: None,
                },
            )
            .await
            .expect("project should be created");
            let task = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "恢复到已删项目".to_owned(),
                    note: None,
                    priority: Some("high".to_owned()),
                    project_id: Some(project.id),
                },
            )
            .await
            .expect("task should be created");

            delete_task_to_trash(
                &state,
                DeleteTaskToTrashInput {
                    space_slug: "default".to_owned(),
                    task_id: task.id,
                },
            )
            .await
            .expect("task should be deleted to trash");
            delete_project_to_trash(
                &state,
                DeleteProjectToTrashInput {
                    space_slug: "default".to_owned(),
                    project_id: project.id,
                },
            )
            .await
            .expect("project should be deleted to trash");

            let task_trash_entry = trash_entry_for_entity(&state, task.id).await;
            let error = restore_task_from_trash(
                &state,
                RestoreTaskFromTrashInput {
                    space_slug: "default".to_owned(),
                    trash_entry_id: task_trash_entry.id,
                },
            )
            .await
            .expect_err("restore should fail when original project is deleted");
            let still_deleted_task = task::Entity::find_by_id(task.id)
                .one(&state.connection)
                .await
                .expect("task should be queryable")
                .expect("task should exist");
            let task_trash_count = trash_entry::Entity::find()
                .filter(trash_entry::Column::EntityId.eq(task.id))
                .count(&state.connection)
                .await
                .expect("trash count should be queryable");

            assert!(error.to_string().contains("is not restorable"));
            assert!(still_deleted_task.deleted_at.is_some());
            assert_eq!(task_trash_count, 1);
        });
    }

    #[test]
    fn restore_task_from_trash_rejects_cross_space_trash_entry() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before cross-space task restore test");
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
                    title: "外部 Task".to_owned(),
                    note: None,
                    priority: None,
                    project_id: None,
                },
            )
            .await
            .expect("foreign task should be created");
            delete_task_to_trash(
                &state,
                DeleteTaskToTrashInput {
                    space_slug: "study".to_owned(),
                    task_id: foreign_task.id,
                },
            )
            .await
            .expect("foreign task should be deleted");

            let trash_entry = trash_entry_for_entity(&state, foreign_task.id).await;
            let error = restore_task_from_trash(
                &state,
                RestoreTaskFromTrashInput {
                    space_slug: "default".to_owned(),
                    trash_entry_id: trash_entry.id,
                },
            )
            .await
            .expect_err("cross-space restore should be rejected");

            assert!(error
                .to_string()
                .contains("does not belong to current space"));
        });
    }

    #[test]
    fn delete_project_to_trash_soft_deletes_project_without_cascading_tasks() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before project delete test");
            let project = create_project(
                &state,
                CreateProjectInput {
                    space_slug: "default".to_owned(),
                    name: "删除项目".to_owned(),
                    note: None,
                },
            )
            .await
            .expect("project should be created");
            let task = create_task(
                &state,
                CreateTaskInput {
                    space_slug: "default".to_owned(),
                    title: "保留任务".to_owned(),
                    note: None,
                    priority: Some("medium".to_owned()),
                    project_id: Some(project.id),
                },
            )
            .await
            .expect("task should be created");

            delete_project_to_trash(
                &state,
                DeleteProjectToTrashInput {
                    space_slug: "default".to_owned(),
                    project_id: project.id,
                },
            )
            .await
            .expect("project should be deleted to trash");

            let deleted_project = project::Entity::find_by_id(project.id)
                .one(&state.connection)
                .await
                .expect("project should be queryable")
                .expect("project should exist");
            let active_task = task::Entity::find_by_id(task.id)
                .one(&state.connection)
                .await
                .expect("task should be queryable")
                .expect("task should exist");
            let projects = list_projects(
                &state,
                ListProjectsInput {
                    space_slug: "default".to_owned(),
                },
            )
            .await
            .expect("projects should be listed");
            let trash_entry = trash_entry_for_entity(&state, project.id).await;

            assert!(deleted_project.deleted_at.is_some());
            assert_eq!(active_task.deleted_at, None);
            assert_eq!(active_task.project_id, Some(project.id));
            assert_eq!(trash_entry.entity_type, "project");
            assert_eq!(
                trash_entry
                    .entity_snapshot
                    .get("name")
                    .and_then(|value| value.as_str()),
                Some("删除项目")
            );
            assert!(projects.projects.is_empty());
        });
    }

    #[test]
    fn delete_project_to_trash_rejects_cross_space_project() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before cross-space project delete test");
            create_space(
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
                    space_slug: "study".to_owned(),
                    name: "外部 Project".to_owned(),
                    note: None,
                },
            )
            .await
            .expect("foreign project should be created");

            let error = delete_project_to_trash(
                &state,
                DeleteProjectToTrashInput {
                    space_slug: "default".to_owned(),
                    project_id: foreign_project.id,
                },
            )
            .await
            .expect_err("cross-space project delete should be rejected");

            assert!(error
                .to_string()
                .contains("does not belong to space `default`"));
        });
    }

    #[test]
    fn restore_project_from_trash_restores_top_level_project_and_removes_entry() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before project restore test");
            let project = create_project(
                &state,
                CreateProjectInput {
                    space_slug: "default".to_owned(),
                    name: "恢复项目".to_owned(),
                    note: None,
                },
            )
            .await
            .expect("project should be created");

            delete_project_to_trash(
                &state,
                DeleteProjectToTrashInput {
                    space_slug: "default".to_owned(),
                    project_id: project.id,
                },
            )
            .await
            .expect("project should be deleted to trash");

            let trash_entry = trash_entry_for_entity(&state, project.id).await;

            restore_project_from_trash(
                &state,
                RestoreProjectFromTrashInput {
                    space_slug: "default".to_owned(),
                    trash_entry_id: trash_entry.id,
                },
            )
            .await
            .expect("project should restore from trash");

            let restored_project = project::Entity::find_by_id(project.id)
                .one(&state.connection)
                .await
                .expect("project should be queryable")
                .expect("project should exist");
            let trash_count = trash_entry::Entity::find()
                .filter(trash_entry::Column::EntityId.eq(project.id))
                .count(&state.connection)
                .await
                .expect("trash count should be queryable");

            assert_eq!(restored_project.deleted_at, None);
            assert_eq!(restored_project.parent_project_id, None);
            assert_eq!(trash_count, 0);
        });
    }

    #[test]
    fn restore_project_from_trash_rejects_deleted_parent_and_keeps_entry() {
        let temp_dir = TestDatabaseDir::new();

        tauri::async_runtime::block_on(async {
            let state = prepare_database_at_path(&temp_dir.database_path())
                .await
                .expect("bootstrap should succeed before child project restore test");
            let parent = create_project(
                &state,
                CreateProjectInput {
                    space_slug: "default".to_owned(),
                    name: "父项目".to_owned(),
                    note: None,
                },
            )
            .await
            .expect("parent project should be created");
            let space = space::Entity::find()
                .filter(space::Column::Slug.eq("default"))
                .one(&state.connection)
                .await
                .expect("default space should be queryable")
                .expect("default space should exist");
            let now = chrono::Utc::now();
            let child = project::ActiveModel {
                id: Set(uuid::Uuid::new_v4()),
                space_id: Set(space.id),
                parent_project_id: Set(Some(parent.id)),
                name: Set("子项目".to_owned()),
                status: Set("active".to_owned()),
                note: Set(None),
                due_at: Set(None),
                sort_order: Set(1),
                deleted_at: Set(None),
                created_at: Set(now),
                updated_at: Set(now),
            }
            .insert(&state.connection)
            .await
            .expect("child project should be inserted");

            delete_project_to_trash(
                &state,
                DeleteProjectToTrashInput {
                    space_slug: "default".to_owned(),
                    project_id: child.id,
                },
            )
            .await
            .expect("child project should be deleted to trash");
            delete_project_to_trash(
                &state,
                DeleteProjectToTrashInput {
                    space_slug: "default".to_owned(),
                    project_id: parent.id,
                },
            )
            .await
            .expect("parent project should be deleted to trash");

            let child_trash_entry = trash_entry_for_entity(&state, child.id).await;
            let error = restore_project_from_trash(
                &state,
                RestoreProjectFromTrashInput {
                    space_slug: "default".to_owned(),
                    trash_entry_id: child_trash_entry.id,
                },
            )
            .await
            .expect_err("restore should fail when original parent is deleted");
            let child_trash_count = trash_entry::Entity::find()
                .filter(trash_entry::Column::EntityId.eq(child.id))
                .count(&state.connection)
                .await
                .expect("trash count should be queryable");

            assert!(error.to_string().contains("is not restorable"));
            assert_eq!(child_trash_count, 1);
        });
    }

    async fn trash_entry_for_entity(
        state: &crate::infrastructure::database::DatabaseState,
        entity_id: uuid::Uuid,
    ) -> trash_entry::Model {
        trash_entry::Entity::find()
            .filter(trash_entry::Column::EntityId.eq(entity_id))
            .one(&state.connection)
            .await
            .expect("trash entry should be queryable")
            .expect("trash entry should exist")
    }

    fn parse_utc(value: &str) -> chrono::DateTime<chrono::Utc> {
        chrono::DateTime::parse_from_rfc3339(value)
            .expect("timestamp should be parseable")
            .with_timezone(&chrono::Utc)
    }
}

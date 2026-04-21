//! Task 创建相关测试。

use stoneflow_entity::task;

use crate::application::create::{create_task, CreateTaskInput};
use crate::application::project::{create_project, CreateProjectInput};
use crate::infrastructure::database::prepare_database_at_path;
use crate::tests::TestDatabaseDir;

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
fn create_task_accepts_priority_and_skips_inbox_when_project_assigned() {
    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before creating task");

        let project = create_project(
            &state,
            CreateProjectInput {
                space_slug: "default".to_owned(),
                name: "M2-B 联调".to_owned(),
                note: None,
            },
        )
        .await
        .expect("project should be created");

        let payload = create_task(
            &state,
            CreateTaskInput {
                space_slug: "default".to_owned(),
                title: "直接写入执行层".to_owned(),
                note: None,
                priority: Some("high".to_owned()),
                project_id: Some(project.id),
            },
        )
        .await
        .expect("task should be created");

        let persisted_task = task::Entity::find_by_id(payload.id)
            .one(&state.connection)
            .await
            .expect("created task should be queryable")
            .expect("created task should exist");

        assert_eq!(persisted_task.status, "todo");
        assert_eq!(persisted_task.priority.as_deref(), Some("high"));
        assert_eq!(persisted_task.project_id, Some(project.id));
    });
}

#[test]
fn create_task_rejects_blank_title() {
    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before validation");

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
fn create_task_rejects_invalid_priority() {
    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before validation");

        let error = create_task(
            &state,
            CreateTaskInput {
                space_slug: "default".to_owned(),
                title: "测试无效优先级".to_owned(),
                note: None,
                priority: Some("invalid".to_owned()),
                project_id: None,
            },
        )
        .await
        .expect_err("invalid priority should be rejected");

        assert!(error.to_string().contains("invalid priority"));
    });
}

#[test]
fn create_task_rejects_foreign_project() {
    use crate::application::create::{create_space, CreateSpaceInput};

    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before cross-space test");

        let foreign_project = create_project(
            &state,
            CreateProjectInput {
                space_slug: "default".to_owned(),
                name: "Foreign Project".to_owned(),
                note: None,
            },
        )
        .await
        .expect("project should be created");

        create_space(
            &state,
            CreateSpaceInput {
                name: "Other Space".to_owned(),
            },
        )
        .await
        .expect("second space should be created");

        let error = create_task(
            &state,
            CreateTaskInput {
                space_slug: "other-space".to_owned(),
                title: "尝试跨空间关联".to_owned(),
                note: None,
                priority: None,
                project_id: Some(foreign_project.id),
            },
        )
        .await
        .expect_err("cross-space project should be rejected");

        assert!(error
            .to_string()
            .contains("does not belong to space `other-space`"));
    });
}

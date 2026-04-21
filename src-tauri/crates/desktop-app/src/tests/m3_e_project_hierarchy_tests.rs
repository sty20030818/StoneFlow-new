//! M3-E 一层 Project 树与 Project 执行边界测试。

use chrono::Utc;
use sea_orm::EntityTrait;
use stoneflow_entity::project;
use uuid::Uuid;

use crate::application::create::{
    create_project, create_space, create_task, CreateProjectInput, CreateSpaceInput,
    CreateTaskInput, PROJECT_STATUS_ACTIVE, TASK_STATUS_TODO,
};
use crate::application::project::{
    build_project_tree_payload, get_project_execution_view, is_project_execution_task,
    list_projects, GetProjectExecutionViewInput, ListProjectsInput,
};
use crate::application::trash::{
    delete_project_to_trash, list_trash_entries, restore_project_from_trash,
    DeleteProjectToTrashInput, ListTrashEntriesInput, RestoreProjectFromTrashInput,
};
use crate::infrastructure::database::prepare_database_at_path;

fn project_model(
    id: Uuid,
    space_id: Uuid,
    parent_project_id: Option<Uuid>,
    name: &str,
    sort_order: i32,
) -> stoneflow_entity::project::Model {
    let now = Utc::now();

    stoneflow_entity::project::Model {
        id,
        space_id,
        parent_project_id,
        name: name.to_owned(),
        status: PROJECT_STATUS_ACTIVE.to_owned(),
        note: None,
        due_at: None,
        sort_order,
        deleted_at: None,
        created_at: now,
        updated_at: now,
    }
}

fn task_model(project_id: Option<Uuid>, priority: Option<&str>) -> stoneflow_entity::task::Model {
    let now = Utc::now();

    stoneflow_entity::task::Model {
        id: Uuid::new_v4(),
        space_id: Uuid::new_v4(),
        project_id,
        title: "任务".to_owned(),
        status: TASK_STATUS_TODO.to_owned(),
        priority: priority.map(str::to_owned),
        note: None,
        tags: serde_json::json!([]),
        due_at: None,
        pinned: false,
        source: "test".to_owned(),
        deleted_at: None,
        completed_at: None,
        created_at: now,
        updated_at: now,
    }
}

fn test_database_path() -> std::path::PathBuf {
    std::env::temp_dir().join(format!("stoneflow-m3-e-test-{}.db", Uuid::new_v4()))
}

#[test]
fn project_tree_payload_only_keeps_one_level_children() {
    let space_id = Uuid::new_v4();
    let parent_id = Uuid::new_v4();
    let child_id = Uuid::new_v4();
    let grandchild_id = Uuid::new_v4();
    let sibling_id = Uuid::new_v4();

    let payload = build_project_tree_payload(vec![
        project_model(child_id, space_id, Some(parent_id), "子项目", 0),
        project_model(parent_id, space_id, None, "父项目", 0),
        project_model(grandchild_id, space_id, Some(child_id), "孙级项目", 0),
        project_model(sibling_id, space_id, None, "同级项目", 1),
    ]);

    assert_eq!(payload.len(), 2);
    assert_eq!(payload[0].id, parent_id);
    assert_eq!(payload[0].children.len(), 1);
    assert_eq!(payload[0].children[0].id, child_id);
    assert!(payload[0].children[0].children.is_empty());
    assert_eq!(payload[1].id, sibling_id);
}

#[test]
fn project_execution_task_requires_direct_project_and_priority() {
    let project_id = Uuid::new_v4();
    let ready_task = task_model(Some(project_id), Some("high"));
    let inbox_task = task_model(None, Some("high"));
    let untriaged_task = task_model(Some(project_id), None);

    assert!(is_project_execution_task(&ready_task));
    assert!(!is_project_execution_task(&inbox_task));
    assert!(!is_project_execution_task(&untriaged_task));
}

#[test]
fn create_subproject_validates_parent_boundary() {
    let database_path = test_database_path();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&database_path)
            .await
            .expect("database should be prepared");

        let parent = create_project(
            &state,
            CreateProjectInput {
                space_slug: "default".to_owned(),
                name: "父项目".to_owned(),
                note: None,
                parent_project_id: None,
            },
        )
        .await
        .expect("parent project should be created");
        let child = create_project(
            &state,
            CreateProjectInput {
                space_slug: "default".to_owned(),
                name: "子项目".to_owned(),
                note: None,
                parent_project_id: Some(parent.id),
            },
        )
        .await
        .expect("child project should be created");

        assert_eq!(child.parent_project_id, Some(parent.id));

        let grandchild_error = create_project(
            &state,
            CreateProjectInput {
                space_slug: "default".to_owned(),
                name: "孙级项目".to_owned(),
                note: None,
                parent_project_id: Some(child.id),
            },
        )
        .await
        .expect_err("grandchild project should be rejected");
        assert!(grandchild_error
            .to_string()
            .contains("only supports one-level subprojects"));

        create_space(
            &state,
            CreateSpaceInput {
                name: "Study".to_owned(),
            },
        )
        .await
        .expect("second space should be created");
        let foreign_parent = create_project(
            &state,
            CreateProjectInput {
                space_slug: "study".to_owned(),
                name: "外部父项目".to_owned(),
                note: None,
                parent_project_id: None,
            },
        )
        .await
        .expect("foreign parent should be created");
        let cross_space_error = create_project(
            &state,
            CreateProjectInput {
                space_slug: "default".to_owned(),
                name: "跨 Space 子项目".to_owned(),
                note: None,
                parent_project_id: Some(foreign_parent.id),
            },
        )
        .await
        .expect_err("cross-space parent should be rejected");
        assert!(cross_space_error.to_string().contains("does not belong to space"));

        delete_project_to_trash(
            &state,
            DeleteProjectToTrashInput {
                space_slug: "default".to_owned(),
                project_id: parent.id,
            },
        )
        .await
        .expect("parent project should be deleted");
        let deleted_parent_error = create_project(
            &state,
            CreateProjectInput {
                space_slug: "default".to_owned(),
                name: "已删除父级下的子项目".to_owned(),
                note: None,
                parent_project_id: Some(parent.id),
            },
        )
        .await
        .expect_err("deleted parent should be rejected");
        assert!(deleted_parent_error.to_string().contains("does not exist"));
    });

    let _ = std::fs::remove_file(database_path);
}

#[test]
fn project_execution_view_returns_children_without_aggregating_child_tasks() {
    let database_path = test_database_path();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&database_path)
            .await
            .expect("database should be prepared");

        let parent = create_project(
            &state,
            CreateProjectInput {
                space_slug: "default".to_owned(),
                name: "父项目".to_owned(),
                note: None,
                parent_project_id: None,
            },
        )
        .await
        .expect("parent should be created");
        let child = create_project(
            &state,
            CreateProjectInput {
                space_slug: "default".to_owned(),
                name: "子项目".to_owned(),
                note: None,
                parent_project_id: Some(parent.id),
            },
        )
        .await
        .expect("child should be created");

        create_task(
            &state,
            CreateTaskInput {
                space_slug: "default".to_owned(),
                title: "父项目任务".to_owned(),
                note: None,
                priority: Some("high".to_owned()),
                project_id: Some(parent.id),
            },
        )
        .await
        .expect("parent task should be created");
        create_task(
            &state,
            CreateTaskInput {
                space_slug: "default".to_owned(),
                title: "子项目任务".to_owned(),
                note: None,
                priority: Some("high".to_owned()),
                project_id: Some(child.id),
            },
        )
        .await
        .expect("child task should be created");

        let tree = list_projects(
            &state,
            ListProjectsInput {
                space_slug: "default".to_owned(),
            },
        )
        .await
        .expect("project tree should be listed");
        assert_eq!(tree.projects.len(), 1);
        assert_eq!(tree.projects[0].children[0].id, child.id);

        let parent_view = get_project_execution_view(
            &state,
            GetProjectExecutionViewInput {
                space_slug: "default".to_owned(),
                project_id: parent.id,
            },
        )
        .await
        .expect("parent view should be returned");
        assert_eq!(parent_view.child_projects.len(), 1);
        assert_eq!(parent_view.tasks.len(), 1);
        assert_eq!(parent_view.tasks[0].title, "父项目任务");

        let child_view = get_project_execution_view(
            &state,
            GetProjectExecutionViewInput {
                space_slug: "default".to_owned(),
                project_id: child.id,
            },
        )
        .await
        .expect("child view should be returned");
        assert!(child_view.child_projects.is_empty());
        assert_eq!(child_view.tasks.len(), 1);
        assert_eq!(child_view.tasks[0].title, "子项目任务");
    });

    let _ = std::fs::remove_file(database_path);
}

#[test]
fn restore_subproject_requires_available_top_level_parent() {
    let database_path = test_database_path();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&database_path)
            .await
            .expect("database should be prepared");

        let parent = create_project(
            &state,
            CreateProjectInput {
                space_slug: "default".to_owned(),
                name: "父项目".to_owned(),
                note: None,
                parent_project_id: None,
            },
        )
        .await
        .expect("parent should be created");
        let child = create_project(
            &state,
            CreateProjectInput {
                space_slug: "default".to_owned(),
                name: "子项目".to_owned(),
                note: None,
                parent_project_id: Some(parent.id),
            },
        )
        .await
        .expect("child should be created");

        delete_project_to_trash(
            &state,
            DeleteProjectToTrashInput {
                space_slug: "default".to_owned(),
                project_id: child.id,
            },
        )
        .await
        .expect("child should be deleted");
        delete_project_to_trash(
            &state,
            DeleteProjectToTrashInput {
                space_slug: "default".to_owned(),
                project_id: parent.id,
            },
        )
        .await
        .expect("parent should be deleted without cascading child");
        let trash = list_trash_entries(
            &state,
            ListTrashEntriesInput {
                space_slug: "default".to_owned(),
            },
        )
        .await
        .expect("trash list should be returned");
        let child_trash_entry_id = trash
            .entries
            .iter()
            .find(|entry| entry.entity_id == child.id)
            .expect("child trash entry should exist")
            .id;

        let restore_error = restore_project_from_trash(
            &state,
            RestoreProjectFromTrashInput {
                space_slug: "default".to_owned(),
                trash_entry_id: child_trash_entry_id,
            },
        )
        .await
        .expect_err("child restore should fail while parent is deleted");
        assert!(restore_error.to_string().contains("not restorable"));

        let active_tree = list_projects(
            &state,
            ListProjectsInput {
                space_slug: "default".to_owned(),
            },
        )
        .await
        .expect("project tree should still be queryable");
        assert!(active_tree.projects.is_empty());

        let child_record = project::Entity::find_by_id(child.id)
            .one(&state.connection)
            .await
            .expect("child should be queryable")
            .expect("child should exist");
        assert_eq!(child_record.parent_project_id, Some(parent.id));
    });

    let _ = std::fs::remove_file(database_path);
}

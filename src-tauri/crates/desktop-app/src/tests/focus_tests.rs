//! Focus 视图测试。

use stoneflow_entity::task;

use crate::application::create::{create_project, create_task, CreateProjectInput, CreateTaskInput};
use crate::application::focus::{
    get_focus_view_tasks, list_focus_views, update_task_pin_state,
    GetFocusViewTasksInput, ListFocusViewsInput, UpdateTaskPinStateInput,
};
use crate::infrastructure::database::prepare_database_at_path;
use crate::tests::TestDatabaseDir;

#[test]
fn focus_views_lists_system_views_for_space() {
    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before listing focus views");

        let payload = list_focus_views(
            &state,
            ListFocusViewsInput {
                space_slug: "work".to_owned(),
            },
        )
        .await
        .expect("focus views should be listed");

        assert_eq!(payload.views.len(), 4);
        assert!(payload.views.iter().any(|v| v.key == "focus"));
        assert!(payload.views.iter().any(|v| v.key == "upcoming"));
        assert!(payload.views.iter().any(|v| v.key == "recent"));
        assert!(payload.views.iter().any(|v| v.key == "high_priority"));
    });
}

#[test]
fn focus_view_shows_pinned_tasks() {
    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before focus view query");

        let project = create_project(
            &state,
            CreateProjectInput {
                space_slug: "work".to_owned(),
                name: "执行层".to_owned(),
                note: None,
            parent_project_id: None,
},
        )
        .await
        .expect("project should be created");

        let pinned_task = create_task(
            &state,
            CreateTaskInput {
                space_slug: "work".to_owned(),
                title: "置顶任务".to_owned(),
                note: None,
                priority: Some("high".to_owned()),
                project_id: Some(project.id),
            status: None,
            },
        )
        .await
        .expect("pinned task should be created");

        update_task_pin_state(
            &state,
            UpdateTaskPinStateInput {
                space_slug: "work".to_owned(),
                task_id: pinned_task.id,
                pinned: true,
            },
        )
        .await
        .expect("task should be pinned");

        let regular_task = create_task(
            &state,
            CreateTaskInput {
                space_slug: "work".to_owned(),
                title: "普通任务".to_owned(),
                note: None,
                priority: Some("medium".to_owned()),
                project_id: Some(project.id),
            status: None,
            },
        )
        .await
        .expect("regular task should be created");

        let payload = get_focus_view_tasks(
            &state,
            GetFocusViewTasksInput {
                space_slug: "work".to_owned(),
                view_key: "focus".to_owned(),
            },
        )
        .await
        .expect("focus view tasks should be returned");

        assert_eq!(payload.tasks.len(), 1);
        assert_eq!(payload.tasks[0].id, pinned_task.id);
        assert_eq!(payload.tasks[0].title, "置顶任务");
    });
}

#[test]
fn high_priority_view_shows_high_and_urgent_tasks() {
    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before high priority query");

        let project = create_project(
            &state,
            CreateProjectInput {
                space_slug: "work".to_owned(),
                name: "执行层".to_owned(),
                note: None,
            parent_project_id: None,
},
        )
        .await
        .expect("project should be created");

        create_task(
            &state,
            CreateTaskInput {
                space_slug: "work".to_owned(),
                title: "高优先级".to_owned(),
                note: None,
                priority: Some("high".to_owned()),
                project_id: Some(project.id),
            status: None,
            },
        )
        .await
        .expect("high priority task should be created");

        create_task(
            &state,
            CreateTaskInput {
                space_slug: "work".to_owned(),
                title: "紧急任务".to_owned(),
                note: None,
                priority: Some("urgent".to_owned()),
                project_id: Some(project.id),
            status: None,
            },
        )
        .await
        .expect("urgent task should be created");

        create_task(
            &state,
            CreateTaskInput {
                space_slug: "work".to_owned(),
                title: "普通优先级".to_owned(),
                note: None,
                priority: Some("medium".to_owned()),
                project_id: Some(project.id),
            status: None,
            },
        )
        .await
        .expect("medium priority task should be created");

        let payload = get_focus_view_tasks(
            &state,
            GetFocusViewTasksInput {
                space_slug: "work".to_owned(),
                view_key: "high_priority".to_owned(),
            },
        )
        .await
        .expect("high priority view tasks should be returned");

        assert_eq!(payload.tasks.len(), 2);
    });
}

//! Inbox 整理相关测试。

use stoneflow_entity::task;

use crate::application::create::{create_project, create_task, CreateProjectInput, CreateTaskInput};
use crate::application::inbox::{
    list_inbox_tasks, triage_inbox_task, ListInboxTasksInput, TriageInboxTaskInput,
};
use crate::infrastructure::database::prepare_database_at_path;
use crate::tests::TestDatabaseDir;

#[test]
fn inbox_lists_todo_tasks_without_project_or_priority() {
    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before listing inbox");

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
                title: "纯 Inbox 任务".to_owned(),
                note: None,
                priority: None,
                project_id: None,
            status: None,
            },
        )
        .await
        .expect("inbox task should be created");

        create_task(
            &state,
            CreateTaskInput {
                space_slug: "work".to_owned(),
                title: "有优先级无项目".to_owned(),
                note: None,
                priority: Some("high".to_owned()),
                project_id: None,
            status: None,
            },
        )
        .await
        .expect("priority-only task should be created");

        create_task(
            &state,
            CreateTaskInput {
                space_slug: "work".to_owned(),
                title: "已分类任务".to_owned(),
                note: None,
                priority: Some("medium".to_owned()),
                project_id: Some(project.id),
            status: None,
            },
        )
        .await
        .expect("categorized task should be created");

        let payload = list_inbox_tasks(
            &state,
            ListInboxTasksInput {
                space_slug: "work".to_owned(),
            },
        )
        .await
        .expect("inbox should be listed");

        assert_eq!(payload.tasks.len(), 2);
        assert_eq!(payload.tasks[0].title, "有优先级无项目");
        assert_eq!(payload.tasks[1].title, "纯 Inbox 任务");
    });
}

#[test]
fn inbox_excludes_done_tasks() {
    use crate::application::project::{
        create_project, update_project_task_status, CreateProjectInput,
        UpdateProjectTaskStatusInput,
    };

    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before testing done exclusion");

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

        let inbox_task = create_task(
            &state,
            CreateTaskInput {
                space_slug: "work".to_owned(),
                title: "待整理任务".to_owned(),
                note: None,
                priority: None,
                project_id: None,
            status: None,
            },
        )
        .await
        .expect("inbox task should be created");

        let project_task = create_task(
            &state,
            CreateTaskInput {
                space_slug: "work".to_owned(),
                title: "有项目任务".to_owned(),
                note: None,
                priority: Some("low".to_owned()),
                project_id: Some(project.id),
            status: None,
            },
        )
        .await
        .expect("project task should be created");

        update_project_task_status(
            &state,
            UpdateProjectTaskStatusInput {
                space_slug: "work".to_owned(),
                project_id: project.id,
                task_id: project_task.id,
                status: "done".to_owned(),
            },
        )
        .await
        .expect("project task should be marked done");

        let payload = list_inbox_tasks(
            &state,
            ListInboxTasksInput {
                space_slug: "work".to_owned(),
            },
        )
        .await
        .expect("inbox should be listed");

        assert_eq!(payload.tasks.len(), 1);
        assert_eq!(payload.tasks[0].id, inbox_task.id);
    });
}

#[test]
fn triage_inbox_task_assigns_project_and_priority() {
    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before triage");

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

        let task = create_task(
            &state,
            CreateTaskInput {
                space_slug: "work".to_owned(),
                title: "待整理任务".to_owned(),
                note: None,
                priority: None,
                project_id: None,
            status: None,
            },
        )
        .await
        .expect("inbox task should be created");

        let payload = triage_inbox_task(
            &state,
            TriageInboxTaskInput {
                space_slug: "work".to_owned(),
                task_id: task.id,
                project_id: Some(project.id),
                priority: Some("high".to_owned()),
            },
        )
        .await
        .expect("inbox task should be triaged");

        assert_eq!(payload.task_id, task.id);
        assert_eq!(payload.project_id, Some(project.id));
        assert_eq!(payload.priority.as_deref(), Some("high"));

        let persisted_task = task::Entity::find_by_id(task.id)
            .one(&state.connection)
            .await
            .expect("task should be queryable")
            .expect("task should exist");

        assert_eq!(persisted_task.project_id, Some(project.id));
        assert_eq!(persisted_task.priority.as_deref(), Some("high"));
    });
}

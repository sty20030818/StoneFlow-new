//! Project 和 Task 执行视图测试。

use stoneflow_entity::{project, task};

use crate::application::create::{create_project, create_task, CreateProjectInput, CreateTaskInput};
use crate::application::project::{
    create_project as create_project_usecase,
    get_project_execution_view, list_projects,
    update_project_task_status, CreateProjectInput as ListInput,
    GetProjectExecutionViewInput, ListProjectsInput,
    UpdateProjectTaskStatusInput,
};
use crate::infrastructure::database::prepare_database_at_path;
use crate::tests::TestDatabaseDir;

#[test]
fn project_creation_with_optional_fields() {
    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before creating project");

        let payload = create_project(
            &state,
            CreateProjectInput {
                space_slug: "work".to_owned(),
                name: "  整理 M2-B  ".to_owned(),
                note: Some("  包含数据库与接口梳理  ".to_owned()),
            parent_project_id: None,
},
        )
        .await
        .expect("project should be created");

        let persisted_project = project::Entity::find_by_id(payload.id)
            .one(&state.connection)
            .await
            .expect("created project should be queryable")
            .expect("created project should exist");

        assert_eq!(persisted_project.name, "整理 M2-B");
        assert_eq!(
            persisted_project.note.as_deref(),
            Some("包含数据库与接口梳理")
        );
        assert_eq!(persisted_project.status, "active");
        assert!(persisted_project.parent_project_id.is_none());
        assert!(persisted_project.deleted_at.is_none());
    });
}

#[test]
fn project_list_returns_active_sorted_by_sort_order() {
    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before listing projects");

        create_project(
            &state,
            CreateProjectInput {
                space_slug: "work".to_owned(),
                name: "Alpha".to_owned(),
                note: None,
            parent_project_id: None,
},
        )
        .await
        .expect("first project should be created");

        create_project(
            &state,
            CreateProjectInput {
                space_slug: "work".to_owned(),
                name: "Beta".to_owned(),
                note: None,
            parent_project_id: None,
},
        )
        .await
        .expect("second project should be created");

        let payload = list_projects(
            &state,
            ListProjectsInput {
                space_slug: "work".to_owned(),
            },
        )
        .await
        .expect("projects should be listed");

        assert_eq!(payload.projects.len(), 2);
        assert!(payload.projects[0].sort_order < payload.projects[1].sort_order);
    });
}

#[test]
fn project_rejects_blank_name() {
    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before validation");

        let error = create_project(
            &state,
            CreateProjectInput {
                space_slug: "work".to_owned(),
                name: "   ".to_owned(),
                note: None,
            parent_project_id: None,
},
        )
        .await
        .expect_err("blank project name should be rejected");

        assert!(error.to_string().contains("project name cannot be empty"));
    });
}

#[test]
fn project_execution_view_filters_ready_tasks() {
    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before execution view");

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
                title: "已就绪任务".to_owned(),
                note: None,
                priority: Some("high".to_owned()),
                project_id: Some(project.id),
            },
        )
        .await
        .expect("ready task should be created");

        create_task(
            &state,
            CreateTaskInput {
                space_slug: "work".to_owned(),
                title: "未分类任务".to_owned(),
                note: None,
                priority: None,
                project_id: None,
            },
        )
        .await
        .expect("inbox task should be created");

        let payload = get_project_execution_view(
            &state,
            GetProjectExecutionViewInput {
                space_slug: "work".to_owned(),
                project_id: project.id,
            },
        )
        .await
        .expect("execution view should be returned");

        assert_eq!(payload.tasks.len(), 1);
        assert_eq!(payload.tasks[0].title, "已就绪任务");
    });
}

#[test]
fn update_project_task_status_toggles_completion() {
    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before status update");

        let project = create_project(
            &state,
            CreateProjectInput {
                space_slug: "work".to_owned(),
                name: "状态切换".to_owned(),
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
                title: "可切换任务".to_owned(),
                note: None,
                priority: Some("medium".to_owned()),
                project_id: Some(project.id),
            },
        )
        .await
        .expect("task should be created");

        let done_payload = update_project_task_status(
            &state,
            UpdateProjectTaskStatusInput {
                space_slug: "work".to_owned(),
                project_id: project.id,
                task_id: task.id,
                status: "done".to_owned(),
            },
        )
        .await
        .expect("task should be marked done");

        assert_eq!(done_payload.status, "done");
        assert!(done_payload.completed_at.is_some());

        let todo_payload = update_project_task_status(
            &state,
            UpdateProjectTaskStatusInput {
                space_slug: "work".to_owned(),
                project_id: project.id,
                task_id: task.id,
                status: "todo".to_owned(),
            },
        )
        .await
        .expect("task should be reverted to todo");

        assert_eq!(todo_payload.status, "todo");
        assert!(todo_payload.completed_at.is_none());
    });
}

#[test]
fn update_project_task_status_rejects_cross_space_task() {
    use crate::application::create::{create_space, CreateSpaceInput};
    use crate::application::inbox::triage_inbox_task;
    use crate::application::inbox::TriageInboxTaskInput;

    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before cross-space test");

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

        create_space(
            &state,
            CreateSpaceInput {
                name: "study".to_owned(),
            },
        )
        .await
        .expect("second space should be created");

        let foreign_project = create_project(
            &state,
            CreateProjectInput {
                space_slug: "study".to_owned(),
                name: "Foreign Project".to_owned(),
                note: None,
            parent_project_id: None,
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
                space_slug: "work".to_owned(),
                project_id: project.id,
                task_id: foreign_task.id,
                status: "done".to_owned(),
            },
        )
        .await
        .expect_err("cross-space task update should be rejected");

        assert!(error
            .to_string()
            .contains("does not belong to space `work`"));
    });
}

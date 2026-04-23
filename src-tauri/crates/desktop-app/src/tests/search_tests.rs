//! Search 搜索测试。

use crate::application::create::{create_project, create_task, CreateProjectInput, CreateTaskInput};
use crate::application::search::{search_workspace, SearchWorkspaceInput};
use crate::infrastructure::database::prepare_database_at_path;
use crate::tests::TestDatabaseDir;

#[test]
fn search_workspace_finds_tasks_and_projects_by_keyword() {
    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before search");

        let project = create_project(
            &state,
            CreateProjectInput {
                space_slug: "work".to_owned(),
                name: "M2-B 里程碑".to_owned(),
                note: Some("里程碑备注".to_owned()),
            parent_project_id: None,
},
        )
        .await
        .expect("project should be created");

        create_task(
            &state,
            CreateTaskInput {
                space_slug: "work".to_owned(),
                title: "M2-B 任务标题".to_owned(),
                note: Some("任务包含 M2-B 内容".to_owned()),
                priority: Some("high".to_owned()),
                project_id: Some(project.id),
            },
        )
        .await
        .expect("task should be created");

        create_task(
            &state,
            CreateTaskInput {
                space_slug: "work".to_owned(),
                title: "不相关的任务".to_owned(),
                note: None,
                priority: None,
                project_id: None,
            },
        )
        .await
        .expect("unrelated task should be created");

        let payload = search_workspace(
            &state,
            SearchWorkspaceInput {
                space_slug: "work".to_owned(),
                query: "M2-B".to_owned(),
                limit: 10,
            },
        )
        .await
        .expect("search should succeed");

        assert!(payload
            .projects
            .iter()
            .any(|p| p.name.contains("M2-B")));
        assert!(payload
            .tasks
            .iter()
            .any(|t| t.title.contains("M2-B")));
        assert!(!payload
            .tasks
            .iter()
            .any(|t| t.title == "不相关的任务"));
    });
}

#[test]
fn search_workspace_respects_limit() {
    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before limit test");

        for i in 0..5 {
            create_project(
                &state,
                CreateProjectInput {
                    space_slug: "work".to_owned(),
                    name: format!("测试项目 {}", i),
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
                    title: format!("测试任务 {}", i),
                    note: None,
                    priority: Some("medium".to_owned()),
                    project_id: None,
                },
            )
            .await
            .expect("task should be created");
        }

        let payload = search_workspace(
            &state,
            SearchWorkspaceInput {
                space_slug: "work".to_owned(),
                query: "测试".to_owned(),
                limit: 3,
            },
        )
        .await
        .expect("search should succeed");

        assert_eq!(payload.projects.len(), 3);
        assert_eq!(payload.tasks.len(), 3);
    });
}

//! Task Drawer 测试。

use stoneflow_entity::task;

use crate::application::create::{create_project, create_task, CreateProjectInput, CreateTaskInput};
use crate::application::inbox::triage_inbox_task;
use crate::application::inbox::TriageInboxTaskInput;
use crate::application::task_drawer::{
    get_task_drawer_detail, update_task_drawer_fields, UpdateTaskDrawerFieldsInput,
    GetTaskDrawerDetailInput,
};
use crate::infrastructure::database::prepare_database_at_path;
use crate::tests::TestDatabaseDir;

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
            parent_project_id: None,
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
            .expect("bootstrap should succeed before updating task drawer");

        let project = create_project(
            &state,
            CreateProjectInput {
                space_slug: "default".to_owned(),
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
                space_slug: "default".to_owned(),
                title: "Drawer 可编辑字段".to_owned(),
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
        .expect("task should be triaged");

        let updated = update_task_drawer_fields(
            &state,
            UpdateTaskDrawerFieldsInput {
                space_slug: "default".to_owned(),
                task_id: task.id,
                title: "  修正后的标题  ".to_owned(),
                note: Some("更新后的备注".to_owned()),
                priority: None,
                project_id: None,
                status: "todo".to_owned(),
            },
        )
        .await
        .expect("task drawer fields should be updated");

        assert_eq!(updated.task_id, task.id);

        let persisted_task = task::Entity::find_by_id(task.id)
            .one(&state.connection)
            .await
            .expect("task should be queryable")
            .expect("task should exist");

        assert_eq!(persisted_task.title, "修正后的标题");
        assert_eq!(persisted_task.note.as_deref(), Some("更新后的备注"));
        assert_eq!(persisted_task.priority, None);
        assert_eq!(persisted_task.project_id, None);
    });
}

#[test]
fn update_task_drawer_fields_sets_status_done_and_completed_at() {
    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before status update");

        let task = create_task(
            &state,
            CreateTaskInput {
                space_slug: "default".to_owned(),
                title: "完成任务".to_owned(),
                note: None,
                priority: Some("medium".to_owned()),
                project_id: None,
            },
        )
        .await
        .expect("task should be created");

        let updated = update_task_drawer_fields(
            &state,
            UpdateTaskDrawerFieldsInput {
                space_slug: "default".to_owned(),
                task_id: task.id,
                title: "已完成".to_owned(),
                note: None,
                priority: Some("medium".to_owned()),
                project_id: None,
                status: "done".to_owned(),
            },
        )
        .await
        .expect("task should be marked done");

        assert_eq!(updated.status, "done");
        assert!(updated.completed_at.is_some());

        let persisted_task = task::Entity::find_by_id(task.id)
            .one(&state.connection)
            .await
            .expect("task should be queryable")
            .expect("task should exist");

        assert_eq!(persisted_task.status, "done");
        assert!(persisted_task.completed_at.is_some());
    });
}

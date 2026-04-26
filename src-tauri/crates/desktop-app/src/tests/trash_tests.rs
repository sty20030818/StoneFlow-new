//! Trash 回收站测试。

use stoneflow_entity::{project, task, trash_entry};

use crate::application::create::{create_project, create_task, CreateProjectInput, CreateTaskInput};
use crate::application::project::create_project as create_project_usecase;
use crate::application::task_drawer::delete_task_to_trash;
use crate::application::task_drawer::DeleteTaskToTrashInput;
use crate::application::trash::{
    delete_project_to_trash, list_trash_entries, restore_project_from_trash,
    restore_task_from_trash, DeleteProjectToTrashInput, ListTrashEntriesInput,
    RestoreProjectFromTrashInput, RestoreTaskFromTrashInput,
};
use crate::infrastructure::database::prepare_database_at_path;
use crate::tests::TestDatabaseDir;

#[test]
fn duplicate_trash_entry_is_rejected_by_unique_constraint() {
    use sea_orm::{ActiveModelTrait, ActiveValue::Set};
    use serde_json::json;

    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before testing trash uniqueness");

        let space = stoneflow_entity::space::Entity::find()
            .filter(stoneflow_entity::space::Column::Slug.eq("work"))
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
fn delete_task_to_trash_writes_trash_entry_and_soft_deletes() {
    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before delete to trash");

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
                title: "待删除任务".to_owned(),
                note: None,
                priority: Some("high".to_owned()),
                project_id: Some(project.id),
            status: None,
            },
        )
        .await
        .expect("task should be created");

        let payload = delete_task_to_trash(
            &state,
            DeleteTaskToTrashInput {
                space_slug: "work".to_owned(),
                task_id: task.id,
            },
        )
        .await
        .expect("task should be deleted to trash");

        assert_eq!(payload.task_id, task.id);
        assert_eq!(payload.deleted_from, "task_drawer");

        let persisted_task = task::Entity::find_by_id(task.id)
            .one(&state.connection)
            .await
            .expect("task should be queryable")
            .expect("task should exist");

        assert!(persisted_task.deleted_at.is_some());

        let trash_count = trash_entry::Entity::find()
            .count(&state.connection)
            .await
            .expect("trash count should be queryable");

        assert_eq!(trash_count, 1);
    });
}

#[test]
fn restore_task_from_trash_recovers_to_original_project() {
    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before restore test");

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
                title: "可恢复任务".to_owned(),
                note: None,
                priority: Some("medium".to_owned()),
                project_id: Some(project.id),
            status: None,
            },
        )
        .await
        .expect("task should be created");

        let deleted = delete_task_to_trash(
            &state,
            DeleteTaskToTrashInput {
                space_slug: "work".to_owned(),
                task_id: task.id,
            },
        )
        .await
        .expect("task should be deleted");

        let trash_entries = list_trash_entries(
            &state,
            ListTrashEntriesInput {
                space_slug: "work".to_owned(),
            },
        )
        .await
        .expect("trash entries should be listed");

        let trash_entry = &trash_entries.entries[0];

        let restored = restore_task_from_trash(
            &state,
            RestoreTaskFromTrashInput {
                space_slug: "work".to_owned(),
                trash_entry_id: trash_entry.id,
            },
        )
        .await
        .expect("task should be restored");

        assert_eq!(restored.entity_type, "task");
        assert_eq!(restored.entity_id, task.id);

        let restored_task = task::Entity::find_by_id(task.id)
            .one(&state.connection)
            .await
            .expect("task should be queryable")
            .expect("task should exist");

        assert!(restored_task.deleted_at.is_none());
        assert_eq!(restored_task.project_id, Some(project.id));
    });
}

#[test]
fn delete_project_to_trash_soft_deletes_without_cascade() {
    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before project delete");

        let project = create_project(
            &state,
            CreateProjectInput {
                space_slug: "work".to_owned(),
                name: "可删除项目".to_owned(),
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
                title: "项目下的任务".to_owned(),
                note: None,
                priority: Some("low".to_owned()),
                project_id: Some(project.id),
            status: None,
            },
        )
        .await
        .expect("task should be created");

        let payload = delete_project_to_trash(
            &state,
            DeleteProjectToTrashInput {
                space_slug: "work".to_owned(),
                project_id: project.id,
            },
        )
        .await
        .expect("project should be deleted to trash");

        assert_eq!(payload.project_id, project.id);

        let deleted_project = project::Entity::find_by_id(project.id)
            .one(&state.connection)
            .await
            .expect("project should be queryable")
            .expect("project should exist");

        assert!(deleted_project.deleted_at.is_some());

        let related_task = task::Entity::find_by_id(task.id)
            .one(&state.connection)
            .await
            .expect("task should be queryable")
            .expect("task should exist");

        assert!(related_task.deleted_at.is_none());
        assert_eq!(related_task.project_id, Some(project.id));
    });
}

//! Resource 相关测试。

use stoneflow_entity::resource;

use crate::application::create::{create_task, CreateTaskInput};
use crate::application::resource::{
    create_task_resource, delete_task_resource, list_task_resources,
    resolve_open_target, CreateTaskResourceInput, DeleteTaskResourceInput,
    ListTaskResourcesInput, ResourceOpenTarget, RESOURCE_TYPE_DOC_LINK,
    RESOURCE_TYPE_LOCAL_FILE, RESOURCE_TYPE_LOCAL_FOLDER,
};
use crate::infrastructure::database::prepare_database_at_path;
use crate::tests::TestDatabaseDir;

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
                space_slug: "work".to_owned(),
                title: "挂载 M3-C 资源".to_owned(),
                note: None,
                priority: None,
                project_id: None,
            },
        )
        .await
        .expect("task should be created before resources");

        let local_root = temp_dir.root().join("resource-fixtures");
        let local_folder = local_root.join("folder");
        let local_file = local_root.join("brief.md");
        std::fs::create_dir_all(&local_folder).expect("folder fixture should be created");
        std::fs::write(&local_file, "M3-C").expect("file fixture should be created");

        create_task_resource(
            &state,
            CreateTaskResourceInput {
                space_slug: "work".to_owned(),
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
                space_slug: "work".to_owned(),
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
                space_slug: "work".to_owned(),
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
                space_slug: "work".to_owned(),
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
    use crate::application::create::{create_space, CreateSpaceInput};

    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before validation tests");

        let task = create_task(
            &state,
            CreateTaskInput {
                space_slug: "work".to_owned(),
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
                space_slug: "work".to_owned(),
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
    use stoneflow_entity::trash_entry;

    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before delete test");

        let task = create_task(
            &state,
            CreateTaskInput {
                space_slug: "work".to_owned(),
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
                space_slug: "work".to_owned(),
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
                space_slug: "work".to_owned(),
                resource_id: created.resource.id,
            },
        )
        .await
        .expect("resource should be deleted");

        let resources = list_task_resources(
            &state,
            ListTaskResourcesInput {
                space_slug: "work".to_owned(),
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
    use serde_json::json;

    let temp_dir = TestDatabaseDir::new();
    let local_file = temp_dir.root().join("open-target.md");
    std::fs::create_dir_all(temp_dir.root()).expect("fixture root should be created");
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
        ResourceOpenTarget::FilePath(local_file)
    );
    assert!(resolve_open_target(&invalid_resource).is_err());
}

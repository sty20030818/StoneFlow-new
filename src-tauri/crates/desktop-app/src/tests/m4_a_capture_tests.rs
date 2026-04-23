//! M4-A 捕获底座与当前 Space 状态测试。

use std::path::PathBuf;

use sea_orm::{ActiveModelTrait, ActiveValue::Set, ColumnTrait, EntityTrait, QueryFilter};
use stoneflow_entity::{space, task};
use uuid::Uuid;

use crate::application::create::{
    create_capture_task, create_space, set_active_space, ActiveSpaceState, CaptureTaskInput,
    CreateSpaceInput, SetActiveSpaceInput,
};
use crate::infrastructure::database::prepare_database_at_path;

struct TestDatabaseDir {
    root: PathBuf,
}

impl TestDatabaseDir {
    fn new() -> Self {
        let root =
            std::env::temp_dir().join(format!("stoneflow-m4-a-test-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&root).expect("test dir should be created");
        Self { root }
    }

    fn database_path(&self) -> PathBuf {
        self.root.join("app.db")
    }
}

impl Drop for TestDatabaseDir {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.root);
    }
}

#[test]
fn create_capture_task_uses_active_space_when_available() {
    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before capture test");
        let active_space_state = ActiveSpaceState::default();

        let other_space = create_space(
            &state,
            CreateSpaceInput {
                name: "Capture Space".to_owned(),
            },
        )
        .await
        .expect("capture space should be created");

        set_active_space(
            &state,
            &active_space_state,
            SetActiveSpaceInput {
                space_slug: other_space.slug.clone(),
            },
        )
        .await
        .expect("active space should be written");

        let payload = create_capture_task(
            &state,
            &active_space_state,
            CaptureTaskInput {
                title: " 从系统入口捕获 ".to_owned(),
                note: None,
                priority: None,
            },
        )
        .await
        .expect("capture task should be created");

        let persisted_task = task::Entity::find_by_id(payload.id)
            .one(&state.connection)
            .await
            .expect("created capture task should be queryable")
            .expect("created capture task should exist");

        assert_eq!(payload.space_id, other_space.id);
        assert_eq!(payload.title, "从系统入口捕获");
        assert_eq!(persisted_task.space_id, other_space.id);
        assert_eq!(persisted_task.project_id, None);
        assert_eq!(persisted_task.status, "todo");
        assert_eq!(persisted_task.source, "quick_capture");
        assert!(!payload.space_fallback);
    });
}

#[test]
fn create_capture_task_falls_back_to_default_space_when_active_space_missing() {
    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before capture fallback test");
        let active_space_state = ActiveSpaceState::default();

        let default_space = space::Entity::find()
            .filter(space::Column::Slug.eq("work"))
            .one(&state.connection)
            .await
            .expect("default space should be queryable")
            .expect("default space should exist");

        let payload = create_capture_task(
            &state,
            &active_space_state,
            CaptureTaskInput {
                title: "没有当前 Space 时回退".to_owned(),
                note: None,
                priority: None,
            },
        )
        .await
        .expect("capture task should fall back to default space");

        assert_eq!(payload.space_id, default_space.id);
        assert_eq!(payload.source, "quick_capture");
        assert!(payload.space_fallback);
    });
}

#[test]
fn create_capture_task_falls_back_to_default_space_when_active_space_invalid() {
    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before invalid active space test");
        let active_space_state = ActiveSpaceState::default();

        active_space_state
            .set(Uuid::new_v4())
            .expect("test should write invalid active space id");

        let payload = create_capture_task(
            &state,
            &active_space_state,
            CaptureTaskInput {
                title: "无效当前 Space 时回退".to_owned(),
                note: None,
                priority: None,
            },
        )
        .await
        .expect("capture task should fall back to default space");

        assert!(payload.space_fallback);
    });
}

#[test]
fn create_capture_task_rejects_when_default_space_unavailable() {
    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before default space unavailable test");
        let active_space_state = ActiveSpaceState::default();

        let default_space = space::Entity::find()
            .filter(space::Column::Slug.eq("work"))
            .one(&state.connection)
            .await
            .expect("default space should be queryable")
            .expect("default space should exist");
        let mut active_model: space::ActiveModel = default_space.into();
        active_model.is_archived = Set(true);
        active_model
            .update(&state.connection)
            .await
            .expect("default space should be archived for test");

        let error = create_capture_task(
            &state,
            &active_space_state,
            CaptureTaskInput {
                title: "默认 Space 不可用".to_owned(),
                note: None,
                priority: None,
            },
        )
        .await
        .expect_err("archived default space should reject capture");

        assert!(error
            .to_string()
            .contains("default space `work` is archived"));
    });
}

#[test]
fn create_capture_task_rejects_blank_title() {
    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before capture validation test");
        let active_space_state = ActiveSpaceState::default();

        let error = create_capture_task(
            &state,
            &active_space_state,
            CaptureTaskInput {
                title: "   ".to_owned(),
                note: None,
                priority: None,
            },
        )
        .await
        .expect_err("blank title should be rejected");

        assert!(error.to_string().contains("task title cannot be empty"));
    });
}

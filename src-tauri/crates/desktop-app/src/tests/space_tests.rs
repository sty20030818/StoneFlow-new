//! Space 和数据库基础设施测试。

use stoneflow_entity::{focus_view, space};

use crate::infrastructure::database::prepare_database_at_path;
use crate::tests::TestDatabaseDir;

#[test]
fn empty_database_bootstrap_creates_system_spaces() {
    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("empty database bootstrap should succeed");

        let space_count = space::Entity::find()
            .count(&state.connection)
            .await
            .expect("space count should be queryable");

        let focus_view_count = focus_view::Entity::find()
            .count(&state.connection)
            .await
            .expect("focus view count should be queryable");

        for slug in ["work", "studio", "life"] {
            let exists = space::Entity::find()
                .filter(space::Column::Slug.eq(slug))
                .one(&state.connection)
                .await
                .expect("system space should be queryable")
                .is_some();

            assert!(exists, "system space `{slug}` should exist");
        }

        assert!(state.is_ready);
        assert_eq!(space_count, 3);
        assert_eq!(focus_view_count, 12);
    });
}

#[test]
fn repeated_bootstrap_keeps_seed_idempotent() {
    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("first bootstrap should succeed");

        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("second bootstrap should succeed");

        let space_count = space::Entity::find()
            .count(&state.connection)
            .await
            .expect("space count should remain queryable");

        let focus_view_count = focus_view::Entity::find()
            .count(&state.connection)
            .await
            .expect("focus view count should remain queryable");

        assert_eq!(space_count, 3);
        assert_eq!(focus_view_count, 12);
    });
}

#[test]
fn bootstrap_migrates_legacy_default_slug_to_work() {
    use sea_orm::{ActiveModelTrait, ActiveValue::Set};

    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before simulating legacy slug");

        let work_space = space::Entity::find()
            .filter(space::Column::Slug.eq("work"))
            .one(&state.connection)
            .await
            .expect("work space should be queryable")
            .expect("work space should exist");
        let work_space_id = work_space.id;
        let mut active_model: space::ActiveModel = work_space.into();
        active_model.slug = Set("default".to_owned());
        active_model.name = Set("旧工作".to_owned());
        active_model
            .update(&state.connection)
            .await
            .expect("legacy slug simulation should persist");

        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should migrate legacy default slug");

        let migrated_space = space::Entity::find()
            .filter(space::Column::Slug.eq("work"))
            .one(&state.connection)
            .await
            .expect("migrated space should be queryable")
            .expect("migrated space should exist");
        let legacy_space = space::Entity::find()
            .filter(space::Column::Slug.eq("default"))
            .one(&state.connection)
            .await
            .expect("legacy space should be queryable");

        assert_eq!(migrated_space.id, work_space_id);
        assert_eq!(migrated_space.name, "工作");
        assert!(legacy_space.is_none());
    });
}

#[test]
fn rerunning_migrator_on_existing_schema_is_safe() {
    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before rerunning migrator");

        stoneflow_migration::Migrator::up(&state.connection, None)
            .await
            .expect("rerunning migrator on existing schema should succeed");
    });
}

#[test]
fn duplicate_focus_view_key_is_rejected_by_unique_constraint() {
    use sea_orm::{ActiveModelTrait, ActiveValue::Set};
    use serde_json::json;

    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before testing unique focus view key");

        let default_space = space::Entity::find()
            .filter(space::Column::Slug.eq("work"))
            .one(&state.connection)
            .await
            .expect("default space should be queryable")
            .expect("default space should exist");

        let insert_result = focus_view::ActiveModel {
            id: Set(uuid::Uuid::new_v4()),
            space_id: Set(default_space.id),
            name: Set("重复 Focus".to_owned()),
            key: Set("focus".to_owned()),
            r#type: Set("system".to_owned()),
            filter_config: Set(json!({})),
            sort_config: Set(json!({})),
            group_config: Set(json!({})),
            sort_order: Set(99),
            is_enabled: Set(true),
            created_at: Set(chrono::Utc::now()),
            updated_at: Set(chrono::Utc::now()),
        }
        .insert(&state.connection)
        .await;

        assert!(insert_result.is_err());
    });
}

#[test]
fn create_space_with_slug_generation_and_system_focus_views() {
    use crate::application::create::{create_space, CreateSpaceInput};
    use crate::infrastructure::database::DatabaseState;

    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before creating space");

        let payload = create_space(
            &state,
            CreateSpaceInput {
                name: "  我的学习空间  ".to_owned(),
            },
        )
        .await
        .expect("space should be created");

        let persisted_space = space::Entity::find_by_id(payload.id)
            .one(&state.connection)
            .await
            .expect("created space should be queryable")
            .expect("created space should exist");

        let focus_view_count = focus_view::Entity::find()
            .filter(focus_view::Column::SpaceId.eq(payload.id))
            .count(&state.connection)
            .await
            .expect("focus view count should be queryable");

        assert_eq!(persisted_space.name, "我的学习空间");
        assert_eq!(persisted_space.slug, "wo-de-xue-xi-kong-jian");
        assert!(persisted_space.sort_order >= 0);
        assert!(!persisted_space.is_archived);
        assert_eq!(focus_view_count, 4);
    });
}

#[test]
fn create_space_rejects_duplicate_slug() {
    use crate::application::create::{create_space, CreateSpaceInput};

    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before testing duplicate");

        create_space(
            &state,
            CreateSpaceInput {
                name: "Study".to_owned(),
            },
        )
        .await
        .expect("first space should be created");

        let error = create_space(
            &state,
            CreateSpaceInput {
                name: "study".to_owned(),
            },
        )
        .await
        .expect_err("duplicate slug should be rejected");

        assert!(error.to_string().contains("slug `study` already exists"));
    });
}

#[test]
fn create_space_rejects_empty_name() {
    use crate::application::create::{create_space, CreateSpaceInput};

    let temp_dir = TestDatabaseDir::new();

    tauri::async_runtime::block_on(async {
        let state = prepare_database_at_path(&temp_dir.database_path())
            .await
            .expect("bootstrap should succeed before validation");

        let error = create_space(
            &state,
            CreateSpaceInput {
                name: "   ".to_owned(),
            },
        )
        .await
        .expect_err("empty name should be rejected");

        assert!(error.to_string().contains("space name cannot be empty"));
    });
}

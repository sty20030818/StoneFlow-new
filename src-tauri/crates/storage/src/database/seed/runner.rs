//! Seed 运行入口：负责幂等编排，不承载业务 CRUD。

use sea_orm::{ActiveValue::Set, DatabaseConnection, TransactionTrait};
use serde_json::Value;
use stoneflow_schema::{setting, space, view};

use crate::error::StorageError;
use stoneflow_domain::{create_id, now_utc};

use super::{
    defaults::{default_settings, default_space, default_views},
    store,
};

const MULTIPLE_DEFAULT_SPACES_ERROR: &str = "数据库存在多个活跃默认 Space，无法继续初始化";
const SIDEBAR_PREFERENCE_SETTING_KEY: &str = "app.sidebar.preferences";
const LEGACY_SIDEBAR_SETTING_KEY: &str = "app.sidebar";
const UI_PREFERENCE_SETTING_KEY: &str = "app.ui.preferences";
const LEGACY_UI_SETTING_KEY: &str = "app.ui";

/// 返回多个默认 Space 的统一初始化错误。
pub fn multiple_default_spaces_error() -> StorageError {
    StorageError::initialization(MULTIPLE_DEFAULT_SPACES_ERROR)
}

/// 执行阶段 1 默认 Seed。
pub async fn run_seed(connection: &DatabaseConnection) -> Result<(), StorageError> {
    if store::count_active_default_spaces(connection).await? > 1 {
        return Err(multiple_default_spaces_error());
    }

    let transaction = connection.begin().await?;

    ensure_default_space(&transaction).await?;
    ensure_system_views(&transaction).await?;
    ensure_settings(&transaction).await?;

    transaction.commit().await?;
    Ok(())
}

async fn ensure_default_space<C>(connection: &C) -> Result<(), StorageError>
where
    C: sea_orm::ConnectionTrait,
{
    if store::count_active_default_spaces(connection).await? > 0 {
        return Ok(());
    }

    let now = timestamp_now();
    let seed = default_space();
    store::insert_default_space(
        connection,
        space::ActiveModel {
            id: Set(create_id().to_string()),
            name: Set(seed.name.to_owned()),
            icon_key: Set(seed.icon_key.to_owned()),
            color_key: Set(seed.color_key.to_owned()),
            is_default: Set(seed.is_default),
            sort_order: Set(seed.sort_order),
            archived_at: Set(None),
            deleted_at: Set(None),
            created_at: Set(now.clone()),
            updated_at: Set(now),
        },
    )
    .await?;

    Ok(())
}

async fn ensure_system_views<C>(connection: &C) -> Result<(), StorageError>
where
    C: sea_orm::ConnectionTrait,
{
    for seed in default_views() {
        if store::system_view_exists(connection, seed.entity_type, seed.key).await? {
            continue;
        }

        let now = timestamp_now();
        store::insert_system_view(
            connection,
            view::ActiveModel {
                id: Set(create_id().to_string()),
                name: Set(seed.name.to_owned()),
                description: Set(None),
                r#type: Set(stoneflow_schema::common::ViewKind::System),
                entity_type: Set(seed.entity_type),
                key: Set(Some(seed.key.to_owned())),
                filters: Set(json_string(&seed.filters)?),
                sort: Set(json_string(&seed.sort)?),
                group_by: Set(seed.group_by.map(str::to_owned)),
                is_visible: Set(seed.is_visible),
                sort_order: Set(seed.sort_order),
                created_at: Set(now.clone()),
                updated_at: Set(now),
            },
        )
        .await?;
    }

    Ok(())
}

async fn ensure_settings<C>(connection: &C) -> Result<(), StorageError>
where
    C: sea_orm::ConnectionTrait,
{
    migrate_legacy_settings(connection).await?;

    for seed in default_settings() {
        if store::setting_exists(connection, seed.key).await? {
            continue;
        }

        let now = timestamp_now();
        store::insert_setting(
            connection,
            setting::ActiveModel {
                key: Set(seed.key.to_owned()),
                value: Set(json_string(&seed.value)?),
                created_at: Set(now.clone()),
                updated_at: Set(now),
            },
        )
        .await?;
    }

    Ok(())
}

async fn migrate_legacy_settings<C>(connection: &C) -> Result<(), StorageError>
where
    C: sea_orm::ConnectionTrait,
{
    if !store::setting_exists(connection, SIDEBAR_PREFERENCE_SETTING_KEY).await? {
        if let Some(raw_sidebar) = store::get_setting_value(connection, LEGACY_SIDEBAR_SETTING_KEY).await? {
            if let Some(next_sidebar_preferences) = extract_sidebar_preferences_from_legacy_json(&raw_sidebar)? {
                insert_setting_json(connection, SIDEBAR_PREFERENCE_SETTING_KEY, &next_sidebar_preferences)
                    .await?;
            }
        }
    }

    if !store::setting_exists(connection, UI_PREFERENCE_SETTING_KEY).await? {
        if let Some(raw_ui) = store::get_setting_value(connection, LEGACY_UI_SETTING_KEY).await? {
            if let Some(next_ui_preferences) = extract_ui_preferences_from_legacy_json(&raw_ui)? {
                insert_setting_json(connection, UI_PREFERENCE_SETTING_KEY, &next_ui_preferences).await?;
            }
        }
    }

    Ok(())
}

async fn insert_setting_json<C>(connection: &C, key: &str, value: &Value) -> Result<(), StorageError>
where
    C: sea_orm::ConnectionTrait,
{
    let now = timestamp_now();
    store::insert_setting(
        connection,
        setting::ActiveModel {
            key: Set(key.to_owned()),
            value: Set(json_string(value)?),
            created_at: Set(now.clone()),
            updated_at: Set(now),
        },
    )
    .await?;

    Ok(())
}

fn extract_sidebar_preferences_from_legacy_json(raw: &str) -> Result<Option<Value>, StorageError> {
    let legacy = serde_json::from_str::<Value>(raw).map_err(|error| {
        StorageError::initialization(format!("legacy app.sidebar 反序列化失败: {error}"))
    })?;

    let Some(main_items) = legacy.get("mainItems").cloned() else {
        return Ok(None);
    };
    let Some(project_section) = legacy.get("projectSection") else {
        return Ok(None);
    };
    let Some(footer_items) = legacy.get("footerItems").cloned() else {
        return Ok(None);
    };

    Ok(Some(serde_json::json!({
        "mainItems": main_items,
        "projectSection": {
            "visible": project_section.get("visible").cloned().unwrap_or(serde_json::json!(true)),
            "order": project_section.get("order").cloned().unwrap_or(serde_json::json!(500)),
            "showCounts": project_section.get("showCounts").cloned().unwrap_or(serde_json::json!(true)),
            "showCompleted": project_section.get("showCompleted").cloned().unwrap_or(serde_json::json!(true))
        },
        "footerItems": footer_items
    })))
}

fn extract_ui_preferences_from_legacy_json(raw: &str) -> Result<Option<Value>, StorageError> {
    let legacy = serde_json::from_str::<Value>(raw)
        .map_err(|error| StorageError::initialization(format!("legacy app.ui 反序列化失败: {error}")))?;

    Ok(Some(serde_json::json!({
        "theme": legacy.get("theme").cloned().unwrap_or(serde_json::json!("system")),
        "density": legacy.get("density").cloned().unwrap_or(serde_json::json!("comfortable"))
    })))
}

fn timestamp_now() -> String {
    now_utc().to_rfc3339()
}

fn json_string(value: &Value) -> Result<String, StorageError> {
    serde_json::to_string(value)
        .map_err(|error| StorageError::initialization(format!("默认 JSON 序列化失败: {error}")))
}

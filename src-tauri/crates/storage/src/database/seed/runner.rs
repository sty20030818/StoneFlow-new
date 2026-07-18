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

fn timestamp_now() -> String {
    now_utc().to_rfc3339()
}

fn json_string(value: &Value) -> Result<String, StorageError> {
    serde_json::to_string(value)
        .map_err(|error| StorageError::initialization(format!("默认 JSON 序列化失败: {error}")))
}

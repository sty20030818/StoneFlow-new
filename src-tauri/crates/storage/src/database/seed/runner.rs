//! Seed 运行入口：只创建默认 Space。

use crate::entities::space;
use sea_orm::{ActiveValue::Set, DatabaseConnection, TransactionTrait};

use crate::error::StorageError;

use super::{
    defaults::{default_space_seed, seed_timestamp},
    store,
};

const MULTIPLE_DEFAULT_SPACES_ERROR: &str = "数据库存在多个活跃默认 Space，无法继续初始化";

/// 返回多个默认 Space 的统一初始化错误。
pub fn multiple_default_spaces_error() -> StorageError {
    StorageError::initialization(MULTIPLE_DEFAULT_SPACES_ERROR)
}

/// 执行 R2 默认 Seed（仅默认 Space）。
pub async fn run_seed(connection: &DatabaseConnection) -> Result<(), StorageError> {
    if store::count_active_default_spaces(connection).await? > 1 {
        return Err(multiple_default_spaces_error());
    }

    let transaction = connection.begin().await?;
    ensure_default_space(&transaction).await?;
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

    let now = seed_timestamp();
    let seed = default_space_seed();
    store::insert_default_space(
        connection,
        space::ActiveModel {
            id: Set(seed.id),
            name: Set(seed.name.to_owned()),
            icon_key: Set(seed.icon_key.to_owned()),
            color_key: Set(seed.color_key.to_owned()),
            is_default: Set(true),
            position: Set(seed.position),
            generation: Set(1),
            archived_at: Set(None),
            deleted_at: Set(None),
            created_at: Set(now.clone()),
            updated_at: Set(now),
        },
    )
    .await?;

    Ok(())
}

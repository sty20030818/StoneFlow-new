//! 数据库初始化阶段的幂等 seed 逻辑。

use anyhow::Result;
use sea_orm::DatabaseConnection;
use stoneflow_core::{default_space_seed, system_focus_view_definitions};

use crate::infrastructure::repositories::{FocusViewRepository, SpaceRepository};

/// 执行最小幂等 seed，保证默认 Space 与系统 FocusView 存在。
pub(crate) async fn run_seed(connection: &DatabaseConnection) -> Result<()> {
    let space_repository = SpaceRepository::new(connection);
    let focus_view_repository = FocusViewRepository::new(connection);

    let default_space = space_repository.ensure_space(&default_space_seed()).await?;

    for definition in system_focus_view_definitions() {
        focus_view_repository
            .upsert_system_view(default_space.id, &definition)
            .await?;
    }

    Ok(())
}

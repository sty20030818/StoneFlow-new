//! Seed 默认值。

use stoneflow_domain::{create_id, now_utc, POSITION_STEP};

/// 默认 Space 种子。
pub struct DefaultSpaceSeed {
    pub id: String,
    pub name: &'static str,
    pub icon_key: &'static str,
    pub color_key: &'static str,
    pub position: i64,
}

pub fn default_space_seed() -> DefaultSpaceSeed {
    DefaultSpaceSeed {
        id: create_id().to_string(),
        name: "个人",
        icon_key: "home",
        color_key: "blue",
        position: POSITION_STEP,
    }
}

pub fn seed_timestamp() -> String {
    now_utc().to_rfc3339()
}

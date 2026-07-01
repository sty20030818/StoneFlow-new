//! 云同步配置持久化。

use stoneflow_domain::now_utc;
use stoneflow_storage::{database::DatabaseRuntimeState, repositories::SettingsRepository};

use crate::app::error::AppError;

use super::{
    policy::SyncPolicy,
    types::{SyncPolicySetting, SyncRemoteConfig, SyncRemoteConfigSetting},
};

pub const SYNC_CONFIG_SETTING_KEY: &str = "app.sync.config";
pub const SYNC_POLICY_SETTING_KEY: &str = "app.sync.policy";

/// 从 settings 表读取同步远端配置。
pub async fn load_remote_config(
    database: &DatabaseRuntimeState,
) -> Result<Option<SyncRemoteConfig>, AppError> {
    let repository = SettingsRepository::new(database.connection().clone());
    let stored = repository
        .find_json_setting::<SyncRemoteConfigSetting>(SYNC_CONFIG_SETTING_KEY)
        .await?;

    Ok(stored.and_then(normalize_setting))
}

/// 从 settings 表读取同步策略；缺省值是 15 分钟自动同步。
pub async fn load_sync_policy(
    database: &DatabaseRuntimeState,
) -> Result<(SyncPolicy, Option<String>), AppError> {
    let repository = SettingsRepository::new(database.connection().clone());
    let stored = repository
        .find_json_setting::<SyncPolicySetting>(SYNC_POLICY_SETTING_KEY)
        .await?;
    let Some(setting) = stored else {
        return Ok((SyncPolicy::default(), None));
    };

    let policy = SyncPolicy {
        mode: setting.mode.unwrap_or(SyncPolicy::default().mode),
        interval_minutes: setting
            .interval_minutes
            .unwrap_or(SyncPolicy::default().interval_minutes),
    }
    .validated()?;

    Ok((policy, setting.next_sync_at))
}

/// 写入并返回标准化后的同步策略。
pub async fn save_sync_policy(
    database: &DatabaseRuntimeState,
    policy: SyncPolicy,
    next_sync_at: Option<String>,
) -> Result<SyncPolicy, AppError> {
    let policy = policy.validated()?;
    let repository = SettingsRepository::new(database.connection().clone());
    let updated_at = now_utc().to_rfc3339();

    repository
        .set_json_setting(
            SYNC_POLICY_SETTING_KEY,
            &SyncPolicySetting {
                mode: Some(policy.mode),
                interval_minutes: Some(policy.interval_minutes),
                next_sync_at,
            },
            &updated_at,
        )
        .await?;

    Ok(policy)
}

/// 写入并返回标准化后的同步远端配置。
pub async fn save_remote_config(
    database: &DatabaseRuntimeState,
    url: String,
    token: String,
) -> Result<SyncRemoteConfig, AppError> {
    let config = normalize_fields(Some(url), Some(token))
        .ok_or_else(|| AppError::validation("请先填写完整的 Turso url 和 token"))?;
    let repository = SettingsRepository::new(database.connection().clone());
    let updated_at = now_utc().to_rfc3339();

    repository
        .set_json_setting(
            SYNC_CONFIG_SETTING_KEY,
            &SyncRemoteConfigSetting {
                url: Some(config.url.clone()),
                token: Some(config.token.clone()),
            },
            &updated_at,
        )
        .await?;

    Ok(config)
}

fn normalize_setting(setting: SyncRemoteConfigSetting) -> Option<SyncRemoteConfig> {
    normalize_fields(setting.url, setting.token)
}

fn normalize_fields(url: Option<String>, token: Option<String>) -> Option<SyncRemoteConfig> {
    let normalized_url = url?.trim().to_owned();
    let normalized_token = token?.trim().to_owned();

    if normalized_url.is_empty() || normalized_token.is_empty() {
        return None;
    }

    Some(SyncRemoteConfig {
        url: normalized_url,
        token: normalized_token,
    })
}

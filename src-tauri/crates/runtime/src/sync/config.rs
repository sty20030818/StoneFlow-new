//! 云同步配置持久化。

use stoneflow_domain::now_utc;
#[cfg(not(debug_assertions))]
use stoneflow_platform::SyncTokenStore;
use stoneflow_storage::{database::DatabaseRuntimeState, repositories::SettingsRepository};

use crate::app::error::AppError;

use super::{
    policy::SyncPolicy,
    types::{SyncConfigSource, SyncPolicySetting, SyncRemoteConfig},
};

pub const SYNC_POLICY_SETTING_KEY: &str = "app.sync.policy";
#[cfg(debug_assertions)]
const DEV_SYNC_DATABASE_URL_ENV: &str = "STONEFLOW_SYNC_DATABASE_URL";

/// Debug 仅从 `.env.local` 读取；正式版仅从系统钥匙串读取。
pub async fn load_remote_config() -> Result<Option<SyncRemoteConfig>, AppError> {
    let Some(database_url) = read_sync_secret().await?.and_then(normalize_database_url) else {
        return Ok(None);
    };
    if !looks_like_postgres_url(&database_url) {
        return Ok(None);
    }
    Ok(Some(SyncRemoteConfig { database_url }))
}

#[cfg(debug_assertions)]
pub const fn sync_config_source() -> SyncConfigSource {
    SyncConfigSource::Environment
}

#[cfg(not(debug_assertions))]
pub const fn sync_config_source() -> SyncConfigSource {
    SyncConfigSource::SystemKeychain
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

/// 开发构建只从环境变量读取，禁止 UI 写入任何凭据存储。
#[cfg(debug_assertions)]
pub async fn save_remote_config(_database_url: String) -> Result<SyncRemoteConfig, AppError> {
    Err(AppError::validation(
        "开发模式不保存同步连接串，请在项目根目录 .env.local 设置 STONEFLOW_SYNC_DATABASE_URL",
    ))
}

/// 写入并返回标准化后的云端副本配置。
#[cfg(not(debug_assertions))]
pub async fn save_remote_config(database_url: String) -> Result<SyncRemoteConfig, AppError> {
    let database_url = normalize_database_url(database_url)
        .ok_or_else(|| AppError::validation("请填写有效的同步数据库连接串"))?;
    if !looks_like_postgres_url(&database_url) {
        return Err(AppError::validation(
            "连接串应以 postgresql:// 或 postgres:// 开头（Neon / 自建 Postgres）",
        ));
    }

    write_sync_secret(database_url.clone()).await?;
    Ok(SyncRemoteConfig { database_url })
}

pub(super) fn normalize_database_url(url: impl Into<String>) -> Option<String> {
    // 去掉首尾空白与粘贴时常见的换行/零宽字符，避免「看起来对但校验失败」。
    let url = url
        .into()
        .trim()
        .trim_matches(|c: char| c == '\u{feff}' || c == '\u{200b}')
        .lines()
        .map(str::trim)
        .find(|line| !line.is_empty() && !line.starts_with('#'))
        .unwrap_or("")
        .to_owned();
    (!url.is_empty()).then_some(url)
}

fn looks_like_postgres_url(url: &str) -> bool {
    let lower = url.to_ascii_lowercase();
    lower.starts_with("postgresql://") || lower.starts_with("postgres://")
}

/// 日志与 UI 展示：去掉用户密码。
pub fn redact_database_url(url: &str) -> String {
    // postgresql://user:pass@host:port/db → postgresql://user:***@host:port/db
    if let Some(scheme_end) = url.find("://") {
        let scheme = &url[..scheme_end + 3];
        let rest = &url[scheme_end + 3..];
        if let Some(at) = rest.rfind('@') {
            let userinfo = &rest[..at];
            let host_and_path = &rest[at + 1..];
            let user = userinfo.split(':').next().unwrap_or(userinfo);
            return format!("{scheme}{user}:***@{host_and_path}");
        }
    }
    url.to_owned()
}

#[cfg(debug_assertions)]
async fn read_sync_secret() -> Result<Option<String>, AppError> {
    match std::env::var(DEV_SYNC_DATABASE_URL_ENV) {
        Ok(value) => Ok(Some(value)),
        Err(std::env::VarError::NotPresent) => Ok(None),
        Err(error) => Err(AppError::validation(format!(
            "开发同步环境变量不可用: {error}"
        ))),
    }
}

#[cfg(not(debug_assertions))]
async fn read_sync_secret() -> Result<Option<String>, AppError> {
    match tokio::task::spawn_blocking(SyncTokenStore::load).await {
        Ok(Ok(value)) => Ok(value),
        Ok(Err(error)) => Err(AppError::initialization(format!(
            "无法读取系统钥匙串: {error}"
        ))),
        Err(error) => Err(AppError::internal(format!(
            "读取系统钥匙串任务失败: {error}"
        ))),
    }
}

#[cfg(not(debug_assertions))]
async fn write_sync_secret(secret: String) -> Result<(), AppError> {
    tokio::task::spawn_blocking(move || SyncTokenStore::save(&secret))
        .await
        .map_err(|error| AppError::internal(format!("保存同步系统凭证任务失败: {error}")))?
        .map_err(|error| {
            AppError::validation(format!(
                "无法写入系统钥匙串（{error}）。请在「系统设置 → 隐私与安全性」允许 StoneFlow 访问钥匙串后重试。"
            ))
        })
}

#[cfg(test)]
mod tests {
    use super::{normalize_database_url, redact_database_url};

    #[test]
    fn redact_database_url_should_hide_password() {
        assert_eq!(
            redact_database_url("postgresql://root:s3cret@47.0.0.1:5432/narrative"),
            "postgresql://root:***@47.0.0.1:5432/narrative"
        );
        assert_eq!(
            redact_database_url("postgres://localhost/db"),
            "postgres://localhost/db"
        );
    }

    #[test]
    fn normalize_database_url_should_skip_comments_and_blank_lines() {
        let raw = "\n# comment\npostgresql://u:p@h/db?sslmode=require\n";
        assert_eq!(
            normalize_database_url(raw).as_deref(),
            Some("postgresql://u:p@h/db?sslmode=require")
        );
    }
}

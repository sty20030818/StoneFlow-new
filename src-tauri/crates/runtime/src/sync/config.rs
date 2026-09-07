//! 云同步配置持久化。

use stoneflow_domain::now_utc;
#[cfg(not(debug_assertions))]
use stoneflow_platform::SyncTokenStore;
use stoneflow_storage::{database::DatabaseRuntimeState, repositories::SettingsRepository};
use url::{Host, Url};

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
    if parse_postgres_url(&database_url).is_err() {
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
    let config = validate_remote_config(database_url)?;

    write_sync_secret(config.database_url.clone()).await?;
    Ok(config)
}

/// 在任何网络访问前拒绝 Debug 构建的 UI 凭据写入。
#[cfg(debug_assertions)]
pub fn ensure_remote_config_writable() -> Result<(), AppError> {
    Err(AppError::validation(
        "开发模式不保存同步连接串，请在项目根目录 .env.local 设置 STONEFLOW_SYNC_DATABASE_URL",
    ))
}

#[cfg(not(debug_assertions))]
pub const fn ensure_remote_config_writable() -> Result<(), AppError> {
    Ok(())
}

/// 标准化并结构化校验 Postgres URL；不会持久化凭据。
pub fn validate_remote_config(database_url: String) -> Result<SyncRemoteConfig, AppError> {
    let database_url = normalize_database_url(database_url)
        .ok_or_else(|| AppError::validation("请填写有效的同步数据库连接串"))?;
    parse_postgres_url(&database_url)?;
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

fn parse_postgres_url(database_url: &str) -> Result<Url, AppError> {
    let parsed = Url::parse(database_url)
        .map_err(|_| AppError::validation("请填写有效的同步数据库连接串"))?;
    if !matches!(parsed.scheme(), "postgresql" | "postgres") {
        return Err(AppError::validation(
            "连接串应以 postgresql:// 或 postgres:// 开头（Neon / 自建 Postgres）",
        ));
    }
    if parsed.host().is_none() {
        return Err(AppError::validation("同步数据库连接串缺少主机地址"));
    }
    Ok(parsed)
}

/// 日志与 UI 展示：只保留结构化解析后的安全位置字段，绝不回退原始输入。
pub fn redact_database_url(database_url: &str) -> String {
    let Ok(parsed) = parse_postgres_url(database_url) else {
        return "postgresql://[invalid]".to_owned();
    };
    let Some(host) = parsed.host() else {
        return "postgresql://[invalid]".to_owned();
    };

    let host = match host {
        Host::Domain(value) => value.to_owned(),
        Host::Ipv4(value) => value.to_string(),
        Host::Ipv6(value) => format!("[{value}]"),
    };
    let mut safe = format!("{}://{host}", parsed.scheme());
    if let Some(port) = parsed.port() {
        safe.push(':');
        safe.push_str(&port.to_string());
    }
    safe.push_str(parsed.path());

    // Query value 没有可证明的非敏感合同；即使 key 看似安全，也可能被用户或供应商
    // 填入凭据。展示边界因此完全丢弃 query，只保留定位远端所需的结构字段。
    safe
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
    use super::{normalize_database_url, redact_database_url, validate_remote_config};

    #[test]
    fn redact_database_url_should_only_keep_safe_location_fields() {
        assert_eq!(
            redact_database_url("postgresql://root:s3cret@47.0.0.1:5432/narrative"),
            "postgresql://47.0.0.1:5432/narrative"
        );
        assert_eq!(
            redact_database_url("postgres://localhost/db"),
            "postgres://localhost/db"
        );
    }

    #[test]
    fn redact_database_url_should_hide_query_and_percent_encoded_passwords() {
        let safe = redact_database_url(
            "postgresql://user:p%40ss%2Fword@db.example.com/app?password=query%2Fsecret&sslmode=require&options=-c%20password%3Dhidden",
        );

        assert_eq!(safe, "postgresql://db.example.com/app");
        assert!(!safe.contains("user"));
        assert!(!safe.contains("secret"));
        assert!(!safe.contains("password"));
        assert!(!safe.contains("%40"));
    }

    #[test]
    fn redact_database_url_should_drop_values_even_for_known_query_keys() {
        let safe = redact_database_url(
            "postgresql://db.example.com/app?sslmode=synthetic-secret&channel_binding=another-secret&target_session_attrs=third-secret",
        );

        assert_eq!(safe, "postgresql://db.example.com/app");
        assert!(!safe.contains("secret"));
    }

    #[test]
    fn redact_database_url_should_never_return_unparseable_input() {
        assert_eq!(
            redact_database_url("not-a-url-with-secret"),
            "postgresql://[invalid]"
        );
    }

    #[test]
    fn validate_remote_config_should_require_a_postgres_host() {
        assert!(validate_remote_config("https://example.com/db".to_owned()).is_err());
        assert!(validate_remote_config("postgresql:///db".to_owned()).is_err());
        assert!(validate_remote_config("postgresql://db.example.com/db".to_owned()).is_ok());
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

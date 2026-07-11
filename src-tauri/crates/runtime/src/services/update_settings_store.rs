//! 基于 `tauri-plugin-store` 的更新设置持久化适配器。

use tauri_plugin_store::StoreExt;

use stoneflow_domain::{
    check_mode_to_stored, normalize_check_interval_secs, parse_check_mode, UpdateChannel,
    UpdateSettings, AUTO_CHECK_INTERVAL_SECS,
};
use stoneflow_usecase::update::UpdateSettingsPort;
use stoneflow_usecase::UsecaseError;

/// Store 文件名（存放在 Tauri app data 目录）。
const STORE_PATH: &str = "update-settings.json";

/// 存储键名。
const KEY_CHECK_MODE: &str = "checkMode";
const KEY_CHANNEL: &str = "channel";
/// 新键：单一跳过版本。
const KEY_SKIPPED_VERSION: &str = "skippedVersion";
/// 旧键：数组；读时迁移为单一值后写回新键。
const KEY_SKIPPED_VERSIONS_LEGACY: &str = "skippedVersions";
const KEY_LAST_CHECKED_AT: &str = "lastCheckedAt";
const KEY_CHECK_INTERVAL_SECS: &str = "checkIntervalSecs";

/// 基于 tauri-plugin-store 的设置持久化。
#[derive(Clone)]
pub struct StoreUpdateSettingsAdapter {
    app: tauri::AppHandle,
}

impl StoreUpdateSettingsAdapter {
    pub fn new(app: tauri::AppHandle) -> Self {
        Self { app }
    }

    fn store(&self) -> Result<std::sync::Arc<tauri_plugin_store::Store<tauri::Wry>>, UsecaseError> {
        self.app
            .store(STORE_PATH)
            .map_err(|e| UsecaseError::update(format!("打开更新设置 store 失败: {e}")))
    }
}

/// 读取跳过版本：优先新键；兼容旧数组（取最后一个）。
fn load_skipped_version(
    store: &tauri_plugin_store::Store<tauri::Wry>,
) -> (Option<String>, bool /* needs_migrate */) {
    if let Some(v) = store.get(KEY_SKIPPED_VERSION) {
        if v.is_null() {
            return (None, store.get(KEY_SKIPPED_VERSIONS_LEGACY).is_some());
        }
        if let Ok(s) = serde_json::from_value::<String>(v.clone()) {
            let needs = store.get(KEY_SKIPPED_VERSIONS_LEGACY).is_some();
            return (if s.is_empty() { None } else { Some(s) }, needs);
        }
        if let Ok(opt) = serde_json::from_value::<Option<String>>(v.clone()) {
            let needs = store.get(KEY_SKIPPED_VERSIONS_LEGACY).is_some();
            return (opt.filter(|s| !s.is_empty()), needs);
        }
    }

    // 旧格式：string[]
    if let Some(v) = store.get(KEY_SKIPPED_VERSIONS_LEGACY) {
        if let Ok(list) = serde_json::from_value::<Vec<String>>(v.clone()) {
            let last = list.into_iter().rev().find(|s| !s.is_empty());
            return (last, true);
        }
    }

    (None, false)
}

impl UpdateSettingsPort for StoreUpdateSettingsAdapter {
    async fn load(&self) -> Result<UpdateSettings, UsecaseError> {
        let store = self.store()?;

        let raw_mode = store
            .get(KEY_CHECK_MODE)
            .and_then(|v| v.as_str().map(|s| s.to_owned()));
        let check_mode = raw_mode
            .as_deref()
            .map(parse_check_mode)
            .unwrap_or_default();
        // 脏值 / 缺省：规范化回写
        let mode_needs_rewrite = match raw_mode.as_deref() {
            None => true,
            Some(s) => s != check_mode_to_stored(check_mode),
        };

        let channel = store
            .get(KEY_CHANNEL)
            .and_then(|v| serde_json::from_value::<UpdateChannel>(v.clone()).ok())
            .unwrap_or_default();

        let (skipped_version, skip_needs_migrate) = load_skipped_version(store.as_ref());

        let last_checked_at = store
            .get(KEY_LAST_CHECKED_AT)
            .and_then(|v| serde_json::from_value::<Option<i64>>(v.clone()).ok())
            .flatten();

        let raw_interval = store
            .get(KEY_CHECK_INTERVAL_SECS)
            .and_then(|v| v.as_i64().or_else(|| v.as_u64().map(|u| u as i64)))
            .unwrap_or(AUTO_CHECK_INTERVAL_SECS);
        let check_interval_secs = normalize_check_interval_secs(raw_interval);
        let interval_needs_rewrite = check_interval_secs != raw_interval
            || store.get(KEY_CHECK_INTERVAL_SECS).is_none();

        let settings = UpdateSettings {
            check_mode,
            channel,
            skipped_version,
            last_checked_at,
            check_interval_secs,
        };

        if mode_needs_rewrite || interval_needs_rewrite || skip_needs_migrate {
            self.save(&settings).await?;
        }

        Ok(settings)
    }

    async fn save(&self, settings: &UpdateSettings) -> Result<(), UsecaseError> {
        let store = self.store()?;
        let check_interval_secs = normalize_check_interval_secs(settings.check_interval_secs);
        store.set(
            KEY_CHECK_MODE,
            serde_json::to_value(settings.check_mode)
                .map_err(|e| UsecaseError::update(format!("序列化 check_mode 失败: {e}")))?,
        );
        store.set(
            KEY_CHANNEL,
            serde_json::to_value(settings.channel)
                .map_err(|e| UsecaseError::update(format!("序列化 channel 失败: {e}")))?,
        );
        store.set(
            KEY_SKIPPED_VERSION,
            serde_json::to_value(&settings.skipped_version)
                .map_err(|e| UsecaseError::update(format!("序列化 skipped_version 失败: {e}")))?,
        );
        // 清掉旧数组键，避免双源
        store.delete(KEY_SKIPPED_VERSIONS_LEGACY);
        store.set(
            KEY_LAST_CHECKED_AT,
            serde_json::to_value(settings.last_checked_at)
                .map_err(|e| UsecaseError::update(format!("序列化 last_checked_at 失败: {e}")))?,
        );
        store.set(
            KEY_CHECK_INTERVAL_SECS,
            serde_json::to_value(check_interval_secs)
                .map_err(|e| UsecaseError::update(format!("序列化 check_interval_secs 失败: {e}")))?,
        );
        store
            .save()
            .map_err(|e| UsecaseError::update(format!("保存更新设置失败: {e}")))?;
        Ok(())
    }
}

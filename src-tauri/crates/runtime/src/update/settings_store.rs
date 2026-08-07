//! update settings 的独占 JSON 持久化边界。

use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

use tauri::Manager;

use stoneflow_application::update::UpdateSettingsPort;
use stoneflow_application::ApplicationError;
use stoneflow_domain::{normalize_check_interval_secs, UpdateSettings};

/// Store 文件名（存放在 Tauri app data 目录）。
const STORE_PATH: &str = "update-settings.json";

/// 独占文件适配器：不向 renderer 暴露缓存，写入使用同目录临时文件原子替换。
#[derive(Clone)]
pub struct FileUpdateSettingsAdapter {
    path: PathBuf,
}

impl FileUpdateSettingsAdapter {
    pub fn new(app: &tauri::AppHandle) -> Result<Self, ApplicationError> {
        let path = app
            .path()
            .app_data_dir()
            .map_err(|e| ApplicationError::update(format!("解析更新设置路径失败: {e}")))?
            .join(STORE_PATH);
        Ok(Self { path })
    }
}

impl UpdateSettingsPort for FileUpdateSettingsAdapter {
    async fn load(&self) -> Result<UpdateSettings, ApplicationError> {
        let bytes = match fs::read(&self.path) {
            Ok(bytes) => bytes,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                return Ok(UpdateSettings::default());
            }
            Err(error) => {
                return Err(ApplicationError::update(format!(
                    "读取更新设置失败: {error}"
                )));
            }
        };
        let mut settings: UpdateSettings = serde_json::from_slice(&bytes)
            .map_err(|e| ApplicationError::update(format!("解析更新设置失败: {e}")))?;
        settings.check_interval_secs = normalize_check_interval_secs(settings.check_interval_secs);
        Ok(settings)
    }

    async fn save(&self, settings: &UpdateSettings) -> Result<(), ApplicationError> {
        save_settings_atomically(&self.path, settings)
    }
}

fn save_settings_atomically(
    path: &Path,
    settings: &UpdateSettings,
) -> Result<(), ApplicationError> {
    let parent = path
        .parent()
        .ok_or_else(|| ApplicationError::update("更新设置路径缺少父目录"))?;
    fs::create_dir_all(parent)
        .map_err(|e| ApplicationError::update(format!("创建更新设置目录失败: {e}")))?;

    let mut normalized = settings.clone();
    normalized.check_interval_secs = normalize_check_interval_secs(normalized.check_interval_secs);
    let bytes = serde_json::to_vec_pretty(&normalized)
        .map_err(|e| ApplicationError::update(format!("序列化更新设置失败: {e}")))?;
    let mut temporary = tempfile::NamedTempFile::new_in(parent)
        .map_err(|e| ApplicationError::update(format!("创建更新设置临时文件失败: {e}")))?;
    temporary
        .write_all(&bytes)
        .and_then(|()| temporary.as_file().sync_all())
        .map_err(|e| ApplicationError::update(format!("写入更新设置临时文件失败: {e}")))?;
    temporary
        .persist(path)
        .map_err(|e| ApplicationError::update(format!("原子替换更新设置失败: {}", e.error)))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use stoneflow_domain::{UpdateChannel, AUTO_CHECK_INTERVAL_SECS};

    use super::*;

    #[test]
    fn atomic_save_replaces_the_complete_settings_document() {
        let temp_dir = tempfile::tempdir().unwrap();
        let path = temp_dir.path().join(STORE_PATH);
        let mut settings = UpdateSettings {
            channel: UpdateChannel::Beta,
            check_interval_secs: -1,
            pending_restart_version: Some("0.2.0-beta.4".to_string()),
            ..UpdateSettings::default()
        };

        save_settings_atomically(&path, &settings).unwrap();
        settings.channel = UpdateChannel::Stable;
        settings.pending_restart_version = None;
        save_settings_atomically(&path, &settings).unwrap();

        let saved: UpdateSettings = serde_json::from_slice(&fs::read(path).unwrap()).unwrap();
        assert_eq!(saved.channel, UpdateChannel::Stable);
        assert_eq!(saved.check_interval_secs, AUTO_CHECK_INTERVAL_SECS);
        assert!(saved.pending_restart_version.is_none());
    }
}

//! 应用内更新的用例编排层。
//!
//! 定义更新操作的 Port trait 与 `UpdateService` 业务编排，不依赖 Tauri。

use std::future::Future;
use std::sync::atomic::{AtomicBool, Ordering};

use chrono::Utc;
use serde::Serialize;
use stoneflow_domain::{
    is_version_skipped, should_auto_check, UpdateChannel, UpdateCheckMode, UpdateSettings,
};

use crate::error::UsecaseError;

/// 下载进行中时占用的守卫：离开作用域后释放单飞锁。
struct DownloadInFlightGuard<'a>(&'a AtomicBool);

impl Drop for DownloadInFlightGuard<'_> {
    fn drop(&mut self) {
        self.0.store(false, Ordering::SeqCst);
    }
}

/// 从远端检查到的更新信息。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub version: String,
    pub body: Option<String>,
    pub pub_date: Option<String>,
}

/// 更新操作 Port —— 由 runtime 层的 Tauri adapter 实现。
pub trait UpdatePort: Send + Sync {
    /// 向远端检查是否有更新，返回 `Some(info)` 或 `None`（已是最新）。
    fn check(
        &self,
        channel: UpdateChannel,
    ) -> impl Future<Output = Result<Option<UpdateInfo>, UsecaseError>> + Send;

    /// 执行下载并安装，通过 `on_progress` 向前端推送下载进度。
    fn download_and_install(
        &self,
        channel: UpdateChannel,
        on_progress: impl Fn(u64, Option<u64>) + Send + Sync + 'static,
    ) -> impl Future<Output = Result<(), UsecaseError>> + Send;

    /// 重启应用以完成更新。
    fn restart(&self) -> impl Future<Output = Result<(), UsecaseError>> + Send;
}

/// 更新设置持久化 Port —— 由 runtime 层基于 `tauri-plugin-store` 实现。
pub trait UpdateSettingsPort: Send + Sync {
    fn load(&self) -> impl Future<Output = Result<UpdateSettings, UsecaseError>> + Send;
    fn save(
        &self,
        settings: &UpdateSettings,
    ) -> impl Future<Output = Result<(), UsecaseError>> + Send;
}

/// 更新业务编排服务。
pub struct UpdateService<P: UpdatePort, S: UpdateSettingsPort> {
    port: P,
    settings_port: S,
    /// 进程内下载单飞：防止自动下载与用户手动下载并发执行两次。
    download_in_flight: AtomicBool,
}

impl<P: UpdatePort, S: UpdateSettingsPort> UpdateService<P, S> {
    pub fn new(port: P, settings_port: S) -> Self {
        Self {
            port,
            settings_port,
            download_in_flight: AtomicBool::new(false),
        }
    }

    /// 当前是否有进行中的下载（供 runtime/前端会话快照使用）。
    pub fn is_download_in_flight(&self) -> bool {
        self.download_in_flight.load(Ordering::SeqCst)
    }

    /// 读取当前更新设置。
    pub async fn get_settings(&self) -> Result<UpdateSettings, UsecaseError> {
        self.settings_port.load().await
    }

    /// 检查更新。
    ///
    /// - `manual = true`：用户手动触发，绕过节流和跳过版本过滤。
    /// - `manual = false`：自动检查，受 6 小时节流和版本跳过列表约束。
    pub async fn check_update(&self, manual: bool) -> Result<Option<UpdateInfo>, UsecaseError> {
        let settings = self.settings_port.load().await?;

        // 自动模式下的拦截逻辑
        if !manual {
            // 手动模式不自动检查
            if settings.check_mode == UpdateCheckMode::Manual {
                return Ok(None);
            }
            // 6 小时节流
            let now = Utc::now().timestamp();
            if !should_auto_check(now, settings.last_checked_at) {
                return Ok(None);
            }
        }

        // 向远端查询
        let update = self.port.check(settings.channel).await?;

        // 更新 last_checked_at（无论是否有更新都记录检查时间）
        let mut new_settings = settings.clone();
        new_settings.last_checked_at = Some(Utc::now().timestamp());
        self.settings_port.save(&new_settings).await?;

        // 自动模式下跳过用户选择跳过的版本
        if !manual {
            if let Some(ref info) = update {
                if is_version_skipped(&settings.skipped_versions, &info.version) {
                    return Ok(None);
                }
            }
        }

        Ok(update)
    }

    /// 开始下载并安装当前检测到的更新。
    ///
    /// 同一时刻最多一次下载：若已有下载在进行，直接返回 `Ok(())`（幂等忽略重复请求）。
    pub async fn download_and_install(
        &self,
        on_progress: impl Fn(u64, Option<u64>) + Send + Sync + 'static,
    ) -> Result<(), UsecaseError> {
        if self
            .download_in_flight
            .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
            .is_err()
        {
            // 已有下载：bootstrap 静默下载与 UI「立即更新」可能重叠，忽略第二次。
            return Ok(());
        }
        let _guard = DownloadInFlightGuard(&self.download_in_flight);

        let settings = self.settings_port.load().await?;
        self.port
            .download_and_install(settings.channel, on_progress)
            .await
    }

    /// 重启应用以完成安装。
    pub async fn restart(&self) -> Result<(), UsecaseError> {
        self.port.restart().await
    }

    /// 设置更新检查模式。
    pub async fn set_check_mode(&self, mode: UpdateCheckMode) -> Result<(), UsecaseError> {
        let mut settings = self.settings_port.load().await?;
        settings.check_mode = mode;
        self.settings_port.save(&settings).await
    }

    /// 设置更新渠道。
    pub async fn set_channel(&self, channel: UpdateChannel) -> Result<(), UsecaseError> {
        let mut settings = self.settings_port.load().await?;
        settings.channel = channel;
        self.settings_port.save(&settings).await
    }

    /// 将指定版本加入跳过列表。
    pub async fn skip_version(&self, version: String) -> Result<(), UsecaseError> {
        let mut settings = self.settings_port.load().await?;
        if !settings.skipped_versions.iter().any(|v| v == &version) {
            settings.skipped_versions.push(version);
        }
        self.settings_port.save(&settings).await
    }
}

#[cfg(test)]
mod tests {
    use std::sync::{Arc, Mutex};

    use super::*;

    /// 测试用的内存 Mock UpdatePort。
    struct MockUpdatePort {
        latest_version: Option<&'static str>,
        download_called: Arc<Mutex<bool>>,
        download_count: Arc<Mutex<u32>>,
        download_delay_ms: u64,
        restart_called: Arc<Mutex<bool>>,
    }

    impl MockUpdatePort {
        fn new(latest_version: Option<&'static str>) -> Self {
            Self {
                latest_version,
                download_called: Arc::new(Mutex::new(false)),
                download_count: Arc::new(Mutex::new(0)),
                download_delay_ms: 0,
                restart_called: Arc::new(Mutex::new(false)),
            }
        }
    }

    impl UpdatePort for MockUpdatePort {
        async fn check(
            &self,
            _channel: UpdateChannel,
        ) -> Result<Option<UpdateInfo>, UsecaseError> {
            Ok(self.latest_version.map(|v| UpdateInfo {
                version: v.to_string(),
                body: Some("test notes".into()),
                pub_date: None,
            }))
        }

        async fn download_and_install(
            &self,
            _channel: UpdateChannel,
            _on_progress: impl Fn(u64, Option<u64>) + Send + Sync + 'static,
        ) -> Result<(), UsecaseError> {
            *self.download_called.lock().unwrap() = true;
            *self.download_count.lock().unwrap() += 1;
            if self.download_delay_ms > 0 {
                tokio::time::sleep(std::time::Duration::from_millis(self.download_delay_ms)).await;
            }
            Ok(())
        }

        async fn restart(&self) -> Result<(), UsecaseError> {
            *self.restart_called.lock().unwrap() = true;
            Ok(())
        }
    }

    /// 测试用的内存 Mock SettingsPort。
    struct MockSettingsPort {
        settings: Arc<Mutex<UpdateSettings>>,
    }

    impl MockSettingsPort {
        fn new(settings: UpdateSettings) -> Self {
            Self {
                settings: Arc::new(Mutex::new(settings)),
            }
        }
    }

    impl UpdateSettingsPort for MockSettingsPort {
        async fn load(&self) -> Result<UpdateSettings, UsecaseError> {
            Ok(self.settings.lock().unwrap().clone())
        }

        async fn save(&self, settings: &UpdateSettings) -> Result<(), UsecaseError> {
            *self.settings.lock().unwrap() = settings.clone();
            Ok(())
        }
    }

    #[tokio::test]
    async fn manual_check_should_bypass_throttling_and_skip_list() {
        let port = MockUpdatePort::new(Some("0.2.0"));
        let settings_port = MockSettingsPort::new(UpdateSettings {
            check_mode: UpdateCheckMode::Manual,
            channel: UpdateChannel::Stable,
            skipped_versions: vec!["0.2.0".to_string()],
            last_checked_at: Some(Utc::now().timestamp()), // 刚检查过
        });
        let service = UpdateService::new(port, settings_port);

        let result = service.check_update(true).await.unwrap();
        assert!(result.is_some());
        assert_eq!(result.unwrap().version, "0.2.0");
    }

    #[tokio::test]
    async fn auto_check_should_skip_manual_mode() {
        let port = MockUpdatePort::new(Some("0.2.0"));
        let settings_port = MockSettingsPort::new(UpdateSettings {
            check_mode: UpdateCheckMode::Manual,
            ..Default::default()
        });
        let service = UpdateService::new(port, settings_port);

        let result = service.check_update(false).await.unwrap();
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn auto_check_should_respect_skip_list() {
        let port = MockUpdatePort::new(Some("0.2.0"));
        let settings_port = MockSettingsPort::new(UpdateSettings {
            check_mode: UpdateCheckMode::NotifyOnly,
            skipped_versions: vec!["0.2.0".to_string()],
            ..Default::default()
        });
        let service = UpdateService::new(port, settings_port);

        let result = service.check_update(false).await.unwrap();
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn skip_version_should_add_to_list() {
        let port = MockUpdatePort::new(None);
        let settings_port = MockSettingsPort::new(UpdateSettings::default());
        let service = UpdateService::new(port, settings_port);

        service.skip_version("0.2.0".to_string()).await.unwrap();
        let settings = service.get_settings().await.unwrap();
        assert!(settings.skipped_versions.contains(&"0.2.0".to_string()));
    }

    #[tokio::test]
    async fn set_check_mode_should_persist() {
        let port = MockUpdatePort::new(None);
        let settings_port = MockSettingsPort::new(UpdateSettings::default());
        let service = UpdateService::new(port, settings_port);

        service
            .set_check_mode(UpdateCheckMode::AutoDownload)
            .await
            .unwrap();
        let settings = service.get_settings().await.unwrap();
        assert_eq!(settings.check_mode, UpdateCheckMode::AutoDownload);
    }

    #[tokio::test]
    async fn concurrent_download_should_only_invoke_port_once() {
        let download_count = Arc::new(Mutex::new(0u32));
        let port = MockUpdatePort {
            latest_version: Some("0.2.0"),
            download_called: Arc::new(Mutex::new(false)),
            download_count: Arc::clone(&download_count),
            download_delay_ms: 80,
            restart_called: Arc::new(Mutex::new(false)),
        };
        let settings_port = MockSettingsPort::new(UpdateSettings::default());
        let service = Arc::new(UpdateService::new(port, settings_port));

        let s1 = Arc::clone(&service);
        let s2 = Arc::clone(&service);
        let (r1, r2) = tokio::join!(
            s1.download_and_install(|_, _| {}),
            s2.download_and_install(|_, _| {}),
        );

        assert!(r1.is_ok());
        assert!(r2.is_ok());
        assert_eq!(
            *download_count.lock().unwrap(),
            1,
            "second concurrent download must be single-flighted"
        );
        assert!(!service.is_download_in_flight());
    }

    #[tokio::test]
    async fn download_can_retry_after_previous_finishes() {
        let download_count = Arc::new(Mutex::new(0u32));
        let port = MockUpdatePort {
            latest_version: Some("0.2.0"),
            download_called: Arc::new(Mutex::new(false)),
            download_count: Arc::clone(&download_count),
            download_delay_ms: 0,
            restart_called: Arc::new(Mutex::new(false)),
        };
        let settings_port = MockSettingsPort::new(UpdateSettings::default());
        let service = UpdateService::new(port, settings_port);

        service.download_and_install(|_, _| {}).await.unwrap();
        service.download_and_install(|_, _| {}).await.unwrap();
        assert_eq!(*download_count.lock().unwrap(), 2);
    }
}

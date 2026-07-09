//! 应用内更新的用例编排层。
//!
//! 定义更新操作的 Port trait 与 `UpdateService` 业务编排，不依赖 Tauri。

use std::future::Future;
use std::sync::{Arc, Mutex};

use chrono::Utc;
use serde::Serialize;
use stoneflow_domain::{
    is_version_skipped, normalize_check_interval_secs, should_auto_check_with_interval,
    UpdateChannel, UpdateCheckMode, UpdateSettings,
};

use crate::error::UsecaseError;

/// 进程内更新会话阶段（供前端 hydrate）。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum UpdateSessionPhase {
    Idle,
    Downloading,
    Ready,
}

/// 更新会话快照。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSessionSnapshot {
    pub phase: UpdateSessionPhase,
    pub version: Option<String>,
    pub downloaded: u64,
    pub total: Option<u64>,
    pub download_in_flight: bool,
}

struct SessionInner {
    in_flight: bool,
    phase: UpdateSessionPhase,
    version: Option<String>,
    downloaded: u64,
    total: Option<u64>,
    /// 最近一次 check 到的远端版本，供下载会话标注。
    pending_version: Option<String>,
    /// 为 false 时停止推送进度；并配合 abort 真正中断下载 task。
    emit_progress: bool,
    /// 当前下载 task 的 abort 句柄（仅下载阶段有效）。
    abort_handle: Option<tokio::task::AbortHandle>,
    /// 用户请求取消（abort 后 join 时识别）。
    cancel_requested: bool,
}

impl Default for SessionInner {
    fn default() -> Self {
        Self {
            in_flight: false,
            phase: UpdateSessionPhase::Idle,
            version: None,
            downloaded: 0,
            total: None,
            pending_version: None,
            emit_progress: true,
            abort_handle: None,
            cancel_requested: false,
        }
    }
}

/// 下载结果。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DownloadOutcome {
    /// 下载并预装完成，等待重启。
    Completed,
    /// 用户在下载中取消（网络任务已 abort）。
    Cancelled,
}

/// 下载进行中时占用的守卫：离开作用域后清除 in_flight。
struct DownloadInFlightGuard(Arc<Mutex<SessionInner>>);

impl Drop for DownloadInFlightGuard {
    fn drop(&mut self) {
        if let Ok(mut s) = self.0.lock() {
            s.in_flight = false;
        }
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
///
/// `P: Clone`：下载在独立 task 中运行以便 `abort` 真正中断网络流。
pub struct UpdateService<P: UpdatePort + Clone + 'static, S: UpdateSettingsPort> {
    port: P,
    settings_port: S,
    /// 进程内下载会话（单飞 + hydrate 快照）。
    session: Arc<Mutex<SessionInner>>,
}

impl<P: UpdatePort + Clone + 'static, S: UpdateSettingsPort> UpdateService<P, S> {
    pub fn new(port: P, settings_port: S) -> Self {
        Self {
            port,
            settings_port,
            session: Arc::new(Mutex::new(SessionInner::default())),
        }
    }

    /// 当前是否有进行中的下载。
    pub fn is_download_in_flight(&self) -> bool {
        self.session
            .lock()
            .map(|s| s.in_flight)
            .unwrap_or(false)
    }

    /// 读取进程内更新会话快照（前端挂载时 hydrate）。
    pub fn session_snapshot(&self) -> UpdateSessionSnapshot {
        let s = self.session.lock().unwrap_or_else(|e| e.into_inner());
        UpdateSessionSnapshot {
            phase: s.phase,
            version: s.version.clone(),
            downloaded: s.downloaded,
            total: s.total,
            download_in_flight: s.in_flight,
        }
    }

    /// 是否应向前端推送下载进度（取消后为 false）。
    pub fn should_emit_progress(&self) -> bool {
        self.session
            .lock()
            .map(|s| s.emit_progress)
            .unwrap_or(true)
    }

    /// 停止进度推送（兼容旧调用）。
    pub fn suppress_progress_emits(&self) {
        self.cancel_download();
    }

    /// 取消**下载中**的更新：abort 下载 task，断开 HTTP 流。
    ///
    /// 已进入 install 的极短窗口内可能无法打断；完成后（Ready）调用无效。
    pub fn cancel_download(&self) {
        let handle = {
            let mut s = match self.session.lock() {
                Ok(g) => g,
                Err(e) => e.into_inner(),
            };
            if s.phase != UpdateSessionPhase::Downloading && !s.in_flight {
                return;
            }
            s.emit_progress = false;
            s.cancel_requested = true;
            s.abort_handle.take()
        };
        if let Some(handle) = handle {
            handle.abort();
        }
    }

    /// 读取当前更新设置（间隔字段已规范化）。
    pub async fn get_settings(&self) -> Result<UpdateSettings, UsecaseError> {
        self.get_settings_normalized().await
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
            // 按用户配置的间隔节流
            let now = Utc::now().timestamp();
            let interval = normalize_check_interval_secs(settings.check_interval_secs);
            if !should_auto_check_with_interval(now, settings.last_checked_at, interval) {
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

        if let Some(ref info) = update {
            if let Ok(mut s) = self.session.lock() {
                s.pending_version = Some(info.version.clone());
            }
        }

        Ok(update)
    }

    /// 开始下载并安装当前检测到的更新。
    ///
    /// - 同一时刻最多一次下载：若已有下载在进行，返回 `Ok(Completed)` 幂等忽略。
    /// - 下载在独立 task 中运行，可通过 [`Self::cancel_download`] abort 真正中断网络。
    /// - `Ok(Cancelled)`：用户取消；`Ok(Completed)`：预装完成。
    pub async fn download_and_install(
        &self,
        on_progress: impl Fn(u64, Option<u64>) + Send + Sync + 'static,
    ) -> Result<DownloadOutcome, UsecaseError> {
        {
            let mut s = self.session.lock().unwrap_or_else(|e| e.into_inner());
            if s.in_flight {
                // 已有下载：幂等视为「已有任务在跑」，不二次启动。
                return Ok(DownloadOutcome::Completed);
            }
            s.in_flight = true;
            s.phase = UpdateSessionPhase::Downloading;
            s.downloaded = 0;
            s.total = None;
            s.version = s.pending_version.clone();
            s.emit_progress = true;
            s.cancel_requested = false;
            s.abort_handle = None;
        }
        let _guard = DownloadInFlightGuard(Arc::clone(&self.session));

        let settings = self.settings_port.load().await?;
        let session = Arc::clone(&self.session);
        let port = self.port.clone();
        let channel = settings.channel;

        let join = tokio::spawn(async move {
            port.download_and_install(channel, move |downloaded, total| {
                if let Ok(mut s) = session.lock() {
                    if s.cancel_requested {
                        return;
                    }
                    s.downloaded = downloaded;
                    s.total = total;
                    s.phase = UpdateSessionPhase::Downloading;
                }
                on_progress(downloaded, total);
            })
            .await
        });

        {
            let mut s = self.session.lock().unwrap_or_else(|e| e.into_inner());
            s.abort_handle = Some(join.abort_handle());
        }

        let join_result = join.await;

        // 清理 abort 句柄
        if let Ok(mut s) = self.session.lock() {
            s.abort_handle = None;
        }

        match join_result {
            Ok(Ok(())) => {
                let cancelled = self
                    .session
                    .lock()
                    .map(|s| s.cancel_requested)
                    .unwrap_or(false);
                if cancelled {
                    self.reset_session_after_cancel();
                    return Ok(DownloadOutcome::Cancelled);
                }
                if let Ok(mut s) = self.session.lock() {
                    s.phase = UpdateSessionPhase::Ready;
                    s.cancel_requested = false;
                }
                Ok(DownloadOutcome::Completed)
            }
            Ok(Err(e)) => {
                let cancelled = self
                    .session
                    .lock()
                    .map(|s| s.cancel_requested)
                    .unwrap_or(false);
                if cancelled {
                    self.reset_session_after_cancel();
                    return Ok(DownloadOutcome::Cancelled);
                }
                if let Ok(mut s) = self.session.lock() {
                    s.phase = UpdateSessionPhase::Idle;
                    s.downloaded = 0;
                    s.total = None;
                    s.cancel_requested = false;
                }
                Err(e)
            }
            Err(join_err) => {
                // abort 会走到这里
                let cancelled = join_err.is_cancelled()
                    || self
                        .session
                        .lock()
                        .map(|s| s.cancel_requested)
                        .unwrap_or(false);
                self.reset_session_after_cancel();
                if cancelled {
                    Ok(DownloadOutcome::Cancelled)
                } else {
                    Err(UsecaseError::update(format!(
                        "下载任务异常结束: {join_err}"
                    )))
                }
            }
        }
    }

    fn reset_session_after_cancel(&self) {
        if let Ok(mut s) = self.session.lock() {
            s.phase = if s.pending_version.is_some() {
                UpdateSessionPhase::Idle
            } else {
                UpdateSessionPhase::Idle
            };
            // 保留 pending_version，便于用户再次下载
            s.downloaded = 0;
            s.total = None;
            s.emit_progress = true;
            s.cancel_requested = false;
            s.abort_handle = None;
            s.version = s.pending_version.clone();
        }
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

    /// 设置自动检查间隔（秒）；非法值会收敛到默认 6 小时。
    pub async fn set_check_interval_secs(&self, interval_secs: i64) -> Result<(), UsecaseError> {
        let mut settings = self.settings_port.load().await?;
        settings.check_interval_secs = normalize_check_interval_secs(interval_secs);
        self.settings_port.save(&settings).await
    }

    /// 读取规范化后的完整设置（含默认间隔）。
    pub async fn get_settings_normalized(&self) -> Result<UpdateSettings, UsecaseError> {
        let mut settings = self.settings_port.load().await?;
        settings.check_interval_secs =
            normalize_check_interval_secs(settings.check_interval_secs);
        Ok(settings)
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
    #[derive(Clone)]
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
            ..Default::default()
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
        assert_eq!(r1.unwrap(), DownloadOutcome::Completed);
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

        assert_eq!(
            service.download_and_install(|_, _| {}).await.unwrap(),
            DownloadOutcome::Completed
        );
        assert_eq!(
            service.download_and_install(|_, _| {}).await.unwrap(),
            DownloadOutcome::Completed
        );
        assert_eq!(*download_count.lock().unwrap(), 2);
    }

    #[tokio::test]
    async fn session_snapshot_tracks_ready_after_download() {
        let port = MockUpdatePort::new(Some("0.3.0"));
        let settings_port = MockSettingsPort::new(UpdateSettings::default());
        let service = UpdateService::new(port, settings_port);

        let info = service.check_update(true).await.unwrap().unwrap();
        assert_eq!(info.version, "0.3.0");
        assert_eq!(
            service.download_and_install(|_, _| {}).await.unwrap(),
            DownloadOutcome::Completed
        );

        let snap = service.session_snapshot();
        assert_eq!(snap.phase, UpdateSessionPhase::Ready);
        assert_eq!(snap.version.as_deref(), Some("0.3.0"));
        assert!(!snap.download_in_flight);
    }

    #[tokio::test]
    async fn cancel_download_aborts_in_flight_task() {
        let download_count = Arc::new(Mutex::new(0u32));
        let port = MockUpdatePort {
            latest_version: Some("0.3.0"),
            download_called: Arc::new(Mutex::new(false)),
            download_count: Arc::clone(&download_count),
            download_delay_ms: 500,
            restart_called: Arc::new(Mutex::new(false)),
        };
        let settings_port = MockSettingsPort::new(UpdateSettings::default());
        let service = Arc::new(UpdateService::new(port, settings_port));
        let _ = service.check_update(true).await.unwrap();

        let svc = Arc::clone(&service);
        let handle = tokio::spawn(async move { svc.download_and_install(|_, _| {}).await });

        tokio::time::sleep(std::time::Duration::from_millis(30)).await;
        assert!(service.is_download_in_flight());
        service.cancel_download();

        let outcome = handle.await.unwrap().unwrap();
        assert_eq!(outcome, DownloadOutcome::Cancelled);
        assert!(!service.is_download_in_flight());
        assert_eq!(service.session_snapshot().phase, UpdateSessionPhase::Idle);

        // 取消后可重新下载
        assert_eq!(
            service.download_and_install(|_, _| {}).await.unwrap(),
            DownloadOutcome::Completed
        );
    }
}

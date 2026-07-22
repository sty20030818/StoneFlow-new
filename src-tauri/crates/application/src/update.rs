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

use crate::error::ApplicationError;

/// 进程内更新会话阶段（供前端 hydrate）。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum UpdateSessionPhase {
    Idle,
    /// 已发现更新，等待用户确认下载（仅提醒 / 取消下载后）。
    Available,
    Downloading,
    Ready,
}

/// 更新检查触发来源。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UpdateCheckKind {
    /// 用户手动：绕过节流与跳过列表。
    Manual,
    /// 定期自动：受间隔节流；Manual 模式不查；尊重跳过列表。
    Scheduled,
    /// 启动首次：不受间隔节流（仍尊重 Manual 模式与跳过列表）。
    Startup,
}

/// 更新会话快照。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSessionSnapshot {
    pub phase: UpdateSessionPhase,
    pub version: Option<String>,
    pub body: Option<String>,
    pub pub_date: Option<String>,
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
    pending_body: Option<String>,
    pending_pub_date: Option<String>,
    /// 已下载、待用户确认后安装的安装包（Windows 上 install 会立刻退出进程）。
    staged_package: Option<Vec<u8>>,
    /// 为 false 时停止推送进度（取消后）；配合 abort 中断下载 task。
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
            pending_body: None,
            pending_pub_date: None,
            staged_package: None,
            emit_progress: true,
            abort_handle: None,
            cancel_requested: false,
        }
    }
}

/// 下载结果。
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DownloadOutcome {
    /// 下载并预装完成，等待重启。
    Completed { version: String },
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
    ) -> impl Future<Output = Result<Option<UpdateInfo>, ApplicationError>> + Send;

    /// **仅下载**安装包（校验签名），**不安装**。
    /// 成功返回 `(version, package_bytes)`；port 内只应做一次远端 check。
    fn download_package(
        &self,
        channel: UpdateChannel,
        on_progress: impl Fn(u64, Option<u64>) + Send + Sync + 'static,
    ) -> impl Future<Output = Result<(String, Vec<u8>), ApplicationError>> + Send;

    /// 安装已暂存的安装包。
    /// Windows 上会启动安装器并 `exit` 当前进程（随后由安装器重启）；Unix 上通常返回后再 `restart`。
    fn install_package(
        &self,
        channel: UpdateChannel,
        bytes: Vec<u8>,
    ) -> impl Future<Output = Result<(), ApplicationError>> + Send;

    /// 重启应用（无暂存包时的兜底；Windows 安装路径通常走不到这里）。
    fn restart(&self) -> impl Future<Output = Result<(), ApplicationError>> + Send;
}

/// 更新设置持久化 Port —— 由 runtime 层基于 `tauri-plugin-store` 实现。
pub trait UpdateSettingsPort: Send + Sync {
    fn load(&self) -> impl Future<Output = Result<UpdateSettings, ApplicationError>> + Send;
    fn save(
        &self,
        settings: &UpdateSettings,
    ) -> impl Future<Output = Result<(), ApplicationError>> + Send;
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
        self.session.lock().map(|s| s.in_flight).unwrap_or(false)
    }

    /// 读取进程内更新会话快照（前端挂载时 hydrate）。
    pub fn session_snapshot(&self) -> UpdateSessionSnapshot {
        let s = self.session.lock().unwrap_or_else(|e| e.into_inner());
        let version = match s.phase {
            UpdateSessionPhase::Available => {
                s.pending_version.clone().or_else(|| s.version.clone())
            }
            _ => s.version.clone().or_else(|| s.pending_version.clone()),
        };
        UpdateSessionSnapshot {
            phase: s.phase,
            version,
            body: s.pending_body.clone(),
            pub_date: s.pending_pub_date.clone(),
            downloaded: s.downloaded,
            total: s.total,
            download_in_flight: s.in_flight,
        }
    }

    /// 最近一次 check 到的远端版本（下载前可用，避免命令层再 check 一次）。
    pub fn pending_version(&self) -> Option<String> {
        self.session
            .lock()
            .ok()
            .and_then(|s| s.pending_version.clone())
    }

    /// 是否应向前端推送下载进度（取消后为 false）。
    pub fn should_emit_progress(&self) -> bool {
        self.session.lock().map(|s| s.emit_progress).unwrap_or(true)
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
    pub async fn get_settings(&self) -> Result<UpdateSettings, ApplicationError> {
        let mut settings = self.settings_port.load().await?;
        settings.check_interval_secs = normalize_check_interval_secs(settings.check_interval_secs);
        Ok(settings)
    }

    /// 检查更新（IPC：`manual=true` → Manual，否则 Scheduled）。
    pub async fn check_update(&self, manual: bool) -> Result<Option<UpdateInfo>, ApplicationError> {
        self.check_update_with(if manual {
            UpdateCheckKind::Manual
        } else {
            UpdateCheckKind::Scheduled
        })
        .await
    }

    /// 检查更新。
    ///
    /// - [`UpdateCheckKind::Manual`]：绕过节流和跳过版本过滤。
    /// - [`UpdateCheckKind::Scheduled`]：受间隔节流；Manual 模式不查；尊重跳过列表。
    /// - [`UpdateCheckKind::Startup`]：启动首次，不受间隔节流；仍尊重 Manual 模式与跳过列表。
    pub async fn check_update_with(
        &self,
        kind: UpdateCheckKind,
    ) -> Result<Option<UpdateInfo>, ApplicationError> {
        let settings = self.settings_port.load().await?;
        let is_manual = kind == UpdateCheckKind::Manual;

        if !is_manual {
            // 手动模式不自动检查
            if settings.check_mode == UpdateCheckMode::Manual {
                return Ok(None);
            }
            // 定期自动受间隔节流；启动首次故意绕过，避免「有更新但 6h 内静默」
            if kind == UpdateCheckKind::Scheduled {
                let now = Utc::now().timestamp();
                let interval = normalize_check_interval_secs(settings.check_interval_secs);
                if !should_auto_check_with_interval(now, settings.last_checked_at, interval) {
                    return Ok(None);
                }
            }
        }

        // 向远端查询
        let update = self.port.check(settings.channel).await?;

        // 非手动：若远端仍是用户跳过的那个版本，视为无更新
        // 手动：仍返回该版本，并清除跳过记录（用户主动再查 = 愿意再看到）
        let (update, clear_skip) = if !is_manual {
            match update {
                Some(ref info)
                    if is_version_skipped(settings.skipped_version.as_deref(), &info.version) =>
                {
                    (None, false)
                }
                other => (other, false),
            }
        } else {
            let clear = update.as_ref().is_some_and(|info| {
                settings.skipped_version.as_deref() == Some(info.version.as_str())
            });
            (update, clear)
        };

        // 更新 last_checked_at；手动检查到已跳过版本时一并清 skip
        let mut new_settings = settings.clone();
        new_settings.last_checked_at = Some(Utc::now().timestamp());
        if clear_skip {
            new_settings.skipped_version = None;
        }
        self.settings_port.save(&new_settings).await?;

        self.apply_check_result_to_session(update.as_ref());

        Ok(update)
    }

    /// 将检查结果写入进程内会话，供前端 hydrate（避免仅依赖可能丢失的 emit）。
    fn apply_check_result_to_session(&self, update: Option<&UpdateInfo>) {
        let Ok(mut s) = self.session.lock() else {
            return;
        };
        // 下载中 / 已就绪时不降级会话
        if s.in_flight
            || s.phase == UpdateSessionPhase::Downloading
            || s.phase == UpdateSessionPhase::Ready
        {
            if let Some(info) = update {
                s.pending_version = Some(info.version.clone());
                s.pending_body = info.body.clone();
                s.pending_pub_date = info.pub_date.clone();
            }
            return;
        }

        match update {
            Some(info) => {
                s.pending_version = Some(info.version.clone());
                s.pending_body = info.body.clone();
                s.pending_pub_date = info.pub_date.clone();
                s.version = Some(info.version.clone());
                s.phase = UpdateSessionPhase::Available;
                s.downloaded = 0;
                s.total = None;
            }
            None => {
                // 无更新：清掉「仅有 available」的悬挂态
                if s.phase == UpdateSessionPhase::Available {
                    s.phase = UpdateSessionPhase::Idle;
                    s.version = None;
                    s.pending_version = None;
                    s.pending_body = None;
                    s.pending_pub_date = None;
                    s.downloaded = 0;
                    s.total = None;
                }
            }
        }
    }

    /// 下载更新包并**暂存**（不安装）。
    ///
    /// - 同一时刻最多一次下载：若已有下载在进行，返回 `Ok(Completed)` 幂等忽略。
    /// - 下载在独立 task 中运行，可通过 [`Self::cancel_download`] abort 真正中断网络。
    /// - `Ok(Cancelled)`：用户取消；`Ok(Completed)`：下载完成，等待用户重启安装。
    ///
    /// **重要**：Windows 上 `install` 会立刻跑安装器并退出进程；因此必须与下载拆开，
    /// 只有用户点「重启」时才 [`Self::apply_and_restart`]。
    pub async fn download_and_install(
        &self,
        on_progress: impl Fn(u64, Option<u64>) + Send + Sync + 'static,
    ) -> Result<DownloadOutcome, ApplicationError> {
        {
            let mut s = self.session.lock().unwrap_or_else(|e| e.into_inner());
            if s.in_flight {
                // 已有下载：幂等忽略；版本取当前会话。
                let version = s.version.clone().unwrap_or_default();
                return Ok(DownloadOutcome::Completed { version });
            }
            // 已就绪且包还在：幂等
            if s.phase == UpdateSessionPhase::Ready && s.staged_package.is_some() {
                let version = s.version.clone().unwrap_or_default();
                return Ok(DownloadOutcome::Completed { version });
            }
            s.in_flight = true;
            s.phase = UpdateSessionPhase::Downloading;
            s.downloaded = 0;
            s.total = None;
            s.version = s.pending_version.clone();
            s.staged_package = None;
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
            port.download_package(channel, move |downloaded, total| {
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
            Ok(Ok((version, bytes))) => {
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
                    s.version = Some(version.clone());
                    s.pending_version = Some(version.clone());
                    s.staged_package = Some(bytes);
                    s.cancel_requested = false;
                }
                Ok(DownloadOutcome::Completed { version })
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
                    // 下载失败但仍有 pending → 回到 available，便于用户重试
                    s.phase = if s.pending_version.is_some() {
                        UpdateSessionPhase::Available
                    } else {
                        UpdateSessionPhase::Idle
                    };
                    s.version = s.pending_version.clone();
                    s.staged_package = None;
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
                    Err(ApplicationError::update(format!(
                        "下载任务异常结束: {join_err}"
                    )))
                }
            }
        }
    }

    fn reset_session_after_cancel(&self) {
        if let Ok(mut s) = self.session.lock() {
            // 保留 pending_*，回到 available 便于再次下载
            s.phase = if s.pending_version.is_some() {
                UpdateSessionPhase::Available
            } else {
                UpdateSessionPhase::Idle
            };
            s.downloaded = 0;
            s.total = None;
            s.staged_package = None;
            s.emit_progress = true;
            s.cancel_requested = false;
            s.abort_handle = None;
            s.version = s.pending_version.clone();
        }
    }

    /// 安装已暂存的更新并重启。
    ///
    /// - 有暂存包：先 `install_package`（Windows 通常直接 exit + 安装器拉起新版本）
    /// - 无暂存包：仅 `restart`（兜底）
    pub async fn apply_and_restart(&self) -> Result<(), ApplicationError> {
        let settings = self.settings_port.load().await?;
        let staged = self
            .session
            .lock()
            .map(|mut s| s.staged_package.take())
            .unwrap_or(None);

        if let Some(bytes) = staged {
            // Windows：install 内部 process::exit，不会返回
            self.port.install_package(settings.channel, bytes).await?;
        }

        self.port.restart().await
    }

    /// 重启应用（不安装）。
    pub async fn restart(&self) -> Result<(), ApplicationError> {
        self.port.restart().await
    }

    /// 设置更新检查模式。
    pub async fn set_check_mode(&self, mode: UpdateCheckMode) -> Result<(), ApplicationError> {
        let mut settings = self.settings_port.load().await?;
        settings.check_mode = mode;
        self.settings_port.save(&settings).await
    }

    /// 设置更新渠道。
    pub async fn set_channel(&self, channel: UpdateChannel) -> Result<(), ApplicationError> {
        let mut settings = self.settings_port.load().await?;
        settings.channel = channel;
        self.settings_port.save(&settings).await
    }

    /// 设置自动检查间隔（秒）；非法值会收敛到默认 6 小时。
    pub async fn set_check_interval_secs(
        &self,
        interval_secs: i64,
    ) -> Result<(), ApplicationError> {
        let mut settings = self.settings_port.load().await?;
        settings.check_interval_secs = normalize_check_interval_secs(interval_secs);
        self.settings_port.save(&settings).await
    }

    /// 记录「跳过此版本」（覆盖为单一值；出新版本号后会再次提醒）。
    pub async fn skip_version(&self, version: String) -> Result<(), ApplicationError> {
        let mut settings = self.settings_port.load().await?;
        settings.skipped_version = Some(version.clone());
        self.settings_port.save(&settings).await?;

        // 若跳过的是当前 pending，清掉 available 会话
        if let Ok(mut s) = self.session.lock() {
            if s.pending_version.as_deref() == Some(version.as_str())
                && !s.in_flight
                && s.phase != UpdateSessionPhase::Downloading
                && s.phase != UpdateSessionPhase::Ready
            {
                s.phase = UpdateSessionPhase::Idle;
                s.version = None;
                s.pending_version = None;
                s.pending_body = None;
                s.pending_pub_date = None;
                s.downloaded = 0;
                s.total = None;
            }
        }
        Ok(())
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
        ) -> Result<Option<UpdateInfo>, ApplicationError> {
            Ok(self.latest_version.map(|v| UpdateInfo {
                version: v.to_string(),
                body: Some("test notes".into()),
                pub_date: None,
            }))
        }

        async fn download_package(
            &self,
            _channel: UpdateChannel,
            _on_progress: impl Fn(u64, Option<u64>) + Send + Sync + 'static,
        ) -> Result<(String, Vec<u8>), ApplicationError> {
            *self.download_called.lock().unwrap() = true;
            *self.download_count.lock().unwrap() += 1;
            if self.download_delay_ms > 0 {
                tokio::time::sleep(std::time::Duration::from_millis(self.download_delay_ms)).await;
            }
            Ok((
                self.latest_version.unwrap_or("0.0.0").to_string(),
                vec![0u8; 8],
            ))
        }

        async fn install_package(
            &self,
            _channel: UpdateChannel,
            _bytes: Vec<u8>,
        ) -> Result<(), ApplicationError> {
            Ok(())
        }

        async fn restart(&self) -> Result<(), ApplicationError> {
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
        async fn load(&self) -> Result<UpdateSettings, ApplicationError> {
            Ok(self.settings.lock().unwrap().clone())
        }

        async fn save(&self, settings: &UpdateSettings) -> Result<(), ApplicationError> {
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
            skipped_version: Some("0.2.0".to_string()),
            last_checked_at: Some(Utc::now().timestamp()), // 刚检查过
            ..Default::default()
        });
        let service = UpdateService::new(port, settings_port);

        let result = service.check_update(true).await.unwrap();
        assert!(result.is_some());
        assert_eq!(result.unwrap().version, "0.2.0");
        // 手动检查会清除对该版本的跳过
        assert!(service
            .get_settings()
            .await
            .unwrap()
            .skipped_version
            .is_none());
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
            skipped_version: Some("0.2.0".to_string()),
            ..Default::default()
        });
        let service = UpdateService::new(port, settings_port);

        let result = service.check_update(false).await.unwrap();
        assert!(result.is_none());
    }

    #[tokio::test]
    async fn skip_version_should_store_single_value() {
        let port = MockUpdatePort::new(None);
        let settings_port = MockSettingsPort::new(UpdateSettings::default());
        let service = UpdateService::new(port, settings_port);

        service.skip_version("0.2.0".to_string()).await.unwrap();
        service.skip_version("0.3.0".to_string()).await.unwrap();
        let settings = service.get_settings().await.unwrap();
        assert_eq!(settings.skipped_version.as_deref(), Some("0.3.0"));
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
        assert!(matches!(r1.unwrap(), DownloadOutcome::Completed { .. }));
    }

    #[tokio::test]
    async fn download_when_already_ready_is_idempotent() {
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

        assert!(matches!(
            service.download_and_install(|_, _| {}).await.unwrap(),
            DownloadOutcome::Completed { version } if version == "0.2.0"
        ));
        // 已有暂存包时不再重复下载
        assert!(matches!(
            service.download_and_install(|_, _| {}).await.unwrap(),
            DownloadOutcome::Completed { version } if version == "0.2.0"
        ));
        assert_eq!(*download_count.lock().unwrap(), 1);
        assert_eq!(service.session_snapshot().phase, UpdateSessionPhase::Ready);
    }

    #[tokio::test]
    async fn apply_and_restart_consumes_staged_package() {
        let port = MockUpdatePort::new(Some("0.2.0"));
        let restart_called = Arc::clone(&port.restart_called);
        let settings_port = MockSettingsPort::new(UpdateSettings::default());
        let service = UpdateService::new(port, settings_port);

        let _ = service.download_and_install(|_, _| {}).await.unwrap();
        assert_eq!(service.session_snapshot().phase, UpdateSessionPhase::Ready);

        service.apply_and_restart().await.unwrap();
        assert!(*restart_called.lock().unwrap());
    }

    #[tokio::test]
    async fn session_snapshot_tracks_ready_after_download() {
        let port = MockUpdatePort::new(Some("0.3.0"));
        let settings_port = MockSettingsPort::new(UpdateSettings::default());
        let service = UpdateService::new(port, settings_port);

        let info = service.check_update(true).await.unwrap().unwrap();
        assert_eq!(info.version, "0.3.0");
        assert!(matches!(
            service.download_and_install(|_, _| {}).await.unwrap(),
            DownloadOutcome::Completed { version } if version == "0.3.0"
        ));

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
        assert_eq!(
            service.session_snapshot().phase,
            UpdateSessionPhase::Available
        );

        // 取消后可重新下载
        assert!(matches!(
            service.download_and_install(|_, _| {}).await.unwrap(),
            DownloadOutcome::Completed { version } if version == "0.3.0"
        ));
    }

    #[tokio::test]
    async fn check_should_mark_session_available() {
        let port = MockUpdatePort::new(Some("0.4.0"));
        let settings_port = MockSettingsPort::new(UpdateSettings::default());
        let service = UpdateService::new(port, settings_port);

        let info = service.check_update(true).await.unwrap().unwrap();
        assert_eq!(info.version, "0.4.0");

        let snap = service.session_snapshot();
        assert_eq!(snap.phase, UpdateSessionPhase::Available);
        assert_eq!(snap.version.as_deref(), Some("0.4.0"));
    }

    #[tokio::test]
    async fn startup_check_should_bypass_throttle_but_respect_skip_list() {
        let port = MockUpdatePort::new(Some("0.5.0"));
        let settings_port = MockSettingsPort::new(UpdateSettings {
            check_mode: UpdateCheckMode::NotifyOnly,
            last_checked_at: Some(Utc::now().timestamp()), // 刚检查过
            skipped_version: None,
            ..Default::default()
        });
        let service = UpdateService::new(port, settings_port);

        // Scheduled 被节流
        assert!(service
            .check_update_with(UpdateCheckKind::Scheduled)
            .await
            .unwrap()
            .is_none());

        // Startup 绕过节流
        let info = service
            .check_update_with(UpdateCheckKind::Startup)
            .await
            .unwrap();
        assert_eq!(info.unwrap().version, "0.5.0");
        assert_eq!(
            service.session_snapshot().phase,
            UpdateSessionPhase::Available
        );
    }

    #[tokio::test]
    async fn startup_check_should_respect_manual_mode() {
        let port = MockUpdatePort::new(Some("0.5.0"));
        let settings_port = MockSettingsPort::new(UpdateSettings {
            check_mode: UpdateCheckMode::Manual,
            ..Default::default()
        });
        let service = UpdateService::new(port, settings_port);

        assert!(service
            .check_update_with(UpdateCheckKind::Startup)
            .await
            .unwrap()
            .is_none());
    }
}

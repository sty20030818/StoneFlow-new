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
    Installing,
}

/// 快照中公开的更新身份；opaque handle 只保留在后端会话内。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSessionIdentity {
    pub version: String,
    pub channel: UpdateChannel,
}

/// 下载进度。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSessionProgress {
    pub downloaded: u64,
    pub total: Option<u64>,
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

/// 一次检查的明确结果；只有 `NoUpdate` 表示远端检查已完成且确实没有更新。
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum UpdateCheckOutcome {
    Found(UpdateInfo),
    NoUpdate,
    /// 因模式、节流、跳过列表或活动事务而未执行/提交检查。
    Skipped,
    /// 检查期间设置或会话身份变化，本次结果已作废。
    Superseded,
}

/// 更新会话快照。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSessionSnapshot {
    /// 单调递增的后端快照版本；旧事件不得覆盖新快照。
    pub revision: u64,
    pub phase: UpdateSessionPhase,
    pub update: Option<UpdateSessionIdentity>,
    pub progress: Option<UpdateSessionProgress>,
    pub error_message: Option<String>,
}

type DownloadProgress = UpdateSessionProgress;

/// 已通过 updater 验证、可直接交给平台安装器的不可变资产。
struct StagedUpdate<H> {
    checked: Arc<CheckedUpdate<H>>,
    bytes: Vec<u8>,
}

enum SessionState<H> {
    Idle,
    Available {
        checked: Arc<CheckedUpdate<H>>,
    },
    Downloading {
        checked: Arc<CheckedUpdate<H>>,
        progress: DownloadProgress,
        abort_handle: Option<tokio::task::AbortHandle>,
        epoch: u64,
        /// 渠道已切换时，下载仍可完成，但取消/失败不得恢复旧渠道候选。
        restore_available: bool,
    },
    Ready {
        staged: Arc<StagedUpdate<H>>,
    },
    Installing {
        staged: Arc<StagedUpdate<H>>,
    },
}

struct SessionInner<H> {
    revision: u64,
    operation_epoch: u64,
    state: SessionState<H>,
    /// 错误归属由 phase 唯一决定：Idle=check、Available=download、Ready=install。
    error_message: Option<String>,
}

impl<H> Default for SessionInner<H> {
    fn default() -> Self {
        Self {
            revision: 0,
            operation_epoch: 0,
            state: SessionState::Idle,
            error_message: None,
        }
    }
}

impl<H> SessionInner<H> {
    fn next_epoch(&mut self) -> u64 {
        self.operation_epoch = self.operation_epoch.wrapping_add(1);
        self.operation_epoch
    }

    fn bump_revision(&mut self) {
        self.revision = self.revision.wrapping_add(1);
    }

    fn clear_error(&mut self) {
        self.error_message = None;
    }

    fn commit_error(&mut self, error: &ApplicationError) {
        self.error_message = Some(error.to_string());
        self.bump_revision();
    }
}

/// 下载请求结果。
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DownloadOutcome {
    /// 下载并预装完成，等待重启。
    Completed { version: String },
    /// 相同更新身份已在下载，本次请求未重复启动网络任务。
    InProgress,
    /// 用户在下载中取消（网络任务已 abort）。
    Cancelled,
}

/// 下载 future 被上层取消时，恢复候选并中断底层网络 task。
struct DownloadOperationGuard<H> {
    session: Arc<Mutex<SessionInner<H>>>,
    epoch: u64,
    armed: bool,
}

impl<H> DownloadOperationGuard<H> {
    fn new(session: Arc<Mutex<SessionInner<H>>>, epoch: u64) -> Self {
        Self {
            session,
            epoch,
            armed: true,
        }
    }

    fn disarm(&mut self) {
        self.armed = false;
    }
}

impl<H> Drop for DownloadOperationGuard<H> {
    fn drop(&mut self) {
        if !self.armed {
            return;
        }
        let abort_handle = {
            let Ok(mut session) = self.session.lock() else {
                return;
            };
            let previous = std::mem::replace(&mut session.state, SessionState::Idle);
            match previous {
                SessionState::Downloading {
                    checked,
                    abort_handle,
                    restore_available,
                    epoch,
                    ..
                } if epoch == self.epoch => {
                    session.next_epoch();
                    if restore_available {
                        session.state = SessionState::Available { checked };
                    }
                    session.bump_revision();
                    abort_handle
                }
                other => {
                    session.state = other;
                    None
                }
            }
        };
        if let Some(handle) = abort_handle {
            handle.abort();
        }
    }
}

/// 从远端检查到的更新信息。
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub version: String,
}

/// 一次有效检查产生的不可变更新身份；`H` 由 runtime adapter 决定。
pub struct CheckedUpdate<H> {
    pub version: String,
    pub channel: UpdateChannel,
    pub handle: H,
}

/// 更新操作 Port —— 由 runtime 层的 Tauri adapter 实现。
pub trait UpdatePort: Send + Sync {
    type Handle: Send + Sync + 'static;

    /// 向远端检查更新，并交付后续下载、安装必须复用的 opaque handle。
    fn check(
        &self,
        channel: UpdateChannel,
    ) -> impl Future<Output = Result<Option<CheckedUpdate<Self::Handle>>, ApplicationError>> + Send;

    /// 使用检查阶段交付的 exact handle 下载并校验安装包，不得再次检查远端。
    fn download_package(
        &self,
        checked: Arc<CheckedUpdate<Self::Handle>>,
        on_progress: impl Fn(u64, Option<u64>) + Send + Sync + 'static,
    ) -> impl Future<Output = Result<Vec<u8>, ApplicationError>> + Send;

    /// 使用原检查 handle 安装已暂存的安装包，不得重新查询远端。
    /// Windows 上会启动安装器并 `exit` 当前进程（随后由安装器重启）；Unix 上通常返回后再 `restart`。
    fn install_package(
        &self,
        checked: Arc<CheckedUpdate<Self::Handle>>,
        bytes: Vec<u8>,
    ) -> impl Future<Output = Result<(), ApplicationError>> + Send;

    /// 安装完成后重启应用；Windows 安装路径通常由安装器接管而不会调用。
    fn restart(&self) -> impl Future<Output = Result<(), ApplicationError>> + Send;
}

/// 更新设置持久化 Port —— 由 runtime 层实现。
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
    /// 串行化完整检查，避免后台检查使并发的手动结果失效。
    check_gate: tokio::sync::Mutex<()>,
    /// 只串行化 update settings 的 load-modify-save，不覆盖网络或安装 I/O。
    settings_write: tokio::sync::Mutex<()>,
    /// 进程内下载会话（单飞 + hydrate 快照）。
    session: Arc<Mutex<SessionInner<P::Handle>>>,
}

impl<P: UpdatePort + Clone + 'static, S: UpdateSettingsPort> UpdateService<P, S> {
    pub fn new(port: P, settings_port: S) -> Self {
        Self {
            port,
            settings_port,
            check_gate: tokio::sync::Mutex::new(()),
            settings_write: tokio::sync::Mutex::new(()),
            session: Arc::new(Mutex::new(SessionInner::default())),
        }
    }

    /// 当前是否有进行中的下载。
    pub fn is_download_in_flight(&self) -> bool {
        self.session
            .lock()
            .map(|s| matches!(s.state, SessionState::Downloading { .. }))
            .unwrap_or(false)
    }

    /// 读取进程内更新会话快照（前端挂载时 hydrate）。
    pub fn session_snapshot(&self) -> UpdateSessionSnapshot {
        let s = self.session.lock().unwrap_or_else(|e| e.into_inner());
        let (phase, checked, progress) = match &s.state {
            SessionState::Idle => (UpdateSessionPhase::Idle, None, None),
            SessionState::Available { checked } => {
                (UpdateSessionPhase::Available, Some(checked.as_ref()), None)
            }
            SessionState::Downloading {
                checked, progress, ..
            } => (
                UpdateSessionPhase::Downloading,
                Some(checked.as_ref()),
                Some(progress.clone()),
            ),
            SessionState::Ready { staged } => (
                UpdateSessionPhase::Ready,
                Some(staged.checked.as_ref()),
                None,
            ),
            SessionState::Installing { staged } => (
                UpdateSessionPhase::Installing,
                Some(staged.checked.as_ref()),
                None,
            ),
        };
        UpdateSessionSnapshot {
            revision: s.revision,
            phase,
            update: checked.map(|checked| UpdateSessionIdentity {
                version: checked.version.clone(),
                channel: checked.channel,
            }),
            progress,
            error_message: s.error_message.clone(),
        }
    }

    fn commit_check_error(&self, error: &ApplicationError) {
        let mut session = self.session.lock().unwrap_or_else(|e| e.into_inner());
        if matches!(session.state, SessionState::Idle) {
            session.commit_error(error);
        }
    }

    fn commit_install_error_for_staged(
        &self,
        staged: &Arc<StagedUpdate<P::Handle>>,
        error: &ApplicationError,
    ) {
        let mut session = self.session.lock().unwrap_or_else(|e| e.into_inner());
        if matches!(
            &session.state,
            SessionState::Ready { staged: current } if Arc::ptr_eq(current, staged)
        ) {
            session.commit_error(error);
        }
    }

    fn commit_check_error_for_epoch(&self, epoch: u64, error: &ApplicationError) {
        let mut session = self.session.lock().unwrap_or_else(|e| e.into_inner());
        if session.operation_epoch == epoch && matches!(session.state, SessionState::Idle) {
            session.commit_error(error);
        }
    }

    /// 取消**下载中**的更新：abort 下载 task，断开 HTTP 流。
    ///
    /// 已进入 install 的极短窗口内可能无法打断；完成后（Ready）调用无效。
    pub fn cancel_download(&self) {
        let handle = {
            let mut session = match self.session.lock() {
                Ok(g) => g,
                Err(e) => e.into_inner(),
            };
            let previous = std::mem::replace(&mut session.state, SessionState::Idle);
            match previous {
                SessionState::Downloading {
                    checked,
                    abort_handle,
                    restore_available,
                    ..
                } => {
                    session.next_epoch();
                    if restore_available {
                        session.state = SessionState::Available { checked };
                    }
                    session.bump_revision();
                    abort_handle
                }
                other => {
                    session.state = other;
                    return;
                }
            }
        };
        if let Some(handle) = handle {
            handle.abort();
        }
    }

    /// 读取当前更新设置（间隔字段已规范化）。
    pub async fn get_settings(&self) -> Result<UpdateSettings, ApplicationError> {
        let _settings_write = self.settings_write.lock().await;
        let mut settings = self.settings_port.load().await?;
        settings.check_interval_secs = normalize_check_interval_secs(settings.check_interval_secs);
        Ok(settings)
    }

    /// 手动检查更新。
    pub async fn check_update(&self) -> Result<UpdateCheckOutcome, ApplicationError> {
        self.check_update_with(UpdateCheckKind::Manual).await
    }

    /// 检查更新。
    ///
    /// - [`UpdateCheckKind::Manual`]：绕过节流和跳过版本过滤。
    /// - [`UpdateCheckKind::Scheduled`]：受间隔节流；Manual 模式不查；尊重跳过列表。
    /// - [`UpdateCheckKind::Startup`]：启动首次，不受间隔节流；仍尊重 Manual 模式与跳过列表。
    pub async fn check_update_with(
        &self,
        kind: UpdateCheckKind,
    ) -> Result<UpdateCheckOutcome, ApplicationError> {
        let _check_gate = self.check_gate.lock().await;

        {
            let session = self.session.lock().unwrap_or_else(|e| e.into_inner());
            if matches!(
                session.state,
                SessionState::Downloading { .. }
                    | SessionState::Ready { .. }
                    | SessionState::Installing { .. }
            ) {
                return Ok(UpdateCheckOutcome::Skipped);
            }
        }

        let settings = {
            let _settings_write = self.settings_write.lock().await;
            match self.settings_port.load().await {
                Ok(settings) => settings,
                Err(error) => {
                    self.commit_check_error(&error);
                    return Err(error);
                }
            }
        };
        let is_manual = kind == UpdateCheckKind::Manual;

        if !is_manual {
            // 手动模式不自动检查
            if settings.check_mode == UpdateCheckMode::Manual {
                return Ok(UpdateCheckOutcome::Skipped);
            }
            // 定期自动受间隔节流；启动首次故意绕过，避免「有更新但 6h 内静默」
            if kind == UpdateCheckKind::Scheduled {
                let now = Utc::now().timestamp();
                let interval = normalize_check_interval_secs(settings.check_interval_secs);
                if !should_auto_check_with_interval(now, settings.last_checked_at, interval) {
                    return Ok(UpdateCheckOutcome::Skipped);
                }
            }
        }

        let epoch = {
            let mut session = self.session.lock().unwrap_or_else(|e| e.into_inner());
            if matches!(
                session.state,
                SessionState::Downloading { .. }
                    | SessionState::Ready { .. }
                    | SessionState::Installing { .. }
            ) {
                return Ok(UpdateCheckOutcome::Skipped);
            }
            session.next_epoch()
        };

        let requested_channel = settings.channel;
        let update = match self.port.check(requested_channel).await {
            Ok(update) => update,
            Err(error) => {
                self.commit_check_error_for_epoch(epoch, &error);
                return Err(error);
            }
        };
        if update
            .as_ref()
            .is_some_and(|checked| checked.channel != requested_channel)
        {
            let error = ApplicationError::update("更新检查返回了与请求不一致的渠道".to_string());
            self.commit_check_error_for_epoch(epoch, &error);
            return Err(error);
        }

        // 网络返回后重读最新设置：本次 check 只写自己拥有的字段，
        // 不用网络前的快照覆盖并发渠道/模式变更。
        let _settings_write = self.settings_write.lock().await;
        let mut settings = match self.settings_port.load().await {
            Ok(settings) => settings,
            Err(error) => {
                self.commit_check_error_for_epoch(epoch, &error);
                return Err(error);
            }
        };
        if settings.channel != requested_channel {
            return Ok(UpdateCheckOutcome::Superseded);
        }

        {
            let session = self.session.lock().unwrap_or_else(|e| e.into_inner());
            if session.operation_epoch != epoch
                || matches!(
                    session.state,
                    SessionState::Downloading { .. }
                        | SessionState::Ready { .. }
                        | SessionState::Installing { .. }
                )
            {
                return Ok(UpdateCheckOutcome::Superseded);
            }
        }

        // 非手动：若远端仍是用户跳过的那个版本，本次检查提交但不对外提示
        // 手动：仍返回该版本，并清除跳过记录（用户主动再查 = 愿意再看到）
        let (update, clear_skip, skipped) = if !is_manual {
            match update {
                Some(ref info)
                    if is_version_skipped(settings.skipped_version.as_deref(), &info.version) =>
                {
                    (None, false, true)
                }
                other => (other, false, false),
            }
        } else {
            let clear = update.as_ref().is_some_and(|info| {
                settings.skipped_version.as_deref() == Some(info.version.as_str())
            });
            (update, clear, false)
        };

        // 更新 last_checked_at；手动检查到已跳过版本时一并清 skip
        settings.last_checked_at = Some(Utc::now().timestamp());
        if clear_skip {
            settings.skipped_version = None;
        }
        if let Err(error) = self.settings_port.save(&settings).await {
            self.commit_check_error_for_epoch(epoch, &error);
            return Err(error);
        }

        let info = update.as_ref().map(|checked| UpdateInfo {
            version: checked.version.clone(),
        });
        let mut session = self.session.lock().unwrap_or_else(|e| e.into_inner());
        if session.operation_epoch != epoch
            || matches!(
                session.state,
                SessionState::Downloading { .. }
                    | SessionState::Ready { .. }
                    | SessionState::Installing { .. }
            )
        {
            return Ok(UpdateCheckOutcome::Superseded);
        }
        let changed = update.is_some()
            || !matches!(session.state, SessionState::Idle)
            || session.error_message.is_some();
        session.state = update.map_or(SessionState::Idle, |checked| SessionState::Available {
            checked: Arc::new(checked),
        });
        if changed {
            session.clear_error();
            session.bump_revision();
        }

        Ok(match info {
            Some(info) => UpdateCheckOutcome::Found(info),
            None if skipped => UpdateCheckOutcome::Skipped,
            None => UpdateCheckOutcome::NoUpdate,
        })
    }

    /// 下载更新包并**暂存**（不安装）。
    ///
    /// - 同一时刻最多一次下载：重复请求不启动网络，也不误报 Ready。
    /// - 下载在独立 task 中运行，可通过 [`Self::cancel_download`] abort 真正中断网络。
    /// - `Ok(InProgress)`：相同身份已在下载；`Ok(Cancelled)`：用户取消；
    ///   `Ok(Completed)`：下载完成，等待用户重启安装。
    ///
    /// **重要**：Windows 上 `install` 会立刻跑安装器并退出进程；因此必须与下载拆开，
    /// 只有用户点「重启」时才 [`Self::install_staged_update`]。
    pub async fn download_update(
        &self,
        expected_version: &str,
        expected_channel: UpdateChannel,
        on_progress: impl Fn(u64, Option<u64>) + Send + Sync + 'static,
    ) -> Result<DownloadOutcome, ApplicationError> {
        let (checked, epoch) = {
            let mut session = self.session.lock().unwrap_or_else(|e| e.into_inner());
            let checked = match &session.state {
                SessionState::Downloading { checked, .. } => {
                    if checked.version == expected_version && checked.channel == expected_channel {
                        return Ok(DownloadOutcome::InProgress);
                    }
                    return Err(ApplicationError::conflict(
                        "正在下载的更新与请求身份不一致".to_string(),
                    ));
                }
                SessionState::Ready { staged } => {
                    if staged.checked.version != expected_version
                        || staged.checked.channel != expected_channel
                    {
                        return Err(ApplicationError::conflict(
                            "已暂存的更新与请求身份不一致".to_string(),
                        ));
                    }
                    return Ok(DownloadOutcome::Completed {
                        version: staged.checked.version.clone(),
                    });
                }
                SessionState::Installing { staged } => {
                    if staged.checked.version != expected_version
                        || staged.checked.channel != expected_channel
                    {
                        return Err(ApplicationError::conflict(
                            "正在安装的更新与请求身份不一致".to_string(),
                        ));
                    }
                    return Ok(DownloadOutcome::Completed {
                        version: staged.checked.version.clone(),
                    });
                }
                SessionState::Available { checked }
                    if checked.version == expected_version
                        && checked.channel == expected_channel =>
                {
                    Arc::clone(checked)
                }
                SessionState::Available { .. } => {
                    return Err(ApplicationError::conflict(
                        "可下载的更新与请求身份不一致".to_string(),
                    ));
                }
                SessionState::Idle => {
                    return Err(ApplicationError::conflict(
                        "没有可下载的已检查更新".to_string(),
                    ));
                }
            };
            let epoch = session.next_epoch();
            session.state = SessionState::Downloading {
                checked: Arc::clone(&checked),
                progress: DownloadProgress {
                    downloaded: 0,
                    total: None,
                },
                abort_handle: None,
                epoch,
                restore_available: true,
            };
            session.clear_error();
            session.bump_revision();
            (checked, epoch)
        };
        let mut guard = DownloadOperationGuard::new(Arc::clone(&self.session), epoch);
        on_progress(0, None);
        let session = Arc::clone(&self.session);
        let port = self.port.clone();
        let checked_for_download = Arc::clone(&checked);

        let join = tokio::spawn(async move {
            port.download_package(checked_for_download, move |downloaded, total| {
                let committed = if let Ok(mut current) = session.lock() {
                    let operation_is_current = current.operation_epoch == epoch;
                    let committed = match &mut current.state {
                        SessionState::Downloading {
                            progress,
                            epoch: current_epoch,
                            ..
                        } if *current_epoch == epoch && operation_is_current => {
                            if progress.downloaded == downloaded && progress.total == total {
                                false
                            } else {
                                progress.downloaded = downloaded;
                                progress.total = total;
                                true
                            }
                        }
                        _ => false,
                    };
                    if committed {
                        current.bump_revision();
                    }
                    committed
                } else {
                    false
                };
                if committed {
                    on_progress(downloaded, total);
                }
            })
            .await
        });

        self.register_download_abort(epoch, join.abort_handle());

        let join_result = join.await;
        let result = match join_result {
            Ok(Ok(bytes)) => {
                let committed = {
                    let mut session = self.session.lock().unwrap_or_else(|e| e.into_inner());
                    if session.operation_epoch == epoch
                        && matches!(
                            session.state,
                            SessionState::Downloading {
                                epoch: current_epoch,
                                ..
                            } if current_epoch == epoch
                        )
                    {
                        session.state = SessionState::Ready {
                            staged: Arc::new(StagedUpdate {
                                checked: Arc::clone(&checked),
                                bytes,
                            }),
                        };
                        session.clear_error();
                        session.bump_revision();
                        true
                    } else {
                        false
                    }
                };
                if committed {
                    Ok(DownloadOutcome::Completed {
                        version: checked.version.clone(),
                    })
                } else {
                    Ok(DownloadOutcome::Cancelled)
                }
            }
            Ok(Err(error)) => {
                if self.restore_available(epoch, Some(&error)) {
                    Err(error)
                } else {
                    Ok(DownloadOutcome::Cancelled)
                }
            }
            Err(join_error) => {
                if join_error.is_cancelled() {
                    self.restore_available(epoch, None);
                    Ok(DownloadOutcome::Cancelled)
                } else {
                    let error = ApplicationError::update(format!("下载任务异常结束: {join_error}"));
                    if self.restore_available(epoch, Some(&error)) {
                        Err(error)
                    } else {
                        Ok(DownloadOutcome::Cancelled)
                    }
                }
            }
        };
        guard.disarm();
        result
    }

    /// 注册晚到的 abort handle；若该 operation 已被取消或替换，立即补偿 abort。
    fn register_download_abort(&self, epoch: u64, abort_handle: tokio::task::AbortHandle) {
        let abort_immediately = {
            let mut session = self.session.lock().unwrap_or_else(|e| e.into_inner());
            let operation_is_current = session.operation_epoch == epoch;
            match &mut session.state {
                SessionState::Downloading {
                    abort_handle: slot,
                    epoch: current_epoch,
                    ..
                } if *current_epoch == epoch && operation_is_current => {
                    *slot = Some(abort_handle.clone());
                    false
                }
                _ => true,
            }
        };
        if abort_immediately {
            abort_handle.abort();
        }
    }

    fn restore_available(&self, epoch: u64, error: Option<&ApplicationError>) -> bool {
        let mut session = self.session.lock().unwrap_or_else(|e| e.into_inner());
        if session.operation_epoch != epoch {
            return false;
        }
        let previous = std::mem::replace(&mut session.state, SessionState::Idle);
        match previous {
            SessionState::Downloading {
                checked,
                epoch: current_epoch,
                restore_available,
                ..
            } if current_epoch == epoch => {
                if restore_available {
                    session.state = SessionState::Available { checked };
                    if let Some(error) = error {
                        session.error_message = Some(error.to_string());
                    }
                }
                session.bump_revision();
                true
            }
            other => {
                session.state = other;
                false
            }
        }
    }

    /// 安装指定版本的已暂存更新并重启。
    ///
    /// 仅 `Ready + expected_version` 可进入安装。当当前设置渠道与暂存渠道不同时，
    /// `confirmed_source_channel` 必须精确确认暂存渠道。
    pub async fn install_staged_update(
        &self,
        expected_version: &str,
        confirmed_source_channel: Option<UpdateChannel>,
        on_session_changed: impl Fn() + Send + Sync,
    ) -> Result<(), ApplicationError> {
        let expected_staged = {
            let session = self.session.lock().unwrap_or_else(|e| e.into_inner());
            match &session.state {
                SessionState::Ready { staged } if staged.checked.version == expected_version => {
                    Arc::clone(staged)
                }
                SessionState::Ready { staged } => {
                    return Err(ApplicationError::conflict(format!(
                        "暂存更新版本为 {}，与期望版本 {expected_version} 不一致",
                        staged.checked.version
                    )));
                }
                SessionState::Installing { staged }
                    if staged.checked.version == expected_version =>
                {
                    return Err(ApplicationError::conflict("更新安装已在进行"));
                }
                SessionState::Installing { .. } => {
                    return Err(ApplicationError::conflict(
                        "正在安装的更新与期望版本不一致".to_string(),
                    ));
                }
                SessionState::Idle
                | SessionState::Available { .. }
                | SessionState::Downloading { .. } => {
                    return Err(ApplicationError::conflict(
                        "没有可安装的已暂存更新".to_string(),
                    ));
                }
            }
        };

        let staged = {
            let _settings_write = self.settings_write.lock().await;
            let mut settings = match self.settings_port.load().await {
                Ok(settings) => settings,
                Err(error) => {
                    self.commit_install_error_for_staged(&expected_staged, &error);
                    return Err(error);
                }
            };
            let staged = {
                let mut session = self.session.lock().unwrap_or_else(|e| e.into_inner());
                let staged = match &session.state {
                    SessionState::Ready { staged } if Arc::ptr_eq(staged, &expected_staged) => {
                        Arc::clone(staged)
                    }
                    SessionState::Ready { .. } => {
                        return Err(ApplicationError::conflict(
                            "已暂存更新在安装确认期间发生变化".to_string(),
                        ));
                    }
                    SessionState::Installing { staged }
                        if staged.checked.version == expected_version =>
                    {
                        return Err(ApplicationError::conflict("更新安装已在进行"));
                    }
                    SessionState::Installing { .. } => {
                        return Err(ApplicationError::conflict(
                            "正在安装的更新与期望版本不一致".to_string(),
                        ));
                    }
                    SessionState::Idle
                    | SessionState::Available { .. }
                    | SessionState::Downloading { .. } => {
                        return Err(ApplicationError::conflict(
                            "没有可安装的已暂存更新".to_string(),
                        ));
                    }
                };
                if staged.checked.channel != settings.channel
                    && confirmed_source_channel != Some(staged.checked.channel)
                {
                    return Err(ApplicationError::conflict(format!(
                        "暂存更新来自 {}，当前设置为 {}，必须精确确认暂存渠道",
                        staged.checked.channel.path_segment(),
                        settings.channel.path_segment()
                    )));
                }

                session.state = SessionState::Installing {
                    staged: Arc::clone(&staged),
                };
                session.clear_error();
                session.bump_revision();
                staged
            };
            on_session_changed();

            settings.pending_restart_version = Some(staged.checked.version.clone());
            if let Err(error) = self.settings_port.save(&settings).await {
                settings.pending_restart_version = None;
                let error = match self.settings_port.save(&settings).await {
                    Ok(()) => error,
                    Err(cleanup_error) => ApplicationError::update(format!(
                        "{error}; 回滚更新完成标记失败: {cleanup_error}"
                    )),
                };
                self.restore_ready_after_install(Arc::clone(&staged), &error);
                on_session_changed();
                return Err(error);
            }
            staged
        };

        // Windows：install 内部 process::exit，不会返回。克隆仅发生在平台 API
        // 要求取得 Vec 的边界；会话始终保留同一个 staged，失败无需重新下载。
        if let Err(error) = self
            .port
            .install_package(Arc::clone(&staged.checked), staged.bytes.clone())
            .await
        {
            let error = self.recover_failed_install(staged, error).await;
            on_session_changed();
            return Err(error);
        }

        if let Err(error) = self.port.restart().await {
            let error = self.recover_failed_install(staged, error).await;
            on_session_changed();
            return Err(error);
        }
        Ok(())
    }

    fn restore_ready_after_install(
        &self,
        staged: Arc<StagedUpdate<P::Handle>>,
        error: &ApplicationError,
    ) {
        let mut session = self.session.lock().unwrap_or_else(|e| e.into_inner());
        let previous = std::mem::replace(&mut session.state, SessionState::Idle);
        match previous {
            SessionState::Installing { staged: current } if Arc::ptr_eq(&current, &staged) => {
                session.state = SessionState::Ready { staged };
                session.error_message = Some(error.to_string());
                session.bump_revision();
            }
            other => session.state = other,
        }
    }

    async fn recover_failed_install(
        &self,
        staged: Arc<StagedUpdate<P::Handle>>,
        error: ApplicationError,
    ) -> ApplicationError {
        let cleanup = {
            let _settings_write = self.settings_write.lock().await;
            match self.settings_port.load().await {
                Ok(mut settings) => {
                    settings.pending_restart_version = None;
                    self.settings_port.save(&settings).await
                }
                Err(error) => Err(error),
            }
        };
        let error = match cleanup {
            Ok(()) => error,
            Err(cleanup_error) => {
                ApplicationError::update(format!("{error}; 清除更新完成标记失败: {cleanup_error}"))
            }
        };
        self.restore_ready_after_install(staged, &error);
        error
    }

    /// 原子消费应用内更新的重启确认，只在当前版本严格匹配时返回版本号。
    pub async fn consume_completed_update(
        &self,
        current_version: &str,
    ) -> Result<Option<String>, ApplicationError> {
        let _settings_write = self.settings_write.lock().await;
        let mut settings = self.settings_port.load().await?;
        let Some(pending_version) = settings.pending_restart_version.take() else {
            return Ok(None);
        };
        self.settings_port.save(&settings).await?;
        Ok((pending_version == current_version).then_some(pending_version))
    }

    /// 重启应用（不安装）。
    pub async fn restart(&self) -> Result<(), ApplicationError> {
        self.port.restart().await
    }

    /// 设置更新检查模式。
    pub async fn set_check_mode(&self, mode: UpdateCheckMode) -> Result<(), ApplicationError> {
        let _settings_write = self.settings_write.lock().await;
        let mut settings = self.settings_port.load().await?;
        settings.check_mode = mode;
        self.settings_port.save(&settings).await
    }

    /// 设置更新渠道。
    pub async fn set_channel(&self, channel: UpdateChannel) -> Result<(), ApplicationError> {
        let _settings_write = self.settings_write.lock().await;
        let mut settings = self.settings_port.load().await?;
        let changed = settings.channel != channel;
        settings.channel = channel;
        self.settings_port.save(&settings).await?;

        if changed {
            let mut session = self.session.lock().unwrap_or_else(|e| e.into_inner());
            match &mut session.state {
                SessionState::Idle => {
                    session.next_epoch();
                    if session.error_message.take().is_some() {
                        session.bump_revision();
                    }
                }
                SessionState::Available { .. } => {
                    session.next_epoch();
                    session.state = SessionState::Idle;
                    session.clear_error();
                    session.bump_revision();
                }
                SessionState::Downloading {
                    checked,
                    restore_available,
                    ..
                } => {
                    *restore_available = checked.channel == channel;
                }
                SessionState::Ready { .. } | SessionState::Installing { .. } => {}
            }
        }
        Ok(())
    }

    /// 设置自动检查间隔（秒）；非法值会收敛到默认 6 小时。
    pub async fn set_check_interval_secs(
        &self,
        interval_secs: i64,
    ) -> Result<(), ApplicationError> {
        let _settings_write = self.settings_write.lock().await;
        let mut settings = self.settings_port.load().await?;
        settings.check_interval_secs = normalize_check_interval_secs(interval_secs);
        self.settings_port.save(&settings).await
    }

    /// 仅跳过当前精确的 Available 身份；与下载竞争时只有一个状态迁移能成功。
    pub async fn skip_version(
        &self,
        expected_version: &str,
        expected_channel: UpdateChannel,
    ) -> Result<(), ApplicationError> {
        let _check_gate = self.check_gate.lock().await;
        let _settings_write = self.settings_write.lock().await;
        let mut settings = self.settings_port.load().await?;

        let (checked, epoch) = {
            let mut session = self.session.lock().unwrap_or_else(|e| e.into_inner());
            let checked = match &session.state {
                SessionState::Available { checked }
                    if checked.version == expected_version
                        && checked.channel == expected_channel =>
                {
                    Arc::clone(checked)
                }
                _ => {
                    return Err(ApplicationError::conflict(
                        "只有当前可用更新可以被跳过".to_string(),
                    ));
                }
            };
            let epoch = session.next_epoch();
            session.state = SessionState::Idle;
            session.clear_error();
            session.bump_revision();
            (checked, epoch)
        };

        settings.skipped_version = Some(expected_version.to_string());
        if let Err(error) = self.settings_port.save(&settings).await {
            let mut session = self.session.lock().unwrap_or_else(|e| e.into_inner());
            if session.operation_epoch == epoch && matches!(session.state, SessionState::Idle) {
                session.state = SessionState::Available { checked };
                session.bump_revision();
            }
            return Err(error);
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use std::sync::atomic::{AtomicBool, AtomicU32, AtomicU64, Ordering};
    use std::sync::{Arc, Mutex};

    use super::*;
    use tokio::sync::Notify;

    /// 测试用的内存 Mock UpdatePort。
    #[derive(Clone)]
    struct MockUpdatePort {
        latest_version: Arc<Mutex<Option<&'static str>>>,
        check_count: Arc<AtomicU32>,
        next_handle_id: Arc<AtomicU64>,
        download_count: Arc<Mutex<u32>>,
        downloaded_handle_ids: Arc<Mutex<Vec<u64>>>,
        installed_handle_ids: Arc<Mutex<Vec<u64>>>,
        installed_packages: Arc<Mutex<Vec<Vec<u8>>>>,
        fail_download: Arc<AtomicBool>,
        fail_install: Arc<AtomicBool>,
        fail_restart: Arc<AtomicBool>,
        check_started: Option<Arc<Notify>>,
        check_release: Option<Arc<Notify>>,
        install_started: Option<Arc<Notify>>,
        install_release: Option<Arc<Notify>>,
        download_delay_ms: u64,
        install_delay_ms: u64,
        restart_count: Arc<AtomicU32>,
    }

    struct MockHandle {
        id: u64,
    }

    impl MockUpdatePort {
        fn new(latest_version: Option<&'static str>) -> Self {
            Self {
                latest_version: Arc::new(Mutex::new(latest_version)),
                check_count: Arc::new(AtomicU32::new(0)),
                next_handle_id: Arc::new(AtomicU64::new(1)),
                download_count: Arc::new(Mutex::new(0)),
                downloaded_handle_ids: Arc::new(Mutex::new(Vec::new())),
                installed_handle_ids: Arc::new(Mutex::new(Vec::new())),
                installed_packages: Arc::new(Mutex::new(Vec::new())),
                fail_download: Arc::new(AtomicBool::new(false)),
                fail_install: Arc::new(AtomicBool::new(false)),
                fail_restart: Arc::new(AtomicBool::new(false)),
                check_started: None,
                check_release: None,
                install_started: None,
                install_release: None,
                download_delay_ms: 0,
                install_delay_ms: 0,
                restart_count: Arc::new(AtomicU32::new(0)),
            }
        }
    }

    impl UpdatePort for MockUpdatePort {
        type Handle = MockHandle;

        async fn check(
            &self,
            channel: UpdateChannel,
        ) -> Result<Option<CheckedUpdate<Self::Handle>>, ApplicationError> {
            self.check_count.fetch_add(1, Ordering::SeqCst);
            if let Some(started) = &self.check_started {
                started.notify_one();
            }
            if let Some(release) = &self.check_release {
                release.notified().await;
            }
            Ok(
                (*self.latest_version.lock().unwrap()).map(|v| CheckedUpdate {
                    version: v.to_string(),
                    channel,
                    handle: MockHandle {
                        id: self.next_handle_id.fetch_add(1, Ordering::SeqCst),
                    },
                }),
            )
        }

        async fn download_package(
            &self,
            checked: Arc<CheckedUpdate<Self::Handle>>,
            on_progress: impl Fn(u64, Option<u64>) + Send + Sync + 'static,
        ) -> Result<Vec<u8>, ApplicationError> {
            *self.download_count.lock().unwrap() += 1;
            self.downloaded_handle_ids
                .lock()
                .unwrap()
                .push(checked.handle.id);
            on_progress(4, Some(8));
            if self.download_delay_ms > 0 {
                tokio::time::sleep(std::time::Duration::from_millis(self.download_delay_ms)).await;
            }
            if self.fail_download.load(Ordering::SeqCst) {
                return Err(ApplicationError::update("测试下载失败"));
            }
            Ok(vec![0u8; 8])
        }

        async fn install_package(
            &self,
            checked: Arc<CheckedUpdate<Self::Handle>>,
            bytes: Vec<u8>,
        ) -> Result<(), ApplicationError> {
            self.installed_handle_ids
                .lock()
                .unwrap()
                .push(checked.handle.id);
            self.installed_packages.lock().unwrap().push(bytes);
            if let Some(started) = &self.install_started {
                started.notify_one();
            }
            if let Some(release) = &self.install_release {
                release.notified().await;
            }
            if self.install_delay_ms > 0 {
                tokio::time::sleep(std::time::Duration::from_millis(self.install_delay_ms)).await;
            }
            if self.fail_install.load(Ordering::SeqCst) {
                return Err(ApplicationError::update("测试安装失败".to_string()));
            }
            Ok(())
        }

        async fn restart(&self) -> Result<(), ApplicationError> {
            self.restart_count.fetch_add(1, Ordering::SeqCst);
            if self.fail_restart.load(Ordering::SeqCst) {
                return Err(ApplicationError::update("测试重启失败".to_string()));
            }
            Ok(())
        }
    }

    /// 首次下载被取消后仍投递旧进度，用于验证同版本重试的 ABA 隔离。
    #[derive(Clone, Default)]
    struct AbaUpdatePort {
        download_count: Arc<AtomicU32>,
    }

    impl UpdatePort for AbaUpdatePort {
        type Handle = ();

        async fn check(
            &self,
            channel: UpdateChannel,
        ) -> Result<Option<CheckedUpdate<Self::Handle>>, ApplicationError> {
            Ok(Some(CheckedUpdate {
                version: "0.6.0".to_string(),
                channel,
                handle: (),
            }))
        }

        async fn download_package(
            &self,
            _checked: Arc<CheckedUpdate<Self::Handle>>,
            on_progress: impl Fn(u64, Option<u64>) + Send + Sync + 'static,
        ) -> Result<Vec<u8>, ApplicationError> {
            let attempt = self.download_count.fetch_add(1, Ordering::SeqCst);
            if attempt == 0 {
                tokio::spawn(async move {
                    tokio::time::sleep(std::time::Duration::from_millis(60)).await;
                    on_progress(999, None);
                });
                return std::future::pending().await;
            }
            tokio::time::sleep(std::time::Duration::from_millis(140)).await;
            Ok(vec![1, 2, 3])
        }

        async fn install_package(
            &self,
            _checked: Arc<CheckedUpdate<Self::Handle>>,
            _bytes: Vec<u8>,
        ) -> Result<(), ApplicationError> {
            Ok(())
        }

        async fn restart(&self) -> Result<(), ApplicationError> {
            Ok(())
        }
    }

    /// 测试用的内存 Mock SettingsPort。
    #[derive(Clone)]
    struct MockSettingsPort {
        settings: Arc<Mutex<UpdateSettings>>,
        fail_load_at: Arc<AtomicU32>,
        fail_next_save: Arc<AtomicBool>,
        fail_clear: Arc<AtomicBool>,
        load_count: Arc<AtomicU32>,
        save_count: Arc<AtomicU32>,
        next_load_started: Arc<Mutex<Option<Arc<Notify>>>>,
        next_load_release: Arc<Mutex<Option<Arc<Notify>>>>,
    }

    impl MockSettingsPort {
        fn new(settings: UpdateSettings) -> Self {
            Self {
                settings: Arc::new(Mutex::new(settings)),
                fail_load_at: Arc::new(AtomicU32::new(0)),
                fail_next_save: Arc::new(AtomicBool::new(false)),
                fail_clear: Arc::new(AtomicBool::new(false)),
                load_count: Arc::new(AtomicU32::new(0)),
                save_count: Arc::new(AtomicU32::new(0)),
                next_load_started: Arc::new(Mutex::new(None)),
                next_load_release: Arc::new(Mutex::new(None)),
            }
        }

        fn current(&self) -> UpdateSettings {
            self.settings.lock().unwrap().clone()
        }

        fn fail_next_save(&self) {
            self.fail_next_save.store(true, Ordering::SeqCst);
        }

        fn fail_load_call(&self, call: u32) {
            self.fail_load_at.store(call, Ordering::SeqCst);
        }

        fn block_next_load(&self, started: Arc<Notify>, release: Arc<Notify>) {
            *self.next_load_started.lock().unwrap() = Some(started);
            *self.next_load_release.lock().unwrap() = Some(release);
        }

        fn fail_clear(&self) {
            self.fail_clear.store(true, Ordering::SeqCst);
        }
    }

    impl UpdateSettingsPort for MockSettingsPort {
        async fn load(&self) -> Result<UpdateSettings, ApplicationError> {
            let call = self.load_count.fetch_add(1, Ordering::SeqCst) + 1;
            let started = self.next_load_started.lock().unwrap().take();
            let release = self.next_load_release.lock().unwrap().take();
            if let Some(started) = started {
                started.notify_one();
            }
            if let Some(release) = release {
                release.notified().await;
            }
            if self
                .fail_load_at
                .compare_exchange(call, 0, Ordering::SeqCst, Ordering::SeqCst)
                .is_ok()
            {
                return Err(ApplicationError::update("测试设置读取失败"));
            }
            Ok(self.settings.lock().unwrap().clone())
        }

        async fn save(&self, settings: &UpdateSettings) -> Result<(), ApplicationError> {
            self.save_count.fetch_add(1, Ordering::SeqCst);
            if self.fail_next_save.swap(false, Ordering::SeqCst)
                || (self.fail_clear.load(Ordering::SeqCst)
                    && settings.pending_restart_version.is_none())
            {
                return Err(ApplicationError::update("测试设置保存失败"));
            }
            *self.settings.lock().unwrap() = settings.clone();
            Ok(())
        }
    }

    async fn download_current<P, S>(
        service: &UpdateService<P, S>,
    ) -> Result<DownloadOutcome, ApplicationError>
    where
        P: UpdatePort + Clone + 'static,
        S: UpdateSettingsPort,
    {
        let update = service
            .session_snapshot()
            .update
            .expect("test requires a checked update");
        service
            .download_update(&update.version, update.channel, |_, _| {})
            .await
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

        let result = service.check_update().await.unwrap();
        assert!(matches!(
            result,
            UpdateCheckOutcome::Found(UpdateInfo { ref version }) if version == "0.2.0"
        ));
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

        let result = service
            .check_update_with(UpdateCheckKind::Scheduled)
            .await
            .unwrap();
        assert_eq!(result, UpdateCheckOutcome::Skipped);
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

        let result = service
            .check_update_with(UpdateCheckKind::Scheduled)
            .await
            .unwrap();
        assert_eq!(result, UpdateCheckOutcome::Skipped);
    }

    #[tokio::test]
    async fn skip_version_should_store_single_value() {
        let port = MockUpdatePort::new(Some("0.2.0"));
        let latest_version = Arc::clone(&port.latest_version);
        let settings_port = MockSettingsPort::new(UpdateSettings::default());
        let service = UpdateService::new(port, settings_port);

        service.check_update().await.unwrap();
        service
            .skip_version("0.2.0", UpdateChannel::Stable)
            .await
            .unwrap();
        *latest_version.lock().unwrap() = Some("0.3.0");
        service.check_update().await.unwrap();
        service
            .skip_version("0.3.0", UpdateChannel::Stable)
            .await
            .unwrap();
        let settings = service.get_settings().await.unwrap();
        assert_eq!(settings.skipped_version.as_deref(), Some("0.3.0"));
    }

    #[tokio::test]
    async fn skip_version_should_reject_a_download_in_progress() {
        let mut port = MockUpdatePort::new(Some("0.2.0"));
        port.download_delay_ms = 100;
        let settings_port = MockSettingsPort::new(UpdateSettings::default());
        let service = Arc::new(UpdateService::new(port, settings_port));
        service.check_update().await.unwrap();

        let downloading = Arc::clone(&service);
        let task = tokio::spawn(async move { download_current(&downloading).await });
        tokio::time::timeout(std::time::Duration::from_secs(1), async {
            while service.session_snapshot().phase != UpdateSessionPhase::Downloading {
                tokio::task::yield_now().await;
            }
        })
        .await
        .unwrap();

        assert!(matches!(
            service.skip_version("0.2.0", UpdateChannel::Stable).await,
            Err(ApplicationError::Conflict(_))
        ));
        assert!(service
            .get_settings()
            .await
            .unwrap()
            .skipped_version
            .is_none());
        task.await.unwrap().unwrap();
    }

    #[tokio::test]
    async fn skip_save_failure_should_restore_the_available_candidate() {
        let settings_port = MockSettingsPort::new(UpdateSettings::default());
        let service = UpdateService::new(MockUpdatePort::new(Some("0.2.0")), settings_port.clone());
        service.check_update().await.unwrap();
        settings_port.fail_next_save();

        assert!(service
            .skip_version("0.2.0", UpdateChannel::Stable)
            .await
            .is_err());
        assert_eq!(
            service.session_snapshot().phase,
            UpdateSessionPhase::Available
        );
        assert!(settings_port.current().skipped_version.is_none());
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
    async fn loading_settings_should_not_write_defaults_back() {
        let settings_port = MockSettingsPort::new(UpdateSettings::default());
        let save_count = Arc::clone(&settings_port.save_count);
        let service = UpdateService::new(MockUpdatePort::new(None), settings_port);

        service.get_settings().await.unwrap();

        assert_eq!(save_count.load(Ordering::SeqCst), 0);
    }

    #[tokio::test]
    async fn channel_change_during_check_should_win_without_being_overwritten() {
        let check_started = Arc::new(Notify::new());
        let check_release = Arc::new(Notify::new());
        let mut port = MockUpdatePort::new(Some("0.2.0"));
        port.check_started = Some(Arc::clone(&check_started));
        port.check_release = Some(Arc::clone(&check_release));
        let settings_port = MockSettingsPort::new(UpdateSettings::default());
        let service = Arc::new(UpdateService::new(port, settings_port.clone()));

        let checking = Arc::clone(&service);
        let check = tokio::spawn(async move { checking.check_update().await });
        check_started.notified().await;
        service.set_channel(UpdateChannel::Beta).await.unwrap();
        check_release.notify_one();

        assert_eq!(
            check.await.unwrap().unwrap(),
            UpdateCheckOutcome::Superseded
        );
        let settings = settings_port.current();
        assert_eq!(settings.channel, UpdateChannel::Beta);
        assert!(settings.last_checked_at.is_none());
        assert_eq!(service.session_snapshot().phase, UpdateSessionPhase::Idle);
    }

    #[tokio::test]
    async fn concurrent_scheduled_check_should_not_supersede_manual_result() {
        let check_started = Arc::new(Notify::new());
        let check_release = Arc::new(Notify::new());
        let mut port = MockUpdatePort::new(Some("0.2.0"));
        port.check_started = Some(Arc::clone(&check_started));
        port.check_release = Some(Arc::clone(&check_release));
        let check_count = Arc::clone(&port.check_count);
        let service = Arc::new(UpdateService::new(
            port,
            MockSettingsPort::new(UpdateSettings {
                check_mode: UpdateCheckMode::NotifyOnly,
                ..Default::default()
            }),
        ));

        let manual_service = Arc::clone(&service);
        let manual = tokio::spawn(async move { manual_service.check_update().await });
        check_started.notified().await;

        let scheduled_service = Arc::clone(&service);
        let scheduled = tokio::spawn(async move {
            scheduled_service
                .check_update_with(UpdateCheckKind::Scheduled)
                .await
        });
        tokio::time::sleep(std::time::Duration::from_millis(10)).await;

        assert_eq!(check_count.load(Ordering::SeqCst), 1);
        assert_eq!(service.session.lock().unwrap().operation_epoch, 1);

        check_release.notify_one();
        let manual_result = manual.await.unwrap().unwrap();
        let scheduled_result = scheduled.await.unwrap().unwrap();

        assert!(matches!(
            manual_result,
            UpdateCheckOutcome::Found(UpdateInfo { ref version }) if version == "0.2.0"
        ));
        assert_eq!(scheduled_result, UpdateCheckOutcome::Skipped);
        assert_eq!(check_count.load(Ordering::SeqCst), 1);
        let snapshot = service.session_snapshot();
        assert_eq!(snapshot.phase, UpdateSessionPhase::Available);
        assert_eq!(snapshot.update.unwrap().version, "0.2.0");
    }

    #[tokio::test]
    async fn download_should_require_a_committed_check() {
        let service = UpdateService::new(
            MockUpdatePort::new(Some("0.2.0")),
            MockSettingsPort::new(UpdateSettings::default()),
        );

        let error = service
            .download_update("0.2.0", UpdateChannel::Stable, |_, _| {})
            .await
            .unwrap_err();

        assert!(matches!(error, ApplicationError::Conflict(_)));
    }

    #[tokio::test]
    async fn download_should_reject_a_stale_identity_without_side_effects() {
        let port = MockUpdatePort::new(Some("0.2.0"));
        let download_count = Arc::clone(&port.download_count);
        let service = UpdateService::new(port, MockSettingsPort::new(UpdateSettings::default()));
        service.check_update().await.unwrap();

        let error = service
            .download_update("0.2.1", UpdateChannel::Stable, |_, _| {})
            .await
            .unwrap_err();

        assert!(matches!(error, ApplicationError::Conflict(_)));
        assert_eq!(*download_count.lock().unwrap(), 0);
        assert_eq!(
            service.session_snapshot().phase,
            UpdateSessionPhase::Available
        );
    }

    #[tokio::test]
    async fn download_should_publish_initial_snapshot_and_attach_failure() {
        let port = MockUpdatePort::new(Some("0.2.0"));
        port.fail_download.store(true, Ordering::SeqCst);
        let service = Arc::new(UpdateService::new(
            port,
            MockSettingsPort::new(UpdateSettings::default()),
        ));
        service.check_update().await.unwrap();
        let observed = Arc::new(Mutex::new(Vec::new()));
        let observed_for_callback = Arc::clone(&observed);
        let service_for_callback = Arc::clone(&service);

        let error = service
            .download_update("0.2.0", UpdateChannel::Stable, move |_, _| {
                observed_for_callback
                    .lock()
                    .unwrap()
                    .push(service_for_callback.session_snapshot());
            })
            .await
            .unwrap_err();

        let first = observed.lock().unwrap().first().cloned().unwrap();
        assert_eq!(first.phase, UpdateSessionPhase::Downloading);
        assert_eq!(
            first.progress,
            Some(UpdateSessionProgress {
                downloaded: 0,
                total: None,
            })
        );
        let failed = service.session_snapshot();
        assert_eq!(failed.phase, UpdateSessionPhase::Available);
        assert_eq!(
            failed.error_message.as_deref(),
            Some(error.to_string().as_str())
        );
    }

    #[tokio::test]
    async fn download_should_reuse_the_handle_from_check() {
        let port = MockUpdatePort::new(Some("0.2.0"));
        let check_count = Arc::clone(&port.check_count);
        let downloaded_handle_ids = Arc::clone(&port.downloaded_handle_ids);
        let service = UpdateService::new(port, MockSettingsPort::new(UpdateSettings::default()));

        service.check_update().await.unwrap();
        download_current(&service).await.unwrap();

        assert_eq!(check_count.load(Ordering::SeqCst), 1);
        assert_eq!(*downloaded_handle_ids.lock().unwrap(), vec![1]);
    }

    #[tokio::test]
    async fn check_should_not_access_network_during_download() {
        let mut port = MockUpdatePort::new(Some("0.2.0"));
        port.download_delay_ms = 200;
        let check_count = Arc::clone(&port.check_count);
        let service = Arc::new(UpdateService::new(
            port,
            MockSettingsPort::new(UpdateSettings::default()),
        ));
        service.check_update().await.unwrap();

        let downloading_service = Arc::clone(&service);
        let download = tokio::spawn(async move { download_current(&downloading_service).await });
        tokio::time::sleep(std::time::Duration::from_millis(10)).await;

        assert_eq!(
            service.check_update().await.unwrap(),
            UpdateCheckOutcome::Skipped
        );
        assert_eq!(check_count.load(Ordering::SeqCst), 1);
        service.cancel_download();
        assert_eq!(download.await.unwrap().unwrap(), DownloadOutcome::Cancelled);
    }

    #[tokio::test]
    async fn check_should_not_access_network_when_ready() {
        let port = MockUpdatePort::new(Some("0.2.0"));
        let check_count = Arc::clone(&port.check_count);
        let service = UpdateService::new(port, MockSettingsPort::new(UpdateSettings::default()));
        service.check_update().await.unwrap();
        download_current(&service).await.unwrap();

        let result = service.check_update().await.unwrap();

        assert_eq!(result, UpdateCheckOutcome::Skipped);
        assert_eq!(check_count.load(Ordering::SeqCst), 1);
    }

    #[tokio::test]
    async fn snapshot_revision_should_advance_for_progress_and_ready() {
        let mut port = MockUpdatePort::new(Some("0.2.0"));
        port.download_delay_ms = 80;
        let service = Arc::new(UpdateService::new(
            port,
            MockSettingsPort::new(UpdateSettings::default()),
        ));
        service.check_update().await.unwrap();
        let available_revision = service.session_snapshot().revision;

        let downloading_service = Arc::clone(&service);
        let download = tokio::spawn(async move { download_current(&downloading_service).await });
        tokio::time::sleep(std::time::Duration::from_millis(10)).await;
        let downloading = service.session_snapshot();
        download.await.unwrap().unwrap();
        let ready = service.session_snapshot();

        assert!(downloading.revision > available_revision);
        assert!(ready.revision > downloading.revision);
    }

    #[tokio::test]
    async fn abort_registration_should_abort_when_cancel_won_the_race() {
        let service = UpdateService::new(
            MockUpdatePort::new(Some("0.2.0")),
            MockSettingsPort::new(UpdateSettings::default()),
        );
        let epoch = {
            let mut session = service.session.lock().unwrap();
            let epoch = session.next_epoch();
            session.state = SessionState::Downloading {
                checked: Arc::new(CheckedUpdate {
                    version: "0.2.0".to_string(),
                    channel: UpdateChannel::Stable,
                    handle: MockHandle { id: 1 },
                }),
                progress: DownloadProgress {
                    downloaded: 0,
                    total: None,
                },
                abort_handle: None,
                epoch,
                restore_available: true,
            };
            epoch
        };
        service.cancel_download();
        let task = tokio::spawn(std::future::pending::<()>());

        service.register_download_abort(epoch, task.abort_handle());

        assert!(task.await.unwrap_err().is_cancelled());
    }

    #[tokio::test]
    async fn stale_progress_should_not_mutate_same_version_retry() {
        let port = AbaUpdatePort::default();
        let download_count = Arc::clone(&port.download_count);
        let service = Arc::new(UpdateService::new(
            port,
            MockSettingsPort::new(UpdateSettings::default()),
        ));
        service.check_update().await.unwrap();

        let first_service = Arc::clone(&service);
        let first = tokio::spawn(async move { download_current(&first_service).await });
        tokio::time::sleep(std::time::Duration::from_millis(10)).await;
        service.cancel_download();
        assert_eq!(first.await.unwrap().unwrap(), DownloadOutcome::Cancelled);

        let second_service = Arc::clone(&service);
        let second = tokio::spawn(async move { download_current(&second_service).await });
        tokio::time::sleep(std::time::Duration::from_millis(10)).await;
        let retry_revision = service.session_snapshot().revision;
        tokio::time::sleep(std::time::Duration::from_millis(70)).await;
        let after_stale_progress = service.session_snapshot();

        assert_eq!(after_stale_progress.revision, retry_revision);
        assert_eq!(after_stale_progress.progress.unwrap().downloaded, 0);
        assert!(matches!(
            second.await.unwrap().unwrap(),
            DownloadOutcome::Completed { version } if version == "0.6.0"
        ));
        assert_eq!(download_count.load(Ordering::SeqCst), 2);
    }

    #[tokio::test]
    async fn concurrent_download_should_only_invoke_port_once() {
        let mut port = MockUpdatePort::new(Some("0.2.0"));
        port.download_delay_ms = 80;
        let download_count = Arc::clone(&port.download_count);
        let settings_port = MockSettingsPort::new(UpdateSettings::default());
        let service = Arc::new(UpdateService::new(port, settings_port));
        service.check_update().await.unwrap();

        let s1 = Arc::clone(&service);
        let s2 = Arc::clone(&service);
        let (r1, r2) = tokio::join!(download_current(&s1), download_current(&s2),);

        assert!(r1.is_ok());
        assert!(r2.is_ok());
        assert_eq!(
            *download_count.lock().unwrap(),
            1,
            "second concurrent download must be single-flighted"
        );
        assert!(!service.is_download_in_flight());
        assert!(matches!(r1.unwrap(), DownloadOutcome::Completed { .. }));
        assert_eq!(r2.unwrap(), DownloadOutcome::InProgress);
    }

    #[tokio::test]
    async fn download_when_already_ready_is_idempotent() {
        let port = MockUpdatePort::new(Some("0.2.0"));
        let download_count = Arc::clone(&port.download_count);
        let settings_port = MockSettingsPort::new(UpdateSettings::default());
        let service = UpdateService::new(port, settings_port);
        service.check_update().await.unwrap();

        assert!(matches!(
            download_current(&service).await.unwrap(),
            DownloadOutcome::Completed { version } if version == "0.2.0"
        ));
        // 已有暂存包时不再重复下载
        assert!(matches!(
            download_current(&service).await.unwrap(),
            DownloadOutcome::Completed { version } if version == "0.2.0"
        ));
        assert_eq!(*download_count.lock().unwrap(), 1);
        assert_eq!(service.session_snapshot().phase, UpdateSessionPhase::Ready);
    }

    #[tokio::test]
    async fn install_should_require_ready_and_expected_version() {
        let port = MockUpdatePort::new(Some("0.2.0"));
        let installed_handle_ids = Arc::clone(&port.installed_handle_ids);
        let restart_count = Arc::clone(&port.restart_count);
        let settings_port = MockSettingsPort::new(UpdateSettings::default());
        let service = UpdateService::new(port, settings_port);

        let error = service
            .install_staged_update("0.2.0", None, || {})
            .await
            .unwrap_err();
        assert!(matches!(error, ApplicationError::Conflict(_)));

        service.check_update().await.unwrap();
        let _ = download_current(&service).await.unwrap();
        let error = service
            .install_staged_update("0.2.1", None, || {})
            .await
            .unwrap_err();

        assert!(matches!(error, ApplicationError::Conflict(_)));
        assert_eq!(service.session_snapshot().phase, UpdateSessionPhase::Ready);
        assert!(installed_handle_ids.lock().unwrap().is_empty());
        assert_eq!(restart_count.load(Ordering::SeqCst), 0);
    }

    #[tokio::test]
    async fn install_should_require_exact_staged_channel_confirmation_after_switch() {
        let port = MockUpdatePort::new(Some("0.2.0"));
        let installed_handle_ids = Arc::clone(&port.installed_handle_ids);
        let settings_port = MockSettingsPort::new(UpdateSettings::default());
        let service = UpdateService::new(port, settings_port);
        service.check_update().await.unwrap();
        download_current(&service).await.unwrap();
        service.set_channel(UpdateChannel::Beta).await.unwrap();

        assert!(matches!(
            service.install_staged_update("0.2.0", None, || {}).await,
            Err(ApplicationError::Conflict(_))
        ));
        assert!(matches!(
            service
                .install_staged_update("0.2.0", Some(UpdateChannel::Beta), || {})
                .await,
            Err(ApplicationError::Conflict(_))
        ));
        assert_eq!(service.session_snapshot().phase, UpdateSessionPhase::Ready);
        assert!(installed_handle_ids.lock().unwrap().is_empty());

        service
            .install_staged_update("0.2.0", Some(UpdateChannel::Stable), || {})
            .await
            .unwrap();
        assert_eq!(*installed_handle_ids.lock().unwrap(), vec![1]);
    }

    #[tokio::test]
    async fn install_should_persist_marker_before_invoking_installer() {
        let install_started = Arc::new(Notify::new());
        let install_release = Arc::new(Notify::new());
        let mut port = MockUpdatePort::new(Some("0.2.0"));
        port.install_started = Some(Arc::clone(&install_started));
        port.install_release = Some(Arc::clone(&install_release));
        let settings_port = MockSettingsPort::new(UpdateSettings::default());
        let service = Arc::new(UpdateService::new(port, settings_port.clone()));
        service.check_update().await.unwrap();
        download_current(&service).await.unwrap();
        let observed = Arc::new(Mutex::new(Vec::new()));

        let installing = Arc::clone(&service);
        let observed_for_callback = Arc::clone(&observed);
        let service_for_callback = Arc::clone(&service);
        let install = tokio::spawn(async move {
            installing
                .install_staged_update("0.2.0", None, move || {
                    observed_for_callback
                        .lock()
                        .unwrap()
                        .push(service_for_callback.session_snapshot().phase);
                })
                .await
        });
        install_started.notified().await;

        assert_eq!(
            settings_port.current().pending_restart_version.as_deref(),
            Some("0.2.0")
        );
        assert_eq!(
            service.session_snapshot().phase,
            UpdateSessionPhase::Installing
        );
        assert_eq!(
            observed.lock().unwrap().as_slice(),
            &[UpdateSessionPhase::Installing]
        );
        install_release.notify_one();
        install.await.unwrap().unwrap();
    }

    #[tokio::test]
    async fn marker_write_failure_should_restore_ready_without_invoking_installer() {
        let port = MockUpdatePort::new(Some("0.2.0"));
        let installed_handle_ids = Arc::clone(&port.installed_handle_ids);
        let restart_count = Arc::clone(&port.restart_count);
        let settings_port = MockSettingsPort::new(UpdateSettings::default());
        let service = UpdateService::new(port, settings_port.clone());
        service.check_update().await.unwrap();
        download_current(&service).await.unwrap();
        settings_port.fail_next_save();

        let error = service
            .install_staged_update("0.2.0", None, || {})
            .await
            .unwrap_err();

        assert!(matches!(error, ApplicationError::Update(_)));
        assert_eq!(service.session_snapshot().phase, UpdateSessionPhase::Ready);
        assert!(installed_handle_ids.lock().unwrap().is_empty());
        assert_eq!(restart_count.load(Ordering::SeqCst), 0);
        assert!(settings_port.current().pending_restart_version.is_none());
    }

    #[tokio::test]
    async fn install_should_use_the_staged_handle_when_remote_pointer_disappears() {
        let port = MockUpdatePort::new(Some("0.2.0"));
        let latest_version = Arc::clone(&port.latest_version);
        let check_count = Arc::clone(&port.check_count);
        let download_count = Arc::clone(&port.download_count);
        let downloaded_handle_ids = Arc::clone(&port.downloaded_handle_ids);
        let installed_handle_ids = Arc::clone(&port.installed_handle_ids);
        let installed_packages = Arc::clone(&port.installed_packages);
        let restart_count = Arc::clone(&port.restart_count);
        let settings_port = MockSettingsPort::new(UpdateSettings::default());
        let service = UpdateService::new(port, settings_port.clone());

        service.check_update().await.unwrap();
        download_current(&service).await.unwrap();
        *latest_version.lock().unwrap() = None;

        service
            .install_staged_update("0.2.0", None, || {})
            .await
            .unwrap();

        assert_eq!(check_count.load(Ordering::SeqCst), 1);
        assert_eq!(*download_count.lock().unwrap(), 1);
        assert_eq!(*downloaded_handle_ids.lock().unwrap(), vec![1]);
        assert_eq!(*installed_handle_ids.lock().unwrap(), vec![1]);
        assert_eq!(*installed_packages.lock().unwrap(), vec![vec![0; 8]]);
        assert_eq!(restart_count.load(Ordering::SeqCst), 1);
    }

    #[tokio::test]
    async fn failed_install_should_restore_the_same_staged_update_for_retry() {
        let port = MockUpdatePort::new(Some("0.2.0"));
        let fail_install = Arc::clone(&port.fail_install);
        let check_count = Arc::clone(&port.check_count);
        let download_count = Arc::clone(&port.download_count);
        let installed_handle_ids = Arc::clone(&port.installed_handle_ids);
        let installed_packages = Arc::clone(&port.installed_packages);
        let restart_count = Arc::clone(&port.restart_count);
        let settings_port = MockSettingsPort::new(UpdateSettings::default());
        let service = UpdateService::new(port, settings_port.clone());
        service.check_update().await.unwrap();
        download_current(&service).await.unwrap();
        let staged_before = {
            let session = service.session.lock().unwrap();
            match &session.state {
                SessionState::Ready { staged, .. } => Arc::clone(staged),
                _ => panic!("expected ready staged update"),
            }
        };
        fail_install.store(true, Ordering::SeqCst);

        let error = service
            .install_staged_update("0.2.0", None, || {})
            .await
            .unwrap_err();
        let staged_after = {
            let session = service.session.lock().unwrap();
            match &session.state {
                SessionState::Ready { staged, .. } => Arc::clone(staged),
                _ => panic!("failed install must restore ready"),
            }
        };

        assert!(Arc::ptr_eq(&staged_before, &staged_after));
        let snapshot = service.session_snapshot();
        assert_eq!(snapshot.phase, UpdateSessionPhase::Ready);
        assert_eq!(
            snapshot.error_message.as_deref(),
            Some(error.to_string().as_str())
        );
        assert_eq!(restart_count.load(Ordering::SeqCst), 0);
        assert!(settings_port.current().pending_restart_version.is_none());

        fail_install.store(false, Ordering::SeqCst);
        service
            .install_staged_update("0.2.0", None, || {})
            .await
            .unwrap();

        assert_eq!(check_count.load(Ordering::SeqCst), 1);
        assert_eq!(*download_count.lock().unwrap(), 1);
        assert_eq!(*installed_handle_ids.lock().unwrap(), vec![1, 1]);
        assert_eq!(
            *installed_packages.lock().unwrap(),
            vec![vec![0; 8], vec![0; 8]]
        );
        assert_eq!(restart_count.load(Ordering::SeqCst), 1);
    }

    #[tokio::test]
    async fn restart_failure_should_clear_marker_and_restore_same_staged_update() {
        let port = MockUpdatePort::new(Some("0.2.0"));
        port.fail_restart.store(true, Ordering::SeqCst);
        let installed_handle_ids = Arc::clone(&port.installed_handle_ids);
        let settings_port = MockSettingsPort::new(UpdateSettings::default());
        let service = UpdateService::new(port, settings_port.clone());
        service.check_update().await.unwrap();
        download_current(&service).await.unwrap();
        let staged_before = {
            let session = service.session.lock().unwrap();
            match &session.state {
                SessionState::Ready { staged, .. } => Arc::clone(staged),
                _ => panic!("expected ready staged update"),
            }
        };

        service
            .install_staged_update("0.2.0", None, || {})
            .await
            .unwrap_err();

        let staged_after = {
            let session = service.session.lock().unwrap();
            match &session.state {
                SessionState::Ready { staged, .. } => Arc::clone(staged),
                _ => panic!("restart failure must restore ready"),
            }
        };
        assert!(Arc::ptr_eq(&staged_before, &staged_after));
        assert_eq!(*installed_handle_ids.lock().unwrap(), vec![1]);
        assert!(settings_port.current().pending_restart_version.is_none());
    }

    #[tokio::test]
    async fn marker_clear_failure_should_still_restore_ready_and_surface_error() {
        let port = MockUpdatePort::new(Some("0.2.0"));
        port.fail_install.store(true, Ordering::SeqCst);
        let settings_port = MockSettingsPort::new(UpdateSettings::default());
        let service = UpdateService::new(port, settings_port.clone());
        service.check_update().await.unwrap();
        download_current(&service).await.unwrap();
        settings_port.fail_clear();

        let error = service
            .install_staged_update("0.2.0", None, || {})
            .await
            .unwrap_err();

        assert!(error.to_string().contains("清除更新完成标记失败"));
        assert_eq!(service.session_snapshot().phase, UpdateSessionPhase::Ready);
        assert_eq!(
            settings_port.current().pending_restart_version.as_deref(),
            Some("0.2.0")
        );
    }

    #[tokio::test]
    async fn concurrent_install_should_only_invoke_installer_and_restart_once() {
        let mut port = MockUpdatePort::new(Some("0.2.0"));
        port.install_delay_ms = 80;
        let installed_handle_ids = Arc::clone(&port.installed_handle_ids);
        let restart_count = Arc::clone(&port.restart_count);
        let settings_port = MockSettingsPort::new(UpdateSettings::default());
        let load_count = Arc::clone(&settings_port.load_count);
        let service = Arc::new(UpdateService::new(port, settings_port));
        service.check_update().await.unwrap();
        download_current(&service).await.unwrap();
        let ready_staged = {
            let session = service.session.lock().unwrap();
            match &session.state {
                SessionState::Ready { staged, .. } => Arc::clone(staged),
                _ => panic!("expected ready staged update"),
            }
        };

        let first = Arc::clone(&service);
        let first_result =
            tokio::spawn(async move { first.install_staged_update("0.2.0", None, || {}).await });
        tokio::time::sleep(std::time::Duration::from_millis(10)).await;
        let installing_staged = {
            let session = service.session.lock().unwrap();
            match &session.state {
                SessionState::Installing { staged } => Arc::clone(staged),
                _ => panic!("expected installing staged update"),
            }
        };
        let loads_before_second = load_count.load(Ordering::SeqCst);
        let second_result = service.install_staged_update("0.2.0", None, || {}).await;
        let first_result = first_result.await.unwrap();

        assert!(Arc::ptr_eq(&ready_staged, &installing_staged));
        assert!(first_result.is_ok());
        assert!(matches!(second_result, Err(ApplicationError::Conflict(_))));
        assert_eq!(load_count.load(Ordering::SeqCst), loads_before_second);
        assert_eq!(*installed_handle_ids.lock().unwrap(), vec![1]);
        assert_eq!(restart_count.load(Ordering::SeqCst), 1);
    }

    #[tokio::test]
    async fn stale_install_settings_error_should_not_pollute_installing_session() {
        let load_started = Arc::new(Notify::new());
        let load_release = Arc::new(Notify::new());
        let install_started = Arc::new(Notify::new());
        let install_release = Arc::new(Notify::new());
        let mut port = MockUpdatePort::new(Some("0.2.0"));
        port.install_started = Some(Arc::clone(&install_started));
        port.install_release = Some(Arc::clone(&install_release));
        let settings_port = MockSettingsPort::new(UpdateSettings::default());
        let load_count = Arc::clone(&settings_port.load_count);
        let service = Arc::new(UpdateService::new(port, settings_port.clone()));
        service.check_update().await.unwrap();
        download_current(&service).await.unwrap();

        settings_port.block_next_load(Arc::clone(&load_started), Arc::clone(&load_release));
        let first_service = Arc::clone(&service);
        let first = tokio::spawn(async move {
            first_service
                .install_staged_update("0.2.0", None, || {})
                .await
        });
        load_started.notified().await;

        settings_port.fail_load_call(load_count.load(Ordering::SeqCst) + 1);
        let second_service = Arc::clone(&service);
        let second = tokio::spawn(async move {
            second_service
                .install_staged_update("0.2.0", None, || {})
                .await
        });
        tokio::time::sleep(std::time::Duration::from_millis(10)).await;
        load_release.notify_one();
        install_started.notified().await;

        let error = second.await.unwrap().unwrap_err();
        assert!(matches!(error, ApplicationError::Update(_)));
        let installing = service.session_snapshot();
        assert_eq!(installing.phase, UpdateSessionPhase::Installing);
        assert_eq!(installing.error_message, None);

        install_release.notify_one();
        first.await.unwrap().unwrap();
    }

    #[tokio::test]
    async fn session_snapshot_tracks_ready_after_download() {
        let port = MockUpdatePort::new(Some("0.3.0"));
        let settings_port = MockSettingsPort::new(UpdateSettings::default());
        let service = UpdateService::new(port, settings_port);

        assert!(matches!(
            service.check_update().await.unwrap(),
            UpdateCheckOutcome::Found(UpdateInfo { ref version }) if version == "0.3.0"
        ));
        assert!(matches!(
            download_current(&service).await.unwrap(),
            DownloadOutcome::Completed { version } if version == "0.3.0"
        ));

        let snap = service.session_snapshot();
        assert_eq!(snap.phase, UpdateSessionPhase::Ready);
        assert_eq!(
            snap.update,
            Some(UpdateSessionIdentity {
                version: "0.3.0".to_string(),
                channel: UpdateChannel::Stable,
            })
        );
        assert!(snap.progress.is_none());
        assert_eq!(
            serde_json::to_value(&snap).unwrap(),
            serde_json::json!({
                "revision": snap.revision,
                "phase": "ready",
                "update": { "version": "0.3.0", "channel": "stable" },
                "progress": null,
                "errorMessage": null
            })
        );
    }

    #[tokio::test]
    async fn consume_completed_update_should_return_matching_version_once() {
        let settings_port = MockSettingsPort::new(UpdateSettings {
            pending_restart_version: Some("0.3.0".to_string()),
            ..Default::default()
        });
        let service = UpdateService::new(MockUpdatePort::new(None), settings_port);

        assert_eq!(
            service.consume_completed_update("0.3.0").await.unwrap(),
            Some("0.3.0".to_string())
        );
        assert!(service
            .consume_completed_update("0.3.0")
            .await
            .unwrap()
            .is_none());
    }

    #[tokio::test]
    async fn consume_completed_update_should_clear_mismatched_version_without_prompt() {
        let settings_port = MockSettingsPort::new(UpdateSettings {
            pending_restart_version: Some("0.3.0".to_string()),
            ..Default::default()
        });
        let service = UpdateService::new(MockUpdatePort::new(None), settings_port.clone());

        assert!(service
            .consume_completed_update("0.4.0")
            .await
            .unwrap()
            .is_none());
        assert!(settings_port.current().pending_restart_version.is_none());
    }

    #[tokio::test]
    async fn consume_completed_update_should_not_prompt_when_clear_fails() {
        let settings_port = MockSettingsPort::new(UpdateSettings {
            pending_restart_version: Some("0.3.0".to_string()),
            ..Default::default()
        });
        settings_port.fail_clear();
        let service = UpdateService::new(MockUpdatePort::new(None), settings_port.clone());

        assert!(service.consume_completed_update("0.3.0").await.is_err());
        assert_eq!(
            settings_port.current().pending_restart_version.as_deref(),
            Some("0.3.0")
        );
    }

    #[tokio::test]
    async fn cancel_download_aborts_in_flight_task() {
        let mut port = MockUpdatePort::new(Some("0.3.0"));
        port.download_delay_ms = 500;
        let download_count = Arc::clone(&port.download_count);
        let settings_port = MockSettingsPort::new(UpdateSettings::default());
        let service = Arc::new(UpdateService::new(port, settings_port));
        let _ = service.check_update().await.unwrap();

        let svc = Arc::clone(&service);
        let handle = tokio::spawn(async move { download_current(&svc).await });

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
            download_current(&service).await.unwrap(),
            DownloadOutcome::Completed { version } if version == "0.3.0"
        ));
        assert_eq!(*download_count.lock().unwrap(), 2);
    }

    #[tokio::test]
    async fn channel_change_should_preserve_download_but_not_restore_old_candidate() {
        let mut port = MockUpdatePort::new(Some("0.3.0"));
        port.download_delay_ms = 500;
        let service = Arc::new(UpdateService::new(
            port,
            MockSettingsPort::new(UpdateSettings::default()),
        ));
        service.check_update().await.unwrap();
        let downloading = Arc::clone(&service);
        let download = tokio::spawn(async move { download_current(&downloading).await });
        tokio::time::sleep(std::time::Duration::from_millis(30)).await;

        service.set_channel(UpdateChannel::Beta).await.unwrap();
        assert_eq!(
            service.session_snapshot().phase,
            UpdateSessionPhase::Downloading
        );
        service.cancel_download();

        assert_eq!(download.await.unwrap().unwrap(), DownloadOutcome::Cancelled);
        assert_eq!(service.session_snapshot().phase, UpdateSessionPhase::Idle);
    }

    #[tokio::test]
    async fn old_channel_download_failure_should_not_commit_an_idle_error() {
        let mut port = MockUpdatePort::new(Some("0.3.0"));
        port.download_delay_ms = 500;
        port.fail_download.store(true, Ordering::SeqCst);
        let service = Arc::new(UpdateService::new(
            port,
            MockSettingsPort::new(UpdateSettings::default()),
        ));
        service.check_update().await.unwrap();
        let downloading = Arc::clone(&service);
        let download = tokio::spawn(async move { download_current(&downloading).await });
        tokio::time::sleep(std::time::Duration::from_millis(30)).await;

        service.set_channel(UpdateChannel::Beta).await.unwrap();
        assert!(download.await.unwrap().is_err());

        let snapshot = service.session_snapshot();
        assert_eq!(snapshot.phase, UpdateSessionPhase::Idle);
        assert_eq!(snapshot.error_message, None);
    }

    #[tokio::test]
    async fn check_should_mark_session_available() {
        let port = MockUpdatePort::new(Some("0.4.0"));
        let settings_port = MockSettingsPort::new(UpdateSettings::default());
        let service = UpdateService::new(port, settings_port);

        assert!(matches!(
            service.check_update().await.unwrap(),
            UpdateCheckOutcome::Found(UpdateInfo { ref version }) if version == "0.4.0"
        ));

        let snap = service.session_snapshot();
        assert_eq!(snap.phase, UpdateSessionPhase::Available);
        assert_eq!(snap.update.unwrap().version, "0.4.0");
    }

    #[tokio::test]
    async fn check_error_should_not_replace_available_download_error_slot() {
        let port = MockUpdatePort::new(Some("0.4.0"));
        let settings_port = MockSettingsPort::new(UpdateSettings::default());
        let service = UpdateService::new(port, settings_port.clone());
        service.check_update().await.unwrap();
        let before = service.session_snapshot();

        settings_port.fail_next_save();
        assert!(service.check_update().await.is_err());

        let after = service.session_snapshot();
        assert_eq!(after.phase, UpdateSessionPhase::Available);
        assert_eq!(after.update.unwrap().version, "0.4.0");
        assert_eq!(after.error_message, None);
        assert_eq!(after.revision, before.revision);
    }

    #[tokio::test]
    async fn check_should_not_read_settings_while_update_is_ready() {
        let port = MockUpdatePort::new(Some("0.4.0"));
        let settings_port = MockSettingsPort::new(UpdateSettings::default());
        let load_count = Arc::clone(&settings_port.load_count);
        let service = UpdateService::new(port, settings_port);
        service.check_update().await.unwrap();
        assert!(matches!(
            download_current(&service).await.unwrap(),
            DownloadOutcome::Completed { .. }
        ));
        let before = load_count.load(Ordering::SeqCst);

        assert_eq!(
            service
                .check_update_with(UpdateCheckKind::Scheduled)
                .await
                .unwrap(),
            UpdateCheckOutcome::Skipped
        );

        assert_eq!(load_count.load(Ordering::SeqCst), before);
        let snapshot = service.session_snapshot();
        assert_eq!(snapshot.phase, UpdateSessionPhase::Ready);
        assert_eq!(snapshot.error_message, None);
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
        assert_eq!(
            service
                .check_update_with(UpdateCheckKind::Scheduled)
                .await
                .unwrap(),
            UpdateCheckOutcome::Skipped
        );

        // Startup 绕过节流
        let outcome = service
            .check_update_with(UpdateCheckKind::Startup)
            .await
            .unwrap();
        assert!(matches!(
            outcome,
            UpdateCheckOutcome::Found(UpdateInfo { ref version }) if version == "0.5.0"
        ));
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

        assert_eq!(
            service
                .check_update_with(UpdateCheckKind::Startup)
                .await
                .unwrap(),
            UpdateCheckOutcome::Skipped
        );
    }
}

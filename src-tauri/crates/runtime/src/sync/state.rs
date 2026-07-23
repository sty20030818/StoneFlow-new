//! 云同步内存状态源。

use std::sync::Arc;

use chrono::{DateTime, Duration, Utc};
use stoneflow_domain::now_utc;
use tokio::sync::{Mutex, Notify, OwnedMutexGuard, RwLock};

pub use super::types::SyncRunMode;
use super::{
    policy::SyncPolicy,
    types::{SyncRemoteConfig, SyncReplicaState, SyncStatusKind, SyncStatusPayload},
};

const WRITE_DEBOUNCE: Duration = Duration::seconds(3);

#[derive(Debug, Default)]
struct SyncRuntimeInner {
    remote_config: Option<SyncRemoteConfig>,
    status: SyncStatusKind,
    last_push_at: Option<String>,
    last_pull_at: Option<String>,
    last_error: Option<String>,
    last_error_mode: Option<SyncRunMode>,
    dirty_since: Option<String>,
    pending_resync: bool,
    pending_mode: Option<SyncRunMode>,
    replica_state: SyncReplicaState,
    replica_reason: Option<String>,
    last_restore_at: Option<String>,
    policy: SyncPolicy,
    next_sync_at: Option<String>,
    failure_count: u32,
}

/// Tauri app manage 的同步状态。
#[derive(Debug, Clone, Default)]
pub struct SyncRuntimeState {
    inner: Arc<RwLock<SyncRuntimeInner>>,
    execution_lock: Arc<Mutex<()>>,
    scheduler_notify: Arc<Notify>,
}

impl SyncRuntimeState {
    /// 返回面向前端的稳定状态快照。
    pub(crate) async fn snapshot(&self) -> SyncStatusPayload {
        let guard = self.inner.read().await;
        let has_remote_config = guard.remote_config.is_some();

        SyncStatusPayload {
            enabled: has_remote_config,
            status: if has_remote_config {
                guard.status
            } else {
                SyncStatusKind::Disabled
            },
            last_push_at: guard.last_push_at.clone(),
            last_pull_at: guard.last_pull_at.clone(),
            last_error: guard.last_error.clone(),
            last_error_mode: guard.last_error_mode,
            dirty_since: guard.dirty_since.clone(),
            pending_resync: guard.pending_resync,
            has_remote_config,
            remote_url: guard
                .remote_config
                .as_ref()
                .map(|config| config.url.clone()),
            replica_state: guard.replica_state,
            replica_reason: guard.replica_reason.clone(),
            last_restore_at: guard.last_restore_at.clone(),
            policy_mode: guard.policy.mode,
            policy_interval_minutes: guard.policy.interval_minutes,
            next_sync_at: guard.next_sync_at.clone(),
        }
    }

    /// 初始化或覆盖远端配置缓存。
    pub(crate) async fn set_remote_config(&self, remote_config: Option<SyncRemoteConfig>) {
        let mut guard = self.inner.write().await;
        guard.remote_config = remote_config;
        guard.pending_resync = false;
        guard.pending_mode = None;

        if guard.remote_config.is_some() {
            guard.status = if guard.dirty_since.is_some() {
                SyncStatusKind::OfflinePending
            } else {
                SyncStatusKind::Synced
            };
        } else {
            guard.status = SyncStatusKind::Disabled;
        }
    }

    /// 返回当前已加载的远端配置。
    pub(crate) async fn remote_config(&self) -> Option<SyncRemoteConfig> {
        self.inner.read().await.remote_config.clone()
    }

    /// 初始化或覆盖同步策略缓存。
    pub(crate) async fn set_policy(&self, policy: SyncPolicy, next_sync_at: Option<String>) {
        let mut guard = self.inner.write().await;
        guard.policy = policy;
        guard.next_sync_at = if guard.dirty_since.is_some() {
            next_write_deadline(&guard.policy, now_utc())
        } else {
            next_sync_at
        };
        drop(guard);
        self.scheduler_notify.notify_one();
    }

    /// 更新当前设备本地副本状态。
    pub(crate) async fn set_replica_state(
        &self,
        replica_state: SyncReplicaState,
        replica_reason: Option<String>,
        last_restore_at: Option<String>,
    ) {
        let mut guard = self.inner.write().await;
        guard.replica_state = replica_state;
        guard.replica_reason = replica_reason;
        guard.last_restore_at = last_restore_at;
    }

    /// 读取当前设备本地副本状态。
    pub(crate) async fn replica_state(&self) -> SyncReplicaState {
        self.inner.read().await.replica_state
    }

    /// 标记本地有未上推的写入。
    pub(crate) async fn mark_dirty(&self) {
        let mut guard = self.inner.write().await;
        if guard.remote_config.is_none() {
            return;
        }

        let now = now_utc();
        if guard.dirty_since.is_none() {
            guard.dirty_since = Some(now.to_rfc3339());
        }
        if guard.next_sync_at.is_none() {
            guard.next_sync_at = next_write_deadline(&guard.policy, now);
        }

        if is_running(guard.status) {
            queue_pending_mode(&mut guard, SyncRunMode::Sync);
            drop(guard);
            self.scheduler_notify.notify_one();
            return;
        }

        guard.status = SyncStatusKind::OfflinePending;
        drop(guard);
        self.scheduler_notify.notify_one();
    }

    /// 运行中的外部触发只排队，不并发起第二轮。
    pub(crate) async fn queue_pending(&self, mode: SyncRunMode) {
        let mut guard = self.inner.write().await;
        if guard.remote_config.is_none() {
            return;
        }

        queue_pending_mode(&mut guard, mode);
    }

    /// 尝试抢占同步执行权；失败说明已有同步在跑。
    pub(crate) fn try_lock_execution(&self) -> Option<OwnedMutexGuard<()>> {
        self.execution_lock.clone().try_lock_owned().ok()
    }

    /// 等待直到可以执行一轮同步。
    pub(crate) async fn lock_execution(&self) -> OwnedMutexGuard<()> {
        self.execution_lock.clone().lock_owned().await
    }

    /// 一轮同步开始时更新可见状态。
    pub(crate) async fn start_run(&self, _mode: SyncRunMode) {
        let mut guard = self.inner.write().await;
        guard.last_error = None;
        guard.last_error_mode = None;
        guard.status = SyncStatusKind::Syncing;
    }

    /// 同步成功后落状态。
    pub(crate) async fn complete_run(&self, mode: SyncRunMode) {
        let mut guard = self.inner.write().await;
        let now = now_utc().to_rfc3339();

        match mode {
            SyncRunMode::Push => {
                guard.last_push_at = Some(now);
                guard.dirty_since = None;
            }
            SyncRunMode::Pull => {
                guard.last_pull_at = Some(now);
            }
            SyncRunMode::Sync => {
                guard.last_push_at = Some(now.clone());
                guard.last_pull_at = Some(now);
                guard.dirty_since = None;
            }
        }

        guard.status = SyncStatusKind::Synced;
        guard.last_error_mode = None;
        guard.failure_count = 0;
        guard.next_sync_at = None;
        drop(guard);
        self.scheduler_notify.notify_one();
    }

    /// 同步失败只更新状态，不影响业务写入结果。
    pub(crate) async fn fail_run(&self, mode: SyncRunMode, message: String, needs_attention: bool) {
        let mut guard = self.inner.write().await;
        guard.status = if needs_attention {
            SyncStatusKind::NeedsAttention
        } else {
            SyncStatusKind::Error
        };
        guard.last_error = Some(message);
        guard.last_error_mode = Some(mode);
        if needs_attention {
            guard.next_sync_at = None;
        } else {
            guard.failure_count = guard.failure_count.saturating_add(1);
            guard.next_sync_at = match guard.policy.mode {
                super::policy::SyncPolicyMode::Interval => {
                    Some((now_utc() + retry_backoff(guard.failure_count)).to_rfc3339())
                }
                super::policy::SyncPolicyMode::Manual => None,
            };
        };
        drop(guard);
        self.scheduler_notify.notify_one();
    }

    /// 取出排队的补跑模式。
    pub(crate) async fn take_pending_mode(&self) -> Option<SyncRunMode> {
        let mut guard = self.inner.write().await;
        if !guard.pending_resync {
            return None;
        }

        guard.pending_resync = false;
        guard.pending_mode.take()
    }

    pub(crate) fn scheduler_notifier(&self) -> Arc<Notify> {
        Arc::clone(&self.scheduler_notify)
    }

    pub(crate) async fn next_sync_deadline(&self) -> Option<DateTime<Utc>> {
        let guard = self.inner.read().await;
        let raw = guard.next_sync_at.as_ref()?;
        DateTime::parse_from_rfc3339(raw)
            .ok()
            .map(|time| time.with_timezone(&Utc))
    }

    pub(crate) async fn should_run_scheduled_sync(&self, now: DateTime<Utc>) -> bool {
        let guard = self.inner.read().await;
        if guard.remote_config.is_none()
            || guard.dirty_since.is_none()
            || guard.policy.mode == super::policy::SyncPolicyMode::Manual
            || is_running(guard.status)
        {
            return false;
        }

        guard
            .next_sync_at
            .as_ref()
            .and_then(|raw| DateTime::parse_from_rfc3339(raw).ok())
            .is_some_and(|deadline| deadline.with_timezone(&Utc) <= now)
    }
}

fn is_running(status: SyncStatusKind) -> bool {
    matches!(status, SyncStatusKind::Syncing)
}

fn queue_pending_mode(inner: &mut SyncRuntimeInner, next_mode: SyncRunMode) {
    inner.pending_resync = true;
    inner.pending_mode = Some(match inner.pending_mode {
        None => next_mode,
        Some(current) => merge_modes(current, next_mode),
    });
}

fn retry_backoff(failure_count: u32) -> Duration {
    match failure_count {
        0 | 1 => Duration::minutes(1),
        2 => Duration::minutes(2),
        _ => Duration::minutes(5),
    }
}

fn next_write_deadline(policy: &SyncPolicy, now: DateTime<Utc>) -> Option<String> {
    matches!(policy.mode, super::policy::SyncPolicyMode::Interval)
        .then(|| (now + WRITE_DEBOUNCE).to_rfc3339())
}

fn merge_modes(current: SyncRunMode, next: SyncRunMode) -> SyncRunMode {
    use SyncRunMode::{Pull, Push, Sync};

    match (current, next) {
        (Sync, _) | (_, Sync) => Sync,
        (Push, Push) => Push,
        (Pull, Pull) => Pull,
        _ => Sync,
    }
}

#[cfg(test)]
mod tests {
    use chrono::Duration;

    use super::{SyncRunMode, SyncRuntimeState};
    use crate::sync::types::{SyncRemoteConfig, SyncReplicaState, SyncStatusKind};
    use crate::sync::{SyncPolicy, SyncPolicyMode};

    #[tokio::test]
    async fn mark_dirty_should_move_idle_to_dirty() {
        let state = SyncRuntimeState::default();
        state
            .set_remote_config(Some(SyncRemoteConfig {
                url: "libsql://example.turso.io".to_owned(),
                token: "token".to_owned(),
            }))
            .await;

        state.mark_dirty().await;

        let payload = state.snapshot().await;
        assert_eq!(payload.status, SyncStatusKind::OfflinePending);
        assert!(payload.enabled);
    }

    #[tokio::test]
    async fn mark_dirty_should_not_queue_sync_when_idle() {
        let state = SyncRuntimeState::default();
        state
            .set_remote_config(Some(SyncRemoteConfig {
                url: "libsql://example.turso.io".to_owned(),
                token: "token".to_owned(),
            }))
            .await;

        state.mark_dirty().await;

        let next_mode = state.take_pending_mode().await;
        assert_eq!(next_mode, None);
    }

    #[tokio::test]
    async fn mark_dirty_should_schedule_next_sync_for_interval_policy() {
        let state = SyncRuntimeState::default();
        state
            .set_remote_config(Some(SyncRemoteConfig {
                url: "libsql://example.turso.io".to_owned(),
                token: "token".to_owned(),
            }))
            .await;

        state.mark_dirty().await;

        let payload = state.snapshot().await;
        assert!(payload.next_sync_at.is_some());
    }

    #[tokio::test]
    async fn mark_dirty_should_not_schedule_next_sync_for_manual_policy() {
        let state = SyncRuntimeState::default();
        state
            .set_remote_config(Some(SyncRemoteConfig {
                url: "libsql://example.turso.io".to_owned(),
                token: "token".to_owned(),
            }))
            .await;
        state
            .set_policy(
                SyncPolicy {
                    mode: SyncPolicyMode::Manual,
                    interval_minutes: 15,
                },
                None,
            )
            .await;

        state.mark_dirty().await;

        let payload = state.snapshot().await;
        assert_eq!(payload.next_sync_at, None);
    }

    #[tokio::test]
    async fn fail_run_should_schedule_retry() {
        let state = SyncRuntimeState::default();
        state
            .set_remote_config(Some(SyncRemoteConfig {
                url: "libsql://example.turso.io".to_owned(),
                token: "token".to_owned(),
            }))
            .await;

        state
            .fail_run(SyncRunMode::Sync, "network down".to_owned(), false)
            .await;

        let payload = state.snapshot().await;
        assert!(payload.next_sync_at.is_some());
    }

    #[tokio::test]
    async fn fail_run_should_stop_retry_for_actionable_error() {
        let state = SyncRuntimeState::default();
        state
            .set_remote_config(Some(SyncRemoteConfig {
                url: "libsql://example.turso.io".to_owned(),
                token: "token".to_owned(),
            }))
            .await;

        state
            .fail_run(SyncRunMode::Sync, "schema incompatible".to_owned(), true)
            .await;

        let payload = state.snapshot().await;
        assert_eq!(payload.status, SyncStatusKind::NeedsAttention);
        assert_eq!(payload.next_sync_at, None);
    }

    #[test]
    fn retry_backoff_should_cap_at_five_minutes() {
        assert_eq!(super::retry_backoff(1), Duration::minutes(1));
        assert_eq!(super::retry_backoff(2), Duration::minutes(2));
        assert_eq!(super::retry_backoff(3), Duration::minutes(5));
        assert_eq!(super::retry_backoff(99), Duration::minutes(5));
    }

    #[test]
    fn next_write_deadline_should_use_short_debounce_for_interval_policy() {
        let now = chrono::Utc::now();
        let deadline = super::next_write_deadline(
            &SyncPolicy {
                mode: SyncPolicyMode::Interval,
                interval_minutes: 30,
            },
            now,
        );

        assert_eq!(deadline, Some((now + Duration::seconds(3)).to_rfc3339()));
    }

    #[tokio::test]
    async fn queue_pending_should_merge_push_and_pull_into_sync() {
        let state = SyncRuntimeState::default();
        state
            .set_remote_config(Some(SyncRemoteConfig {
                url: "libsql://example.turso.io".to_owned(),
                token: "token".to_owned(),
            }))
            .await;

        state.queue_pending(SyncRunMode::Push).await;
        state.queue_pending(SyncRunMode::Pull).await;

        let next_mode = state.take_pending_mode().await;
        assert_eq!(next_mode, Some(SyncRunMode::Sync));
    }

    #[tokio::test]
    async fn mark_dirty_should_queue_sync_when_sync_is_running() {
        let state = SyncRuntimeState::default();
        state
            .set_remote_config(Some(SyncRemoteConfig {
                url: "libsql://example.turso.io".to_owned(),
                token: "token".to_owned(),
            }))
            .await;
        state.start_run(SyncRunMode::Pull).await;

        state.mark_dirty().await;

        let next_mode = state.take_pending_mode().await;
        assert_eq!(next_mode, Some(SyncRunMode::Sync));
    }

    #[tokio::test]
    async fn start_run_should_begin_sync_round_in_syncing_state() {
        let state = SyncRuntimeState::default();
        state
            .set_remote_config(Some(SyncRemoteConfig {
                url: "libsql://example.turso.io".to_owned(),
                token: "token".to_owned(),
            }))
            .await;

        state.start_run(SyncRunMode::Sync).await;

        let payload = state.snapshot().await;
        assert_eq!(payload.status, SyncStatusKind::Syncing);
    }

    #[tokio::test]
    async fn snapshot_should_include_replica_state() {
        let state = SyncRuntimeState::default();

        state
            .set_replica_state(
                SyncReplicaState::BaselineRequired,
                Some("needs restore".to_owned()),
                Some("2026-06-28T00:00:00Z".to_owned()),
            )
            .await;

        let payload = state.snapshot().await;
        assert_eq!(payload.replica_state, SyncReplicaState::BaselineRequired);
        assert_eq!(payload.replica_reason.as_deref(), Some("needs restore"));
        assert_eq!(
            payload.last_restore_at.as_deref(),
            Some("2026-06-28T00:00:00Z")
        );
    }

    #[tokio::test]
    async fn snapshot_should_default_to_fifteen_minute_policy() {
        let state = SyncRuntimeState::default();

        let payload = state.snapshot().await;

        assert_eq!(payload.policy_mode, SyncPolicyMode::Interval);
        assert_eq!(payload.policy_interval_minutes, 15);
    }
}

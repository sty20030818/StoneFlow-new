//! 自动更新检查调度：可被设置变更打断 sleep，使新间隔立即生效。

use std::sync::Arc;

use tokio::sync::Notify;

/// 更新检查循环的唤醒器（改间隔 / 改模式时 notify）。
#[derive(Clone, Default)]
pub struct UpdateScheduleWake {
    notify: Arc<Notify>,
}

impl UpdateScheduleWake {
    pub fn new() -> Self {
        Self {
            notify: Arc::new(Notify::new()),
        }
    }

    pub fn notify(&self) {
        self.notify.notify_waiters();
    }

    pub fn notified(&self) -> tokio::sync::futures::Notified<'_> {
        self.notify.notified()
    }

    pub fn clone_notify(&self) -> Arc<Notify> {
        Arc::clone(&self.notify)
    }
}

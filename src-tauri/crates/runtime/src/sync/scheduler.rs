//! 云同步自动调度器。

use std::time::Duration;

use chrono::{DateTime, Utc};
use tauri::Manager;

use crate::app::state::AppState;

use super::{engine, state::SyncRunMode};
use stoneflow_domain::now_utc;

const IDLE_SLEEP: Duration = Duration::from_secs(60 * 60);
const POST_TRIGGER_SLEEP: Duration = Duration::from_secs(1);

pub fn start_scheduler(app_handle: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        run_scheduler(app_handle).await;
    });
}

async fn run_scheduler(app_handle: tauri::AppHandle) {
    loop {
        let Some(app_state) = app_handle
            .try_state::<AppState>()
            .map(|state| state.inner().clone())
        else {
            return;
        };
        let sync_state = app_state.sync.clone();
        let notifier = sync_state.scheduler_notifier();
        let sleep_for = sync_state
            .next_sync_deadline()
            .await
            .map(|deadline| sleep_duration_until(deadline, now_utc()))
            .unwrap_or(IDLE_SLEEP);

        tokio::select! {
            _ = tokio::time::sleep(sleep_for) => {}
            _ = notifier.notified() => continue,
        }

        if sync_state.should_run_scheduled_sync(now_utc()).await {
            engine::schedule_background_sync(&app_handle, SyncRunMode::Sync).await;
            tokio::time::sleep(POST_TRIGGER_SLEEP).await;
        }
    }
}

fn sleep_duration_until(deadline: DateTime<Utc>, now: DateTime<Utc>) -> Duration {
    deadline
        .signed_duration_since(now)
        .to_std()
        .unwrap_or(Duration::ZERO)
}

#[cfg(test)]
mod tests {
    use chrono::{Duration, TimeZone, Utc};

    use super::sleep_duration_until;

    #[test]
    fn sleep_duration_until_should_return_zero_for_due_deadline() {
        let now = Utc
            .with_ymd_and_hms(2026, 7, 1, 10, 0, 0)
            .single()
            .expect("time should exist");

        let duration = sleep_duration_until(now - Duration::seconds(1), now);

        assert_eq!(duration, std::time::Duration::ZERO);
    }

    #[test]
    fn sleep_duration_until_should_return_remaining_duration() {
        let now = Utc
            .with_ymd_and_hms(2026, 7, 1, 10, 0, 0)
            .single()
            .expect("time should exist");

        let duration = sleep_duration_until(now + Duration::seconds(30), now);

        assert_eq!(duration, std::time::Duration::from_secs(30));
    }
}

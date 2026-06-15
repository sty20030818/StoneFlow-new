//! 基座回归测试。

use crate::app::state::{
    ActiveScopeKind, ActiveScopeSnapshot, ActiveScopeState, CommandHelperState,
    HelperExitKind, HelperLifecycleStage, IpcServerStatus,
};
use crate::domain::next_runtime_id;
use stoneflow_storage::database::DatabaseRuntimeSnapshot;
use uuid::Uuid;

/// 与 runtime `healthcheck` 命令保持同一契约（测试内联，避免 desktop-app → runtime 依赖）。
fn healthcheck_payload(database: DatabaseRuntimeSnapshot) -> (&'static str, &'static str, bool) {
    let status = if database.database_ready { "ok" } else { "degraded" };
    (status, "desktop-app", database.database_ready)
}

#[test]
fn healthcheck_should_report_stage_0_runtime() {
    let (status, app, database_ready) = healthcheck_payload(DatabaseRuntimeSnapshot {
        database_path: "/tmp/stoneflow.sqlite3".to_owned(),
        database_ready: true,
        migrations_ready: true,
    });

    assert_eq!(status, "ok");
    assert_eq!(app, "desktop-app");
    assert_eq!(database_ready, true);
}

#[tokio::test]
async fn active_scope_state_should_store_latest_scope_snapshot() {
    let state = ActiveScopeState::default();
    state
        .set(ActiveScopeSnapshot {
            id: next_runtime_id(),
            kind: ActiveScopeKind::Space,
            space_id: Some(Uuid::new_v4()),
        })
        .await;

    let snapshot = state.get().await.expect("active scope should exist");
    assert_eq!(snapshot.kind, ActiveScopeKind::Space);
    assert!(snapshot.space_id.is_some());
}

#[tokio::test]
async fn command_helper_snapshot_should_start_with_new_lifecycle_shape() {
    let state = CommandHelperState::default();
    let snapshot = state.snapshot().await;

    assert!(!snapshot.initialized);
    assert_eq!(snapshot.lifecycle_stage, HelperLifecycleStage::Idle);
    assert_eq!(snapshot.ipc_status, IpcServerStatus::Stopped);
    assert_eq!(snapshot.protocol_version, None);
    assert_eq!(snapshot.helper_version, None);
    assert_eq!(snapshot.platform, None);
    assert_eq!(snapshot.last_hello_at, None);
    assert_eq!(snapshot.last_window_ready_at, None);
    assert_eq!(snapshot.last_window_unready_at, None);
    assert!(!snapshot.shutdown_acknowledged);
    assert_eq!(snapshot.last_shutdown_requested_at, None);
    assert_eq!(snapshot.last_shutdown_ack_at, None);
    assert_eq!(snapshot.last_shutdown_reason, None);
    assert!(!snapshot.shutdown_requested);
    assert_eq!(snapshot.last_exit_kind, None);
    assert_eq!(snapshot.last_exit_code, None);
    assert_eq!(snapshot.last_exit_reason, None);
    assert_eq!(snapshot.last_exit_at, None);
}

#[tokio::test]
async fn command_helper_state_should_follow_hello_to_window_ready_path() {
    let state = CommandHelperState::default();
    state.mark_helper_starting(None).await;
    state.mark_helper_spawned(42).await;
    state
        .mark_helper_hello(
            4,
            "0.1.0".to_owned(),
            "windows".to_owned(),
            "2026-05-23T00:00:00Z".to_owned(),
        )
        .await;
    state
        .mark_window_ready("2026-05-23T00:00:01Z".to_owned())
        .await;

    let snapshot = state.snapshot().await;
    assert_eq!(snapshot.lifecycle_stage, HelperLifecycleStage::Ready);
    assert_eq!(snapshot.helper_pid, Some(42));
    assert_eq!(snapshot.protocol_version, Some(4));
    assert_eq!(snapshot.helper_version.as_deref(), Some("0.1.0"));
    assert_eq!(snapshot.platform.as_deref(), Some("windows"));
    assert_eq!(
        snapshot.last_window_ready_at.as_deref(),
        Some("2026-05-23T00:00:01Z")
    );
}

#[tokio::test]
async fn command_helper_state_should_return_to_waiting_for_window_on_unready() {
    let state = CommandHelperState::default();
    state.mark_helper_starting(None).await;
    state.mark_helper_spawned(42).await;
    state
        .mark_helper_hello(
            4,
            "0.1.0".to_owned(),
            "windows".to_owned(),
            "2026-05-23T00:00:00Z".to_owned(),
        )
        .await;
    state
        .mark_window_ready("2026-05-23T00:00:01Z".to_owned())
        .await;
    state
        .mark_window_unready("2026-05-23T00:00:02Z".to_owned())
        .await;

    let snapshot = state.snapshot().await;
    assert_eq!(snapshot.lifecycle_stage, HelperLifecycleStage::WaitingForWindow);
    assert_eq!(
        snapshot.last_window_unready_at.as_deref(),
        Some("2026-05-23T00:00:02Z")
    );
}

#[tokio::test]
async fn command_helper_state_should_preserve_new_fields_across_terminal_states() {
    let state = CommandHelperState::default();
    state.mark_helper_starting(None).await;
    state.mark_helper_spawned(42).await;
    state
        .mark_helper_hello(
            4,
            "0.1.0".to_owned(),
            "windows".to_owned(),
            "2026-05-23T00:00:00Z".to_owned(),
        )
        .await;
    state
        .mark_window_ready("2026-05-23T00:00:01Z".to_owned())
        .await;
    state
        .mark_shutdown_requested("supervisor_stop", "2026-05-23T00:00:02Z".to_owned())
        .await;
    state
        .mark_shutdown_acknowledged("2026-05-23T00:00:03Z".to_owned())
        .await;
    state.mark_shutting_down().await;
    state.mark_helper_restarting("restart".to_owned()).await;
    state
        .mark_helper_crashed(
            "crash".to_owned(),
            Some(1),
            "crash".to_owned(),
            "2026-05-23T00:00:04Z".to_owned(),
        )
        .await;
    state.mark_helper_disconnected("disconnected".to_owned()).await;

    let snapshot = state.snapshot().await;
    assert_eq!(snapshot.lifecycle_stage, HelperLifecycleStage::Disconnected);
    assert_eq!(snapshot.protocol_version, Some(4));
    assert_eq!(snapshot.helper_version.as_deref(), Some("0.1.0"));
    assert_eq!(snapshot.platform.as_deref(), Some("windows"));
    assert!(snapshot.shutdown_requested);
    assert!(snapshot.shutdown_acknowledged);
    assert_eq!(
        snapshot.last_shutdown_requested_at.as_deref(),
        Some("2026-05-23T00:00:02Z")
    );
    assert_eq!(
        snapshot.last_shutdown_ack_at.as_deref(),
        Some("2026-05-23T00:00:03Z")
    );
    assert_eq!(
        snapshot.last_shutdown_reason.as_deref(),
        Some("supervisor_stop")
    );
    assert_eq!(snapshot.restart_count, 1);
    assert_eq!(snapshot.last_exit_kind, Some(HelperExitKind::Crash));
    assert_eq!(snapshot.last_exit_code, Some(1));
    assert_eq!(snapshot.last_exit_reason.as_deref(), Some("crash"));
    assert_eq!(snapshot.last_exit_at.as_deref(), Some("2026-05-23T00:00:04Z"));
}

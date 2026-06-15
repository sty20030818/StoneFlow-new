//! 基座回归测试。

use crate::app::state::{
    ActiveScopeKind, ActiveScopeSnapshot, ActiveScopeState, CommandOpenState,
    PendingCommandOpenIntent,
};
use stoneflow_domain::next_runtime_id;
use stoneflow_storage::database::DatabaseRuntimeSnapshot;
use uuid::Uuid;

/// 与 runtime `healthcheck` 命令保持同一契约。
fn healthcheck_payload(database: DatabaseRuntimeSnapshot) -> (&'static str, &'static str, bool) {
    let status = if database.database_ready { "ok" } else { "degraded" };
    (status, "stoneflow", database.database_ready)
}

#[test]
fn healthcheck_should_report_stage_0_runtime() {
    let (status, app, database_ready) = healthcheck_payload(DatabaseRuntimeSnapshot {
        database_path: "/tmp/stoneflow.sqlite3".to_owned(),
        database_ready: true,
        migrations_ready: true,
    });

    assert_eq!(status, "ok");
    assert_eq!(app, "stoneflow");
    assert!(database_ready);
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
async fn command_open_state_should_store_and_take_pending_open_intent() {
    let state = CommandOpenState::default();
    let intent = PendingCommandOpenIntent {
        kind: "task".to_owned(),
        id: "task-1".to_owned(),
        space_id: "space-1".to_owned(),
        project_id: Some("project-1".to_owned()),
        placement: "project".to_owned(),
    };

    state.set_pending_command_open(intent.clone()).await;
    let taken = state
        .take_pending_command_open()
        .await
        .expect("pending intent should exist");

    assert_eq!(taken, intent);
    assert!(state.take_pending_command_open().await.is_none());
}

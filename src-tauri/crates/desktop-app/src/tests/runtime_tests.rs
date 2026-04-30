//! 基座回归测试。

use crate::app::state::{ActiveScopeKind, ActiveScopeSnapshot, ActiveScopeState};
use crate::domain::next_runtime_id;
use crate::infrastructure::database::DatabaseRuntimeSnapshot;
use crate::infrastructure::runtime::healthcheck_payload;
use uuid::Uuid;

#[test]
fn healthcheck_should_report_stage_0_runtime() {
    let payload = healthcheck_payload(DatabaseRuntimeSnapshot {
        database_path: "/tmp/stoneflow.sqlite3".to_owned(),
        database_ready: true,
        migrations_ready: true,
    });

    assert_eq!(payload.status, "ok");
    assert_eq!(payload.app, "desktop-app");
    assert_eq!(payload.architecture_stage, "stage_0_infra");
    assert!(payload.database_ready);
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

//! 基座回归测试。

use crate::app::commands::workspace::healthcheck;
use crate::app::state::{ActiveSpaceSnapshot, ActiveSpaceState};
use crate::domain::next_runtime_id;
use crate::infrastructure::runtime::healthcheck_payload;

#[test]
fn healthcheck_should_report_pre_stage_a_runtime() {
    let payload = healthcheck_payload();

    assert_eq!(payload.status, "ok");
    assert_eq!(payload.architecture_stage, "pre_stage_a");
    assert!(!payload.database_ready);
}

#[test]
fn healthcheck_command_should_match_runtime_payload() {
    let payload = healthcheck();

    assert_eq!(payload.app, "desktop-app");
    assert_eq!(payload.architecture_stage, "pre_stage_a");
}

#[tokio::test]
async fn active_space_state_should_store_latest_slug() {
    let state = ActiveSpaceState::default();
    state
        .set(ActiveSpaceSnapshot {
            id: next_runtime_id(),
            slug: "work".to_owned(),
        })
        .await;

    let snapshot = state.get().await.expect("active space should exist");
    assert_eq!(snapshot.slug, "work");
}

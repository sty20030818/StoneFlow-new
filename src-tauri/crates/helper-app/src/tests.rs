use crate::lifecycle::HelperLifecycleState;

#[tokio::test]
async fn helper_lifecycle_should_toggle_frontend_ready() {
    let lifecycle = HelperLifecycleState::default();
    lifecycle.mark_frontend_ready().await;
    assert!(lifecycle.is_frontend_ready().await);
    lifecycle.mark_frontend_unready().await;
    assert!(!lifecycle.is_frontend_ready().await);
}

#[tokio::test]
async fn helper_lifecycle_should_reject_actions_during_shutdown() {
    let lifecycle = HelperLifecycleState::default();
    lifecycle.begin_shutdown().await;
    assert_eq!(
        lifecycle.guard_running("shortcut").await.expect_err("should reject shortcut"),
        "helper 正在关闭，忽略全局快捷键"
    );
}

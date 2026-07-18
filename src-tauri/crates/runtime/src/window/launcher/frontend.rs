//! Launcher 前端 ready 状态（单 Binary 路径，不经过 helper lifecycle）。

use std::sync::Arc;

use tokio::sync::RwLock;

#[derive(Debug, Clone, Default)]
pub struct LauncherFrontendState {
    ready: Arc<RwLock<bool>>,
}

impl LauncherFrontendState {
    pub async fn mark_ready(&self) {
        *self.ready.write().await = true;
    }

    pub async fn mark_unready(&self) {
        *self.ready.write().await = false;
    }

    pub async fn is_ready(&self) -> bool {
        *self.ready.read().await
    }
}

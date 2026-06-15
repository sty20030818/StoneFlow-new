use std::sync::Arc;

use tauri::{AppHandle, Wry};

/// Quick Create 窗口生命周期回调，由 runtime 注入业务逻辑。
#[derive(Clone)]
pub struct QuickWindowCallbacks {
    pub on_became_key: Arc<dyn Fn(AppHandle<Wry>) + Send + Sync>,
    pub on_resign_key: Arc<dyn Fn(AppHandle<Wry>) + Send + Sync>,
}

impl QuickWindowCallbacks {
    /// 空操作回调，供测试或无需业务钩子的场景使用。
    pub fn noop() -> Self {
        Self {
            on_became_key: Arc::new(|_| {}),
            on_resign_key: Arc::new(|_| {}),
        }
    }
}

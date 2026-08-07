//! 更新会话的唯一全局事件出口。

use stoneflow_application::update::UpdateSessionSnapshot;
use tauri::{AppHandle, Emitter, Manager};

use super::RuntimeUpdateService;

pub const UPDATE_SESSION_CHANGED_EVENT: &str = "update-session-changed";

pub fn emit_session_changed(app: &AppHandle, snapshot: &UpdateSessionSnapshot) {
    let _ = app.emit(UPDATE_SESSION_CHANGED_EVENT, snapshot);
}

pub fn emit_current_session(app: &AppHandle) {
    if let Some(service) = app.try_state::<RuntimeUpdateService>() {
        emit_session_changed(app, &service.session_snapshot());
    }
}

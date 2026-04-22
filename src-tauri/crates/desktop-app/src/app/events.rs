//! 主 App 发给前端窗口的轻量运行时事件。
//!
//! 这些事件只表达“某类事实已经变化”，不携带完整业务快照；前端收到后仍通过
//! 既有查询 Command 读取最新事实，避免复制 Rust 查询规则。

use tauri::{AppHandle, Emitter, Runtime};
use uuid::Uuid;

/// 任务事实变化事件：用于 Quick Capture / Drawer / 列表动作后的主应用刷新。
pub(crate) const TASKS_CHANGED_EVENT: &str = "stoneflow://tasks/changed";

/// Command Helper 请求主 App 打开实体。
pub(crate) const COMMAND_OPEN_EVENT: &str = "stoneflow://command/open";

/// 任务事实变化事件的最小载荷。
#[derive(Debug, Clone, serde::Serialize)]
pub(crate) struct TaskChangedPayload {
    pub(crate) space_id: Uuid,
    pub(crate) space_slug: String,
    pub(crate) task_id: Uuid,
    pub(crate) source: String,
    pub(crate) space_fallback: bool,
}

/// Command 打开请求载荷。
#[derive(Debug, Clone, serde::Serialize)]
pub(crate) struct CommandOpenPayload {
    pub(crate) kind: String,
    pub(crate) id: Uuid,
    pub(crate) space_slug: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(crate) project_id: Option<Uuid>,
}

/// 向所有已打开前端窗口广播任务变化。
///
/// 事件只作为刷新加速信号；发送失败不应影响已经成功完成的业务写入。
pub(crate) fn emit_task_changed<R: Runtime>(
    app_handle: &AppHandle<R>,
    payload: TaskChangedPayload,
) {
    if let Err(error) = app_handle.emit(TASKS_CHANGED_EVENT, payload) {
        log::warn!("发送任务变更事件失败: {error}");
    }
}

/// 向主 App 前端广播 Command 打开请求。
pub(crate) fn emit_command_open<R: Runtime>(app_handle: &AppHandle<R>, payload: CommandOpenPayload) {
    if let Err(error) = app_handle.emit(COMMAND_OPEN_EVENT, payload) {
        log::warn!("发送 Command 打开事件失败: {error}");
    }
}

//! Helper 前端（Quick Capture 页面）可调的 Tauri Command。

use serde::{Deserialize, Serialize};
use stoneflow_ipc_protocol::{CreateTaskPayload, IpcError};

use crate::ipc_client;

/// 前端输入；字段命名与主 App 的 `create_capture_task` Command 保持一致，
/// 方便前端复用同一个 payload 结构。
#[derive(Debug, Clone, Deserialize)]
pub struct HelperCreateTaskInput {
    pub title: String,
    #[serde(default)]
    pub note: Option<String>,
    #[serde(default)]
    pub priority: Option<String>,
}

/// 前端可观察到的错误载荷，保持与主 App `CaptureTaskErrorPayload` 的 `{type, message}`
/// 契约一致，前端侧不需要分支处理。
#[derive(Debug, Clone, Serialize)]
pub struct HelperCaptureErrorPayload {
    #[serde(rename = "type")]
    pub type_: &'static str,
    pub message: String,
}

impl From<IpcError> for HelperCaptureErrorPayload {
    fn from(error: IpcError) -> Self {
        let (type_, message) = match error {
            IpcError::Validation(msg) => ("Validation", msg),
            IpcError::NotFound(msg) => ("NotFound", msg),
            IpcError::Forbidden(msg) => ("Forbidden", msg),
            IpcError::Conflict(msg) => ("Conflict", msg),
            IpcError::Internal(msg) => ("Internal", msg),
            IpcError::CaptureSpaceUnavailable(msg) => ("CaptureSpaceUnavailable", msg),
            IpcError::DefaultSpaceUnavailable(msg) => ("DefaultSpaceUnavailable", msg),
            IpcError::CapturePersistence(msg) => ("CapturePersistence", msg),
        };
        Self { type_, message }
    }
}

/// 前端成功回传 payload；字段名使用 snake_case，与主 App `create_capture_task`
/// 的响应保持同构（前端解析逻辑不用分支）。
#[derive(Debug, Clone, Serialize)]
pub struct HelperCreatedTaskResponse {
    pub id: String,
    pub title: String,
    pub space_fallback: bool,
}

/// Helper 侧的「创建任务」入口：转换前端输入 → 经 IPC 发给主 App。
#[tauri::command]
pub async fn helper_create_task(
    input: HelperCreateTaskInput,
) -> Result<HelperCreatedTaskResponse, HelperCaptureErrorPayload> {
    // 清洗：空白 priority 归一为 None，与主 App 前端逻辑保持一致。
    let priority = input.priority.and_then(|value| {
        if value.trim().is_empty() {
            None
        } else {
            Some(value)
        }
    });

    let payload = CreateTaskPayload {
        title: input.title,
        note: input.note,
        priority,
    };

    let created = ipc_client::create_task(payload).await.map_err(|error| {
        log::warn!("helper_create_task 失败: {error}");
        HelperCaptureErrorPayload::from(error)
    })?;

    Ok(HelperCreatedTaskResponse {
        id: created.id.to_string(),
        title: created.title,
        space_fallback: created.space_fallback,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn maps_ipc_errors_to_frontend_capture_error_contract() {
        let cases = [
            (
                IpcError::Validation("blank title".to_owned()),
                "Validation",
                "blank title",
            ),
            (
                IpcError::CaptureSpaceUnavailable("active space missing".to_owned()),
                "CaptureSpaceUnavailable",
                "active space missing",
            ),
            (
                IpcError::DefaultSpaceUnavailable("default space archived".to_owned()),
                "DefaultSpaceUnavailable",
                "default space archived",
            ),
            (
                IpcError::CapturePersistence("sqlite write failed".to_owned()),
                "CapturePersistence",
                "sqlite write failed",
            ),
            (
                IpcError::Internal("connect main app failed".to_owned()),
                "Internal",
                "connect main app failed",
            ),
        ];

        for (error, expected_type, expected_message) in cases {
            let payload = HelperCaptureErrorPayload::from(error);
            assert_eq!(payload.type_, expected_type);
            assert_eq!(payload.message, expected_message);
        }
    }
}

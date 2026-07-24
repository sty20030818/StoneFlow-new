//! Launcher 命令错误与薄响应包装。
//!
//! 业务 payload 直接复用 application DTO 序列化，与 tasks 命令一致。

use crate::app::error::AppError;
use serde::Serialize;
use stoneflow_application::launcher_context::LauncherInitialStateDto;

#[derive(Debug, Clone, Serialize)]
pub struct LauncherErrorPayload {
    #[serde(rename = "type")]
    pub type_: &'static str,
    pub message: String,
}

impl From<AppError> for LauncherErrorPayload {
    fn from(error: AppError) -> Self {
        let message = error.to_string();
        let type_ = if message.starts_with("验证失败") {
            "Validation"
        } else if message.contains("不存在") {
            "NotFound"
        } else {
            "Internal"
        };
        Self { type_, message }
    }
}

/// prepare-session 响应：session 元数据 + 初始态（flatten）。
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherOpenSessionResponse {
    pub session_id: String,
    pub opened_at: String,
    #[serde(flatten)]
    pub open_context: LauncherInitialStateDto,
}

/// 初始态别名：直出 application DTO。
pub type LauncherInitialStateResponse = LauncherInitialStateDto;

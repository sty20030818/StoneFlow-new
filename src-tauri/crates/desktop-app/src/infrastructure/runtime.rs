//! 前置阶段 A 的最小运行时基座。

use serde::Serialize;

/// 当前基座的健康检查响应。
#[derive(Debug, Clone, Serialize)]
pub struct RuntimeHealthcheckPayload {
    pub status: &'static str,
    pub app: &'static str,
    pub architecture_stage: &'static str,
    pub database_path: String,
    pub database_ready: bool,
}

/// 返回当前最小基座的健康快照。
pub fn healthcheck_payload() -> RuntimeHealthcheckPayload {
    RuntimeHealthcheckPayload {
        status: "ok",
        app: "desktop-app",
        architecture_stage: "pre_stage_a",
        database_path: String::new(),
        database_ready: false,
    }
}

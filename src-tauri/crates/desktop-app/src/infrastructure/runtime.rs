//! 前置阶段 A 的最小运行时基座。

use serde::Serialize;

use crate::infrastructure::database::DatabaseRuntimeSnapshot;

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
pub fn healthcheck_payload(database: DatabaseRuntimeSnapshot) -> RuntimeHealthcheckPayload {
    RuntimeHealthcheckPayload {
        status: if database.database_ready {
            "ok"
        } else {
            "degraded"
        },
        app: "desktop-app",
        architecture_stage: "stage_0_infra",
        database_path: database.database_path,
        database_ready: database.database_ready,
    }
}

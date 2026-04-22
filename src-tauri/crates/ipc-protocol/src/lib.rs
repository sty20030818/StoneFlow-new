//! StoneFlow Helper ↔ 主 App IPC 协议（纯 DTO，不依赖 tauri / sea-orm）。
//!
//! 设计取舍：
//! - 协议 crate 只定义「请求 / 响应 / 错误」三个 enum 和套接字命名规则，
//!   具体的连接、监听、异步收发由 server / client 侧各自实现。
//! - 传输帧格式：`u32 BE` 长度前缀 + JSON 字节；防止半包粘包，约束单帧 ≤ `MAX_FRAME_BYTES`。
//! - 跨平台命名：Unix 用文件系统路径（`$TMPDIR/…`），Windows 用命名空间（`\\.\pipe\…`）。

use serde::{Deserialize, Serialize};
use thiserror::Error;
use uuid::Uuid;

/// 协议语义版本，双方握手时使用。
pub const PROTOCOL_VERSION: u16 = 1;

/// 单帧最大字节数（1 MiB）。正常负载远小于此值，超过视为异常。
pub const MAX_FRAME_BYTES: usize = 1024 * 1024;

/// 连接/读写默认超时（毫秒）。调用方可在其基础上自行叠加策略。
pub const DEFAULT_CONNECT_TIMEOUT_MS: u64 = 2_000;
pub const DEFAULT_REQUEST_TIMEOUT_MS: u64 = 5_000;

/// Helper → 主 App 的请求。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum IpcRequest {
    /// 连通性探测。
    Ping,
    /// 当前 Space 查询（初版保留，前端暂不强依赖）。
    GetActiveSpace,
    /// 请求创建一条 Quick Capture 任务。
    CreateTask(CreateTaskPayload),
    /// 在当前捕获 Space 内搜索 Task / Project。
    SearchWorkspace(SearchWorkspacePayload),
    /// 请求主 App 打开一个 Task。
    OpenTask(OpenTaskPayload),
    /// 请求主 App 打开一个 Project。
    OpenProject(OpenProjectPayload),
}

/// 创建任务的输入载荷，语义对应主 App `create_capture_task_usecase` 的入参。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct CreateTaskPayload {
    pub title: String,
    #[serde(default)]
    pub note: Option<String>,
    #[serde(default)]
    pub priority: Option<String>,
}

/// Helper 搜索请求。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SearchWorkspacePayload {
    pub query: String,
    pub limit: u64,
}

/// 打开 Task 的请求。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OpenTaskPayload {
    pub task_id: Uuid,
}

/// 打开 Project 的请求。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OpenProjectPayload {
    pub project_id: Uuid,
}

/// 主 App → Helper 的响应。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum IpcResponse {
    /// Ping 回应。
    Pong { protocol_version: u16 },
    /// 当前 Space slug。
    ActiveSpace { space_slug: Option<String> },
    /// 创建成功的任务摘要。
    TaskCreated(TaskCreatedPayload),
    /// 当前捕获 Space 内的轻量搜索结果。
    WorkspaceSearch(WorkspaceSearchResultPayload),
    /// 打开请求已转交主 App。
    Opened,
    /// 处理失败，返回结构化错误。
    Error(IpcError),
}

/// 任务创建结果摘要（只保留 Helper 需要向用户反馈的最小字段）。
///
/// `space_slug` 可能为空：主 App 当前用例返回的 payload 不携带 slug，
/// Helper 初版仅用于日志，不展示给用户，因此保留可选。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TaskCreatedPayload {
    pub id: Uuid,
    pub title: String,
    #[serde(default)]
    pub space_slug: Option<String>,
    pub space_fallback: bool,
}

/// Helper 侧搜索结果。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct WorkspaceSearchResultPayload {
    pub space_slug: String,
    pub tasks: Vec<WorkspaceTaskSearchItemPayload>,
    pub projects: Vec<WorkspaceProjectSearchItemPayload>,
}

/// Task 搜索结果的 IPC 载荷。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct WorkspaceTaskSearchItemPayload {
    pub id: Uuid,
    pub title: String,
    #[serde(default)]
    pub note: Option<String>,
    #[serde(default)]
    pub priority: Option<String>,
    #[serde(default)]
    pub project_id: Option<Uuid>,
    #[serde(default)]
    pub project_name: Option<String>,
    pub updated_at: String,
}

/// Project 搜索结果的 IPC 载荷。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct WorkspaceProjectSearchItemPayload {
    pub id: Uuid,
    pub name: String,
    #[serde(default)]
    pub note: Option<String>,
    pub status: String,
    pub sort_order: i32,
}

/// IPC 通道上承载的业务错误。
///
/// 刻意与主 App `AppError` 保持同构的字符串标签，
/// 便于后续若需要统一错误分类，只需在主 App 侧做一次 `From` 转换。
#[derive(Debug, Clone, Serialize, Deserialize, Error, PartialEq, Eq)]
#[serde(tag = "code", content = "message", rename_all = "snake_case")]
pub enum IpcError {
    #[error("validation: {0}")]
    Validation(String),
    #[error("not found: {0}")]
    NotFound(String),
    #[error("forbidden: {0}")]
    Forbidden(String),
    #[error("conflict: {0}")]
    Conflict(String),
    #[error("internal: {0}")]
    Internal(String),
    #[error("capture space unavailable: {0}")]
    CaptureSpaceUnavailable(String),
    #[error("default space unavailable: {0}")]
    DefaultSpaceUnavailable(String),
    #[error("capture persistence: {0}")]
    CapturePersistence(String),
}

/// 套接字命名抽象，屏蔽 Unix 文件路径 / Windows 命名空间差异。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SocketName {
    /// Unix 下是文件系统绝对路径；Windows 下是命名空间名（不含 `\\.\pipe\` 前缀）。
    pub raw: String,
    /// true = 命名空间（Windows Named Pipe / Linux abstract socket）；false = 文件路径（Unix domain socket file）。
    pub namespaced: bool,
}

/// 返回主 App 与 Helper 双方应当使用的套接字名称。
///
/// 路径规则：
/// - Windows：命名空间 `com.stonefish.stoneflow`（由 interprocess 侧转成 `\\.\pipe\…`）
/// - macOS / Linux：`$TMPDIR/com.stonefish.stoneflow-$USER.sock`；
///     - 使用用户 `TMPDIR`（macOS 天然按用户隔离），避免多用户共用 `/tmp` 时互相抢占；
///     - 文件名带用户名做二次兜底；
///     - UDS 路径在 macOS 限制为 104 字节，`$TMPDIR` 本身不会超长。
pub fn socket_name() -> SocketName {
    #[cfg(windows)]
    {
        SocketName {
            raw: "com.stonefish.stoneflow".to_owned(),
            namespaced: true,
        }
    }

    #[cfg(not(windows))]
    {
        let tmpdir = std::env::var("TMPDIR")
            .ok()
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| "/tmp".to_owned());
        let user = std::env::var("USER")
            .ok()
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| "anon".to_owned());
        let trimmed = tmpdir.trim_end_matches('/');
        SocketName {
            raw: format!("{trimmed}/com.stonefish.stoneflow-{user}.sock"),
            namespaced: false,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn request_roundtrip() {
        let req = IpcRequest::CreateTask(CreateTaskPayload {
            title: "写 plan".to_owned(),
            note: Some("备注".to_owned()),
            priority: None,
        });
        let json = serde_json::to_string(&req).unwrap();
        let back: IpcRequest = serde_json::from_str(&json).unwrap();
        assert_eq!(req, back);
        // 序列化格式应符合「tag = kind」约定，方便未来扩展
        assert!(json.contains(r#""kind":"create_task""#));
    }

    #[test]
    fn error_serializes_with_code_and_message() {
        let err = IpcError::Validation("title empty".to_owned());
        let value = serde_json::to_value(&err).unwrap();
        assert_eq!(value["code"], "validation");
        assert_eq!(value["message"], "title empty");
    }

    #[test]
    fn socket_name_is_nonempty_and_consistent() {
        let a = socket_name();
        let b = socket_name();
        assert_eq!(a, b);
        assert!(!a.raw.is_empty());

        #[cfg(windows)]
        assert!(a.namespaced);

        #[cfg(not(windows))]
        {
            assert!(!a.namespaced);
            assert!(a.raw.ends_with(".sock"));
            assert!(a.raw.starts_with('/'));
        }
    }
}

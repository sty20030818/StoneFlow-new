//! StoneFlow Helper ↔ 主 App IPC 协议（纯 DTO，不依赖 tauri / sea-orm）。
//!
//! 设计取舍：
//! - 协议 crate 只定义请求 / 响应 / 错误 / 套接字命名；
//! - Helper 只表达意图，不承载业务规则；
//! - 传输帧格式保持为 `u32 BE` 长度前缀 + JSON；
//! - v2 直接围绕 Quick Create 建模，不再保留旧的 capture DTO 作为主路径。

use serde::{Deserialize, Serialize};
use thiserror::Error;

/// 协议语义版本，双方握手时使用。
pub const PROTOCOL_VERSION: u16 = 3;

/// 单帧最大字节数（1 MiB）。
pub const MAX_FRAME_BYTES: usize = 1024 * 1024;

/// 连接/读写默认超时（毫秒）。
pub const DEFAULT_CONNECT_TIMEOUT_MS: u64 = 2_000;
pub const DEFAULT_REQUEST_TIMEOUT_MS: u64 = 5_000;

/// Helper → 主 App 的请求。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum IpcRequest {
    Ping,
    HelperHello(HelperHelloPayload),
    HelperWindowReady,
    HelperWindowUnready,
    QuickGetInitialState,
    QuickListProjectsBySpace(QuickListProjectsBySpacePayload),
    QuickSearch(QuickSearchPayload),
    QuickCreate(QuickCreatePayload),
    QuickCreateAndOpen(QuickCreatePayload),
    /// 打开已存在的 Task / Project。
    QuickOpenTarget(QuickOpenTargetPayload),
}

/// 主 App → Helper 的响应。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum IpcResponse {
    Pong { protocol_version: u16 },
    HelperHelloAck(HelperHelloAckPayload),
    QuickInitialState(QuickInitialStatePayload),
    QuickProjectsBySpace(QuickProjectsBySpaceResponsePayload),
    QuickSearch(QuickSearchResponsePayload),
    QuickCreated(QuickCreatedPayload),
    Opened,
    Ack,
    Error(IpcError),
}

/// Helper 进程层握手。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct HelperHelloPayload {
    pub protocol_version: u16,
    pub helper_version: String,
    pub pid: u32,
    pub platform: String,
}

/// 主 App 对 HelperHello 的确认。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct HelperHelloAckPayload {
    pub protocol_version: u16,
    pub main_version: String,
}

/// 当前 Scope 的轻量载荷。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct QuickScopePayload {
    #[serde(rename = "type")]
    pub kind: QuickScopeKind,
    pub space_id: Option<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum QuickScopeKind {
    All,
    Space,
}

/// Quick Create 的 placement 联合类型。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct QuickPlacementPayload {
    #[serde(rename = "kind")]
    pub kind: QuickPlacementKind,
    pub project_id: Option<String>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum QuickPlacementKind {
    Inbox,
    NoProject,
    Project,
}

/// Space 摘要。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct QuickSpaceSummaryPayload {
    pub id: String,
    pub name: String,
    pub icon_key: String,
    pub color_key: String,
    pub is_default: bool,
}

/// Project 选择项。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct QuickProjectOptionPayload {
    #[serde(rename = "kind")]
    pub kind: QuickProjectOptionKind,
    pub id: Option<String>,
    pub space_id: String,
    pub name: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum QuickProjectOptionKind {
    Inbox,
    NoProject,
    Project,
}

/// Quick Create 搜索/最近列表里的 Task 项。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct QuickTaskItemPayload {
    pub id: String,
    pub space_id: String,
    pub space_name: String,
    pub project_id: Option<String>,
    pub project_name: Option<String>,
    pub inbox_at: Option<String>,
    pub title: String,
    pub note: Option<String>,
    pub priority: i32,
    pub status: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
}

/// Quick Create 搜索/最近列表里的 Project 项。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct QuickProjectItemPayload {
    pub id: String,
    pub space_id: String,
    pub space_name: String,
    pub name: String,
    pub note: Option<String>,
    pub updated_at: String,
    pub completed_at: Option<String>,
}

/// Quick Create 初始态。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct QuickInitialStatePayload {
    pub current_scope: QuickScopePayload,
    pub default_space_id: String,
    pub default_placement: QuickPlacementPayload,
    pub spaces: Vec<QuickSpaceSummaryPayload>,
    pub projects: Vec<QuickProjectOptionPayload>,
    pub recent_tasks: Vec<QuickTaskItemPayload>,
    pub recent_projects: Vec<QuickProjectItemPayload>,
}

/// 按 Space 拉取项目选项。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct QuickListProjectsBySpacePayload {
    pub space_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct QuickProjectsBySpaceResponsePayload {
    pub space_id: String,
    pub inbox_project: QuickProjectOptionPayload,
    pub no_project_option: QuickProjectOptionPayload,
    pub projects: Vec<QuickProjectOptionPayload>,
}

/// Quick Search 输入。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct QuickSearchPayload {
    pub query: String,
    pub limit: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct QuickSearchResponsePayload {
    pub tasks: Vec<QuickTaskItemPayload>,
    pub projects: Vec<QuickProjectItemPayload>,
}

/// Quick Create / Quick Create And Open 共用输入。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct QuickCreatePayload {
    pub space_id: Option<String>,
    pub placement: QuickPlacementPayload,
    pub title: String,
    pub note: Option<String>,
    pub status: Option<String>,
    pub priority: Option<i32>,
    pub due_at: Option<String>,
    pub scheduled_at: Option<String>,
    pub reminder_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct QuickCreatedPayload {
    pub id: String,
    pub title: String,
    pub space_id: String,
    pub project_id: Option<String>,
    pub inbox_at: Option<String>,
    pub space_fallback: bool,
}

/// 打开既有目标。
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct QuickOpenTargetPayload {
    #[serde(rename = "kind")]
    pub kind: QuickOpenTargetKind,
    pub id: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum QuickOpenTargetKind {
    Task,
    Project,
}

/// IPC 通道承载的业务错误。
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
    pub raw: String,
    pub namespaced: bool,
}

/// 返回主 App 与 Helper 双方共同使用的套接字名称。
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
    fn request_roundtrip_uses_v2_quick_shape() {
        let request = IpcRequest::QuickCreate(QuickCreatePayload {
            space_id: Some("space-1".to_owned()),
            placement: QuickPlacementPayload {
                kind: QuickPlacementKind::Project,
                project_id: Some("project-1".to_owned()),
            },
            title: "写 quick create".to_owned(),
            note: Some("补主链".to_owned()),
            status: Some("todo".to_owned()),
            priority: Some(3),
            due_at: None,
            scheduled_at: None,
            reminder_at: None,
        });

        let json = serde_json::to_string(&request).expect("request should serialize");
        let decoded: IpcRequest = serde_json::from_str(&json).expect("request should deserialize");

        assert_eq!(request, decoded);
        assert!(json.contains(r#""kind":"quick_create""#));
    }

    #[test]
    fn helper_hello_roundtrip_uses_v3_shape() {
        let request = IpcRequest::HelperHello(HelperHelloPayload {
            protocol_version: PROTOCOL_VERSION,
            helper_version: "0.1.0".to_owned(),
            pid: 42,
            platform: "windows".to_owned(),
        });

        let json = serde_json::to_string(&request).expect("request should serialize");
        let decoded: IpcRequest = serde_json::from_str(&json).expect("request should deserialize");

        assert_eq!(request, decoded);
        assert!(json.contains(r#""kind":"helper_hello""#));
    }

    #[test]
    fn helper_hello_ack_roundtrip_serializes() {
        let response = IpcResponse::HelperHelloAck(HelperHelloAckPayload {
            protocol_version: PROTOCOL_VERSION,
            main_version: "0.1.0".to_owned(),
        });

        let json = serde_json::to_string(&response).expect("response should serialize");
        let decoded: IpcResponse =
            serde_json::from_str(&json).expect("response should deserialize");

        assert_eq!(response, decoded);
        assert!(json.contains(r#""kind":"helper_hello_ack""#));
    }

    #[test]
    fn helper_window_ready_roundtrip_serializes() {
        let requests = [IpcRequest::HelperWindowReady, IpcRequest::HelperWindowUnready];

        for request in requests {
            let json = serde_json::to_string(&request).expect("request should serialize");
            let decoded: IpcRequest =
                serde_json::from_str(&json).expect("request should deserialize");
            assert_eq!(request, decoded);
        }
    }

    #[test]
    fn placement_roundtrip_covers_all_variants() {
        let variants = [
            QuickPlacementPayload {
                kind: QuickPlacementKind::Inbox,
                project_id: None,
            },
            QuickPlacementPayload {
                kind: QuickPlacementKind::NoProject,
                project_id: None,
            },
            QuickPlacementPayload {
                kind: QuickPlacementKind::Project,
                project_id: Some("project-1".to_owned()),
            },
        ];

        for variant in variants {
            let json = serde_json::to_string(&variant).expect("placement should serialize");
            let decoded: QuickPlacementPayload =
                serde_json::from_str(&json).expect("placement should deserialize");
            assert_eq!(variant, decoded);
        }
    }

    #[test]
    fn error_serializes_with_code_and_message() {
        let err = IpcError::Validation("title empty".to_owned());
        let value = serde_json::to_value(&err).expect("error should serialize");
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

    #[test]
    fn protocol_version_should_be_3() {
        assert_eq!(PROTOCOL_VERSION, 3);
    }
}

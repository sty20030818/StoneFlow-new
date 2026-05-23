//! Helper IPC Server：只负责 IPC 监听与请求分发。

use std::io;
use std::sync::Arc;

use interprocess::local_socket::{
    tokio::{prelude::*, Listener},
    GenericFilePath, GenericNamespaced, ListenerOptions, ToFsName, ToNsName,
};
use stoneflow_ipc_protocol::{
    socket_name, HelperHelloAckPayload, HelperHelloPayload, IpcError, IpcRequest, IpcResponse,
    QuickCreatedPayload, QuickOpenTargetKind, QuickOpenTargetPayload, SocketName, MAX_FRAME_BYTES,
    PROTOCOL_VERSION,
};
use tauri::{Emitter, Manager};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::sync::Notify;

use crate::{
    app::{
        error::AppError,
        state::{ActiveScopeState, CommandHelperState, PendingCommandOpenIntent},
        MAIN_WINDOW_LABEL,
    },
    application::services::{
        QuickCreateOpenContextService, QuickCreateService, QuickCreateSessionBridge,
    },
    infrastructure::{
        database::DatabaseRuntimeState,
        repositories::{ActivityRepository, ProjectRepository, SpaceRepository, TaskRepository},
    },
};

const COMMAND_OPEN_EVENT: &str = "stoneflow://command/open";
const TASKS_CHANGED_EVENT: &str = "stoneflow://tasks/changed";

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "snake_case")]
struct CommandOpenPayload {
    kind: &'static str,
    id: String,
    space_id: String,
    project_id: Option<String>,
    placement: &'static str,
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "snake_case")]
struct TaskChangedPayload {
    space_id: String,
    space_slug: String,
    task_id: String,
    source: String,
    space_fallback: bool,
}

/// IPC Server 句柄，持有 listener 和 hello 通知器。
pub struct IpcServerHandle {
    pub hello_notify: Arc<Notify>,
}

/// 启动 IPC server，返回句柄供 supervisor 使用。
pub async fn start_ipc_server(
    app_handle: tauri::AppHandle,
    database: DatabaseRuntimeState,
    active_scope: ActiveScopeState,
    helper_state: CommandHelperState,
) -> Result<IpcServerHandle, AppError> {
    helper_state
        .set_ipc_status(crate::app::state::IpcServerStatus::Starting, None)
        .await;

    let listener = bind_listener(&socket_name())
        .map_err(|error| AppError::initialization(format!("IPC server bind 失败: {error}")))?;

    let hello_notify = Arc::new(Notify::new());
    let server_handle = IpcServerHandle {
        hello_notify: hello_notify.clone(),
    };

    helper_state
        .set_ipc_status(crate::app::state::IpcServerStatus::Ready, None)
        .await;

    tauri::async_runtime::spawn(run_ipc_server(
        listener,
        app_handle,
        database,
        active_scope,
        helper_state,
        hello_notify,
    ));

    Ok(server_handle)
}

/// 优雅关闭 IPC server。
pub async fn shutdown(helper_state: CommandHelperState) {
    helper_state
        .set_ipc_status(crate::app::state::IpcServerStatus::Stopped, None)
        .await;
}

pub async fn restore_main_window(app_handle: &tauri::AppHandle) -> Result<(), AppError> {
    if let Some(window) = app_handle.get_webview_window(MAIN_WINDOW_LABEL) {
        window
            .show()
            .map_err(|error: tauri::Error| AppError::internal(error.to_string()))?;
        window
            .unminimize()
            .map_err(|error: tauri::Error| AppError::internal(error.to_string()))?;
        window
            .set_focus()
            .map_err(|error: tauri::Error| AppError::internal(error.to_string()))?;
    }

    Ok(())
}

async fn run_ipc_server(
    listener: Listener,
    app_handle: tauri::AppHandle,
    database: DatabaseRuntimeState,
    active_scope: ActiveScopeState,
    helper_state: CommandHelperState,
    hello_notify: Arc<Notify>,
) {
    loop {
        let stream = match listener.accept().await {
            Ok(stream) => stream,
            Err(error) => {
                helper_state
                    .set_ipc_status(
                        crate::app::state::IpcServerStatus::Error,
                        Some(error.to_string()),
                    )
                    .await;
                log::error!("IPC accept 失败: {error}");
                break;
            }
        };

        let app_handle = app_handle.clone();
        let database = database.clone();
        let active_scope = active_scope.clone();
        let helper_state = helper_state.clone();
        let hello_notify = hello_notify.clone();
        tauri::async_runtime::spawn(async move {
            if let Err(error) = handle_ipc_connection(
                stream,
                app_handle,
                database,
                active_scope,
                helper_state,
                hello_notify,
            )
            .await
            {
                if error.kind() == io::ErrorKind::UnexpectedEof {
                    log::debug!("IPC 连接 early eof（客户端提前断开）");
                } else {
                    log::warn!("IPC 请求处理失败: {error}");
                }
            }
        });
    }
}

async fn handle_ipc_connection(
    stream: interprocess::local_socket::tokio::Stream,
    app_handle: tauri::AppHandle,
    database: DatabaseRuntimeState,
    active_scope: ActiveScopeState,
    helper_state: CommandHelperState,
    hello_notify: Arc<Notify>,
) -> Result<(), io::Error> {
    let (mut reader, mut writer) = stream.split();
    let mut len_buf = [0_u8; 4];
    reader.read_exact(&mut len_buf).await?;
    let len = u32::from_be_bytes(len_buf) as usize;
    if len == 0 || len > MAX_FRAME_BYTES {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!("invalid request frame: {len}"),
        ));
    }

    let mut request_buf = vec![0_u8; len];
    reader.read_exact(&mut request_buf).await?;

    let request = match serde_json::from_slice::<IpcRequest>(&request_buf) {
        Ok(request) => request,
        Err(error) => {
            write_response(
                &mut writer,
                &IpcResponse::Error(IpcError::Internal(format!(
                    "deserialize request: {error}"
                ))),
            )
            .await?;
            return Ok(());
        }
    };

    let service = build_quick_create_service(&database);
    let session_bridge = build_quick_create_session_bridge(&database);
    let response = dispatch_request(
        request,
        &app_handle,
        &service,
        &session_bridge,
        &active_scope,
        &helper_state,
        &hello_notify,
    )
    .await;

    write_response(
        &mut writer,
        &match response {
            Ok(response) => response,
            Err(error) => IpcResponse::Error(map_app_error(error)),
        },
    )
    .await
}

async fn dispatch_request(
    request: IpcRequest,
    app_handle: &tauri::AppHandle,
    service: &QuickCreateService,
    session_bridge: &QuickCreateSessionBridge,
    active_scope: &ActiveScopeState,
    helper_state: &CommandHelperState,
    hello_notify: &Notify,
) -> Result<IpcResponse, AppError> {
    if let Some(response) = handle_control_request(request.clone(), helper_state, hello_notify).await
    {
        return response;
    }

    match request {
        IpcRequest::Ping
        | IpcRequest::HelperHello(_)
        | IpcRequest::HelperWindowReady
        | IpcRequest::HelperWindowUnready => unreachable!("control requests handled above"),
        IpcRequest::QuickGetInitialState => Ok(IpcResponse::QuickInitialState(
            session_bridge
                .prepare_initial_state(active_scope.get().await)
                .await?,
        )),
        IpcRequest::QuickListProjectsBySpace(payload) => Ok(IpcResponse::QuickProjectsBySpace(
            service.list_projects_by_space(payload).await?,
        )),
        IpcRequest::QuickSearch(payload) => {
            Ok(IpcResponse::QuickSearch(service.search(payload).await?))
        }
        IpcRequest::QuickCreate(payload) => {
            let created = service.create(payload, active_scope.get().await).await?;
            emit_task_changed(app_handle, &created)?;
            Ok(IpcResponse::QuickCreated(created))
        }
        IpcRequest::QuickCreateAndOpen(payload) => {
            let created = service.create(payload, active_scope.get().await).await?;
            emit_task_changed(app_handle, &created)?;
            open_created_task(app_handle, service, helper_state, &created).await?;
            Ok(IpcResponse::QuickCreated(created))
        }
        IpcRequest::QuickOpenTarget(payload) => {
            open_existing_target(app_handle, service, helper_state, payload).await?;
            Ok(IpcResponse::Opened)
        }
    }
}

async fn handle_control_request(
    request: IpcRequest,
    helper_state: &CommandHelperState,
    hello_notify: &Notify,
) -> Option<Result<IpcResponse, AppError>> {
    match request {
        IpcRequest::Ping => Some(Ok(IpcResponse::Pong {
            protocol_version: PROTOCOL_VERSION,
        })),
        IpcRequest::HelperHello(payload) => Some(
            handle_helper_hello(helper_state, hello_notify, payload)
                .await
                .map(|()| {
                    IpcResponse::HelperHelloAck(HelperHelloAckPayload {
                        protocol_version: PROTOCOL_VERSION,
                        main_version: env!("CARGO_PKG_VERSION").to_owned(),
                    })
                }),
        ),
        IpcRequest::HelperWindowReady => Some(
            async {
                helper_state
                    .mark_window_ready(chrono::Utc::now().to_rfc3339())
                    .await;
                Ok(IpcResponse::Ack)
            }
            .await,
        ),
        IpcRequest::HelperWindowUnready => Some(
            async {
                helper_state
                    .mark_window_unready(chrono::Utc::now().to_rfc3339())
                    .await;
                Ok(IpcResponse::Ack)
            }
            .await,
        ),
        _ => None,
    }
}

async fn handle_helper_hello(
    helper_state: &CommandHelperState,
    hello_notify: &Notify,
    payload: HelperHelloPayload,
) -> Result<(), AppError> {
    if payload.protocol_version != PROTOCOL_VERSION {
        return Err(AppError::validation(format!(
            "helper protocol version mismatch: expected {}, got {}",
            PROTOCOL_VERSION, payload.protocol_version
        )));
    }

    helper_state
        .mark_helper_hello(
            payload.protocol_version,
            payload.helper_version,
            payload.platform,
            chrono::Utc::now().to_rfc3339(),
        )
        .await;
    hello_notify.notify_one();

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::app::state::HelperLifecycleStage;
    use tokio::time::{timeout, Duration};

    fn helper_hello(protocol_version: u16) -> IpcRequest {
        IpcRequest::HelperHello(HelperHelloPayload {
            protocol_version,
            helper_version: "0.1.0".to_owned(),
            pid: 42,
            platform: "windows".to_owned(),
        })
    }

    #[tokio::test]
    async fn helper_hello_should_complete_notify_and_promote_waiting_for_window() {
        let helper_state = CommandHelperState::default();
        let hello_notify = Notify::new();
        helper_state.mark_helper_starting(None).await;
        helper_state.mark_helper_spawned(42).await;

        let response = handle_control_request(helper_hello(PROTOCOL_VERSION), &helper_state, &hello_notify)
            .await
            .expect("hello should be handled")
            .expect("hello should succeed");

        assert!(matches!(response, IpcResponse::HelperHelloAck(_)));
        timeout(Duration::from_millis(20), hello_notify.notified())
            .await
            .expect("hello should notify supervisor");

        let snapshot = helper_state.snapshot().await;
        assert_eq!(snapshot.lifecycle_stage, HelperLifecycleStage::WaitingForWindow);
        assert_eq!(snapshot.protocol_version, Some(PROTOCOL_VERSION));
        assert_eq!(snapshot.helper_version.as_deref(), Some("0.1.0"));
        assert_eq!(snapshot.platform.as_deref(), Some("windows"));
        assert!(snapshot.last_hello_at.is_some());
    }

    #[tokio::test]
    async fn non_hello_control_requests_should_not_notify_supervisor() {
        let helper_state = CommandHelperState::default();
        let hello_notify = Notify::new();
        helper_state.mark_helper_starting(None).await;
        helper_state.mark_helper_spawned(42).await;

        let ping_response = handle_control_request(IpcRequest::Ping, &helper_state, &hello_notify)
            .await
            .expect("ping should be handled")
            .expect("ping should succeed");
        assert!(matches!(ping_response, IpcResponse::Pong { .. }));
        assert!(timeout(Duration::from_millis(20), hello_notify.notified()).await.is_err());

        let ready_response =
            handle_control_request(IpcRequest::HelperWindowReady, &helper_state, &hello_notify)
                .await
                .expect("window ready should be handled")
                .expect("window ready should succeed");
        assert!(matches!(ready_response, IpcResponse::Ack));
        assert!(timeout(Duration::from_millis(20), hello_notify.notified()).await.is_err());
    }

    #[tokio::test]
    async fn window_ready_and_unready_should_update_snapshot() {
        let helper_state = CommandHelperState::default();
        let hello_notify = Notify::new();
        helper_state.mark_helper_starting(None).await;
        helper_state.mark_helper_spawned(42).await;
        handle_control_request(helper_hello(PROTOCOL_VERSION), &helper_state, &hello_notify)
            .await
            .expect("hello should be handled")
            .expect("hello should succeed");

        handle_control_request(IpcRequest::HelperWindowReady, &helper_state, &hello_notify)
            .await
            .expect("window ready should be handled")
            .expect("window ready should succeed");
        let ready_snapshot = helper_state.snapshot().await;
        assert_eq!(ready_snapshot.lifecycle_stage, HelperLifecycleStage::Ready);
        assert!(ready_snapshot.last_window_ready_at.is_some());

        handle_control_request(IpcRequest::HelperWindowUnready, &helper_state, &hello_notify)
            .await
            .expect("window unready should be handled")
            .expect("window unready should succeed");
        let unready_snapshot = helper_state.snapshot().await;
        assert_eq!(
            unready_snapshot.lifecycle_stage,
            HelperLifecycleStage::WaitingForWindow
        );
        assert!(unready_snapshot.last_window_unready_at.is_some());
    }

    #[tokio::test]
    async fn protocol_mismatch_should_error_and_keep_waiting_for_hello() {
        let helper_state = CommandHelperState::default();
        let hello_notify = Notify::new();
        helper_state.mark_helper_starting(None).await;
        helper_state.mark_helper_spawned(42).await;

        let error = handle_control_request(helper_hello(PROTOCOL_VERSION - 1), &helper_state, &hello_notify)
            .await
            .expect("hello should be handled")
            .expect_err("protocol mismatch should fail");
        assert!(matches!(error, AppError::Validation(_)));
        assert!(timeout(Duration::from_millis(20), hello_notify.notified()).await.is_err());

        let snapshot = helper_state.snapshot().await;
        assert_eq!(snapshot.lifecycle_stage, HelperLifecycleStage::WaitingForHello);
        assert_eq!(snapshot.protocol_version, None);
        assert_eq!(snapshot.last_hello_at, None);
    }
}

async fn open_created_task(
    app_handle: &tauri::AppHandle,
    service: &QuickCreateService,
    helper_state: &CommandHelperState,
    created: &QuickCreatedPayload,
) -> Result<(), AppError> {
    let target = service.resolve_task_open_target(&created.id).await?;
    restore_main_window(app_handle).await?;
    dispatch_command_open(
        app_handle,
        helper_state,
        CommandOpenPayload {
            kind: target.kind,
            id: target.id,
            space_id: target.space_id,
            project_id: target.project_id,
            placement: match target.placement {
                crate::application::services::QuickResolvedPlacement::Project => "project",
                crate::application::services::QuickResolvedPlacement::Inbox => "inbox",
                crate::application::services::QuickResolvedPlacement::NoProject => "no_project",
            },
        },
    )
    .await
}

async fn open_existing_target(
    app_handle: &tauri::AppHandle,
    service: &QuickCreateService,
    helper_state: &CommandHelperState,
    payload: QuickOpenTargetPayload,
) -> Result<(), AppError> {
    restore_main_window(app_handle).await?;

    match payload.kind {
        QuickOpenTargetKind::Task => {
            let target = service.resolve_task_open_target(&payload.id).await?;
            dispatch_command_open(
                app_handle,
                helper_state,
                CommandOpenPayload {
                    kind: target.kind,
                    id: target.id,
                    space_id: target.space_id,
                    project_id: target.project_id,
                    placement: match target.placement {
                        crate::application::services::QuickResolvedPlacement::Project => "project",
                        crate::application::services::QuickResolvedPlacement::Inbox => "inbox",
                        crate::application::services::QuickResolvedPlacement::NoProject => {
                            "no_project"
                        }
                    },
                },
            )
            .await
        }
        QuickOpenTargetKind::Project => {
            let target = service.resolve_project_open_target(&payload.id).await?;
            dispatch_command_open(
                app_handle,
                helper_state,
                CommandOpenPayload {
                    kind: target.kind,
                    id: target.id,
                    space_id: target.space_id,
                    project_id: target.project_id,
                    placement: "project",
                },
            )
            .await
        }
    }
}

fn emit_command_open(
    app_handle: &tauri::AppHandle,
    payload: CommandOpenPayload,
) -> Result<(), AppError> {
    app_handle
        .emit(COMMAND_OPEN_EVENT, payload)
        .map_err(|error| AppError::internal(error.to_string()))
}

fn emit_task_changed(
    app_handle: &tauri::AppHandle,
    created: &QuickCreatedPayload,
) -> Result<(), AppError> {
    app_handle
        .emit(
            TASKS_CHANGED_EVENT,
            TaskChangedPayload {
                space_id: created.space_id.clone(),
                space_slug: String::new(),
                task_id: created.id.clone(),
                source: "helper".to_owned(),
                space_fallback: created.space_fallback,
            },
        )
        .map_err(|error| AppError::internal(error.to_string()))
}

async fn dispatch_command_open(
    app_handle: &tauri::AppHandle,
    helper_state: &CommandHelperState,
    payload: CommandOpenPayload,
) -> Result<(), AppError> {
    helper_state
        .set_pending_command_open(PendingCommandOpenIntent {
            kind: payload.kind.to_owned(),
            id: payload.id.clone(),
            space_id: payload.space_id.clone(),
            project_id: payload.project_id.clone(),
            placement: payload.placement.to_owned(),
        })
        .await;

    match emit_command_open(app_handle, payload) {
        Ok(()) => Ok(()),
        Err(error) => {
            log::warn!("command open 事件即时投递失败，将保留待消费意图: {error}");
            Err(error)
        }
    }
}

fn build_quick_create_service(database: &DatabaseRuntimeState) -> QuickCreateService {
    let connection = database.connection().clone();
    QuickCreateService::new(
        SpaceRepository::new(connection.clone()),
        ProjectRepository::new(connection.clone()),
        TaskRepository::new(connection.clone()),
        ActivityRepository::new(connection),
    )
}

fn build_quick_create_session_bridge(database: &DatabaseRuntimeState) -> QuickCreateSessionBridge {
    let connection = database.connection().clone();
    let space_repository = SpaceRepository::new(connection.clone());
    let project_repository = ProjectRepository::new(connection.clone());
    let task_repository = TaskRepository::new(connection.clone());
    let quick_create_service = QuickCreateService::new(
        space_repository.clone(),
        project_repository.clone(),
        task_repository.clone(),
        ActivityRepository::new(connection),
    );

    QuickCreateSessionBridge::new(QuickCreateOpenContextService::new(
        quick_create_service,
        space_repository,
        project_repository,
        task_repository,
    ))
}

fn bind_listener(socket: &SocketName) -> Result<Listener, io::Error> {
    // 清理残留 socket 文件，避免 "Address already in use"
    if !socket.namespaced {
        let _ = std::fs::remove_file(&socket.raw);
    }

    let name = if socket.namespaced {
        socket.raw.clone().to_ns_name::<GenericNamespaced>()
    } else {
        socket.raw.clone().to_fs_name::<GenericFilePath>()
    }?;

    ListenerOptions::new().name(name).create_tokio()
}

async fn write_response(
    writer: &mut interprocess::local_socket::tokio::SendHalf,
    response: &IpcResponse,
) -> Result<(), io::Error> {
    let payload = serde_json::to_vec(response)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error.to_string()))?;
    if payload.len() > MAX_FRAME_BYTES {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!("response payload too large: {}", payload.len()),
        ));
    }

    writer
        .write_all(&(payload.len() as u32).to_be_bytes())
        .await?;
    writer.write_all(&payload).await?;
    writer.flush().await
}

fn map_app_error(error: AppError) -> IpcError {
    match error {
        AppError::Validation(message) => IpcError::Validation(message),
        AppError::NotFound(message) => IpcError::NotFound(message),
        AppError::Forbidden(message) => IpcError::Forbidden(message),
        AppError::Conflict(message) => IpcError::Conflict(message),
        AppError::Initialization(message) | AppError::Internal(message) => {
            IpcError::Internal(message)
        }
        AppError::CaptureSpaceUnavailable(message) => IpcError::CaptureSpaceUnavailable(message),
        AppError::DefaultSpaceUnavailable(message) => IpcError::DefaultSpaceUnavailable(message),
        AppError::CapturePersistence(message) => IpcError::CapturePersistence(message),
        AppError::Database(message) => IpcError::Internal(message),
    }
}

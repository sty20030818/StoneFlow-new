//! Helper IPC Server：只负责 IPC 监听与请求分发。

use std::io;
use std::sync::Arc;

use interprocess::local_socket::{
    tokio::{prelude::*, Listener},
    GenericFilePath, GenericNamespaced, ListenerOptions, ToFsName, ToNsName,
};
use stoneflow_ipc_protocol::{
    socket_name, IpcError, IpcRequest, IpcResponse, QuickCreatedPayload, QuickOpenTargetKind,
    QuickOpenTargetPayload, SocketName, MAX_FRAME_BYTES, PROTOCOL_VERSION,
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
    application::services::QuickCreateService,
    infrastructure::{
        database::DatabaseRuntimeState,
        repositories::{ActivityRepository, ProjectRepository, SpaceRepository, TaskRepository},
    },
};

const COMMAND_OPEN_EVENT: &str = "stoneflow://command/open";

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "snake_case")]
struct CommandOpenPayload {
    kind: &'static str,
    id: String,
    space_id: String,
    project_id: Option<String>,
    placement: &'static str,
}

/// IPC Server 句柄，持有 listener 和 handshake 通知器。
pub struct IpcServerHandle {
    pub handshake_notify: Arc<Notify>,
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

    let handshake_notify = Arc::new(Notify::new());
    let server_handle = IpcServerHandle {
        handshake_notify: handshake_notify.clone(),
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
        handshake_notify,
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
    handshake_notify: Arc<Notify>,
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
        let handshake_notify = handshake_notify.clone();
        tauri::async_runtime::spawn(async move {
            if let Err(error) = handle_ipc_connection(
                stream,
                app_handle,
                database,
                active_scope,
                helper_state,
                handshake_notify,
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
    handshake_notify: Arc<Notify>,
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
    let response = dispatch_request(
        request,
        &app_handle,
        &service,
        &active_scope,
        &helper_state,
        &handshake_notify,
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
    active_scope: &ActiveScopeState,
    helper_state: &CommandHelperState,
    handshake_notify: &Notify,
) -> Result<IpcResponse, AppError> {
    // 首个请求到达 = 握手成功，通知 supervisor
    handshake_notify.notify_one();

    match request {
        IpcRequest::Ping => Ok(IpcResponse::Pong {
            protocol_version: PROTOCOL_VERSION,
        }),
        IpcRequest::QuickGetInitialState => Ok(IpcResponse::QuickInitialState(
            service.get_initial_state(active_scope.get().await).await?,
        )),
        IpcRequest::QuickListProjectsBySpace(payload) => Ok(IpcResponse::QuickProjectsBySpace(
            service.list_projects_by_space(payload).await?,
        )),
        IpcRequest::QuickSearch(payload) => {
            Ok(IpcResponse::QuickSearch(service.search(payload).await?))
        }
        IpcRequest::QuickCreate(payload) => Ok(IpcResponse::QuickCreated(
            service.create(payload, active_scope.get().await).await?,
        )),
        IpcRequest::QuickCreateAndOpen(payload) => {
            let created = service.create(payload, active_scope.get().await).await?;
            open_created_task(app_handle, service, helper_state, &created).await?;
            Ok(IpcResponse::QuickCreated(created))
        }
        IpcRequest::QuickOpenTarget(payload) => {
            open_existing_target(app_handle, service, helper_state, payload).await?;
            Ok(IpcResponse::Opened)
        }
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

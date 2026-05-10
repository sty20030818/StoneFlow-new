//! Helper runtime：负责 IPC server、Helper spawn/supervise 与主窗口打开编排。

use std::io;
use std::path::PathBuf;
use std::process::{Command, ExitStatus};
use std::time::Duration;

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

use crate::{
    app::{
        error::AppError,
        state::{
            ActiveScopeState, CommandHelperState, HelperRuntimeStatus, IpcServerStatus,
        },
        MAIN_WINDOW_LABEL,
    },
    application::services::QuickCreateService,
    domain::now_utc,
    infrastructure::{
        database::DatabaseRuntimeState,
        repositories::{ActivityRepository, ProjectRepository, SpaceRepository, TaskRepository},
    },
};

const COMMAND_OPEN_EVENT: &str = "stoneflow://command/open";
const HELPER_MONITOR_INTERVAL_MS: u64 = 500;
const HELPER_RESTART_BACKOFF_MS: u64 = 1_500;

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "snake_case")]
struct CommandOpenPayload {
    kind: &'static str,
    id: String,
    space_id: String,
    project_id: Option<String>,
    placement: &'static str,
}

pub async fn start(
    app_handle: tauri::AppHandle,
    database: DatabaseRuntimeState,
    active_scope: ActiveScopeState,
    helper_state: CommandHelperState,
) -> Result<(), AppError> {
    helper_state
        .set_ipc_status(IpcServerStatus::Starting, None)
        .await;

    let listener = bind_listener(&socket_name())
        .map_err(|error| AppError::initialization(format!("IPC server bind 失败: {error}")))?;

    helper_state
        .set_ipc_status(IpcServerStatus::Ready, None)
        .await;
    helper_state.set_shutdown_requested(false).await;

    tauri::async_runtime::spawn(run_ipc_server(
        listener,
        app_handle.clone(),
        database.clone(),
        active_scope.clone(),
        helper_state.clone(),
    ));

    if let Err(error) = spawn_helper_process(&app_handle, &helper_state).await {
        log::warn!("helper 启动失败: {error}");
        helper_state
            .mark_helper_disconnected(error.to_string())
            .await;
    }

    tauri::async_runtime::spawn(monitor_helper_process(
        app_handle,
        helper_state,
    ));

    Ok(())
}

pub async fn shutdown(helper_state: CommandHelperState) {
    helper_state.set_shutdown_requested(true).await;
    helper_state.mark_shutting_down().await;
    helper_state
        .set_ipc_status(IpcServerStatus::Stopped, None)
        .await;

    if let Some(mut child) = helper_state.take_child().await {
        let _ = child.kill();
        let _ = child.wait();
    }
}

pub async fn restore_main_window(app_handle: &tauri::AppHandle) -> Result<(), AppError> {
    if let Some(window) = app_handle.get_webview_window(MAIN_WINDOW_LABEL) {
        window
            .show()
            .map_err(|error| AppError::internal(error.to_string()))?;
        window
            .unminimize()
            .map_err(|error| AppError::internal(error.to_string()))?;
        window
            .set_focus()
            .map_err(|error| AppError::internal(error.to_string()))?;
    }

    Ok(())
}

async fn run_ipc_server(
    listener: Listener,
    app_handle: tauri::AppHandle,
    database: DatabaseRuntimeState,
    active_scope: ActiveScopeState,
    helper_state: CommandHelperState,
) {
    loop {
        let stream = match listener.accept().await {
            Ok(stream) => stream,
            Err(error) => {
                helper_state
                    .set_ipc_status(IpcServerStatus::Error, Some(error.to_string()))
                    .await;
                log::error!("IPC accept 失败: {error}");
                break;
            }
        };

        let app_handle = app_handle.clone();
        let database = database.clone();
        let active_scope = active_scope.clone();
        let helper_state = helper_state.clone();
        tauri::async_runtime::spawn(async move {
            if let Err(error) =
                handle_ipc_connection(stream, app_handle, database, active_scope, helper_state).await
            {
                log::warn!("IPC 请求处理失败: {error}");
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
) -> Result<IpcResponse, AppError> {
    helper_state
        .mark_helper_ready(PROTOCOL_VERSION, now_utc().to_rfc3339())
        .await;

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
            open_created_task(app_handle, service, &created).await?;
            Ok(IpcResponse::QuickCreated(created))
        }
        IpcRequest::QuickOpenTarget(payload) => {
            open_existing_target(app_handle, service, payload).await?;
            Ok(IpcResponse::Opened)
        }
    }
}

async fn open_created_task(
    app_handle: &tauri::AppHandle,
    service: &QuickCreateService,
    created: &QuickCreatedPayload,
) -> Result<(), AppError> {
    let target = service.resolve_task_open_target(&created.id).await?;
    restore_main_window(app_handle).await?;
    emit_command_open(
        app_handle,
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
}

async fn open_existing_target(
    app_handle: &tauri::AppHandle,
    service: &QuickCreateService,
    payload: QuickOpenTargetPayload,
) -> Result<(), AppError> {
    restore_main_window(app_handle).await?;

    match payload.kind {
        QuickOpenTargetKind::Task => {
            let target = service.resolve_task_open_target(&payload.id).await?;
            emit_command_open(
                app_handle,
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
        }
        QuickOpenTargetKind::Project => {
            let target = service.resolve_project_open_target(&payload.id).await?;
            emit_command_open(
                app_handle,
                CommandOpenPayload {
                    kind: target.kind,
                    id: target.id,
                    space_id: target.space_id,
                    project_id: target.project_id,
                    placement: "project",
                },
            )
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

async fn spawn_helper_process(
    app_handle: &tauri::AppHandle,
    helper_state: &CommandHelperState,
) -> Result<(), AppError> {
    let helper_binary_path = resolve_helper_binary_path()?;
    helper_state
        .mark_helper_starting(Some(helper_binary_path.clone()))
        .await;

    let mut command = Command::new(&helper_binary_path);
    if let Some(parent_dir) = helper_binary_path.parent() {
        command.current_dir(parent_dir);
    }
    command.env("STONEFLOW_MAIN_APP", "1");

    let child = command
        .spawn()
        .map_err(|error| AppError::initialization(format!("spawn helper 失败: {error}")))?;
    let pid = child.id();

    helper_state.store_child(child).await;
    helper_state.mark_helper_spawned(pid).await;

    if app_handle.get_webview_window(MAIN_WINDOW_LABEL).is_none() {
        log::warn!("helper 已启动，但主窗口未找到");
    }

    Ok(())
}

async fn monitor_helper_process(
    app_handle: tauri::AppHandle,
    helper_state: CommandHelperState,
) {
    loop {
        if helper_state.is_shutdown_requested().await {
            break;
        }

        match helper_state.with_child_mut(|child| child.try_wait()).await {
            Some(Ok(Some(status))) => {
                let error = format_exit_status(status);
                helper_state.mark_helper_restarting(error.clone()).await;
                let _ = helper_state.take_child().await;

                tokio::time::sleep(Duration::from_millis(HELPER_RESTART_BACKOFF_MS)).await;
                if helper_state.is_shutdown_requested().await {
                    break;
                }

                if let Err(spawn_error) = spawn_helper_process(&app_handle, &helper_state).await {
                    helper_state
                        .mark_helper_crashed(spawn_error.to_string())
                        .await;
                }
            }
            Some(Ok(None)) => {}
            Some(Err(error)) => {
                helper_state
                    .mark_helper_restarting(format!("helper try_wait 失败: {error}"))
                    .await;
                let _ = helper_state.take_child().await;
            }
            None => {
                let snapshot = helper_state.snapshot().await;
                if matches!(
                    snapshot.helper_status,
                    HelperRuntimeStatus::Disconnected
                        | HelperRuntimeStatus::Crashed
                        | HelperRuntimeStatus::Restarting
                ) {
                    tokio::time::sleep(Duration::from_millis(HELPER_RESTART_BACKOFF_MS)).await;
                    if helper_state.is_shutdown_requested().await {
                        break;
                    }
                    if let Err(error) = spawn_helper_process(&app_handle, &helper_state).await {
                        helper_state.mark_helper_crashed(error.to_string()).await;
                    }
                }
            }
        }

        tokio::time::sleep(Duration::from_millis(HELPER_MONITOR_INTERVAL_MS)).await;
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

fn resolve_helper_binary_path() -> Result<PathBuf, AppError> {
    let current_exe =
        std::env::current_exe().map_err(|error| AppError::initialization(error.to_string()))?;
    let exe_dir = current_exe
        .parent()
        .ok_or_else(|| AppError::initialization("无法解析主程序目录"))?;
    let helper_binary_name = if cfg!(windows) {
        "stoneflow-helper.exe"
    } else {
        "stoneflow-helper"
    };

    let candidates = vec![exe_dir.join(helper_binary_name)];

    #[cfg(target_os = "macos")]
    {
        let login_item = exe_dir
            .parent()
            .and_then(|path| path.parent())
            .map(|contents_dir| {
                contents_dir.join("Library")
                    .join("LoginItems")
                    .join("StoneFlow Helper.app")
                    .join("Contents")
                    .join("MacOS")
                    .join("stoneflow-helper")
            });
        if let Some(path) = login_item {
            candidates.insert(0, path);
        }
    }

    for path in &candidates {
        if path.exists() {
            return Ok(path.clone());
        }
    }

    Err(AppError::initialization(format!(
        "找不到 Helper 二进制，已检查: {}",
        candidates
            .into_iter()
            .map(|path| path.display().to_string())
            .collect::<Vec<_>>()
            .join(", ")
    )))
}

fn format_exit_status(status: ExitStatus) -> String {
    match status.code() {
        Some(code) => format!("helper 意外退出，code={code}"),
        None => "helper 被外部终止".to_owned(),
    }
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

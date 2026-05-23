//! 主 App -> Helper 控制 IPC server。

use std::io;
use std::sync::Arc;
use std::time::Duration;

use interprocess::local_socket::{
    tokio::{prelude::*, Listener},
    GenericFilePath, GenericNamespaced, ListenerOptions, ToFsName, ToNsName,
};
use stoneflow_ipc_protocol::{
    helper_control_socket_name, HelperShutdownAckPayload, HelperShutdownPayload, IpcError,
    IpcRequest, IpcResponse, MAX_FRAME_BYTES, SocketName,
};
use tauri::{AppHandle, Manager, Wry};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::sync::Notify;

use crate::{
    commands::window::shutdown_quick_create,
    runtime::QuickPopupRuntimeState,
};

pub fn spawn_control_server(app_handle: AppHandle<Wry>, shutdown_notify: Arc<Notify>) {
    tauri::async_runtime::spawn(async move {
        let listener = match bind_listener(&helper_control_socket_name()) {
            Ok(listener) => listener,
            Err(error) => {
                log::error!("helper: control server bind 失败: {error}");
                return;
            }
        };

        run_control_server(listener, app_handle, shutdown_notify).await;
    });
}

async fn run_control_server(
    listener: Listener,
    app_handle: AppHandle<Wry>,
    shutdown_notify: Arc<Notify>,
) {
    loop {
        let stream = match listener.accept().await {
            Ok(stream) => stream,
            Err(error) => {
                log::error!("helper: control server accept 失败: {error}");
                break;
            }
        };

        let app_handle = app_handle.clone();
        let shutdown_notify = shutdown_notify.clone();
        tauri::async_runtime::spawn(async move {
            if let Err(error) = handle_connection(stream, app_handle, shutdown_notify).await {
                if error.kind() == io::ErrorKind::UnexpectedEof {
                    log::debug!("helper: control connection early eof");
                } else {
                    log::warn!("helper: control request 处理失败: {error}");
                }
            }
        });
    }
}

async fn handle_connection(
    stream: interprocess::local_socket::tokio::Stream,
    app_handle: AppHandle<Wry>,
    shutdown_notify: Arc<Notify>,
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

    let response = dispatch_control_request(request, &app_handle, &shutdown_notify).await;
    write_response(&mut writer, &response).await
}

async fn dispatch_control_request(
    request: IpcRequest,
    app_handle: &AppHandle<Wry>,
    shutdown_notify: &Arc<Notify>,
) -> IpcResponse {
    match request {
        IpcRequest::HelperShutdown(payload) => {
            match handle_shutdown_request(app_handle.clone(), shutdown_notify.clone(), payload).await {
                Ok(response) => response,
                Err(error) => IpcResponse::Error(error),
            }
        }
        other => IpcResponse::Error(IpcError::Validation(format!(
            "unsupported helper control request: {other:?}"
        ))),
    }
}

async fn handle_shutdown_request(
    app_handle: AppHandle<Wry>,
    shutdown_notify: Arc<Notify>,
    payload: HelperShutdownPayload,
) -> Result<IpcResponse, IpcError> {
    let Some(runtime) = app_handle.try_state::<QuickPopupRuntimeState>() else {
        return Err(IpcError::Internal("quick popup runtime 未注册".to_owned()));
    };
    let runtime = runtime.inner().clone();
    let started = runtime.begin_shutdown().await;
    let phase = if started {
        "shutdown_requested"
    } else {
        "shutting_down"
    };

    let response = IpcResponse::HelperShutdownAck(HelperShutdownAckPayload {
        accepted: true,
        phase: phase.to_owned(),
    });

    if started {
        tauri::async_runtime::spawn(async move {
            if let Err(error) =
                shutdown_helper_process(app_handle, runtime, payload, shutdown_notify).await
            {
                log::warn!("helper: graceful shutdown 执行失败: {error}");
            }
        });
    }

    Ok(response)
}

async fn shutdown_helper_process(
    app_handle: AppHandle<Wry>,
    runtime: QuickPopupRuntimeState,
    payload: HelperShutdownPayload,
    shutdown_notify: Arc<Notify>,
) -> Result<(), String> {
    log::info!(
        "helper: 收到 graceful shutdown 请求 reason={:?} deadline_ms={}",
        payload.reason,
        payload.deadline_ms
    );

    shutdown_quick_create(&app_handle, &runtime).await;
    runtime.mark_frontend_unready().await;
    shutdown_notify.notify_waiters();

    let deadline = Duration::from_millis(payload.deadline_ms);
    tokio::time::sleep(deadline.min(Duration::from_millis(50))).await;
    app_handle.exit(0);
    Ok(())
}

fn bind_listener(socket: &SocketName) -> Result<Listener, io::Error> {
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

#[cfg(test)]
mod tests {
    use super::*;
    use stoneflow_ipc_protocol::HelperShutdownReason;

    #[test]
    fn shutdown_ack_payload_should_express_accepted_phase() {
        let response = IpcResponse::HelperShutdownAck(HelperShutdownAckPayload {
            accepted: true,
            phase: "shutdown_requested".to_owned(),
        });
        let json = serde_json::to_string(&response).expect("response should serialize");
        assert!(json.contains("helper_shutdown_ack"));
        assert!(json.contains("shutdown_requested"));
        let payload = HelperShutdownPayload {
            reason: HelperShutdownReason::SupervisorStop,
            deadline_ms: 2_000,
        };
        assert_eq!(payload.deadline_ms, 2_000);
    }
}

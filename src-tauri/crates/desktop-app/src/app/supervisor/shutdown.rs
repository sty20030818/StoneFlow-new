use std::io;
use std::process::ExitStatus;
use std::time::Duration;

use interprocess::local_socket::{
    tokio::{prelude::*, Stream},
    GenericFilePath, GenericNamespaced, ToFsName, ToNsName,
};
use stoneflow_ipc_protocol::{
    helper_control_socket_name, HelperShutdownAckPayload, HelperShutdownPayload,
    HelperShutdownReason, IpcRequest, IpcResponse, SocketName, DEFAULT_CONNECT_TIMEOUT_MS,
    DEFAULT_REQUEST_TIMEOUT_MS, MAX_FRAME_BYTES,
};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::process::Child;
use tokio::time::timeout;

use crate::app::error::AppError;

const HELPER_SHUTDOWN_TIMEOUT: Duration = Duration::from_secs(2);
const HELPER_TERMINATE_TIMEOUT: Duration = Duration::from_secs(1);

pub enum ShutdownOutcome {
    Exited(ExitStatus),
    Terminated(ExitStatus),
    Killed(ExitStatus),
}

pub struct ShutdownReport {
    pub ack: Option<HelperShutdownAckPayload>,
    pub outcome: ShutdownOutcome,
}

pub async fn shutdown_child_process(
    mut child: Child,
    reason: HelperShutdownReason,
) -> Result<ShutdownReport, AppError> {
    let pid = child.id().unwrap_or(0);
    let ack = request_helper_shutdown(reason, HELPER_SHUTDOWN_TIMEOUT)
        .await
        .map(Some)
        .unwrap_or_else(|error| {
            log::warn!("请求 helper graceful shutdown 失败, pid={pid}: {error}");
            None
        });

    match timeout(HELPER_SHUTDOWN_TIMEOUT, child.wait()).await {
        Ok(Ok(status)) => {
            return Ok(ShutdownReport {
                ack,
                outcome: ShutdownOutcome::Exited(status),
            });
        }
        Ok(Err(error)) => {
            return Err(AppError::initialization(format!(
                "等待 helper 退出失败: {error}"
            )));
        }
        Err(_) => {
            log::warn!(
                "helper 未在 {:?} 内退出，进入 terminate fallback, pid={pid}",
                HELPER_SHUTDOWN_TIMEOUT
            );
        }
    }

    terminate_helper_process(pid).await?;

    match timeout(HELPER_TERMINATE_TIMEOUT, child.wait()).await {
        Ok(Ok(status)) => {
            return Ok(ShutdownReport {
                ack,
                outcome: ShutdownOutcome::Terminated(status),
            });
        }
        Ok(Err(error)) => {
            return Err(AppError::initialization(format!(
                "等待 helper terminate fallback 退出失败: {error}"
            )));
        }
        Err(_) => {
            log::warn!("helper terminate fallback 后仍未退出，进入 kill fallback, pid={pid}");
        }
    }

    child
        .kill()
        .await
        .map_err(|error| AppError::initialization(format!("强制 kill helper 失败: {error}")))?;
    let status = child
        .wait()
        .await
        .map_err(|error| AppError::initialization(format!("等待 helper kill fallback 退出失败: {error}")))?;
    Ok(ShutdownReport {
        ack,
        outcome: ShutdownOutcome::Killed(status),
    })
}

async fn request_helper_shutdown(
    reason: HelperShutdownReason,
    deadline: Duration,
) -> Result<HelperShutdownAckPayload, AppError> {
    let request = IpcRequest::HelperShutdown(HelperShutdownPayload {
        reason,
        deadline_ms: deadline.as_millis() as u64,
    });
    let response = helper_control_round_trip(&request).await?;

    match response {
        IpcResponse::HelperShutdownAck(payload) => Ok(payload),
        IpcResponse::Error(error) => Err(AppError::initialization(format!(
            "helper shutdown 被拒绝: {error}"
        ))),
        other => Err(AppError::initialization(format!(
            "unexpected helper shutdown response: {other:?}"
        ))),
    }
}

#[cfg(target_os = "windows")]
async fn terminate_helper_process(pid: u32) -> Result<(), AppError> {
    let output = tokio::process::Command::new("taskkill")
        .args(["/PID", &pid.to_string()])
        .output()
        .await
        .map_err(|error| AppError::initialization(format!("taskkill 执行失败: {error}")))?;

    if output.status.success() {
        return Ok(());
    }

    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_owned();
    Err(AppError::initialization(format!(
        "taskkill 请求 helper 终止失败: {}",
        if stderr.is_empty() {
            output.status.to_string()
        } else {
            stderr
        }
    )))
}

#[cfg(target_os = "macos")]
async fn terminate_helper_process(pid: u32) -> Result<(), AppError> {
    let output = tokio::process::Command::new("kill")
        .args(["-TERM", &pid.to_string()])
        .output()
        .await
        .map_err(|error| AppError::initialization(format!("kill -TERM 执行失败: {error}")))?;

    if output.status.success() {
        return Ok(());
    }

    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_owned();
    Err(AppError::initialization(format!(
        "kill -TERM 请求 helper 终止失败: {}",
        if stderr.is_empty() {
            output.status.to_string()
        } else {
            stderr
        }
    )))
}

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
async fn terminate_helper_process(_pid: u32) -> Result<(), AppError> {
    Ok(())
}

async fn helper_control_round_trip(request: &IpcRequest) -> Result<IpcResponse, AppError> {
    let socket = helper_control_socket_name();
    let stream = connect_with_timeout(&socket).await?;
    let (mut reader, mut writer) = stream.split();

    let payload = serde_json::to_vec(request)
        .map_err(|error| AppError::initialization(format!("serialize helper shutdown: {error}")))?;
    if payload.len() > MAX_FRAME_BYTES {
        return Err(AppError::initialization(format!(
            "helper shutdown payload too large: {}",
            payload.len()
        )));
    }

    let response_bytes = timeout(
        Duration::from_millis(DEFAULT_REQUEST_TIMEOUT_MS),
        async move {
            writer
                .write_all(&(payload.len() as u32).to_be_bytes())
                .await?;
            writer.write_all(&payload).await?;
            writer.flush().await?;

            let mut len_buf = [0_u8; 4];
            reader.read_exact(&mut len_buf).await?;
            let len = u32::from_be_bytes(len_buf) as usize;
            if len == 0 || len > MAX_FRAME_BYTES {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidData,
                    format!("invalid helper control response frame: {len}"),
                ));
            }

            let mut buf = vec![0_u8; len];
            reader.read_exact(&mut buf).await?;
            io::Result::Ok(buf)
        },
    )
    .await
    .map_err(|_| {
        AppError::initialization(format!(
            "helper shutdown request timed out after {DEFAULT_REQUEST_TIMEOUT_MS} ms"
        ))
    })?
    .map_err(AppError::from)?;

    serde_json::from_slice::<IpcResponse>(&response_bytes).map_err(|error| {
        AppError::initialization(format!("deserialize helper shutdown response: {error}"))
    })
}

async fn connect_with_timeout(socket: &SocketName) -> Result<Stream, AppError> {
    let name_result = if socket.namespaced {
        socket.raw.clone().to_ns_name::<GenericNamespaced>()
    } else {
        socket.raw.clone().to_fs_name::<GenericFilePath>()
    };

    let name = name_result
        .map_err(|error| AppError::initialization(format!("invalid helper control socket: {error}")))?;

    match timeout(
        Duration::from_millis(DEFAULT_CONNECT_TIMEOUT_MS),
        Stream::connect(name),
    )
    .await
    {
        Ok(Ok(stream)) => Ok(stream),
        Ok(Err(error)) => Err(AppError::initialization(format!(
            "connect helper control socket failed: {error}"
        ))),
        Err(_) => Err(AppError::initialization(format!(
            "connect helper control socket timed out after {DEFAULT_CONNECT_TIMEOUT_MS} ms"
        ))),
    }
}


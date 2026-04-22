//! Helper → 主 App 的 IPC 客户端。
//!
//! 每个请求单独建连接，完成即断开：
//! - 实现简单；
//! - 避免长连接在 Helper 休眠后需要保活；
//! - 压力极低（用户敲击频率 << 1 req/s），不用 pool。

use std::io;
use std::time::Duration;

use interprocess::local_socket::{
    tokio::{prelude::*, Stream},
    GenericFilePath, GenericNamespaced, ToFsName, ToNsName,
};
use stoneflow_ipc_protocol::{
    socket_name, CreateTaskPayload, IpcError, IpcRequest, IpcResponse, OpenProjectPayload,
    OpenTaskPayload, SearchWorkspacePayload, SocketName, TaskCreatedPayload,
    WorkspaceSearchResultPayload, DEFAULT_CONNECT_TIMEOUT_MS, DEFAULT_REQUEST_TIMEOUT_MS,
    MAX_FRAME_BYTES,
};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::time::timeout;

/// 探活：返回主 App 的协议版本号。
pub async fn ping() -> Result<u16, IpcError> {
    match round_trip(IpcRequest::Ping).await? {
        IpcResponse::Pong { protocol_version } => Ok(protocol_version),
        IpcResponse::Error(err) => Err(err),
        other => Err(IpcError::Internal(format!(
            "unexpected ipc response for Ping: {other:?}"
        ))),
    }
}

/// 创建 Quick Capture 任务。
pub async fn create_task(payload: CreateTaskPayload) -> Result<TaskCreatedPayload, IpcError> {
    match round_trip(IpcRequest::CreateTask(payload)).await? {
        IpcResponse::TaskCreated(p) => Ok(p),
        IpcResponse::Error(err) => Err(err),
        other => Err(IpcError::Internal(format!(
            "unexpected ipc response for CreateTask: {other:?}"
        ))),
    }
}

/// 搜索主 App 当前捕获 Space 的 Task / Project。
pub async fn search_workspace(
    payload: SearchWorkspacePayload,
) -> Result<WorkspaceSearchResultPayload, IpcError> {
    match round_trip(IpcRequest::SearchWorkspace(payload)).await? {
        IpcResponse::WorkspaceSearch(p) => Ok(p),
        IpcResponse::Error(err) => Err(err),
        other => Err(IpcError::Internal(format!(
            "unexpected ipc response for SearchWorkspace: {other:?}"
        ))),
    }
}

/// 请求主 App 打开指定 Task。
pub async fn open_task(payload: OpenTaskPayload) -> Result<(), IpcError> {
    match round_trip(IpcRequest::OpenTask(payload)).await? {
        IpcResponse::Opened => Ok(()),
        IpcResponse::Error(err) => Err(err),
        other => Err(IpcError::Internal(format!(
            "unexpected ipc response for OpenTask: {other:?}"
        ))),
    }
}

/// 请求主 App 打开指定 Project。
pub async fn open_project(payload: OpenProjectPayload) -> Result<(), IpcError> {
    match round_trip(IpcRequest::OpenProject(payload)).await? {
        IpcResponse::Opened => Ok(()),
        IpcResponse::Error(err) => Err(err),
        other => Err(IpcError::Internal(format!(
            "unexpected ipc response for OpenProject: {other:?}"
        ))),
    }
}

async fn round_trip(request: IpcRequest) -> Result<IpcResponse, IpcError> {
    let socket = socket_name();
    let stream = connect_with_timeout(&socket).await?;
    let (mut reader, mut writer) = stream.split();

    let payload =
        serde_json::to_vec(&request).map_err(|e| IpcError::Internal(format!("serialize: {e}")))?;
    if payload.len() > MAX_FRAME_BYTES {
        return Err(IpcError::Internal(format!(
            "request payload too large: {}",
            payload.len()
        )));
    }

    let write_fut = async {
        writer
            .write_all(&(payload.len() as u32).to_be_bytes())
            .await?;
        writer.write_all(&payload).await?;
        writer.flush().await?;
        io::Result::Ok(())
    };

    let read_fut = async {
        let mut len_buf = [0_u8; 4];
        reader.read_exact(&mut len_buf).await?;
        let len = u32::from_be_bytes(len_buf) as usize;
        if len == 0 || len > MAX_FRAME_BYTES {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                format!("invalid response frame: {len}"),
            ));
        }
        let mut buf = vec![0_u8; len];
        reader.read_exact(&mut buf).await?;
        io::Result::Ok(buf)
    };

    let response_bytes = match timeout(
        Duration::from_millis(DEFAULT_REQUEST_TIMEOUT_MS),
        async move {
            write_fut.await?;
            read_fut.await
        },
    )
    .await
    {
        Ok(Ok(bytes)) => bytes,
        Ok(Err(error)) => {
            return Err(IpcError::Internal(format!("ipc io error: {error}")));
        }
        Err(_) => {
            return Err(IpcError::Internal(format!(
                "ipc request timed out after {DEFAULT_REQUEST_TIMEOUT_MS} ms"
            )));
        }
    };

    serde_json::from_slice::<IpcResponse>(&response_bytes)
        .map_err(|e| IpcError::Internal(format!("deserialize response: {e}")))
}

async fn connect_with_timeout(socket: &SocketName) -> Result<Stream, IpcError> {
    // interprocess 的 `to_ns_name` / `to_fs_name` 已经返回 `io::Result`，
    // 无需再 `map_err(io::Error::from)` 做无意义的同类型转换。
    let name_result = if socket.namespaced {
        socket.raw.clone().to_ns_name::<GenericNamespaced>()
    } else {
        socket.raw.clone().to_fs_name::<GenericFilePath>()
    };

    let name = name_result.map_err(|e| IpcError::Internal(format!("invalid socket name: {e}")))?;

    match timeout(
        Duration::from_millis(DEFAULT_CONNECT_TIMEOUT_MS),
        Stream::connect(name),
    )
    .await
    {
        Ok(Ok(stream)) => Ok(stream),
        Ok(Err(error)) => Err(IpcError::Internal(format!("connect main app: {error}"))),
        Err(_) => Err(IpcError::Internal(format!(
            "connect main app timed out after {DEFAULT_CONNECT_TIMEOUT_MS} ms"
        ))),
    }
}

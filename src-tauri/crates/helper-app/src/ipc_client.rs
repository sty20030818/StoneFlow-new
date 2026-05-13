//! Helper → 主 App 的 IPC 客户端。
//!
//! 每次请求单独建连接，完成即断开，保持 Helper 轻量且不需要长连接保活。

use std::io;
use std::time::Duration;

use interprocess::local_socket::{
    tokio::{prelude::*, Stream},
    GenericFilePath, GenericNamespaced, ToFsName, ToNsName,
};
use stoneflow_ipc_protocol::{
    socket_name, IpcError, IpcRequest, IpcResponse, QuickCreatePayload, QuickInitialStatePayload,
    QuickListProjectsBySpacePayload, QuickOpenTargetPayload, QuickProjectsBySpaceResponsePayload,
    QuickSearchPayload, QuickSearchResponsePayload, SocketName, DEFAULT_CONNECT_TIMEOUT_MS,
    DEFAULT_REQUEST_TIMEOUT_MS, MAX_FRAME_BYTES,
};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::time::timeout;

pub async fn ping() -> Result<u16, IpcError> {
    match round_trip_with_policy(IpcRequest::Ping, RetryPolicy::startup_probe("Ping")).await? {
        IpcResponse::Pong { protocol_version } => Ok(protocol_version),
        IpcResponse::Error(error) => Err(error),
        other => Err(IpcError::Internal(format!(
            "unexpected ipc response for Ping: {other:?}"
        ))),
    }
}

pub async fn quick_get_initial_state() -> Result<QuickInitialStatePayload, IpcError> {
    match round_trip_with_policy(
        IpcRequest::QuickGetInitialState,
        RetryPolicy::startup_probe("QuickGetInitialState"),
    )
    .await?
    {
        IpcResponse::QuickInitialState(payload) => Ok(payload),
        IpcResponse::Error(error) => Err(error),
        other => Err(IpcError::Internal(format!(
            "unexpected ipc response for QuickGetInitialState: {other:?}"
        ))),
    }
}

pub async fn quick_list_projects_by_space(
    payload: QuickListProjectsBySpacePayload,
) -> Result<QuickProjectsBySpaceResponsePayload, IpcError> {
    match round_trip_with_policy(
        IpcRequest::QuickListProjectsBySpace(payload),
        RetryPolicy::single_attempt("QuickListProjectsBySpace"),
    )
    .await?
    {
        IpcResponse::QuickProjectsBySpace(payload) => Ok(payload),
        IpcResponse::Error(error) => Err(error),
        other => Err(IpcError::Internal(format!(
            "unexpected ipc response for QuickListProjectsBySpace: {other:?}"
        ))),
    }
}

pub async fn quick_search(
    payload: QuickSearchPayload,
) -> Result<QuickSearchResponsePayload, IpcError> {
    match round_trip_with_policy(
        IpcRequest::QuickSearch(payload),
        RetryPolicy::single_attempt("QuickSearch"),
    )
    .await?
    {
        IpcResponse::QuickSearch(payload) => Ok(payload),
        IpcResponse::Error(error) => Err(error),
        other => Err(IpcError::Internal(format!(
            "unexpected ipc response for QuickSearch: {other:?}"
        ))),
    }
}

pub async fn quick_create(payload: QuickCreatePayload) -> Result<(), IpcError> {
    match round_trip_with_policy(
        IpcRequest::QuickCreate(payload),
        RetryPolicy::single_attempt("QuickCreate"),
    )
    .await?
    {
        IpcResponse::QuickCreated(_) => Ok(()),
        IpcResponse::Error(error) => Err(error),
        other => Err(IpcError::Internal(format!(
            "unexpected ipc response for QuickCreate: {other:?}"
        ))),
    }
}

pub async fn quick_create_and_open(payload: QuickCreatePayload) -> Result<(), IpcError> {
    match round_trip_with_policy(
        IpcRequest::QuickCreateAndOpen(payload),
        RetryPolicy::single_attempt("QuickCreateAndOpen"),
    )
    .await?
    {
        IpcResponse::QuickCreated(_) => Ok(()),
        IpcResponse::Error(error) => Err(error),
        other => Err(IpcError::Internal(format!(
            "unexpected ipc response for QuickCreateAndOpen: {other:?}"
        ))),
    }
}

pub async fn quick_open_target(payload: QuickOpenTargetPayload) -> Result<(), IpcError> {
    match round_trip_with_policy(
        IpcRequest::QuickOpenTarget(payload),
        RetryPolicy::single_attempt("QuickOpenTarget"),
    )
    .await?
    {
        IpcResponse::Opened => Ok(()),
        IpcResponse::Error(error) => Err(error),
        other => Err(IpcError::Internal(format!(
            "unexpected ipc response for QuickOpenTarget: {other:?}"
        ))),
    }
}

const STARTUP_RETRY_ATTEMPTS: u32 = 3;
const STARTUP_RETRY_DELAY_MS: u64 = 120;

#[derive(Debug, Clone, Copy)]
struct RetryPolicy {
    operation: &'static str,
    max_attempts: u32,
    retry_delay: Duration,
}

impl RetryPolicy {
    fn startup_probe(operation: &'static str) -> Self {
        Self {
            operation,
            max_attempts: STARTUP_RETRY_ATTEMPTS,
            retry_delay: Duration::from_millis(STARTUP_RETRY_DELAY_MS),
        }
    }

    fn single_attempt(operation: &'static str) -> Self {
        Self {
            operation,
            max_attempts: 1,
            retry_delay: Duration::from_millis(0),
        }
    }
}

async fn round_trip_with_policy(
    request: IpcRequest,
    policy: RetryPolicy,
) -> Result<IpcResponse, IpcError> {
    let mut last_error = None;

    for attempt in 1..=policy.max_attempts {
        if attempt > 1 {
            tokio::time::sleep(policy.retry_delay).await;
            log::debug!(
                "helper: {} 第 {} 次重试（共 {} 次）",
                policy.operation,
                attempt - 1,
                policy.max_attempts - 1
            );
        }

        match try_round_trip(&request).await {
            Ok(response) => return Ok(response),
            Err(error) => {
                log::debug!(
                    "helper: {} 请求失败 (attempt {attempt}/{}): {error}",
                    policy.operation,
                    policy.max_attempts
                );
                last_error = Some(error);
            }
        }
    }

    Err(last_error.unwrap_or_else(|| IpcError::Internal("ipc unknown error".into())))
}

async fn try_round_trip(request: &IpcRequest) -> Result<IpcResponse, IpcError> {
    let socket = socket_name();
    let stream = connect_with_timeout(&socket).await?;
    let (mut reader, mut writer) = stream.split();

    let payload = serde_json::to_vec(request)
        .map_err(|error| IpcError::Internal(format!("serialize: {error}")))?;
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
        Ok(Err(error)) => return Err(IpcError::Internal(format!("ipc io error: {error}"))),
        Err(_) => {
            return Err(IpcError::Internal(format!(
                "ipc request timed out after {DEFAULT_REQUEST_TIMEOUT_MS} ms"
            )));
        }
    };

    serde_json::from_slice::<IpcResponse>(&response_bytes)
        .map_err(|error| IpcError::Internal(format!("deserialize response: {error}")))
}

async fn connect_with_timeout(socket: &SocketName) -> Result<Stream, IpcError> {
    let name_result = if socket.namespaced {
        socket.raw.clone().to_ns_name::<GenericNamespaced>()
    } else {
        socket.raw.clone().to_fs_name::<GenericFilePath>()
    };

    let name =
        name_result.map_err(|error| IpcError::Internal(format!("invalid socket name: {error}")))?;

    match timeout(
        Duration::from_millis(DEFAULT_CONNECT_TIMEOUT_MS),
        Stream::connect(name),
    )
    .await
    {
        Ok(Ok(stream)) => Ok(stream),
        Ok(Err(error)) => Err(IpcError::Internal(format!(
            "connect main app socket failed: {error}"
        ))),
        Err(_) => Err(IpcError::Internal(format!(
            "connect main app socket timed out after {DEFAULT_CONNECT_TIMEOUT_MS} ms"
        ))),
    }
}

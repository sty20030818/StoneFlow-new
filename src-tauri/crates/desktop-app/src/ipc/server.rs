//! 本地 IPC Server：监听 Helper 连接，派发请求到 `application::create` 用例。

use std::io;

use interprocess::local_socket::{
    tokio::{prelude::*, Listener, Stream},
    GenericFilePath, GenericNamespaced, ListenerOptions, ToFsName, ToNsName,
};
use anyhow::Context;
use stoneflow_core::default_space_seed;
use stoneflow_ipc_protocol::{
    socket_name, CreateTaskPayload, IpcError, IpcRequest, IpcResponse, SocketName,
    TaskCreatedPayload, WorkspaceProjectSearchItemPayload, WorkspaceSearchResultPayload,
    WorkspaceTaskSearchItemPayload, MAX_FRAME_BYTES, PROTOCOL_VERSION,
};
use tauri::{AppHandle, Manager, Runtime};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use uuid::Uuid;

use crate::app::error::AppError;
use crate::app::events::{
    emit_command_open, emit_task_changed, CommandOpenPayload, TaskChangedPayload,
};
use crate::app::command_helper::{restore_main_window_from_helper, CommandHelperState};
use crate::application::create::{
    create_capture_task as create_capture_task_usecase, ActiveSpaceState, CaptureTaskInput,
};
use crate::application::search::{
    search_workspace as search_workspace_usecase, SearchWorkspaceInput,
};
use crate::infrastructure::database::DatabaseState;
use crate::infrastructure::repositories::{ProjectRepository, SpaceRepository, TaskRepository};

/// 启动 IPC Server：在 Tauri 的异步运行时里长期运行，直至进程退出。
///
/// 策略：
/// - 启动前尝试清理残留的 stale socket 文件（Unix 重启场景常见）；
/// - `accept` 循环失败时仅记录日志、继续尝试，避免单次错误终结整条 IPC 通道；
/// - 每条连接单独 spawn 一个 task，使用行为级协议串行处理请求。
pub(crate) fn start_ipc_server<R: Runtime>(app_handle: &AppHandle<R>) {
    let handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(error) = run_ipc_server(handle).await {
            log::error!("IPC server 终止: {error}");
        }
    });
}

async fn run_ipc_server<R: Runtime>(app_handle: AppHandle<R>) -> io::Result<()> {
    let socket = socket_name();
    cleanup_stale_socket(&socket);

    let listener = build_listener(&socket)?;
    log::info!(
        "IPC server 正在监听 [{}{}]",
        if socket.namespaced { "ns:" } else { "fs:" },
        socket.raw
    );

    loop {
        let conn = match listener.accept().await {
            Ok(c) => c,
            Err(error) => {
                log::warn!("IPC accept 失败，稍后重试: {error}");
                continue;
            }
        };

        let handle = app_handle.clone();
        tauri::async_runtime::spawn(async move {
            if let Err(error) = handle_connection(conn, handle).await {
                // 正常断开（EOF / 对端关闭）走此分支，不升级为 error。
                log::debug!("IPC 连接关闭: {error}");
            }
        });
    }
}

/// 单条连接的请求处理循环。
async fn handle_connection<R: Runtime>(stream: Stream, app_handle: AppHandle<R>) -> io::Result<()> {
    let (mut reader, mut writer) = stream.split();

    loop {
        let mut len_buf = [0_u8; 4];
        if let Err(error) = reader.read_exact(&mut len_buf).await {
            if error.kind() == io::ErrorKind::UnexpectedEof {
                return Ok(());
            }
            return Err(error);
        }
        let len = u32::from_be_bytes(len_buf) as usize;
        if len == 0 || len > MAX_FRAME_BYTES {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                format!("invalid ipc frame length: {len}"),
            ));
        }

        let mut payload = vec![0_u8; len];
        reader.read_exact(&mut payload).await?;

        let response = match serde_json::from_slice::<IpcRequest>(&payload) {
            Ok(req) => dispatch(&app_handle, req).await,
            Err(error) => IpcResponse::Error(IpcError::Validation(format!(
                "invalid ipc request payload: {error}"
            ))),
        };

        write_frame(&mut writer, &response).await?;
    }
}

/// 根据请求类型派发到具体用例；所有业务错误映射为 `IpcError`。
async fn dispatch<R: Runtime>(app_handle: &AppHandle<R>, request: IpcRequest) -> IpcResponse {
    match request {
        IpcRequest::Ping => IpcResponse::Pong {
            protocol_version: PROTOCOL_VERSION,
        },
        IpcRequest::GetActiveSpace => {
            // 当前 Space 的 slug 尚未直接暴露，先返回 None，留给后续版本补齐。
            IpcResponse::ActiveSpace { space_slug: None }
        }
        IpcRequest::CreateTask(CreateTaskPayload {
            title,
            note,
            priority,
        }) => {
            let database = app_handle.state::<DatabaseState>();
            let active_space = app_handle.state::<ActiveSpaceState>();
            let result = create_capture_task_usecase(
                database.inner(),
                active_space.inner(),
                CaptureTaskInput {
                    title,
                    note,
                    priority,
                },
            )
            .await;

            match result {
                Ok(payload) => {
                    emit_task_changed(
                        app_handle,
                        TaskChangedPayload {
                            space_id: payload.space_id,
                            space_slug: payload.space_slug.clone(),
                            task_id: payload.id,
                            source: payload.source.clone(),
                            space_fallback: payload.space_fallback,
                        },
                    );

                    IpcResponse::TaskCreated(TaskCreatedPayload {
                        id: payload.id,
                        title: payload.title,
                        space_slug: Some(payload.space_slug),
                        space_fallback: payload.space_fallback,
                    })
                }
                Err(error) => {
                    let app_error: AppError = error.into();
                    log::warn!("IPC CreateTask 处理失败: {app_error:?}");
                    IpcResponse::Error(app_error.into())
                }
            }
        }
        IpcRequest::SearchWorkspace(payload) => {
            let database = app_handle.state::<DatabaseState>();
            let active_space = app_handle.state::<ActiveSpaceState>();
            let space_slug =
                match resolve_command_space_slug(database.inner(), active_space.inner()).await {
                    Ok(slug) => slug,
                    Err(error) => {
                        let app_error: AppError = error.into();
                        return IpcResponse::Error(app_error.into());
                    }
                };
            let result = search_workspace_usecase(
                database.inner(),
                SearchWorkspaceInput {
                    space_slug: space_slug.clone(),
                    query: payload.query,
                    limit: payload.limit,
                },
            )
            .await;

            match result {
                Ok(payload) => IpcResponse::WorkspaceSearch(WorkspaceSearchResultPayload {
                    space_slug,
                    tasks: payload
                        .tasks
                        .into_iter()
                        .map(|task| WorkspaceTaskSearchItemPayload {
                            id: task.id,
                            title: task.title,
                            note: task.note,
                            priority: task.priority,
                            project_id: task.project_id,
                            project_name: task.project_name,
                            updated_at: task.updated_at.to_rfc3339(),
                        })
                        .collect(),
                    projects: payload
                        .projects
                        .into_iter()
                        .map(|project| WorkspaceProjectSearchItemPayload {
                            id: project.id,
                            name: project.name,
                            note: project.note,
                            status: project.status,
                            sort_order: project.sort_order,
                        })
                        .collect(),
                }),
                Err(error) => {
                    let app_error: AppError = error.into();
                    log::warn!("IPC SearchWorkspace 处理失败: {app_error:?}");
                    IpcResponse::Error(app_error.into())
                }
            }
        }
        IpcRequest::OpenTask(payload) => open_task_from_helper(app_handle, payload.task_id).await,
        IpcRequest::OpenProject(payload) => {
            open_project_from_helper(app_handle, payload.project_id).await
        }
    }
}

async fn resolve_command_space_slug(
    database: &DatabaseState,
    active_space_state: &ActiveSpaceState,
) -> anyhow::Result<String> {
    let space_repository = SpaceRepository::new(&database.connection);

    if let Some(active_space_id) = active_space_state.get()? {
        if let Some(space) = space_repository.find_by_id(active_space_id).await? {
            if !space.is_archived {
                return Ok(space.slug);
            }
        }
    }

    let default_slug = default_space_seed().slug;
    let default_space = space_repository
        .find_by_slug(default_slug)
        .await?
        .with_context(|| format!("default space `{default_slug}` does not exist"))?;

    if default_space.is_archived {
        anyhow::bail!("default space `{default_slug}` is archived");
    }

    Ok(default_space.slug)
}

async fn open_task_from_helper<R: Runtime>(
    app_handle: &AppHandle<R>,
    task_id: Uuid,
) -> IpcResponse {
    let database = app_handle.state::<DatabaseState>();
    let task_repository = TaskRepository::new(&database.connection);
    let space_repository = SpaceRepository::new(&database.connection);

    let result = async {
        let task = task_repository
            .find_active_by_id(task_id)
            .await?
            .with_context(|| format!("task `{task_id}` does not exist"))?;
        let project_id = task.project_id;
        let space = space_repository
            .find_by_id(task.space_id)
            .await?
            .with_context(|| format!("space `{}` does not exist", task.space_id))?;
        Ok::<_, anyhow::Error>((space.slug, project_id))
    }
    .await;

    match result {
        Ok((space_slug, project_id)) => {
            restore_main_window(app_handle);
            emit_command_open(
                app_handle,
                CommandOpenPayload {
                    kind: "task".to_owned(),
                    id: task_id,
                    space_slug,
                    project_id,
                },
            );
            IpcResponse::Opened
        }
        Err(error) => {
            let app_error: AppError = error.into();
            log::warn!("IPC OpenTask 处理失败: {app_error:?}");
            IpcResponse::Error(app_error.into())
        }
    }
}

async fn open_project_from_helper<R: Runtime>(
    app_handle: &AppHandle<R>,
    project_id: Uuid,
) -> IpcResponse {
    let database = app_handle.state::<DatabaseState>();
    let project_repository = ProjectRepository::new(&database.connection);
    let space_repository = SpaceRepository::new(&database.connection);

    let result = async {
        let project = project_repository
            .find_active_by_id(project_id)
            .await?
            .with_context(|| format!("project `{project_id}` does not exist"))?;
        let space = space_repository
            .find_by_id(project.space_id)
            .await?
            .with_context(|| format!("space `{}` does not exist", project.space_id))?;
        Ok::<_, anyhow::Error>(space.slug)
    }
    .await;

    match result {
        Ok(space_slug) => {
            restore_main_window(app_handle);
            emit_command_open(
                app_handle,
                CommandOpenPayload {
                    kind: "project".to_owned(),
                    id: project_id,
                    space_slug,
                    project_id: None,
                },
            );
            IpcResponse::Opened
        }
        Err(error) => {
            let app_error: AppError = error.into();
            log::warn!("IPC OpenProject 处理失败: {app_error:?}");
            IpcResponse::Error(app_error.into())
        }
    }
}

fn restore_main_window<R: Runtime>(app_handle: &AppHandle<R>) {
    let helper_state = app_handle.state::<CommandHelperState>();
    if let Err(error) = restore_main_window_from_helper(app_handle, helper_state.inner()) {
        log::warn!("Helper 打开请求恢复主窗口失败: {error}");
    }
}

/// 将 `IpcResponse` 以 length-prefixed JSON 格式写回连接。
async fn write_frame<W>(writer: &mut W, response: &IpcResponse) -> io::Result<()>
where
    W: AsyncWriteExt + Unpin,
{
    let payload = serde_json::to_vec(response)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
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
    writer.flush().await?;
    Ok(())
}

/// 依据协议层提供的命名类型构造 interprocess listener。
fn build_listener(socket: &SocketName) -> io::Result<Listener> {
    if socket.namespaced {
        let name = socket.raw.clone().to_ns_name::<GenericNamespaced>()?;
        ListenerOptions::new().name(name).create_tokio()
    } else {
        let name = socket.raw.clone().to_fs_name::<GenericFilePath>()?;
        ListenerOptions::new().name(name).create_tokio()
    }
}

/// Unix 域套接字重启时可能残留文件，若无人监听会导致 `bind` 报 `AddrInUse`。
/// Windows 使用命名管道，不存在文件型 socket 清理需求，因此直接跳过。
fn cleanup_stale_socket(socket: &SocketName) {
    if socket.namespaced {
        return;
    }
    cleanup_stale_socket_file(socket);
}

/// 清理 Unix 文件型 socket 的残留文件。
#[cfg(unix)]
fn cleanup_stale_socket_file(socket: &SocketName) {
    let path = std::path::Path::new(&socket.raw);
    if !path.exists() {
        return;
    }

    // 尝试以同步方式连一下；连通意味着有实例在运行，绝不可删除。
    match std::os::unix::net::UnixStream::connect(path) {
        Ok(_) => {
            log::warn!(
                "检测到有实例占用 socket [{}]，跳过清理。新实例 IPC server 可能监听失败。",
                socket.raw
            );
        }
        Err(_) => {
            if let Err(error) = std::fs::remove_file(path) {
                log::warn!("清理 stale socket [{}] 失败: {error}", socket.raw);
            } else {
                log::info!("已清理 stale socket [{}]", socket.raw);
            }
        }
    }
}

/// 非 Unix 平台不会生成文件型 Unix socket；该分支只用于保持跨平台编译边界清晰。
#[cfg(not(unix))]
fn cleanup_stale_socket_file(_socket: &SocketName) {}

//! 云同步调度与执行入口。

use std::process::Stdio;
use std::time::Duration;

use tauri::Manager;
use tokio::sync::OwnedMutexGuard;
use tokio::{
    io::{AsyncBufReadExt, AsyncWriteExt, BufReader},
    process::Command,
    time::timeout,
};

use crate::app::error::AppError;

use super::{
    config::{load_remote_config, save_remote_config},
    replicator::replicate_database,
    state::{SyncRunMode, SyncRuntimeState},
    types::{ConfigureSyncInput, SyncStatusPayload},
};
use stoneflow_storage::database::DatabaseRuntimeState;

const SYNC_WORKER_FLAG: &str = "--stoneflow-sync-worker";
const SYNC_WORKER_TIMEOUT: Duration = Duration::from_secs(20);
const SYNC_WORKER_KILL_WAIT_TIMEOUT: Duration = Duration::from_secs(2);

/// 启动时从 settings 表加载同步配置。
pub async fn initialize_state(
    sync_state: &SyncRuntimeState,
    database: &DatabaseRuntimeState,
) -> Result<(), AppError> {
    let config = load_remote_config(database).await?;
    match config.as_ref() {
        Some(remote) => log::info!(
            "sync:init loaded remote config host={} db_path={}",
            redact_remote_url(&remote.url),
            database.database_path().display()
        ),
        None => log::info!(
            "sync:init remote config missing db_path={}",
            database.database_path().display()
        ),
    }
    sync_state.set_remote_config(config).await;
    Ok(())
}

/// 读取当前同步状态。
pub async fn get_sync_status(sync_state: &SyncRuntimeState) -> SyncStatusPayload {
    sync_state.snapshot().await
}

/// 保存远端配置并刷新运行态缓存。
pub async fn configure_sync(
    database: &DatabaseRuntimeState,
    sync_state: &SyncRuntimeState,
    input: ConfigureSyncInput,
) -> Result<SyncStatusPayload, AppError> {
    let config = save_remote_config(database, input.url, input.token).await?;
    log::info!(
        "sync:configure saved remote config host={} db_path={}",
        redact_remote_url(&config.url),
        database.database_path().display()
    );
    sync_state.set_remote_config(Some(config)).await;
    Ok(sync_state.snapshot().await)
}

/// 本地写入成功后的统一入口：标记 dirty，并在空闲时异步发起一轮上推。
pub async fn note_local_write(app_handle: &tauri::AppHandle) {
    let Some(sync_state) = app_handle.try_state::<SyncRuntimeState>() else {
        return;
    };

    sync_state.mark_dirty().await;
    log::info!("sync:dirty local write marked dirty");
    schedule_background_sync(app_handle, SyncRunMode::Push).await;
}

/// 启动后自动触发一轮 pull-like 同步。
pub fn trigger_startup_pull(app_handle: &tauri::AppHandle) {
    let app_handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        log::info!("sync:trigger startup pull requested");
        schedule_background_sync(&app_handle, SyncRunMode::Pull).await;
    });
}

/// 应用恢复前台后自动触发一轮 pull-like 同步。
pub fn trigger_resume_pull(app_handle: &tauri::AppHandle) {
    let app_handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        log::info!("sync:trigger resume pull requested");
        schedule_background_sync(&app_handle, SyncRunMode::Pull).await;
    });
}

/// 手动同步固定语义为 push -> pull，并等待本轮完成。
pub async fn force_sync(app_handle: &tauri::AppHandle) -> Result<SyncStatusPayload, AppError> {
    let sync_state = sync_state_from_app(app_handle)?;
    ensure_remote_config(&sync_state).await?;

    log::info!("sync:trigger force sync requested");
    let guard = sync_state.lock_execution().await;
    run_sync_loop(app_handle, guard, SyncRunMode::Force).await?;

    Ok(sync_state.snapshot().await)
}

async fn schedule_background_sync(app_handle: &tauri::AppHandle, mode: SyncRunMode) {
    let Ok(sync_state) = sync_state_from_app(app_handle) else {
        log::warn!("sync:schedule state missing");
        return;
    };

    if ensure_remote_config(&sync_state).await.is_err() {
        log::info!(
            "sync:schedule skipped because remote config missing mode={}",
            mode_label(mode)
        );
        return;
    }

    let Some(guard) = sync_state.try_lock_execution() else {
        log::info!(
            "sync:schedule queued because another run is active mode={}",
            mode_label(mode)
        );
        sync_state.queue_pending(mode).await;
        return;
    };

    log::info!(
        "sync:schedule spawning background run mode={}",
        mode_label(mode)
    );
    let app_handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(error) = run_sync_loop(&app_handle, guard, mode).await {
            log::warn!("runtime: 云同步后台任务执行失败: {error}");
        }
    });
}

async fn run_sync_loop(
    app_handle: &tauri::AppHandle,
    _guard: OwnedMutexGuard<()>,
    initial_mode: SyncRunMode,
) -> Result<(), AppError> {
    let sync_state = sync_state_from_app(app_handle)?;
    let mut next_mode = initial_mode;

    log::info!("sync:loop start mode={}", mode_label(initial_mode));
    loop {
        run_sync_round(app_handle, &sync_state, next_mode).await?;

        let Some(pending_mode) = sync_state.take_pending_mode().await else {
            log::info!("sync:loop finished last_mode={}", mode_label(next_mode));
            break;
        };
        log::info!(
            "sync:loop continuing pending_mode={} after={}",
            mode_label(pending_mode),
            mode_label(next_mode)
        );
        next_mode = pending_mode;
    }

    Ok(())
}

async fn run_sync_round(
    app_handle: &tauri::AppHandle,
    sync_state: &SyncRuntimeState,
    mode: SyncRunMode,
) -> Result<(), AppError> {
    let database = database_state_from_app(app_handle)?;
    let remote_config = sync_state
        .remote_config()
        .await
        .ok_or_else(|| AppError::validation("云同步尚未配置远端，请先保存 Turso url 和 token"))?;

    log::info!(
        "sync:round start mode={} db_path={} host={}",
        mode_label(mode),
        database.database_path().display(),
        redact_remote_url(&remote_config.url)
    );
    sync_state.start_run(mode).await;

    let result = match mode {
        SyncRunMode::Push | SyncRunMode::Pull => {
            sync_database(
                database.database_path().display().to_string(),
                &remote_config,
                mode,
            )
            .await
        }
        SyncRunMode::Force => {
            sync_database(
                database.database_path().display().to_string(),
                &remote_config,
                SyncRunMode::Push,
            )
            .await
            .map_err(|error| error.with_sync_mode(SyncRunMode::Push))?;
            sync_state.enter_force_pull_phase().await;
            sync_database(
                database.database_path().display().to_string(),
                &remote_config,
                SyncRunMode::Pull,
            )
            .await
            .map_err(|error| error.with_sync_mode(SyncRunMode::Pull))
        }
    };

    match result {
        Ok(()) => {
            sync_state.complete_run(mode).await;
            log::info!("sync:round success mode={}", mode_label(mode));
            Ok(())
        }
        Err(error) => {
            let message = error.to_string();
            sync_state.fail_run(mode, message.clone()).await;
            log::warn!(
                "sync:round failed mode={} error={message}",
                mode_label(mode)
            );
            Err(AppError::internal(message))
        }
    }
}

async fn sync_database(
    database_path: String,
    remote_config: &crate::sync::types::SyncRemoteConfig,
    mode: SyncRunMode,
) -> Result<(), AppError> {
    let current_exe = std::env::current_exe()
        .map_err(|error| AppError::internal(format!("解析当前应用路径失败: {error}")))?;
    let request = SyncWorkerRequest {
        database_path,
        url: remote_config.url.clone(),
        token: remote_config.token.clone(),
        mode,
    };
    let request_payload = serde_json::to_vec(&request)
        .map_err(|error| AppError::internal(format!("序列化同步请求失败: {error}")))?;

    log::info!(
        "sync:worker spawning exe={} db_path={} host={}",
        current_exe.display(),
        request.database_path,
        redact_remote_url(&request.url)
    );

    let mut child = Command::new(current_exe)
        .arg(SYNC_WORKER_FLAG)
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| AppError::internal(format!("启动同步 worker 失败: {error}")))?;

    let child_id = child.id().unwrap_or_default();
    log::info!("sync:worker spawned pid={child_id}");

    let Some(mut stdin) = child.stdin.take() else {
        return Err(AppError::internal("同步 worker stdin 不可用"));
    };

    stdin
        .write_all(&request_payload)
        .await
        .map_err(|error| AppError::internal(format!("发送同步请求失败: {error}")))?;
    // Tokio 在 Unix 上的 ChildStdin::shutdown() 不会真正关闭底层 pipe，
    // worker 侧 read_to_string(stdin) 必须等到 EOF 才会返回，所以这里需要显式 drop。
    drop(stdin);

    let Some(stderr) = child.stderr.take() else {
        return Err(AppError::internal("同步 worker stderr 不可用"));
    };
    let stderr_task = tokio::spawn(read_worker_stderr(child_id, stderr));

    let status = match timeout(SYNC_WORKER_TIMEOUT, child.wait()).await {
        Ok(result) => result
            .map_err(|error| AppError::internal(format!("等待同步 worker 结束失败: {error}")))?,
        Err(_) => {
            log::warn!(
                "sync:worker timeout pid={} after {}s",
                child_id,
                SYNC_WORKER_TIMEOUT.as_secs()
            );
            let _ = child.start_kill();
            let kill_wait_result = timeout(SYNC_WORKER_KILL_WAIT_TIMEOUT, child.wait()).await;
            if kill_wait_result.is_err() {
                stderr_task.abort();
                return Err(AppError::internal(format!(
                    "同步超时：{} 秒后 worker 仍未退出，强制终止也未完成，请检查本地数据库锁状态",
                    SYNC_WORKER_TIMEOUT.as_secs()
                )));
            }
            let stderr_output = collect_worker_stderr(stderr_task).await;
            let message = if stderr_output.is_empty() {
                format!(
                    "同步超时：{} 秒内未完成，请检查 Turso 远端、网络和本地数据库锁状态",
                    SYNC_WORKER_TIMEOUT.as_secs()
                )
            } else {
                format!(
                    "同步超时：{} 秒内未完成。worker 输出：{}",
                    SYNC_WORKER_TIMEOUT.as_secs(),
                    stderr_output
                )
            };
            return Err(AppError::internal(message));
        }
    };

    let stderr_output = collect_worker_stderr(stderr_task).await;
    log::info!(
        "sync:worker exited pid={} success={} code={:?} stderr_len={}",
        child_id,
        status.success(),
        status.code(),
        stderr_output.len()
    );

    if !status.success() {
        let message = if stderr_output.is_empty() {
            "同步 worker 返回失败".to_owned()
        } else {
            stderr_output
        };
        return Err(AppError::internal(message));
    }

    Ok(())
}

trait SyncErrorContext {
    fn with_sync_mode(self, mode: SyncRunMode) -> AppError;
}

impl SyncErrorContext for AppError {
    fn with_sync_mode(self, mode: SyncRunMode) -> AppError {
        AppError::internal(format!("{}: {}", mode_label(mode), self))
    }
}

async fn read_worker_stderr(child_id: u32, stderr: tokio::process::ChildStderr) -> String {
    let mut lines = BufReader::new(stderr).lines();
    let mut collected = Vec::new();

    loop {
        match lines.next_line().await {
            Ok(Some(line)) => {
                log::info!("sync:worker stderr pid={} {}", child_id, line);
                collected.push(line);
            }
            Ok(None) => break,
            Err(error) => {
                log::warn!(
                    "sync:worker stderr read failed pid={} error={}",
                    child_id,
                    error
                );
                break;
            }
        }
    }

    collected.join("\n")
}

async fn collect_worker_stderr(stderr_task: tokio::task::JoinHandle<String>) -> String {
    match timeout(SYNC_WORKER_KILL_WAIT_TIMEOUT, stderr_task).await {
        Ok(Ok(output)) => output,
        Ok(Err(error)) => {
            log::warn!("sync:worker stderr task join failed: {}", error);
            String::new()
        }
        Err(_) => {
            log::warn!("sync:worker stderr task timed out while collecting output");
            String::new()
        }
    }
}

fn sync_state_from_app(app_handle: &tauri::AppHandle) -> Result<SyncRuntimeState, AppError> {
    app_handle
        .try_state::<SyncRuntimeState>()
        .map(|state| state.inner().clone())
        .ok_or_else(|| AppError::initialization("云同步状态未注册"))
}

fn database_state_from_app(
    app_handle: &tauri::AppHandle,
) -> Result<DatabaseRuntimeState, AppError> {
    app_handle
        .try_state::<DatabaseRuntimeState>()
        .map(|state| state.inner().clone())
        .ok_or_else(|| AppError::initialization("数据库状态未注册"))
}

async fn ensure_remote_config(sync_state: &SyncRuntimeState) -> Result<(), AppError> {
    if sync_state.remote_config().await.is_some() {
        return Ok(());
    }

    Err(AppError::validation(
        "云同步尚未配置远端，请先保存 Turso url 和 token",
    ))
}

/// 当主可执行文件以 worker 标志启动时，直接执行独立同步进程逻辑并返回退出码。
pub fn run_sync_worker_from_cli() -> Option<i32> {
    let is_sync_worker = std::env::args().any(|arg| arg == SYNC_WORKER_FLAG);
    if !is_sync_worker {
        return None;
    }

    Some(match read_sync_worker_request() {
        Ok(request) => {
            eprintln!(
                "sync:worker-cli start db_path={} host={}",
                request.database_path,
                redact_remote_url(&request.url)
            );
            let runtime = match tokio::runtime::Builder::new_current_thread()
                .enable_all()
                .build()
            {
                Ok(runtime) => runtime,
                Err(error) => {
                    eprintln!("初始化同步 worker runtime 失败: {error}");
                    return Some(1);
                }
            };

            let previous_hook = std::panic::take_hook();
            std::panic::set_hook(Box::new(|_| {}));
            let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                runtime.block_on(sync_database_in_worker(request))
            }));
            std::panic::set_hook(previous_hook);

            match result {
                Ok(Ok(())) => {
                    eprintln!("sync:worker-cli success");
                    0
                }
                Ok(Err(message)) => {
                    eprintln!("{message}");
                    1
                }
                Err(_) => {
                    eprintln!("同步 worker 发生未捕获 panic，请检查 Turso url、token 和本地库状态");
                    1
                }
            }
        }
        Err(message) => {
            eprintln!("{message}");
            1
        }
    })
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
struct SyncWorkerRequest {
    database_path: String,
    url: String,
    token: String,
    mode: SyncRunMode,
}

fn read_sync_worker_request() -> Result<SyncWorkerRequest, String> {
    let payload = std::io::read_to_string(std::io::stdin())
        .map_err(|error| format!("读取同步 worker 请求失败: {error}"))?;
    serde_json::from_str::<SyncWorkerRequest>(&payload)
        .map_err(|error| format!("解析同步 worker 请求失败: {error}"))
}

async fn sync_database_in_worker(request: SyncWorkerRequest) -> Result<(), String> {
    eprintln!(
        "sync:worker-cli syncing db_path={} host={}",
        request.database_path,
        redact_remote_url(&request.url)
    );
    eprintln!("sync:worker-cli sync-start");
    replicate_database(
        &request.database_path,
        &crate::sync::types::SyncRemoteConfig {
            url: request.url,
            token: request.token,
        },
        request.mode.into(),
    )
    .await
    .map_err(|error| error.to_string())?;
    eprintln!("sync:worker-cli sync-done");

    Ok(())
}

fn mode_label(mode: SyncRunMode) -> &'static str {
    match mode {
        SyncRunMode::Push => "push",
        SyncRunMode::Pull => "pull",
        SyncRunMode::Force => "force",
    }
}

fn redact_remote_url(url: &str) -> String {
    if let Some(rest) = url.strip_prefix("libsql://") {
        return format!("libsql://{rest}");
    }
    if let Some(rest) = url.strip_prefix("https://") {
        return format!("https://{rest}");
    }
    url.to_owned()
}

#[cfg(test)]
mod tests {
    use stoneflow_test_support::TestDatabase;

    use super::{
        configure_sync, get_sync_status, initialize_state, read_sync_worker_request,
        SyncWorkerRequest,
    };
    use crate::sync::{
        state::SyncRuntimeState,
        types::{ConfigureSyncInput, SyncStatusKind},
    };

    #[tokio::test]
    async fn configure_sync_should_enable_runtime_status() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        let sync_state = SyncRuntimeState::default();
        initialize_state(&sync_state, &database)
            .await
            .expect("sync state should initialize");

        let payload = configure_sync(
            &database,
            &sync_state,
            ConfigureSyncInput {
                url: "libsql://example.turso.io".to_owned(),
                token: "secret".to_owned(),
            },
        )
        .await
        .expect("configure sync should succeed");

        assert!(payload.enabled);
        assert!(payload.has_remote_config);
        assert_eq!(payload.status, SyncStatusKind::Idle);
    }

    #[tokio::test]
    async fn get_sync_status_should_default_to_disabled_without_remote_config() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        let sync_state = SyncRuntimeState::default();
        initialize_state(&sync_state, &database)
            .await
            .expect("sync state should initialize");

        let payload = get_sync_status(&sync_state).await;

        assert!(!payload.enabled);
        assert!(!payload.has_remote_config);
        assert_eq!(payload.status, SyncStatusKind::Disabled);
        assert_eq!(payload.last_error_mode, None);
    }

    #[test]
    fn read_sync_worker_request_should_parse_json_payload() {
        let payload = serde_json::to_string(&SyncWorkerRequest {
            database_path: "/tmp/stoneflow.sqlite3".to_owned(),
            url: "libsql://example.turso.io".to_owned(),
            token: "secret".to_owned(),
            mode: super::SyncRunMode::Force,
        })
        .expect("payload should serialize");

        let parsed =
            serde_json::from_str::<SyncWorkerRequest>(&payload).expect("payload should parse");

        assert_eq!(parsed.database_path, "/tmp/stoneflow.sqlite3");
        assert_eq!(parsed.url, "libsql://example.turso.io");
        assert_eq!(parsed.token, "secret");
        assert_eq!(parsed.mode, super::SyncRunMode::Force);
        let _ = read_sync_worker_request as fn() -> Result<SyncWorkerRequest, String>;
    }
}

//! 云同步调度与执行入口。

use std::path::{Path, PathBuf};

use serde::de::DeserializeOwned;
use serde::Deserialize;
use tauri::Manager;
use tokio::sync::OwnedMutexGuard;
use tokio::process::Command;

use crate::app::error::AppError;

use super::{
    config::{load_remote_config, save_remote_config},
    local::{inspect_local_replica, read_restore_summary},
    state::{SyncRunMode, SyncRuntimeState},
    types::{
        ConfigureSyncInput, RestoreSyncPayload, SyncDiagnosticsPayload, SyncReplicaState,
        SyncStatusPayload,
    },
};
use stoneflow_storage::database::DatabaseRuntimeState;

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
    refresh_local_replica_state(sync_state, database).await?;
    Ok(())
}

/// 读取当前同步状态。
pub async fn get_sync_status(
    sync_state: &SyncRuntimeState,
    database: &DatabaseRuntimeState,
) -> Result<SyncStatusPayload, AppError> {
    refresh_local_replica_state(sync_state, database).await?;
    Ok(sync_state.snapshot().await)
}

/// 读取当前设备和 Turso 远端的只读诊断摘要。
pub async fn get_sync_diagnostics(app_handle: &tauri::AppHandle) -> Result<SyncDiagnosticsPayload, AppError> {
    let sync_state = sync_state_from_app(app_handle)?;
    let database = database_state_from_app(app_handle)?;
    refresh_local_replica_state(&sync_state, &database).await?;
    let remote_config = sync_state
        .remote_config()
        .await
        .ok_or_else(|| AppError::validation("云同步尚未配置远端，请先保存 Turso url 和 token"))?;

    log::info!(
        "sync:diagnostics requested db_path={} host={}",
        database.database_path().display(),
        redact_remote_url(&remote_config.url)
    );

    let mut diagnostics = run_sync_worker_json::<SyncDiagnosticsPayload>(
        app_handle,
        database.database_path().display().to_string(),
        &remote_config,
        "diagnose",
    )
    .await?;
    diagnostics.remote_host = Some(redact_remote_url(&remote_config.url));
    Ok(diagnostics)
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
    refresh_local_replica_state(sync_state, database).await?;
    Ok(sync_state.snapshot().await)
}

/// 本地写入成功后的统一入口：标记 dirty，并在空闲时异步发起一轮完整对齐同步。
pub async fn note_local_write(app_handle: &tauri::AppHandle) {
    let Some(sync_state) = app_handle.try_state::<SyncRuntimeState>() else {
        return;
    };

    sync_state.mark_dirty().await;
    log::info!("sync:dirty local write marked dirty");

    if !sync_execution_enabled() {
        log::info!("sync:dirty remote execution disabled during S1");
        return;
    }

    schedule_background_sync(app_handle, SyncRunMode::Sync).await;
}

/// 启动后自动触发一轮完整对齐同步。
pub fn trigger_startup_sync(app_handle: &tauri::AppHandle) {
    if !sync_execution_enabled() {
        log::info!("sync:trigger startup sync skipped because remote execution disabled");
        return;
    }

    let app_handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        log::info!("sync:trigger startup sync requested");
        schedule_background_sync(&app_handle, SyncRunMode::Sync).await;
    });
}

/// 应用恢复前台后自动触发一轮完整对齐同步。
pub fn trigger_resume_sync(app_handle: &tauri::AppHandle) {
    if !sync_execution_enabled() {
        log::info!("sync:trigger resume sync skipped because remote execution disabled");
        return;
    }

    let app_handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        log::info!("sync:trigger resume sync requested");
        schedule_background_sync(&app_handle, SyncRunMode::Sync).await;
    });
}

/// 手动执行一轮完整同步，并等待本轮完成。
pub async fn run_sync(app_handle: &tauri::AppHandle) -> Result<SyncStatusPayload, AppError> {
    let sync_state = sync_state_from_app(app_handle)?;
    let database = database_state_from_app(app_handle)?;
    refresh_local_replica_state(&sync_state, &database).await?;
    ensure_remote_config(&sync_state).await?;
    ensure_sync_allowed(&sync_state).await?;

    log::info!("sync:trigger manual sync requested");
    let guard = sync_state.lock_execution().await;
    run_sync_loop(app_handle, guard, SyncRunMode::Sync).await?;
    refresh_local_replica_state(&sync_state, &database).await?;

    Ok(sync_state.snapshot().await)
}

/// 显式从远端镜像恢复当前设备的本地工作副本。
pub async fn restore_sync(app_handle: &tauri::AppHandle) -> Result<RestoreSyncPayload, AppError> {
    let sync_state = sync_state_from_app(app_handle)?;
    let database = database_state_from_app(app_handle)?;
    refresh_local_replica_state(&sync_state, &database).await?;
    ensure_remote_config(&sync_state).await?;

    log::info!("sync:trigger restore requested");
    let guard = sync_state.lock_execution().await;
    run_sync_loop(app_handle, guard, SyncRunMode::Restore).await?;
    refresh_local_replica_state(&sync_state, &database).await?;
    let summary = read_restore_summary(&database).await?;

    Ok(RestoreSyncPayload {
        status: sync_state.snapshot().await,
        summary,
    })
}

async fn schedule_background_sync(app_handle: &tauri::AppHandle, mode: SyncRunMode) {
    if !sync_execution_enabled() {
        log::info!(
            "sync:schedule skipped because remote execution disabled mode={}",
            mode_label(mode)
        );
        return;
    }

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

    let Ok(database) = database_state_from_app(app_handle) else {
        log::warn!("sync:schedule database state missing");
        return;
    };

    if let Err(error) = refresh_local_replica_state(&sync_state, &database).await {
        log::warn!("sync:schedule refresh replica state failed: {error}");
        return;
    }

    if let Err(error) = ensure_sync_allowed(&sync_state).await {
        log::info!(
            "sync:schedule blocked mode={} reason={error}",
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

    let database_path = database.database_path().display().to_string();
    let result = match mode {
        SyncRunMode::Push | SyncRunMode::Pull | SyncRunMode::Restore => sync_database(
            app_handle,
            database_path,
            &remote_config,
            mode,
        )
        .await
        .map_err(|error| SyncRoundFailure {
            failed_mode: mode,
            error,
        }),
        SyncRunMode::Sync => run_sync_round_trip(
            app_handle,
            sync_state,
            database_path,
            &remote_config,
        )
        .await,
    };

    match result {
        Ok(()) => {
            sync_state.complete_run(mode).await;
            log::info!("sync:round success mode={}", mode_label(mode));
            Ok(())
        }
        Err(failure) => {
            let message = failure.error.to_string();
            sync_state
                .fail_run(failure.failed_mode, message.clone())
                .await;
            log::warn!(
                "sync:round failed mode={} failed_mode={} error={message}",
                mode_label(mode),
                mode_label(failure.failed_mode)
            );
            Err(failure.error)
        }
    }
}

struct SyncRoundFailure {
    failed_mode: SyncRunMode,
    error: AppError,
}

async fn run_sync_round_trip(
    app_handle: &tauri::AppHandle,
    sync_state: &SyncRuntimeState,
    database_path: String,
    remote_config: &crate::sync::types::SyncRemoteConfig,
) -> Result<(), SyncRoundFailure> {
    log::info!("sync:sync_v2 phase=initial_pull");
    sync_database_v2(
        app_handle,
        database_path.clone(),
        remote_config,
        SyncRunMode::Pull,
    )
    .await
    .map_err(|error| SyncRoundFailure {
        failed_mode: SyncRunMode::Pull,
        error: error.with_sync_mode(SyncRunMode::Pull),
    })?;

    sync_state.enter_sync_push_phase().await;
    log::info!("sync:sync_v2 phase=push");
    sync_database_v2(
        app_handle,
        database_path.clone(),
        remote_config,
        SyncRunMode::Push,
    )
    .await
    .map_err(|error| SyncRoundFailure {
        failed_mode: SyncRunMode::Push,
        error: error.with_sync_mode(SyncRunMode::Push),
    })?;

    sync_state.enter_sync_confirm_pull_phase().await;
    log::info!("sync:sync_v2 phase=confirm_pull");
    sync_database_v2(app_handle, database_path, remote_config, SyncRunMode::Pull)
        .await
        .map_err(|error| SyncRoundFailure {
            failed_mode: SyncRunMode::Pull,
            error: error.with_sync_mode(SyncRunMode::Pull),
        })
}

async fn sync_database(
    app_handle: &tauri::AppHandle,
    database_path: String,
    remote_config: &crate::sync::types::SyncRemoteConfig,
    mode: SyncRunMode,
) -> Result<(), AppError> {
    run_sync_worker(app_handle, &database_path, remote_config, mode).await
}

async fn sync_database_v2(
    app_handle: &tauri::AppHandle,
    database_path: String,
    remote_config: &crate::sync::types::SyncRemoteConfig,
    mode: SyncRunMode,
) -> Result<(), AppError> {
    run_sync_worker_with_label(app_handle, &database_path, remote_config, v2_worker_mode_label(mode))
        .await
}

trait SyncErrorContext {
    fn with_sync_mode(self, mode: SyncRunMode) -> AppError;
}

impl SyncErrorContext for AppError {
    fn with_sync_mode(self, mode: SyncRunMode) -> AppError {
        let prefixed = format!("{}: {}", mode_label(mode), self);
        match self {
            AppError::Validation(_) => AppError::validation(prefixed),
            AppError::NotFound(_) => AppError::not_found(prefixed),
            AppError::Forbidden(_) => AppError::Forbidden(prefixed),
            AppError::Conflict(_) => AppError::conflict(prefixed),
            AppError::Database(_) => AppError::database(prefixed),
            AppError::Initialization(_) => AppError::initialization(prefixed),
            AppError::Internal(_) => AppError::internal(prefixed),
            AppError::CaptureSpaceUnavailable(_) => AppError::CaptureSpaceUnavailable(prefixed),
            AppError::DefaultSpaceUnavailable(_) => AppError::DefaultSpaceUnavailable(prefixed),
            AppError::CapturePersistence(_) => AppError::CapturePersistence(prefixed),
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

async fn refresh_local_replica_state(
    sync_state: &SyncRuntimeState,
    database: &DatabaseRuntimeState,
) -> Result<(), AppError> {
    let snapshot = inspect_local_replica(database, sync_state.remote_config().await.is_some()).await?;
    sync_state
        .set_replica_state(snapshot.state, snapshot.reason, snapshot.last_restore_at)
        .await;
    Ok(())
}

async fn ensure_sync_allowed(sync_state: &SyncRuntimeState) -> Result<(), AppError> {
    match sync_state.replica_state().await {
        SyncReplicaState::Ready => Ok(()),
        SyncReplicaState::RestoreRequired => Err(AppError::validation(
            "当前设备已有本地数据，但还没有 V2 同步基线。为避免误覆盖本地副本，请先走“从云端恢复本地”链路，或等待后续 S1 到 V2 的一次性迁移。",
        )),
        SyncReplicaState::Diverged => Err(AppError::validation(
            "当前设备的本地副本状态异常，已暂停普通同步，请先完成诊断或恢复。",
        )),
        SyncReplicaState::Uninitialized => Err(AppError::validation(
            "当前设备还没有可用的本地同步副本，暂不允许执行云同步。",
        )),
    }
}

fn mode_label(mode: SyncRunMode) -> &'static str {
    match mode {
        SyncRunMode::Push => "push",
        SyncRunMode::Pull => "pull",
        SyncRunMode::Sync => "sync",
        SyncRunMode::Restore => "restore",
    }
}

fn v2_worker_mode_label(mode: SyncRunMode) -> &'static str {
    match mode {
        SyncRunMode::Push => "push_v2",
        SyncRunMode::Pull => "pull_v2",
        SyncRunMode::Sync => "sync",
        SyncRunMode::Restore => "restore",
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

fn sync_execution_enabled() -> bool {
    true
}

async fn run_sync_worker(
    app_handle: &tauri::AppHandle,
    database_path: &str,
    remote_config: &crate::sync::types::SyncRemoteConfig,
    mode: SyncRunMode,
) -> Result<(), AppError> {
    run_sync_worker_with_label(app_handle, database_path, remote_config, mode_label(mode)).await
}

async fn run_sync_worker_with_label(
    app_handle: &tauri::AppHandle,
    database_path: &str,
    remote_config: &crate::sync::types::SyncRemoteConfig,
    worker_mode: &str,
) -> Result<(), AppError> {
    let mut command =
        build_sync_worker_command(app_handle, database_path, remote_config, worker_mode)?;
    let output = command.output().await.map_err(|error| {
        AppError::internal(format!("启动同步 worker 失败: {error}"))
    })?;

    if output.status.success() {
        return Ok(());
    }

    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_owned();
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_owned();
    let failure = parse_sync_worker_failure(&stderr, &stdout, output.status.code());
    log::warn!(
        "sync:worker failed mode={} kind={} message={}",
        worker_mode,
        failure.kind.as_str(),
        failure.message
    );

    Err(failure.into_app_error())
}

async fn run_sync_worker_json<T: DeserializeOwned>(
    app_handle: &tauri::AppHandle,
    database_path: String,
    remote_config: &crate::sync::types::SyncRemoteConfig,
    mode_label: &str,
) -> Result<T, AppError> {
    let mut command =
        build_sync_worker_command(app_handle, &database_path, remote_config, mode_label)?;
    let output = command.output().await.map_err(|error| {
        AppError::internal(format!("启动同步 worker 失败: {error}"))
    })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_owned();
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_owned();
        let failure = parse_sync_worker_failure(&stderr, &stdout, output.status.code());
        log::warn!(
            "sync:worker failed mode={} kind={} message={}",
            mode_label,
            failure.kind.as_str(),
            failure.message
        );
        return Err(failure.into_app_error());
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_owned();
    if stdout.is_empty() {
        return Err(AppError::internal(format!(
            "同步 worker 未返回 {mode_label} 结果"
        )));
    }

    serde_json::from_str::<T>(&stdout).map_err(|error| {
        AppError::internal(format!("解析同步 worker {mode_label} 结果失败: {error}"))
    })
}

fn build_sync_worker_command(
    app_handle: &tauri::AppHandle,
    database_path: &str,
    remote_config: &crate::sync::types::SyncRemoteConfig,
    worker_mode: &str,
) -> Result<Command, AppError> {
    let worker_args = [
        "--database-path",
        database_path,
        "--remote-url",
        remote_config.url.as_str(),
        "--remote-token",
        remote_config.token.as_str(),
        "--mode",
        worker_mode,
    ];

    if let Some(worker_binary) = find_bundled_sync_worker(app_handle)? {
        let mut command = Command::new(worker_binary);
        command.args(worker_args);
        return Ok(command);
    }

    if let Some((manifest_path, workdir)) = find_workspace_manifest_for_dev() {
        let mut command = Command::new("cargo");
        command
            .arg("run")
            .arg("--manifest-path")
            .arg(manifest_path)
            .arg("-p")
            .arg("stoneflow-sync-worker")
            .arg("--quiet")
            .arg("--")
            .args(worker_args)
            .current_dir(workdir);
        return Ok(command);
    }

    Err(AppError::initialization(
        "未找到同步 worker 可执行文件；当前构建无法执行 Turso 同步。",
    ))
}

fn find_bundled_sync_worker(app_handle: &tauri::AppHandle) -> Result<Option<PathBuf>, AppError> {
    let current_exe = std::env::current_exe()
        .map_err(|error| AppError::initialization(format!("读取当前可执行文件路径失败: {error}")))?;
    let Some(base_dir) = current_exe.parent() else {
        return Ok(None);
    };

    let worker_file_name = if cfg!(target_os = "windows") {
        "stoneflow-sync-worker.exe"
    } else {
        "stoneflow-sync-worker"
    };

    // sidecar 在不同打包器下的落点略有差异，按最接近运行时产物的位置依次查找。
    let direct_path = base_dir.join(worker_file_name);
    if direct_path.is_file() {
        return Ok(Some(direct_path));
    }

    let sidecar_path = base_dir.join("binaries").join(worker_file_name);
    if sidecar_path.is_file() {
        return Ok(Some(sidecar_path));
    }

    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        let resource_path = resource_dir.join(worker_file_name);
        if resource_path.is_file() {
            return Ok(Some(resource_path));
        }

        let resource_sidecar_path = resource_dir.join("binaries").join(worker_file_name);
        if resource_sidecar_path.is_file() {
            return Ok(Some(resource_sidecar_path));
        }
    }

    Ok(None)
}

fn find_workspace_manifest_for_dev() -> Option<(PathBuf, PathBuf)> {
    let runtime_manifest_dir = Path::new(env!("CARGO_MANIFEST_DIR"));
    let workspace_root = runtime_manifest_dir.parent()?.parent()?;
    let manifest_path = workspace_root.join("Cargo.toml");
    if !manifest_path.is_file() {
        return None;
    }

    Some((manifest_path, workspace_root.to_path_buf()))
}

fn parse_sync_worker_failure(
    stderr: &str,
    stdout: &str,
    exit_code: Option<i32>,
) -> SyncWorkerFailure {
    for raw in [stderr, stdout] {
        if raw.is_empty() {
            continue;
        }

        if let Ok(failure) = serde_json::from_str::<SyncWorkerFailure>(raw) {
            return failure;
        }
    }

    let message = if !stderr.is_empty() {
        stderr.to_owned()
    } else if !stdout.is_empty() {
        stdout.to_owned()
    } else {
        format!(
            "同步 worker 异常退出，exit_code={}",
            exit_code
                .map(|code| code.to_string())
                .unwrap_or_else(|| "unknown".to_owned())
        )
    };

    SyncWorkerFailure {
        kind: SyncWorkerErrorKind::Internal,
        message,
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "snake_case")]
enum SyncWorkerErrorKind {
    Validation,
    Authentication,
    LocalDatabase,
    RemoteDatabase,
    Serialization,
    Protocol,
    Internal,
}

impl SyncWorkerErrorKind {
    fn as_str(self) -> &'static str {
        match self {
            Self::Validation => "validation",
            Self::Authentication => "authentication",
            Self::LocalDatabase => "local_database",
            Self::RemoteDatabase => "remote_database",
            Self::Serialization => "serialization",
            Self::Protocol => "protocol",
            Self::Internal => "internal",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
struct SyncWorkerFailure {
    kind: SyncWorkerErrorKind,
    message: String,
}

impl SyncWorkerFailure {
    fn into_app_error(self) -> AppError {
        match self.kind {
            SyncWorkerErrorKind::Validation | SyncWorkerErrorKind::Authentication => {
                AppError::validation(self.message)
            }
            SyncWorkerErrorKind::LocalDatabase | SyncWorkerErrorKind::RemoteDatabase => {
                AppError::database(self.message)
            }
            SyncWorkerErrorKind::Serialization
            | SyncWorkerErrorKind::Protocol
            | SyncWorkerErrorKind::Internal => AppError::internal(self.message),
        }
    }
}

#[cfg(test)]
mod tests {
    use stoneflow_test_support::TestDatabase;

    use super::{
        configure_sync, get_sync_status, initialize_state, parse_sync_worker_failure,
        v2_worker_mode_label,
    };
    use crate::sync::{
        state::SyncRuntimeState,
        types::{ConfigureSyncInput, SyncReplicaState, SyncStatusKind},
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
        assert_eq!(payload.status, SyncStatusKind::Synced);
        assert_eq!(payload.remote_url.as_deref(), Some("libsql://example.turso.io"));
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

        let payload = get_sync_status(&sync_state, &database)
            .await
            .expect("sync status should load");

        assert!(!payload.enabled);
        assert!(!payload.has_remote_config);
        assert_eq!(payload.status, SyncStatusKind::Disabled);
        assert_eq!(payload.last_error_mode, None);
        assert_eq!(payload.replica_state, SyncReplicaState::Uninitialized);
    }

    #[test]
    fn parse_sync_worker_failure_should_read_wire_json() {
        let failure = parse_sync_worker_failure(
            r#"{"kind":"authentication","message":"token invalid"}"#,
            "",
            Some(1),
        );

        assert_eq!(failure.kind, super::SyncWorkerErrorKind::Authentication);
        assert_eq!(failure.message, "token invalid");
    }

    #[test]
    fn v2_worker_mode_label_should_map_push_and_pull_only() {
        assert_eq!(v2_worker_mode_label(super::SyncRunMode::Pull), "pull_v2");
        assert_eq!(v2_worker_mode_label(super::SyncRunMode::Push), "push_v2");
    }
}

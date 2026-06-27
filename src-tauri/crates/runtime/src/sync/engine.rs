//! 云同步调度与执行入口。

use tauri::Manager;
use tokio::sync::OwnedMutexGuard;

use crate::app::error::AppError;

use super::{
    config::{load_remote_config, save_remote_config},
    state::{SyncRunMode, SyncRuntimeState},
    types::{ConfigureSyncInput, SyncStatusPayload},
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

    if !sync_execution_enabled() {
        log::info!("sync:dirty remote execution disabled during S1");
        return;
    }

    schedule_background_sync(app_handle, SyncRunMode::Push).await;
}

/// 启动后自动触发一轮 pull-like 同步。
pub fn trigger_startup_pull(app_handle: &tauri::AppHandle) {
    if !sync_execution_enabled() {
        log::info!("sync:trigger startup pull skipped because remote execution disabled");
        return;
    }

    let app_handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        log::info!("sync:trigger startup pull requested");
        schedule_background_sync(&app_handle, SyncRunMode::Pull).await;
    });
}

/// 应用恢复前台后自动触发一轮 pull-like 同步。
pub fn trigger_resume_pull(app_handle: &tauri::AppHandle) {
    if !sync_execution_enabled() {
        log::info!("sync:trigger resume pull skipped because remote execution disabled");
        return;
    }

    let app_handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        log::info!("sync:trigger resume pull requested");
        schedule_background_sync(&app_handle, SyncRunMode::Pull).await;
    });
}

/// 手动同步固定语义为 push -> pull，并等待本轮完成。
pub async fn force_sync(app_handle: &tauri::AppHandle) -> Result<SyncStatusPayload, AppError> {
    if !sync_execution_enabled() {
        return Err(sync_execution_disabled_error());
    }

    let sync_state = sync_state_from_app(app_handle)?;
    ensure_remote_config(&sync_state).await?;

    log::info!("sync:trigger force sync requested");
    let guard = sync_state.lock_execution().await;
    run_sync_loop(app_handle, guard, SyncRunMode::Force).await?;

    Ok(sync_state.snapshot().await)
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
    _database_path: String,
    _remote_config: &crate::sync::types::SyncRemoteConfig,
    _mode: SyncRunMode,
) -> Result<(), AppError> {
    Err(sync_execution_disabled_error())
}

trait SyncErrorContext {
    fn with_sync_mode(self, mode: SyncRunMode) -> AppError;
}

impl SyncErrorContext for AppError {
    fn with_sync_mode(self, mode: SyncRunMode) -> AppError {
        AppError::internal(format!("{}: {}", mode_label(mode), self))
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
    let is_sync_worker = std::env::args().any(|arg| arg == "--stoneflow-sync-worker");
    if !is_sync_worker {
        return None;
    }

    Some(1)
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

fn sync_execution_enabled() -> bool {
    false
}

fn sync_execution_disabled_error() -> AppError {
    AppError::validation(
        "Turso 远端同步正在进行 S1 重构，当前构建暂时禁用实际远端执行；本地 SQLite 仍可正常使用。",
    )
}

#[cfg(test)]
mod tests {
    use stoneflow_test_support::TestDatabase;

    use super::{configure_sync, force_sync, get_sync_status, initialize_state};
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

    #[tokio::test]
    async fn force_sync_should_return_validation_error_while_execution_disabled() {
        let app = tauri::test::mock_app();
        let error = force_sync(app.handle())
            .await
            .expect_err("force sync should be disabled during S1");

        assert!(
            error
                .to_string()
                .contains("当前构建暂时禁用实际远端执行"),
            "unexpected error: {error}"
        );
    }
}

//! 云同步调度与执行入口。

use serde::Serialize;
use tauri::{Emitter, Manager};
use tokio::sync::OwnedMutexGuard;

use crate::app::error::AppError;

use super::{
    config::{load_remote_config, load_sync_policy, save_remote_config, save_sync_policy},
    local::{inspect_local_replica, read_local_diagnostics},
    state::{SyncRunMode, SyncRuntimeState},
    types::{
        ConfigureSyncInput, SyncDiagnosticsCountsPayload, SyncDiagnosticsPayload,
        SyncRemoteDiagnosticsPayload, SyncReplicaState, SyncStatusPayload, UpdateSyncPolicyInput,
    },
};
use stoneflow_storage::{database::DatabaseRuntimeState, repositories::SyncRepository};
use stoneflow_sync::{SyncCloudConfig, SyncError, SyncErrorKind};

const WORKSPACE_CHANGED_EVENT: &str = "stoneflow://workspace/changed";
const SYNC_STATUS_CHANGED_EVENT: &str = "stoneflow://sync/status-changed";
const SERVER_SEQ_CURSOR_SCOPE: &str = "sync:last_pulled_server_seq";
const SYNC_WORKSPACE_DOMAINS: &[&str] = &["tasks", "projects", "spaces", "lifecycle", "views"];

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceChangedPayload {
    source: &'static str,
    reason: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    changed_domains: Option<Vec<&'static str>>,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
struct SyncStatusChangedPayload {
    source: &'static str,
    reason: &'static str,
}

/// 启动时从 settings 表加载同步配置。
pub async fn initialize_state(
    sync_state: &SyncRuntimeState,
    database: &DatabaseRuntimeState,
) -> Result<(), AppError> {
    let config = load_remote_config(database).await?;
    if let Some(remote) = config.as_ref() {
        log::info!(
            "同步:已加载配置 {}",
            super::config::redact_database_url(&remote.database_url)
        );
    }
    sync_state.set_remote_config(config).await;
    let (policy, next_sync_at) = load_sync_policy(database).await?;
    sync_state.set_policy(policy, next_sync_at).await;
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

/// 保存同步策略并刷新运行态缓存。
pub async fn update_sync_policy(
    database: &DatabaseRuntimeState,
    sync_state: &SyncRuntimeState,
    input: UpdateSyncPolicyInput,
) -> Result<SyncStatusPayload, AppError> {
    let policy = save_sync_policy(database, input.into(), None).await?;
    sync_state.set_policy(policy, None).await;
    Ok(sync_state.snapshot().await)
}

/// 读取当前设备与云端副本的只读诊断摘要。
pub async fn get_sync_diagnostics(
    app_handle: &tauri::AppHandle,
) -> Result<SyncDiagnosticsPayload, AppError> {
    let sync_state = sync_state_from_app(app_handle)?;
    let database = database_state_from_app(app_handle)?;
    refresh_local_replica_state(&sync_state, &database).await?;
    let remote_config = sync_state
        .remote_config()
        .await
        .ok_or_else(|| AppError::validation("云同步尚未配置远端，请先保存同步数据库连接"))?;

    let redacted = super::config::redact_database_url(&remote_config.database_url);

    let local = read_local_diagnostics(&database).await?;
    let remote = stoneflow_sync::diagnose_cloud(&to_cloud_config(&remote_config))
        .await
        .map_err(map_sync_error)?;

    Ok(SyncDiagnosticsPayload {
        remote_host: Some(redacted),
        local,
        remote: SyncRemoteDiagnosticsPayload {
            latest_server_seq: remote.latest_server_seq,
            counts: SyncDiagnosticsCountsPayload {
                spaces: remote.counts.spaces,
                projects: remote.counts.projects,
                tasks: remote.counts.tasks,
                task_links: remote.counts.task_links,
                views: remote.counts.views,
                settings: remote.counts.settings,
                total_items: remote.counts.total_items,
            },
        },
    })
}

/// 保存远端配置并刷新运行态缓存。
///
/// 只写本机配置，不在这里连库；调用方应随后触发一轮后台同步做验证与灌库。
/// 保存后状态为「待同步」，避免「未连上就显示已同步」。
pub async fn configure_sync(
    database: &DatabaseRuntimeState,
    sync_state: &SyncRuntimeState,
    input: ConfigureSyncInput,
) -> Result<SyncStatusPayload, AppError> {
    let config = save_remote_config(database, input.database_url).await?;
    log::info!(
        "同步:配置已保存 {}",
        super::config::redact_database_url(&config.database_url)
    );
    sync_state.set_remote_config(Some(config)).await;
    // 新配置尚未对当前云端验证：标 dirty，UI 显示待同步而非已同步。
    sync_state.mark_dirty().await;
    refresh_local_replica_state(sync_state, database).await?;
    Ok(sync_state.snapshot().await)
}

/// 本地写入成功后的统一入口：只标记 dirty，自动同步交给后续调度入口决定。
pub async fn note_local_write(app_handle: &tauri::AppHandle) {
    let Some(app_state) = app_handle.try_state::<crate::app::state::AppState>() else {
        return;
    };

    app_state.sync.mark_dirty().await;
    emit_sync_status_changed(app_handle, "dirty");
}

/// 进程退出前的有界同步收尾：优先 push 本地 outbox，总预算 3 秒，不阻塞 UI 线程无界等待。
///
/// - 未配置远端 / 未启用：立即返回
/// - 已有同步在跑：不抢锁、不排队，仅记录并返回
/// - 超时：放弃本轮，允许进程继续退出
pub async fn flush_before_exit(app_handle: &tauri::AppHandle) {
    const EXIT_FLUSH_BUDGET: std::time::Duration = std::time::Duration::from_secs(3);

    match tokio::time::timeout(EXIT_FLUSH_BUDGET, attempt_exit_flush(app_handle)).await {
        Ok(Ok(())) => {}
        Ok(Err(error)) => log::warn!("同步:退出冲刷失败 {error}"),
        Err(_) => log::warn!("同步:退出冲刷超时 {}s", EXIT_FLUSH_BUDGET.as_secs()),
    }
}

async fn attempt_exit_flush(app_handle: &tauri::AppHandle) -> Result<(), AppError> {
    if !sync_execution_enabled() {
        return Ok(());
    }

    let Ok(sync_state) = sync_state_from_app(app_handle) else {
        return Ok(());
    };

    if ensure_remote_config(&sync_state).await.is_err() {
        return Ok(());
    }

    let Ok(database) = database_state_from_app(app_handle) else {
        return Ok(());
    };

    if ensure_sync_allowed(&sync_state, &database).await.is_err() {
        return Ok(());
    }

    let Some(guard) = sync_state.try_lock_execution() else {
        return Ok(());
    };

    // 退出时优先推送本地变更，避免在 pull 上耗尽预算。
    run_sync_loop(app_handle, guard, SyncRunMode::Push).await
}

/// 启动后在后台执行一轮 push 后 pull。
pub fn trigger_startup_sync(app_handle: &tauri::AppHandle) {
    if !sync_execution_enabled() {
        return;
    }

    let app_handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        schedule_background_sync(&app_handle, SyncRunMode::Sync).await;
    });
}

/// 应用恢复前台后在后台执行一轮 push 后 pull。
pub fn trigger_resume_sync(app_handle: &tauri::AppHandle) {
    if !sync_execution_enabled() {
        return;
    }

    let app_handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        schedule_background_sync(&app_handle, SyncRunMode::Sync).await;
    });
}

/// 手动执行一轮 push 后 pull，并等待本轮完成。
pub async fn run_sync(app_handle: &tauri::AppHandle) -> Result<SyncStatusPayload, AppError> {
    let sync_state = sync_state_from_app(app_handle)?;
    let database = database_state_from_app(app_handle)?;
    refresh_local_replica_state(&sync_state, &database).await?;
    ensure_remote_config(&sync_state).await?;
    ensure_sync_allowed(&sync_state, &database).await?;

    let guard = sync_state.lock_execution().await;
    run_sync_loop(app_handle, guard, SyncRunMode::Sync).await?;
    refresh_local_replica_state(&sync_state, &database).await?;

    Ok(sync_state.snapshot().await)
}

pub(super) async fn schedule_background_sync(app_handle: &tauri::AppHandle, mode: SyncRunMode) {
    if !sync_execution_enabled() {
        return;
    }

    let Ok(sync_state) = sync_state_from_app(app_handle) else {
        return;
    };

    if ensure_remote_config(&sync_state).await.is_err() {
        return;
    }

    let Ok(database) = database_state_from_app(app_handle) else {
        return;
    };

    if let Err(error) = refresh_local_replica_state(&sync_state, &database).await {
        log::warn!("同步:刷新状态失败 {error}");
        return;
    }

    if ensure_sync_allowed(&sync_state, &database).await.is_err() {
        return;
    }

    let Some(guard) = sync_state.try_lock_execution() else {
        sync_state.queue_pending(mode).await;
        return;
    };

    let app_handle = app_handle.clone();
    tauri::async_runtime::spawn(async move {
        if let Err(error) = run_sync_loop(&app_handle, guard, mode).await {
            log::warn!("同步:后台失败 {error}");
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
    let mut changed_domains = Vec::new();

    loop {
        let outcome = run_sync_round(app_handle, &sync_state, next_mode).await?;
        append_unique_domains(&mut changed_domains, outcome.changed_domains);

        let Some(pending_mode) = sync_state.take_pending_mode().await else {
            emit_workspace_changed(app_handle, next_mode, Some(changed_domains))?;
            break;
        };
        next_mode = pending_mode;
    }

    Ok(())
}

fn workspace_changed_payload(
    mode: SyncRunMode,
    changed_domains: Option<Vec<&'static str>>,
) -> WorkspaceChangedPayload {
    WorkspaceChangedPayload {
        source: "sync",
        // 事件 reason 保持稳定英文，便于前端/测试契约；日志用 mode_label 中文。
        reason: mode_reason(mode),
        changed_domains,
    }
}

fn sync_status_changed_payload(reason: &'static str) -> SyncStatusChangedPayload {
    SyncStatusChangedPayload {
        source: "sync",
        reason,
    }
}

async fn read_pending_changed_domains(
    database: &DatabaseRuntimeState,
) -> Result<Vec<&'static str>, AppError> {
    use sea_orm::{ConnectionTrait, DbBackend, Statement};

    let rows = database
        .connection()
        .query_all_raw(Statement::from_string(
            DbBackend::Sqlite,
            "SELECT DISTINCT entity_type FROM outbox",
        ))
        .await
        .map_err(|error| AppError::database(format!("读取 outbox 实体类型失败: {error}")))?;

    let mut domains = Vec::new();
    for row in rows {
        let entity_type: String = row.try_get("", "entity_type").unwrap_or_default();
        if let Some(domain) = domain_for_entity_type(&entity_type) {
            push_unique_domain(&mut domains, domain);
        }
        if matches!(entity_type.as_str(), "space" | "project" | "task") {
            push_unique_domain(&mut domains, "lifecycle");
        }
    }
    Ok(domains)
}

fn resolve_round_changed_domains(
    before_server_seq: Option<i64>,
    after_server_seq: Option<i64>,
    mut pending_domains: Vec<&'static str>,
) -> Vec<&'static str> {
    if after_server_seq.unwrap_or(0) > before_server_seq.unwrap_or(0) {
        append_unique_domains(&mut pending_domains, SYNC_WORKSPACE_DOMAINS.to_vec());
    }
    pending_domains
}

fn domain_for_entity_type(entity_type: &str) -> Option<&'static str> {
    match entity_type {
        "task" | "task_link" => Some("tasks"),
        "project" => Some("projects"),
        "space" => Some("spaces"),
        "view" => Some("views"),
        _ => None,
    }
}

fn append_unique_domains(target: &mut Vec<&'static str>, domains: Vec<&'static str>) {
    for domain in domains {
        push_unique_domain(target, domain);
    }
}

fn push_unique_domain(target: &mut Vec<&'static str>, domain: &'static str) {
    if !target.contains(&domain) {
        target.push(domain);
    }
}

async fn read_local_server_seq_cursor(
    database: &DatabaseRuntimeState,
) -> Result<Option<i64>, AppError> {
    let repository = SyncRepository::new(database.connection().clone());
    let Some(record) = repository.get_cursor(SERVER_SEQ_CURSOR_SCOPE).await? else {
        return Ok(None);
    };
    let Some(cursor) = record.cursor else {
        return Ok(None);
    };
    let trimmed = cursor.trim();
    if trimmed.is_empty() {
        return Ok(None);
    }

    trimmed
        .parse::<i64>()
        .map(Some)
        .map_err(|error| AppError::database(format!("解析本地 server_seq cursor 失败: {error}")))
}

fn emit_workspace_changed(
    app_handle: &tauri::AppHandle,
    mode: SyncRunMode,
    changed_domains: Option<Vec<&'static str>>,
) -> Result<(), AppError> {
    app_handle
        .emit(
            WORKSPACE_CHANGED_EVENT,
            workspace_changed_payload(mode, changed_domains),
        )
        .map_err(|error| AppError::internal(error.to_string()))
}

fn emit_sync_status_changed(app_handle: &tauri::AppHandle, reason: &'static str) {
    let _ = app_handle.emit(
        SYNC_STATUS_CHANGED_EVENT,
        sync_status_changed_payload(reason),
    );
}

async fn run_sync_round(
    app_handle: &tauri::AppHandle,
    sync_state: &SyncRuntimeState,
    mode: SyncRunMode,
) -> Result<SyncRoundOutcome, AppError> {
    let database = database_state_from_app(app_handle)?;
    let remote_config = sync_state
        .remote_config()
        .await
        .ok_or_else(|| AppError::validation("云同步尚未配置远端，请先保存同步数据库连接"))?;

    let before_server_seq = read_local_server_seq_cursor(&database).await?;
    let pending_domains = read_pending_changed_domains(&database).await?;
    sync_state.start_run(mode).await;
    emit_sync_status_changed(app_handle, "started");

    let database_path = database.database_path().display().to_string();
    let started_at = std::time::Instant::now();
    let result = match mode {
        SyncRunMode::Push | SyncRunMode::Pull | SyncRunMode::Sync => {
            sync_database(app_handle, database_path, &remote_config, mode)
                .await
                .map_err(|error| SyncRoundFailure {
                    failed_mode: mode,
                    error,
                })
        }
    };

    match result {
        Ok(()) => {
            let after_server_seq = read_local_server_seq_cursor(&database).await?;
            let changed_domains =
                resolve_round_changed_domains(before_server_seq, after_server_seq, pending_domains);
            sync_state.complete_run(mode).await;
            emit_sync_status_changed(app_handle, "completed");
            log::info!(
                "同步:完成 {} 序号 {:?}→{:?} 耗时ms={}",
                mode_label(mode),
                before_server_seq,
                after_server_seq,
                started_at.elapsed().as_millis()
            );
            Ok(SyncRoundOutcome { changed_domains })
        }
        Err(failure) => {
            let message = failure.error.to_string();
            let needs_attention = matches!(
                &failure.error,
                AppError::Validation(_) | AppError::Internal(_) | AppError::Initialization(_)
            );
            sync_state
                .fail_run(failure.failed_mode, message.clone(), needs_attention)
                .await;
            emit_sync_status_changed(app_handle, "failed");
            log::warn!("同步:失败 {} {message}", mode_label(mode));
            Err(failure.error)
        }
    }
}

struct SyncRoundOutcome {
    changed_domains: Vec<&'static str>,
}

struct SyncRoundFailure {
    failed_mode: SyncRunMode,
    error: AppError,
}

async fn sync_database(
    app_handle: &tauri::AppHandle,
    database_path: String,
    remote_config: &crate::sync::types::SyncRemoteConfig,
    mode: SyncRunMode,
) -> Result<(), AppError> {
    run_sync_worker(app_handle, &database_path, remote_config, mode).await
}

fn sync_state_from_app(app_handle: &tauri::AppHandle) -> Result<SyncRuntimeState, AppError> {
    app_handle
        .try_state::<crate::app::state::AppState>()
        .map(|state| state.sync.clone())
        .ok_or_else(|| AppError::initialization("AppState 未注册"))
}

fn database_state_from_app(
    app_handle: &tauri::AppHandle,
) -> Result<DatabaseRuntimeState, AppError> {
    app_handle
        .try_state::<crate::app::state::AppState>()
        .map(|state| state.database.clone())
        .ok_or_else(|| AppError::initialization("AppState 未注册"))
}

async fn ensure_remote_config(sync_state: &SyncRuntimeState) -> Result<(), AppError> {
    if sync_state.remote_config().await.is_some() {
        return Ok(());
    }

    Err(AppError::validation(
        "云同步尚未配置远端，请先保存同步数据库连接",
    ))
}

async fn refresh_local_replica_state(
    sync_state: &SyncRuntimeState,
    database: &DatabaseRuntimeState,
) -> Result<(), AppError> {
    let snapshot =
        inspect_local_replica(database, sync_state.remote_config().await.is_some()).await?;
    sync_state
        .set_replica_state(snapshot.state, snapshot.reason, snapshot.last_restore_at)
        .await;
    Ok(())
}

async fn ensure_sync_allowed(
    sync_state: &SyncRuntimeState,
    database: &DatabaseRuntimeState,
) -> Result<(), AppError> {
    match sync_state.replica_state().await {
        SyncReplicaState::Ready | SyncReplicaState::BaselineRequired => {
            // BaselineRequired：本机有数据但还没有 server_seq。
            // 允许同步：先 origin seed + push，再 pull 时对空云端 adopt cursor（不 wipe 本机）。
            let _ = database;
            Ok(())
        }
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
        SyncRunMode::Push => "仅上传",
        SyncRunMode::Pull => "仅下载",
        SyncRunMode::Sync => "完整同步",
    }
}

fn mode_reason(mode: SyncRunMode) -> &'static str {
    match mode {
        SyncRunMode::Push => "push",
        SyncRunMode::Pull => "pull",
        SyncRunMode::Sync => "sync",
    }
}

fn sync_execution_enabled() -> bool {
    true
}

fn to_cloud_config(remote: &crate::sync::types::SyncRemoteConfig) -> SyncCloudConfig {
    SyncCloudConfig {
        database_url: remote.database_url.clone(),
    }
}

pub(super) fn map_sync_error(error: SyncError) -> AppError {
    let message = error.message().to_owned();
    match error.kind() {
        SyncErrorKind::Validation | SyncErrorKind::Authentication => AppError::validation(message),
        SyncErrorKind::LocalDatabase | SyncErrorKind::RemoteDatabase => AppError::database(message),
        SyncErrorKind::Schema => AppError::validation(message),
        SyncErrorKind::Serialization | SyncErrorKind::Protocol | SyncErrorKind::Internal => {
            AppError::internal(message)
        }
    }
}

async fn run_sync_worker(
    app_handle: &tauri::AppHandle,
    _database_path: &str,
    remote_config: &crate::sync::types::SyncRemoteConfig,
    mode: SyncRunMode,
) -> Result<(), AppError> {
    let database = database_state_from_app(app_handle)?;
    let plan = resolve_bootstrap_plan(&database, remote_config).await?;
    if !matches!(plan, super::bootstrap_plan::BootstrapPlan::Incremental) {
        log::info!("同步:引导 {}", plan.label());
    }
    if matches!(plan, super::bootstrap_plan::BootstrapPlan::BothPreferLocal) {
        log::warn!("同步:两边都有数据且无序号，默认本机优先");
    }

    match mode {
        SyncRunMode::Push => {
            if plan.needs_origin_seed() {
                super::origin_seed::seed_origin_outbox_if_needed(&database).await?;
            }
            super::outbox_push::push_pending_outbox(&database, remote_config)
                .await
                .map(|_| ())
        }
        SyncRunMode::Pull => super::cursor_pull::pull_remote_changes(&database, remote_config)
            .await
            .map(|_| ()),
        SyncRunMode::Sync => {
            if plan.needs_origin_seed() {
                super::origin_seed::seed_origin_outbox_if_needed(&database).await?;
            }
            super::outbox_push::push_pending_outbox(&database, remote_config).await?;
            super::cursor_pull::pull_remote_changes(&database, remote_config)
                .await
                .map(|_| ())
        }
    }
}

/// 分类当前同步引导计划。
///
/// - 有 cursor：用轻量 `health` 探针（避免每轮 download_full）
/// - 无 cursor / 需重绑：再 download_full 做完整分类
async fn resolve_bootstrap_plan(
    database: &DatabaseRuntimeState,
    remote_config: &crate::sync::types::SyncRemoteConfig,
) -> Result<super::bootstrap_plan::BootstrapPlan, AppError> {
    use super::bootstrap_plan::{classify, LocalContent, LocalCursor, RemoteContent};

    let local_cursor_value = read_local_server_seq_cursor(database).await?;
    let local = if super::cursor_pull::local_has_user_content_for_plan(database).await? {
        LocalContent::HasData
    } else {
        LocalContent::Empty
    };
    let cloud = to_cloud_config(remote_config);

    // 日常增量：只查云端头序号，不拉全量投影。
    if let Some(local_seq) = local_cursor_value {
        let probe = stoneflow_sync::health(&cloud)
            .await
            .map_err(map_sync_error)?;
        let remote_max = probe.latest_server_seq.unwrap_or(0);

        if matches!(local, LocalContent::HasData) && remote_max == 0 {
            log::warn!(
                "同步:检测到云端序号为空但本机有数据且已有序号={local_seq}，将重新灌库上传"
            );
            super::origin_seed::reset_origin_binding_for_reseed(database).await?;
            return Ok(classify(
                LocalContent::HasData,
                RemoteContent::Empty,
                LocalCursor::Missing,
            ));
        }

        if remote_max > 0 && local_seq > remote_max {
            log::warn!(
                "同步:本机序号 {local_seq} 超前于云端头 {remote_max}，清除序号后重新分类"
            );
            super::origin_seed::reset_origin_binding_for_reseed(database).await?;
            // 清序号后按「无 cursor」路径用全量探针分类。
            let baseline = stoneflow_sync::download_full(&cloud)
                .await
                .map_err(map_sync_error)?;
            let remote = if baseline.entities.is_empty() && baseline.tombstones.is_empty() {
                RemoteContent::Empty
            } else {
                RemoteContent::HasData
            };
            return Ok(classify(local, remote, LocalCursor::Missing));
        }

        let remote = if remote_max > 0 {
            RemoteContent::HasData
        } else {
            RemoteContent::Empty
        };
        return Ok(classify(local, remote, LocalCursor::Present));
    }

    let baseline = stoneflow_sync::download_full(&cloud)
        .await
        .map_err(map_sync_error)?;
    let remote = if baseline.entities.is_empty() && baseline.tombstones.is_empty() {
        RemoteContent::Empty
    } else {
        RemoteContent::HasData
    };
    Ok(classify(local, remote, LocalCursor::Missing))
}

#[cfg(test)]
mod tests {
    use stoneflow_test_support::TestDatabase;

    use super::{
        configure_sync, get_sync_status, initialize_state, sync_status_changed_payload,
        workspace_changed_payload,
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
                database_url: "postgresql://user:secret@db.example.com:5432/stoneflow".to_owned(),
            },
        )
        .await
        .expect("configure sync should succeed");

        assert!(payload.enabled);
        assert!(payload.has_remote_config);
        // 保存配置后尚未验证连通：应为待同步，而不是立刻「已同步」。
        assert_eq!(payload.status, SyncStatusKind::OfflinePending);
        assert_eq!(
            payload.remote_url.as_deref(),
            Some("postgresql://user:***@db.example.com:5432/stoneflow")
        );
    }

    #[tokio::test]
    async fn get_sync_status_should_default_to_disabled_without_remote_config() {
        // 不调用 initialize_state：避免读到本机钥匙串里其它测试写入的连接串。
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        let sync_state = SyncRuntimeState::default();

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
    fn workspace_changed_payload_should_describe_sync_source() {
        let payload = workspace_changed_payload(super::SyncRunMode::Pull, Some(vec!["tasks"]));

        assert_eq!(payload.source, "sync");
        assert_eq!(payload.reason, "pull");
        assert_eq!(payload.changed_domains, Some(vec!["tasks"]));
    }

    #[test]
    fn sync_status_changed_payload_should_describe_sync_source() {
        let payload = sync_status_changed_payload("dirty");

        assert_eq!(payload.source, "sync");
        assert_eq!(payload.reason, "dirty");
    }

    #[test]
    fn resolve_round_changed_domains_should_skip_when_nothing_changed() {
        let domains = super::resolve_round_changed_domains(Some(12), Some(12), vec![]);

        assert!(domains.is_empty());
    }

    #[test]
    fn resolve_round_changed_domains_should_include_sync_domains_when_server_seq_advances() {
        let domains = super::resolve_round_changed_domains(Some(12), Some(18), vec!["tasks"]);

        assert_eq!(
            domains,
            vec!["tasks", "projects", "spaces", "lifecycle", "views"]
        );
    }

    #[test]
    fn domain_for_entity_type_should_map_sync_entities_to_workspace_domains() {
        assert_eq!(super::domain_for_entity_type("task_link"), Some("tasks"));
        assert_eq!(super::domain_for_entity_type("project"), Some("projects"));
        assert_eq!(super::domain_for_entity_type("setting"), None);
    }
}

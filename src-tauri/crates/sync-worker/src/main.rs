use std::thread;

mod apply;
mod error;
mod local;
mod pull;
mod push;
mod remote;
mod restore;
mod schema;
mod types;

use error::SyncWorkerError;
use pull::pull_remote_changes;
use push::push_local_changes;
use remote::{bootstrap_remote_schema, open_local_sqlite, open_remote};
use restore::restore_remote_snapshot;
use types::{SyncRemoteConfig, SyncRunMode, WorkerArgs};

fn main() {
    // libsql 在 Windows 上首次访问 Turso 远端时会占用更深调用栈；
    // worker 单独放到更大栈的线程里执行，避免主线程直接 stack overflow。
    let exit_code = match thread::Builder::new()
        .name("sync-worker-main".to_owned())
        .stack_size(8 * 1024 * 1024)
        .spawn(run_entrypoint)
    {
        Ok(handle) => match handle.join() {
            Ok(code) => code,
            Err(_) => {
                eprintln!(
                    "{}",
                    SyncWorkerError::internal("同步 worker 主线程异常退出").to_wire_json()
                );
                1
            }
        },
        Err(error) => {
            eprintln!(
                "{}",
                SyncWorkerError::internal(format!("启动同步 worker 线程失败: {error}"))
                    .to_wire_json()
            );
            1
        }
    };
    std::process::exit(exit_code)
}

fn run_entrypoint() -> i32 {
    let runtime = match tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
    {
        Ok(runtime) => runtime,
        Err(error) => {
            eprintln!(
                "{}",
                SyncWorkerError::internal(format!("初始化同步 worker runtime 失败: {error}"))
                    .to_wire_json()
            );
            return 1;
        }
    };

    match runtime.block_on(run()) {
        Ok(()) => 0,
        Err(error) => {
            eprintln!("{}", error.to_wire_json());
            1
        }
    }
}

async fn run() -> Result<(), SyncWorkerError> {
    let args = parse_args(std::env::args().skip(1))?;
    let local = open_local_sqlite(&args.database_path).await?;
    let remote = open_remote(&args.remote).await?;
    bootstrap_remote_schema(&remote).await?;

    match args.mode {
        SyncRunMode::Push => push_local_changes(&local, &remote).await,
        SyncRunMode::Pull => pull_remote_changes(&local, &remote).await,
        SyncRunMode::Force => {
            pull_remote_changes(&local, &remote).await?;
            push_local_changes(&local, &remote).await?;
            pull_remote_changes(&local, &remote).await
        }
        SyncRunMode::Restore => restore_remote_snapshot(&local, &remote).await,
    }
}

fn parse_args<I>(args: I) -> Result<WorkerArgs, SyncWorkerError>
where
    I: IntoIterator<Item = String>,
{
    let mut database_path = None;
    let mut url = None;
    let mut token = None;
    let mut mode = None;
    let mut iter = args.into_iter();

    while let Some(flag) = iter.next() {
        let value = iter.next().ok_or_else(|| {
            SyncWorkerError::validation(format!("参数 {flag} 缺少取值"))
        })?;
        match flag.as_str() {
            "--database-path" => database_path = Some(value),
            "--remote-url" => url = Some(value),
            "--remote-token" => token = Some(value),
            "--mode" => mode = Some(SyncRunMode::parse(&value)?),
            other => {
                return Err(SyncWorkerError::validation(format!(
                    "不支持的参数: {other}"
                )))
            }
        }
    }

    let database_path = database_path
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
        .ok_or_else(|| SyncWorkerError::validation("缺少 --database-path".to_owned()))?;
    let url = url
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
        .ok_or_else(|| SyncWorkerError::validation("缺少 --remote-url".to_owned()))?;
    let token = token
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
        .ok_or_else(|| SyncWorkerError::validation("缺少 --remote-token".to_owned()))?;
    let mode = mode.ok_or_else(|| SyncWorkerError::validation("缺少 --mode".to_owned()))?;

    Ok(WorkerArgs {
        database_path,
        remote: SyncRemoteConfig { url, token },
        mode,
    })
}

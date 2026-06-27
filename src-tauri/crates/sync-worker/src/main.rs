mod apply;
mod error;
mod pull;
mod push;
mod remote;
mod schema;
mod types;

use error::SyncWorkerError;
use pull::pull_remote_changes;
use push::push_local_changes;
use remote::{bootstrap_remote_schema, open_local_sqlite, open_remote};
use types::{SyncRemoteConfig, SyncRunMode, WorkerArgs};

#[tokio::main]
async fn main() {
    let exit_code = match run().await {
        Ok(()) => 0,
        Err(error) => {
            eprintln!("{error}");
            1
        }
    };
    std::process::exit(exit_code);
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
            push_local_changes(&local, &remote).await?;
            pull_remote_changes(&local, &remote).await
        }
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

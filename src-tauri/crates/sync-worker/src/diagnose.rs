//! 只读同步诊断：采集本地与远端的 cursor 和业务表摘要。

use libsql::{params, Connection};
use serde::Serialize;

use crate::{
    error::SyncWorkerError,
    schema::{DEVICE_ID_SCOPE, LAST_RESTORE_AT_SCOPE, REMOTE_CURSOR_SCOPE},
};

const SYNC_CONFIG_SETTING_KEY: &str = "app.sync.config";

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncDiagnosticsOutput {
    pub local: LocalSyncDiagnosticsOutput,
    pub remote: RemoteSyncDiagnosticsOutput,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalSyncDiagnosticsOutput {
    pub device_id: Option<String>,
    pub last_pulled_remote_cursor: Option<i64>,
    pub last_restore_at: Option<String>,
    pub pending_outbox_count: i64,
    pub counts: SyncDiagnosticsCountsOutput,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteSyncDiagnosticsOutput {
    pub latest_remote_cursor: Option<i64>,
    pub counts: SyncDiagnosticsCountsOutput,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncDiagnosticsCountsOutput {
    pub spaces: i64,
    pub projects: i64,
    pub tasks: i64,
    pub task_links: i64,
    pub views: i64,
    pub settings: i64,
    pub total_items: i64,
}

pub async fn collect_sync_diagnostics(
    local: &Connection,
    remote: &Connection,
) -> Result<SyncDiagnosticsOutput, SyncWorkerError> {
    Ok(SyncDiagnosticsOutput {
        local: LocalSyncDiagnosticsOutput {
            device_id: read_text_cursor(local, DEVICE_ID_SCOPE).await?,
            last_pulled_remote_cursor: read_optional_i64_cursor(local, REMOTE_CURSOR_SCOPE).await?,
            last_restore_at: read_text_cursor(local, LAST_RESTORE_AT_SCOPE).await?,
            pending_outbox_count: read_pending_outbox_count(local).await?,
            counts: read_local_counts(local).await?,
        },
        remote: RemoteSyncDiagnosticsOutput {
            latest_remote_cursor: read_latest_remote_cursor(remote).await?,
            counts: read_remote_counts(remote).await?,
        },
    })
}

async fn read_text_cursor(
    connection: &Connection,
    scope: &str,
) -> Result<Option<String>, SyncWorkerError> {
    let mut rows = connection
        .query(
            "SELECT cursor FROM sync_cursor WHERE scope = ?1 LIMIT 1",
            params![scope.to_owned()],
        )
        .await
        .map_err(|error| SyncWorkerError::local_database(format!("读取本地 sync_cursor 失败: {error}")))?;
    let row = rows
        .next()
        .await
        .map_err(|error| SyncWorkerError::local_database(format!("遍历本地 sync_cursor 失败: {error}")))?;

    row.map(|row| {
        row.get::<Option<String>>(0)
            .map_err(|error| SyncWorkerError::local_database(format!("读取本地 sync_cursor.cursor 失败: {error}")))
    })
    .transpose()
    .map(Option::flatten)
}

async fn read_optional_i64_cursor(
    connection: &Connection,
    scope: &str,
) -> Result<Option<i64>, SyncWorkerError> {
    let Some(raw) = read_text_cursor(connection, scope).await? else {
        return Ok(None);
    };

    raw.parse::<i64>()
        .map(Some)
        .map_err(|error| SyncWorkerError::serialization(format!("解析本地 cursor 失败: {error}")))
}

async fn read_pending_outbox_count(connection: &Connection) -> Result<i64, SyncWorkerError> {
    let mut rows = connection
        .query(
            "SELECT COUNT(*) FROM sync_outbox WHERE status = 'pending' LIMIT 1",
            params![],
        )
        .await
        .map_err(|error| SyncWorkerError::local_database(format!("读取本地待同步 outbox 数量失败: {error}")))?;
    let row = rows
        .next()
        .await
        .map_err(|error| SyncWorkerError::local_database(format!("遍历本地待同步 outbox 数量失败: {error}")))?;

    row.map(|row| {
        row.get::<i64>(0).map_err(|error| {
            SyncWorkerError::local_database(format!("读取本地待同步 outbox 数量列失败: {error}"))
        })
    })
    .transpose()
    .map(|value| value.unwrap_or(0))
}

async fn read_local_counts(connection: &Connection) -> Result<SyncDiagnosticsCountsOutput, SyncWorkerError> {
    let mut rows = connection
        .query(
            r#"
            SELECT
                (SELECT COUNT(*) FROM spaces) AS space_count,
                (SELECT COUNT(*) FROM projects) AS project_count,
                (SELECT COUNT(*) FROM tasks) AS task_count,
                (SELECT COUNT(*) FROM task_links) AS task_link_count,
                (SELECT COUNT(*) FROM views) AS view_count,
                (SELECT COUNT(*) FROM settings WHERE key <> ?1) AS setting_count
            "#,
            params![SYNC_CONFIG_SETTING_KEY],
        )
        .await
        .map_err(|error| SyncWorkerError::local_database(format!("读取本地业务表摘要失败: {error}")))?;
    let row = rows
        .next()
        .await
        .map_err(|error| SyncWorkerError::local_database(format!("遍历本地业务表摘要失败: {error}")))?;
    let Some(row) = row else {
        return Err(SyncWorkerError::protocol("读取本地业务表摘要失败: 缺少结果行"));
    };

    build_counts_from_row(row, "本地", |message| SyncWorkerError::local_database(message))
}

async fn read_remote_counts(connection: &Connection) -> Result<SyncDiagnosticsCountsOutput, SyncWorkerError> {
    let mut rows = connection
        .query(
            r#"
            SELECT
                (SELECT COUNT(*) FROM spaces) AS space_count,
                (SELECT COUNT(*) FROM projects) AS project_count,
                (SELECT COUNT(*) FROM tasks) AS task_count,
                (SELECT COUNT(*) FROM task_links) AS task_link_count,
                (SELECT COUNT(*) FROM views) AS view_count,
                (SELECT COUNT(*) FROM settings WHERE key <> ?1) AS setting_count
            "#,
            params![SYNC_CONFIG_SETTING_KEY],
        )
        .await
        .map_err(|error| SyncWorkerError::remote_database(format!("读取远端业务表摘要失败: {error}")))?;
    let row = rows
        .next()
        .await
        .map_err(|error| SyncWorkerError::remote_database(format!("遍历远端业务表摘要失败: {error}")))?;
    let Some(row) = row else {
        return Err(SyncWorkerError::protocol("读取远端业务表摘要失败: 缺少结果行"));
    };

    build_counts_from_row(row, "远端", |message| SyncWorkerError::remote_database(message))
}

fn build_counts_from_row<F>(
    row: libsql::Row,
    label: &str,
    error_builder: F,
) -> Result<SyncDiagnosticsCountsOutput, SyncWorkerError>
where
    F: Fn(String) -> SyncWorkerError,
{
    let spaces = row
        .get::<i64>(0)
        .map_err(|error| error_builder(format!("读取{label} spaces 计数失败: {error}")))?;
    let projects = row
        .get::<i64>(1)
        .map_err(|error| error_builder(format!("读取{label} projects 计数失败: {error}")))?;
    let tasks = row
        .get::<i64>(2)
        .map_err(|error| error_builder(format!("读取{label} tasks 计数失败: {error}")))?;
    let task_links = row
        .get::<i64>(3)
        .map_err(|error| error_builder(format!("读取{label} task_links 计数失败: {error}")))?;
    let views = row
        .get::<i64>(4)
        .map_err(|error| error_builder(format!("读取{label} views 计数失败: {error}")))?;
    let settings = row
        .get::<i64>(5)
        .map_err(|error| error_builder(format!("读取{label} settings 计数失败: {error}")))?;

    Ok(SyncDiagnosticsCountsOutput {
        spaces,
        projects,
        tasks,
        task_links,
        views,
        settings,
        total_items: spaces + projects + tasks + task_links + views + settings,
    })
}

async fn read_latest_remote_cursor(remote: &Connection) -> Result<Option<i64>, SyncWorkerError> {
    let mut rows = remote
        .query(
            "SELECT MAX(remote_cursor) FROM sync_operations LIMIT 1",
            params![],
        )
        .await
        .map_err(|error| {
            SyncWorkerError::remote_database(format!("读取远端最新 remote_cursor 失败: {error}"))
        })?;
    let row = rows
        .next()
        .await
        .map_err(|error| {
            SyncWorkerError::remote_database(format!("遍历远端最新 remote_cursor 失败: {error}"))
        })?;

    row.map(|row| {
        row.get::<Option<i64>>(0).map_err(|error| {
            SyncWorkerError::remote_database(format!(
                "读取远端 sync_operations.max(remote_cursor) 失败: {error}"
            ))
        })
    })
    .transpose()
    .map(Option::flatten)
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::{
        LocalSyncDiagnosticsOutput, RemoteSyncDiagnosticsOutput, SyncDiagnosticsCountsOutput,
        SyncDiagnosticsOutput,
    };

    #[test]
    fn diagnostics_output_should_serialize_as_camel_case() {
        let payload = SyncDiagnosticsOutput {
            local: LocalSyncDiagnosticsOutput {
                device_id: Some("device-1".to_owned()),
                last_pulled_remote_cursor: Some(12),
                last_restore_at: Some("2026-06-28T00:00:00Z".to_owned()),
                pending_outbox_count: 3,
                counts: SyncDiagnosticsCountsOutput {
                    spaces: 1,
                    projects: 2,
                    tasks: 3,
                    task_links: 4,
                    views: 5,
                    settings: 6,
                    total_items: 21,
                },
            },
            remote: RemoteSyncDiagnosticsOutput {
                latest_remote_cursor: Some(18),
                counts: SyncDiagnosticsCountsOutput {
                    spaces: 1,
                    projects: 2,
                    tasks: 3,
                    task_links: 4,
                    views: 5,
                    settings: 6,
                    total_items: 21,
                },
            },
        };

        let value = serde_json::to_value(payload).expect("diagnostics payload should serialize");

        assert_eq!(
            value,
            json!({
                "local": {
                    "deviceId": "device-1",
                    "lastPulledRemoteCursor": 12,
                    "lastRestoreAt": "2026-06-28T00:00:00Z",
                    "pendingOutboxCount": 3,
                    "counts": {
                        "spaces": 1,
                        "projects": 2,
                        "tasks": 3,
                        "taskLinks": 4,
                        "views": 5,
                        "settings": 6,
                        "totalItems": 21
                    }
                },
                "remote": {
                    "latestRemoteCursor": 18,
                    "counts": {
                        "spaces": 1,
                        "projects": 2,
                        "tasks": 3,
                        "taskLinks": 4,
                        "views": 5,
                        "settings": 6,
                        "totalItems": 21
                    }
                }
            })
        );
    }
}

//! R7 远端协议数据面的只读诊断。

use libsql::{params, Connection};
use serde::Serialize;

use crate::SyncError;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RemoteSyncDiagnosticsOutput {
    pub latest_server_seq: Option<i64>,
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

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncProbeOutput {
    pub latest_server_seq: Option<i64>,
    pub schema_version: Option<i64>,
}

pub async fn collect_sync_probe(remote: &Connection) -> Result<SyncProbeOutput, SyncError> {
    Ok(SyncProbeOutput {
        latest_server_seq: read_latest_server_seq(remote).await?,
        schema_version: Some(crate::PROTOCOL_SCHEMA_VERSION),
    })
}

pub async fn collect_sync_remote_diagnostics(
    remote: &Connection,
) -> Result<RemoteSyncDiagnosticsOutput, SyncError> {
    Ok(RemoteSyncDiagnosticsOutput {
        latest_server_seq: read_latest_server_seq(remote).await?,
        counts: read_remote_counts(remote).await?,
    })
}

async fn read_latest_server_seq(remote: &Connection) -> Result<Option<i64>, SyncError> {
    let mut rows = remote
        .query("SELECT MAX(server_seq) FROM sync_change_log", params![])
        .await
        .map_err(remote_error("读取 R7 最新 server sequence"))?;
    rows.next()
        .await
        .map_err(remote_error("遍历 R7 最新 server sequence"))?
        .ok_or_else(|| SyncError::remote_database("R7 最新 server sequence 缺少结果行"))?
        .get::<Option<i64>>(0)
        .map_err(remote_error("读取 R7 最新 server sequence"))
}

async fn read_remote_counts(remote: &Connection) -> Result<SyncDiagnosticsCountsOutput, SyncError> {
    let mut rows = remote
        .query(
            r#"
            SELECT
                SUM(entity_type = 'space'),
                SUM(entity_type = 'project'),
                SUM(entity_type = 'task'),
                SUM(entity_type = 'task_link'),
                SUM(entity_type = 'view')
            FROM sync_entity_snapshots
            "#,
            params![],
        )
        .await
        .map_err(remote_error("读取 R7 远端实体计数"))?;
    let row = rows
        .next()
        .await
        .map_err(remote_error("遍历 R7 远端实体计数"))?
        .ok_or_else(|| SyncError::remote_database("R7 远端实体计数缺少结果行"))?;
    let spaces = read_count(&row, 0)?;
    let projects = read_count(&row, 1)?;
    let tasks = read_count(&row, 2)?;
    let task_links = read_count(&row, 3)?;
    let views = read_count(&row, 4)?;
    Ok(SyncDiagnosticsCountsOutput {
        spaces,
        projects,
        tasks,
        task_links,
        views,
        settings: 0,
        total_items: spaces + projects + tasks + task_links + views,
    })
}

fn read_count(row: &libsql::Row, index: i32) -> Result<i64, SyncError> {
    row.get::<Option<i64>>(index)
        .map(|value| value.unwrap_or(0))
        .map_err(remote_error("读取 R7 远端实体计数"))
}

fn remote_error(context: &'static str) -> impl Fn(libsql::Error) -> SyncError {
    move |error| SyncError::remote_database(format!("{context}: {error}"))
}

#[cfg(test)]
mod tests {
    use libsql::{params, Builder, Connection};
    use tempfile::TempDir;

    use super::{collect_sync_probe, collect_sync_remote_diagnostics};
    use crate::bootstrap_protocol_schema;

    #[tokio::test]
    async fn remote_diagnostics_should_count_r7_snapshots() {
        let (_directory, connection) = open_test_connection().await;
        bootstrap_protocol_schema(&connection)
            .await
            .expect("schema should bootstrap");
        connection
            .execute(
                "INSERT INTO sync_entity_snapshots(entity_type,entity_id,generation,fields_json,field_versions_json,lifecycle_state,lifecycle_seq,updated_seq) VALUES ('task','task-1',1,'{}','{}','active',1,1)",
                params![],
            )
            .await
            .expect("task snapshot should insert");

        let output = collect_sync_remote_diagnostics(&connection)
            .await
            .expect("diagnostics should read R7 schema");

        assert_eq!(output.counts.tasks, 1);
        assert_eq!(output.counts.total_items, 1);
    }

    #[tokio::test]
    async fn probe_should_read_r7_change_log_head() {
        let (_directory, connection) = open_test_connection().await;
        bootstrap_protocol_schema(&connection)
            .await
            .expect("schema should bootstrap");
        connection
            .execute(
                "INSERT INTO sync_change_log(device_id,operation_id,entity_type,entity_id,generation,mutation_kind,payload_json,committed_at) VALUES ('device-1','operation-1','task','task-1',1,'patch','{}','2026-07-24T00:00:00Z')",
                params![],
            )
            .await
            .expect("change should insert");

        let output = collect_sync_probe(&connection)
            .await
            .expect("probe should read R7 schema");

        assert_eq!(output.latest_server_seq, Some(1));
    }

    async fn open_test_connection() -> (TempDir, Connection) {
        let directory = tempfile::tempdir().expect("temp directory should create");
        let database = Builder::new_local(directory.path().join("remote.db"))
            .build()
            .await
            .expect("database should build");
        let connection = database.connect().expect("database should connect");
        (directory, connection)
    }
}

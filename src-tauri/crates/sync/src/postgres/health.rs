//! 云端副本连通检查与只读诊断。

use sqlx::{PgConnection, Row};

use super::error_map::map_sqlx_error;
use super::schema::PROTOCOL_SCHEMA_VERSION;
use crate::{RemoteSyncDiagnosticsOutput, SyncDiagnosticsCountsOutput, SyncError, SyncProbeOutput};

pub async fn health(conn: &mut PgConnection) -> Result<SyncProbeOutput, SyncError> {
    Ok(SyncProbeOutput {
        latest_server_seq: read_latest_server_seq(conn).await?,
        schema_version: Some(PROTOCOL_SCHEMA_VERSION),
    })
}

pub async fn diagnose(conn: &mut PgConnection) -> Result<RemoteSyncDiagnosticsOutput, SyncError> {
    Ok(RemoteSyncDiagnosticsOutput {
        latest_server_seq: read_latest_server_seq(conn).await?,
        counts: read_counts(conn).await?,
    })
}

async fn read_latest_server_seq(conn: &mut PgConnection) -> Result<Option<i64>, SyncError> {
    let value: Option<i64> = sqlx::query_scalar("SELECT MAX(server_seq) FROM sync_change_log")
        .fetch_one(&mut *conn)
        .await
        .map_err(|error| map_sqlx_error("读取 最新 server sequence", error))?;
    Ok(value)
}

async fn read_counts(conn: &mut PgConnection) -> Result<SyncDiagnosticsCountsOutput, SyncError> {
    // 与本机诊断对齐：每个 (type,id) 只计最高 generation；排除已进回收站（trashed）。
    // 旧实现 COUNT(*) 全表会把历史 generation 和 trashed 行算进去，远端会虚高。
    let row = sqlx::query(
        r#"
        WITH latest AS (
            SELECT DISTINCT ON (entity_type, entity_id)
                entity_type,
                lifecycle_state
            FROM sync_entity_state
            ORDER BY entity_type, entity_id, generation DESC
        )
        SELECT
            COUNT(*) FILTER (
                WHERE entity_type = 'space' AND lifecycle_state <> 'trashed'
            ) AS spaces,
            COUNT(*) FILTER (
                WHERE entity_type = 'project' AND lifecycle_state <> 'trashed'
            ) AS projects,
            COUNT(*) FILTER (
                WHERE entity_type = 'task' AND lifecycle_state <> 'trashed'
            ) AS tasks,
            COUNT(*) FILTER (WHERE entity_type = 'task_link') AS task_links,
            COUNT(*) FILTER (WHERE entity_type = 'view') AS views
        FROM latest
        "#,
    )
    .fetch_one(&mut *conn)
    .await
    .map_err(|error| map_sqlx_error("读取 实体计数", error))?;

    let spaces: i64 = row.get("spaces");
    let projects: i64 = row.get("projects");
    let tasks: i64 = row.get("tasks");
    let task_links: i64 = row.get("task_links");
    let views: i64 = row.get("views");
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

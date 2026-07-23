//! R7 本地同步副本状态与只读诊断。

use sea_orm::{ConnectionTrait, DbBackend, Statement};

use crate::app::error::AppError;
use stoneflow_storage::{database::DatabaseRuntimeState, repositories::SyncRepository};

use super::types::{SyncDiagnosticsCountsPayload, SyncLocalDiagnosticsPayload, SyncReplicaState};

const DEVICE_ID_SCOPE: &str = "sync:device_id";
const SERVER_SEQ_CURSOR_SCOPE: &str = "sync:last_pulled_server_seq";
const LAST_RESTORE_AT_SCOPE: &str = "sync:last_restore_at";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct LocalReplicaSnapshot {
    pub state: SyncReplicaState,
    pub reason: Option<String>,
    pub last_restore_at: Option<String>,
}

pub async fn inspect_local_replica(
    database: &DatabaseRuntimeState,
    has_remote_config: bool,
) -> Result<LocalReplicaSnapshot, AppError> {
    let repository = SyncRepository::new(database.connection().clone());
    let counts = read_local_replica_counts(database.connection()).await?;
    let device_id = repository.get_cursor(DEVICE_ID_SCOPE).await?;
    let server_seq_cursor = repository.get_cursor(SERVER_SEQ_CURSOR_SCOPE).await?;
    let last_restore_at = repository.get_cursor(LAST_RESTORE_AT_SCOPE).await?;

    let has_sync_metadata =
        has_non_empty_cursor(&device_id) || has_non_empty_cursor(&server_seq_cursor);
    let looks_empty_replica = counts.has_no_user_content() && counts.pending_outbox_count == 0;
    let has_restore_marker = has_non_empty_cursor(&last_restore_at);
    let has_server_seq_cursor = has_non_empty_cursor(&server_seq_cursor);

    let (state, reason) = if has_remote_config && looks_empty_replica {
        (SyncReplicaState::Ready, None)
    } else if has_remote_config && !has_server_seq_cursor && !has_restore_marker {
        (
            SyncReplicaState::BaselineRequired,
            Some(
                "当前设备已有本地数据，但缺少 server_seq cursor。为避免把未知本地副本误覆盖，暂不自动同步；请先完成同步基线迁移。"
                    .to_owned(),
            ),
        )
    } else if !has_remote_config && !has_sync_metadata && looks_empty_replica {
        (
            SyncReplicaState::Uninitialized,
            Some("当前设备还没有可用的同步配置与本地工作副本。".to_owned()),
        )
    } else {
        (SyncReplicaState::Ready, None)
    };

    Ok(LocalReplicaSnapshot {
        state,
        reason,
        last_restore_at: last_restore_at.and_then(|record| record.cursor),
    })
}

/// 本地同步诊断只通过应用持有的 SQLite 连接读取，避免 sync crate 重开数据库。
pub async fn read_local_diagnostics(
    database: &DatabaseRuntimeState,
) -> Result<SyncLocalDiagnosticsPayload, AppError> {
    let repository = SyncRepository::new(database.connection().clone());
    let device_id = repository
        .find_device()
        .await?
        .map(|device| device.device_id);
    let last_pulled_server_seq = repository
        .get_cursor(SERVER_SEQ_CURSOR_SCOPE)
        .await?
        .and_then(|cursor| cursor.cursor)
        .map(|cursor| {
            cursor
                .parse()
                .map_err(|error| AppError::database(format!("解析 R7 本地 cursor 失败: {error}")))
        })
        .transpose()?;
    let row = database
        .connection()
        .query_one(Statement::from_string(
            DbBackend::Sqlite,
            r#"
            SELECT
                (SELECT COUNT(*) FROM spaces) AS spaces,
                (SELECT COUNT(*) FROM projects) AS projects,
                (SELECT COUNT(*) FROM tasks) AS tasks,
                (SELECT COUNT(*) FROM task_links) AS task_links,
                (SELECT COUNT(*) FROM views) AS views,
                (SELECT COUNT(*) FROM outbox) AS pending_outbox
            "#,
        ))
        .await
        .map_err(|error| AppError::database(format!("读取 R7 本地诊断计数失败: {error}")))?
        .ok_or_else(|| AppError::database("R7 本地诊断计数缺少结果行"))?;
    let spaces = row.try_get("", "spaces")?;
    let projects = row.try_get("", "projects")?;
    let tasks = row.try_get("", "tasks")?;
    let task_links = row.try_get("", "task_links")?;
    let views = row.try_get("", "views")?;
    let pending_mutation_count = row.try_get("", "pending_outbox")?;

    Ok(SyncLocalDiagnosticsPayload {
        device_id,
        last_pulled_server_seq,
        pending_mutation_count,
        counts: SyncDiagnosticsCountsPayload {
            spaces,
            projects,
            tasks,
            task_links,
            views,
            settings: 0,
            total_items: spaces + projects + tasks + task_links + views,
        },
    })
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct LocalReplicaCounts {
    task_count: i64,
    project_count: i64,
    task_link_count: i64,
    non_default_space_count: i64,
    pending_outbox_count: i64,
}

impl LocalReplicaCounts {
    fn has_no_user_content(self) -> bool {
        self.task_count == 0
            && self.project_count == 0
            && self.task_link_count == 0
            && self.non_default_space_count == 0
    }
}

async fn read_local_replica_counts(
    connection: &impl ConnectionTrait,
) -> Result<LocalReplicaCounts, AppError> {
    let row = connection
        .query_one(Statement::from_string(
            DbBackend::Sqlite,
            r#"
            SELECT
                (SELECT COUNT(*) FROM tasks) AS task_count,
                (SELECT COUNT(*) FROM projects) AS project_count,
                (SELECT COUNT(*) FROM task_links) AS task_link_count,
                (SELECT COUNT(*) FROM spaces WHERE is_default = 0) AS non_default_space_count,
                (SELECT COUNT(*) FROM outbox) AS pending_outbox_count
            "#,
        ))
        .await
        .map_err(|error| AppError::database(format!("读取本地同步副本计数失败: {error}")))?;

    let Some(row) = row else {
        return Ok(LocalReplicaCounts {
            task_count: 0,
            project_count: 0,
            task_link_count: 0,
            non_default_space_count: 0,
            pending_outbox_count: 0,
        });
    };

    Ok(LocalReplicaCounts {
        task_count: row.try_get("", "task_count").unwrap_or(0),
        project_count: row.try_get("", "project_count").unwrap_or(0),
        task_link_count: row.try_get("", "task_link_count").unwrap_or(0),
        non_default_space_count: row.try_get("", "non_default_space_count").unwrap_or(0),
        pending_outbox_count: row.try_get("", "pending_outbox_count").unwrap_or(0),
    })
}

fn has_non_empty_cursor(
    record: &Option<stoneflow_storage::repositories::SyncCursorRecord>,
) -> bool {
    record
        .as_ref()
        .and_then(|item| item.cursor.as_deref())
        .is_some_and(|value| !value.trim().is_empty())
}

#[cfg(test)]
mod tests {
    use stoneflow_test_support::TestDatabase;

    use super::read_local_diagnostics;

    #[tokio::test]
    async fn local_diagnostics_should_read_r7_outbox_state() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");

        let output = read_local_diagnostics(&database)
            .await
            .expect("local diagnostics should read R7 tables");

        assert_eq!(output.pending_mutation_count, 0);
    }
}

//! 本地同步副本状态判定（R2：pending 以 outbox 计数，无 sync_mutations）。

use sea_orm::{ConnectionTrait, DbBackend, Statement};

use crate::app::error::AppError;
use stoneflow_storage::{database::DatabaseRuntimeState, repositories::SyncRepository};

use super::types::SyncReplicaState;

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

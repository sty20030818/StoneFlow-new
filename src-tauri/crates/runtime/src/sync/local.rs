//! 本地同步副本状态判定。

use sea_orm::{ConnectionTrait, DbBackend, Statement};

use crate::app::error::AppError;
use stoneflow_storage::{
    database::DatabaseRuntimeState,
    repositories::{SyncCursorRecord, SyncRepository},
};

use super::types::SyncReplicaState;
const DEVICE_ID_SCOPE: &str = "sync:device_id";
const REMOTE_CURSOR_SCOPE: &str = "sync:last_pulled_remote_cursor";
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
    let device_id = repository.find_cursor(DEVICE_ID_SCOPE).await?;
    let remote_cursor = repository.find_cursor(REMOTE_CURSOR_SCOPE).await?;
    let server_seq_cursor = repository.find_cursor(SERVER_SEQ_CURSOR_SCOPE).await?;
    let last_restore_at = repository.find_cursor(LAST_RESTORE_AT_SCOPE).await?;

    let has_sync_metadata = has_non_empty_cursor(&device_id)
        || has_non_empty_cursor(&remote_cursor)
        || has_non_empty_cursor(&server_seq_cursor);
    let looks_empty_replica = counts.has_no_user_content() && counts.pending_outbox_count == 0;
    let has_restore_marker = has_non_empty_cursor(&last_restore_at);
    let has_server_seq_cursor = has_non_empty_cursor(&server_seq_cursor);

    let (state, reason) = if has_remote_config && looks_empty_replica {
        (SyncReplicaState::Ready, None)
    } else if has_remote_config && !has_server_seq_cursor && !has_restore_marker {
        (
            SyncReplicaState::RestoreRequired,
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
                (SELECT COUNT(*) FROM sync_outbox WHERE status = 'pending') AS pending_outbox_count
            "#,
        ))
        .await
        .map_err(|error| AppError::database(format!("读取本地同步副本计数失败: {error}")))?;

    let Some(row) = row else {
        return Err(AppError::database("读取本地同步副本计数失败: 缺少结果行"));
    };

    Ok(LocalReplicaCounts {
        task_count: row
            .try_get("", "task_count")
            .map_err(|error| AppError::database(format!("读取 task_count 失败: {error}")))?,
        project_count: row
            .try_get("", "project_count")
            .map_err(|error| AppError::database(format!("读取 project_count 失败: {error}")))?,
        task_link_count: row
            .try_get("", "task_link_count")
            .map_err(|error| AppError::database(format!("读取 task_link_count 失败: {error}")))?,
        non_default_space_count: row.try_get("", "non_default_space_count").map_err(|error| {
            AppError::database(format!("读取 non_default_space_count 失败: {error}"))
        })?,
        pending_outbox_count: row
            .try_get("", "pending_outbox_count")
            .map_err(|error| AppError::database(format!("读取 pending_outbox_count 失败: {error}")))?,
    })
}

fn has_non_empty_cursor(record: &Option<SyncCursorRecord>) -> bool {
    record
        .as_ref()
        .and_then(|record| record.cursor.as_ref())
        .is_some_and(|value| !value.trim().is_empty())
}

#[cfg(test)]
mod tests {
    use sea_orm::{ConnectionTrait, DbBackend, Statement};
    use stoneflow_test_support::TestDatabase;

    use super::inspect_local_replica;
    use crate::sync::types::SyncReplicaState;
    use stoneflow_storage::repositories::{SyncOutboxRecord, SyncRepository};

    #[tokio::test]
    async fn inspect_local_replica_should_allow_remote_configured_empty_database_to_sync() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");

        let snapshot = inspect_local_replica(&database, true)
            .await
            .expect("replica inspection should succeed");

        assert_eq!(snapshot.state, SyncReplicaState::Ready);
        assert_eq!(snapshot.reason, None);
    }

    #[tokio::test]
    async fn inspect_local_replica_should_mark_pending_outbox_as_ready() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        let repository = SyncRepository::new(database.connection().clone());
        let record = SyncOutboxRecord {
            id: "op-1".to_owned(),
            entity_type: "task".to_owned(),
            entity_id: "task-1".to_owned(),
            action: "upsert".to_owned(),
            payload: serde_json::json!({ "id": "task-1", "title": "hello" }).to_string(),
            status: "pending".to_owned(),
            error_message: None,
            attempt_count: 0,
            created_at: "2026-06-28T00:00:00Z".to_owned(),
            updated_at: "2026-06-28T00:00:00Z".to_owned(),
        };

        repository
            .insert_outbox_record(repository.connection(), &record)
            .await
            .expect("outbox insert should succeed");
        repository
            .upsert_cursor(
                repository.connection(),
                "sync:last_pulled_server_seq",
                Some("12"),
                "2026-06-28T00:00:00Z",
            )
            .await
            .expect("remote cursor should persist");

        let snapshot = inspect_local_replica(&database, true)
            .await
            .expect("replica inspection should succeed");

        assert_eq!(snapshot.state, SyncReplicaState::Ready);
        assert_eq!(snapshot.reason, None);
    }

    #[tokio::test]
    async fn inspect_local_replica_should_require_restore_when_server_seq_cursor_is_missing() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        database
            .connection()
            .execute(Statement::from_sql_and_values(
                DbBackend::Sqlite,
                r#"
                INSERT INTO spaces(
                    id, name, icon_key, color_key, is_default, sort_order, archived_at, deleted_at,
                    created_at, updated_at
                )
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
                "#,
                [
                    "space-1".into(),
                    "测试空间".into(),
                    "sparkles".into(),
                    "blue".into(),
                    false.into(),
                    1000.into(),
                    Option::<String>::None.into(),
                    Option::<String>::None.into(),
                    "2026-06-28T00:00:00Z".into(),
                    "2026-06-28T00:00:00Z".into(),
                ],
            ))
            .await
            .expect("space should persist");

        let snapshot = inspect_local_replica(&database, true)
            .await
            .expect("replica inspection should succeed");

        assert_eq!(snapshot.state, SyncReplicaState::RestoreRequired);
        assert_eq!(
            snapshot.reason.as_deref(),
            Some(
                "当前设备已有本地数据，但缺少 server_seq cursor。为避免把未知本地副本误覆盖，暂不自动同步；请先完成同步基线迁移。"
            )
        );
    }

    #[tokio::test]
    async fn inspect_local_replica_should_treat_restored_empty_replica_as_ready() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        let repository = SyncRepository::new(database.connection().clone());

        repository
            .upsert_cursor(
                repository.connection(),
                "sync:last_restore_at",
                Some("2026-06-28T00:00:00Z"),
                "2026-06-28T00:00:00Z",
            )
            .await
            .expect("restore marker should persist");

        let snapshot = inspect_local_replica(&database, true)
            .await
            .expect("replica inspection should succeed");

        assert_eq!(snapshot.state, SyncReplicaState::Ready);
        assert_eq!(snapshot.reason, None);
        assert_eq!(
            snapshot.last_restore_at.as_deref(),
            Some("2026-06-28T00:00:00Z")
        );
    }
}

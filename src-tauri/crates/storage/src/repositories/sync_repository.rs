//! Sync Repository：负责本地同步元数据表读写。
//!
//! 当前阶段只收口 `sync_outbox` 与 `sync_cursor` 的最小持久化边界，
//! 让后续 S3/S4 可以在既有 storage 层之上继续演进，而不是把同步元数据散落在 runtime。

use sea_orm::{
    ConnectionTrait, DatabaseBackend, DatabaseConnection, DbBackend, QueryResult, Statement,
};
use sea_orm::Value;

use crate::error::StorageError;

/// 本地待上推操作的持久化记录。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SyncOutboxRecord {
    pub id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub action: String,
    pub payload: String,
    pub status: String,
    pub error_message: Option<String>,
    pub attempt_count: i64,
    pub created_at: String,
    pub updated_at: String,
}

/// `sync_cursor` 的单行记录。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SyncCursorRecord {
    pub scope: String,
    pub cursor: Option<String>,
    pub updated_at: String,
}

#[derive(Debug, Clone)]
pub struct SyncRepository {
    db: DatabaseConnection,
}

impl SyncRepository {
    pub fn new(db: DatabaseConnection) -> Self {
        Self { db }
    }

    pub fn connection(&self) -> &DatabaseConnection {
        &self.db
    }

    /// 插入一条本地同步 outbox 记录。
    pub async fn insert_outbox_record<C>(
        &self,
        connection: &C,
        record: &SyncOutboxRecord,
    ) -> Result<(), StorageError>
    where
        C: ConnectionTrait,
    {
        connection
            .execute(outbox_insert_statement(record))
            .await?;

        Ok(())
    }

    /// 按状态与创建时间读取待处理 outbox。
    pub async fn list_outbox_by_status(
        &self,
        status: &str,
        limit: u64,
    ) -> Result<Vec<SyncOutboxRecord>, StorageError> {
        let rows = self
            .connection()
            .query_all(Statement::from_sql_and_values(
                DbBackend::Sqlite,
                r#"
                SELECT id, entity_type, entity_id, action, payload, status, error_message,
                       attempt_count, created_at, updated_at
                FROM sync_outbox
                WHERE status = ?
                ORDER BY created_at ASC, id ASC
                LIMIT ?
                "#,
                [status.into(), (limit as i64).into()],
            ))
            .await?;

        rows.into_iter().map(map_outbox_row).collect()
    }

    /// 将 outbox 状态与错误信息更新到指定值。
    pub async fn update_outbox_status<C>(
        &self,
        connection: &C,
        outbox_id: &str,
        status: &str,
        error_message: Option<&str>,
        attempt_count: i64,
        updated_at: &str,
    ) -> Result<(), StorageError>
    where
        C: ConnectionTrait,
    {
        connection
            .execute(Statement::from_sql_and_values(
                DbBackend::Sqlite,
                r#"
                UPDATE sync_outbox
                SET status = ?, error_message = ?, attempt_count = ?, updated_at = ?
                WHERE id = ?
                "#,
                [
                    status.into(),
                    option_str_to_value(error_message),
                    attempt_count.into(),
                    updated_at.into(),
                    outbox_id.into(),
                ],
            ))
            .await?;

        Ok(())
    }

    /// 读取指定 scope 的游标；不存在时返回 None。
    pub async fn find_cursor(
        &self,
        scope: &str,
    ) -> Result<Option<SyncCursorRecord>, StorageError> {
        let row = self
            .connection()
            .query_one(Statement::from_sql_and_values(
                DatabaseBackend::Sqlite,
                "SELECT scope, cursor, updated_at FROM sync_cursor WHERE scope = ? LIMIT 1",
                [scope.into()],
            ))
            .await?;

        row.map(map_cursor_row).transpose()
    }

    /// 插入或更新指定 scope 的同步游标。
    pub async fn upsert_cursor<C>(
        &self,
        connection: &C,
        scope: &str,
        cursor: Option<&str>,
        updated_at: &str,
    ) -> Result<(), StorageError>
    where
        C: ConnectionTrait,
    {
        connection
            .execute(Statement::from_sql_and_values(
                DbBackend::Sqlite,
                r#"
                INSERT INTO sync_cursor(scope, cursor, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(scope) DO UPDATE SET
                    cursor = excluded.cursor,
                    updated_at = excluded.updated_at
                "#,
                [scope.into(), option_str_to_value(cursor), updated_at.into()],
            ))
            .await?;

        Ok(())
    }
}

fn outbox_insert_statement(record: &SyncOutboxRecord) -> Statement {
    Statement::from_sql_and_values(
        DbBackend::Sqlite,
        r#"
        INSERT INTO sync_outbox(
            id, entity_type, entity_id, action, payload, status, error_message,
            attempt_count, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
        [
            record.id.clone().into(),
            record.entity_type.clone().into(),
            record.entity_id.clone().into(),
            record.action.clone().into(),
            record.payload.clone().into(),
            record.status.clone().into(),
            option_str_to_value(record.error_message.as_deref()),
            record.attempt_count.into(),
            record.created_at.clone().into(),
            record.updated_at.clone().into(),
        ],
    )
}

fn map_outbox_row(row: QueryResult) -> Result<SyncOutboxRecord, StorageError> {
    Ok(SyncOutboxRecord {
        id: try_get_required_string(&row, "id")?,
        entity_type: try_get_required_string(&row, "entity_type")?,
        entity_id: try_get_required_string(&row, "entity_id")?,
        action: try_get_required_string(&row, "action")?,
        payload: try_get_required_string(&row, "payload")?,
        status: try_get_required_string(&row, "status")?,
        error_message: try_get_optional_string(&row, "error_message")?,
        attempt_count: row
            .try_get("", "attempt_count")
            .map_err(|error| StorageError::database(format!("读取 sync_outbox.attempt_count 失败: {error}")))?,
        created_at: try_get_required_string(&row, "created_at")?,
        updated_at: try_get_required_string(&row, "updated_at")?,
    })
}

fn map_cursor_row(row: QueryResult) -> Result<SyncCursorRecord, StorageError> {
    Ok(SyncCursorRecord {
        scope: try_get_required_string(&row, "scope")?,
        cursor: try_get_optional_string(&row, "cursor")?,
        updated_at: try_get_required_string(&row, "updated_at")?,
    })
}

fn try_get_required_string(row: &QueryResult, column: &str) -> Result<String, StorageError> {
    row.try_get("", column)
        .map_err(|error| StorageError::database(format!("读取 `{column}` 失败: {error}")))
}

fn try_get_optional_string(
    row: &QueryResult,
    column: &str,
) -> Result<Option<String>, StorageError> {
    row.try_get("", column)
        .map_err(|error| StorageError::database(format!("读取 `{column}` 失败: {error}")))
}

fn option_str_to_value(value: Option<&str>) -> Value {
    match value {
        Some(value) => value.into(),
        None => Value::String(None),
    }
}

#[cfg(test)]
mod tests {
    use stoneflow_test_support::TestDatabase;

    use super::{SyncOutboxRecord, SyncRepository};

    mod insert_outbox_record {
        use super::*;

        #[tokio::test]
        async fn should_persist_pending_record() {
            let database = TestDatabase::bootstrap_in_memory()
                .await
                .expect("test database should bootstrap");
            let repository = SyncRepository::new(database.connection().clone());
            let record = SyncOutboxRecord {
                id: "op-1".to_owned(),
                entity_type: "task".to_owned(),
                entity_id: "task-1".to_owned(),
                action: "upsert".to_owned(),
                payload: "{\"title\":\"hello\"}".to_owned(),
                status: "pending".to_owned(),
                error_message: None,
                attempt_count: 0,
                created_at: "2026-06-28T10:00:00Z".to_owned(),
                updated_at: "2026-06-28T10:00:00Z".to_owned(),
            };

            repository
                .insert_outbox_record(repository.connection(), &record)
                .await
                .expect("outbox insert should succeed");

            let rows = repository
                .list_outbox_by_status("pending", 10)
                .await
                .expect("pending outbox query should succeed");

            assert_eq!(rows, vec![record]);
        }
    }

    mod upsert_cursor {
        use super::*;

        #[tokio::test]
        async fn should_insert_then_update_scope_cursor() {
            let database = TestDatabase::bootstrap_in_memory()
                .await
                .expect("test database should bootstrap");
            let repository = SyncRepository::new(database.connection().clone());

            repository
                .upsert_cursor(
                    repository.connection(),
                    "remote",
                    Some("cursor-1"),
                    "2026-06-28T10:00:00Z",
                )
                .await
                .expect("cursor insert should succeed");

            let inserted = repository
                .find_cursor("remote")
                .await
                .expect("cursor lookup should succeed")
                .expect("cursor should exist after insert");
            assert_eq!(inserted.scope, "remote");
            assert_eq!(inserted.cursor.as_deref(), Some("cursor-1"));

            repository
                .upsert_cursor(
                    repository.connection(),
                    "remote",
                    Some("cursor-2"),
                    "2026-06-28T11:00:00Z",
                )
                .await
                .expect("cursor update should succeed");

            let updated = repository
                .find_cursor("remote")
                .await
                .expect("cursor lookup should succeed")
                .expect("cursor should exist after update");
            assert_eq!(updated.scope, "remote");
            assert_eq!(updated.cursor.as_deref(), Some("cursor-2"));
            assert_eq!(updated.updated_at, "2026-06-28T11:00:00Z");
        }
    }
}

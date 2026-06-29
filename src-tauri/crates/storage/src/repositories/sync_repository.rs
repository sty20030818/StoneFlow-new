//! Sync Repository：负责本地同步元数据表读写。
//!
//! `sync_outbox` 是 S1 兼容入口；新的长期同步协议使用
//! `sync_clients`、`sync_mutations`、`sync_shadow` 与 `sync_cursor`。

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

/// 当前设备的长期同步身份。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SyncClientRecord {
    pub client_id: String,
    pub created_at: String,
    pub last_seen_at: String,
}

/// 本地未确认或已确认的长期同步 mutation。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SyncMutationRecord {
    pub client_id: String,
    pub client_seq: i64,
    pub entity_type: String,
    pub entity_id: String,
    pub operation: String,
    pub payload: String,
    pub base_server_seq: Option<i64>,
    pub status: String,
    pub error_message: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// 本地最近一次远端确认基线。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SyncShadowRecord {
    pub entity_type: String,
    pub entity_id: String,
    pub server_seq: i64,
    pub snapshot: String,
    pub deleted_at: Option<String>,
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

    /// 插入或刷新当前设备身份。
    pub async fn upsert_client<C>(
        &self,
        connection: &C,
        record: &SyncClientRecord,
    ) -> Result<(), StorageError>
    where
        C: ConnectionTrait,
    {
        connection
            .execute(Statement::from_sql_and_values(
                DbBackend::Sqlite,
                r#"
                INSERT INTO sync_clients(client_id, created_at, last_seen_at)
                VALUES (?, ?, ?)
                ON CONFLICT(client_id) DO UPDATE SET
                    last_seen_at = excluded.last_seen_at
                "#,
                [
                    record.client_id.clone().into(),
                    record.created_at.clone().into(),
                    record.last_seen_at.clone().into(),
                ],
            ))
            .await?;

        Ok(())
    }

    /// 插入一条长期协议 mutation。
    pub async fn insert_mutation<C>(
        &self,
        connection: &C,
        record: &SyncMutationRecord,
    ) -> Result<(), StorageError>
    where
        C: ConnectionTrait,
    {
        connection
            .execute(mutation_insert_statement(record))
            .await?;

        Ok(())
    }

    /// 按状态与序号读取长期协议 mutation。
    pub async fn list_mutations_by_status(
        &self,
        status: &str,
        limit: u64,
    ) -> Result<Vec<SyncMutationRecord>, StorageError> {
        let rows = self
            .connection()
            .query_all(Statement::from_sql_and_values(
                DbBackend::Sqlite,
                r#"
                SELECT client_id, client_seq, entity_type, entity_id, operation, payload,
                       base_server_seq, status, error_message, created_at, updated_at
                FROM sync_mutations
                WHERE status = ?
                ORDER BY client_id ASC, client_seq ASC
                LIMIT ?
                "#,
                [status.into(), (limit as i64).into()],
            ))
            .await?;

        rows.into_iter().map(map_mutation_row).collect()
    }

    /// 写入或刷新远端确认基线。
    pub async fn upsert_shadow<C>(
        &self,
        connection: &C,
        record: &SyncShadowRecord,
    ) -> Result<(), StorageError>
    where
        C: ConnectionTrait,
    {
        connection
            .execute(Statement::from_sql_and_values(
                DbBackend::Sqlite,
                r#"
                INSERT INTO sync_shadow(entity_type, entity_id, server_seq, snapshot, deleted_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(entity_type, entity_id) DO UPDATE SET
                    server_seq = excluded.server_seq,
                    snapshot = excluded.snapshot,
                    deleted_at = excluded.deleted_at,
                    updated_at = excluded.updated_at
                "#,
                [
                    record.entity_type.clone().into(),
                    record.entity_id.clone().into(),
                    record.server_seq.into(),
                    record.snapshot.clone().into(),
                    option_str_to_value(record.deleted_at.as_deref()),
                    record.updated_at.clone().into(),
                ],
            ))
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

fn mutation_insert_statement(record: &SyncMutationRecord) -> Statement {
    Statement::from_sql_and_values(
        DbBackend::Sqlite,
        r#"
        INSERT INTO sync_mutations(
            client_id, client_seq, entity_type, entity_id, operation, payload,
            base_server_seq, status, error_message, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
        [
            record.client_id.clone().into(),
            record.client_seq.into(),
            record.entity_type.clone().into(),
            record.entity_id.clone().into(),
            record.operation.clone().into(),
            record.payload.clone().into(),
            option_i64_to_value(record.base_server_seq),
            record.status.clone().into(),
            option_str_to_value(record.error_message.as_deref()),
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

fn map_mutation_row(row: QueryResult) -> Result<SyncMutationRecord, StorageError> {
    Ok(SyncMutationRecord {
        client_id: try_get_required_string(&row, "client_id")?,
        client_seq: row
            .try_get("", "client_seq")
            .map_err(|error| StorageError::database(format!("读取 sync_mutations.client_seq 失败: {error}")))?,
        entity_type: try_get_required_string(&row, "entity_type")?,
        entity_id: try_get_required_string(&row, "entity_id")?,
        operation: try_get_required_string(&row, "operation")?,
        payload: try_get_required_string(&row, "payload")?,
        base_server_seq: row
            .try_get("", "base_server_seq")
            .map_err(|error| StorageError::database(format!("读取 sync_mutations.base_server_seq 失败: {error}")))?,
        status: try_get_required_string(&row, "status")?,
        error_message: try_get_optional_string(&row, "error_message")?,
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

fn option_i64_to_value(value: Option<i64>) -> Value {
    match value {
        Some(value) => value.into(),
        None => Value::BigInt(None),
    }
}

#[cfg(test)]
mod tests {
    use stoneflow_test_support::TestDatabase;

    use super::{SyncClientRecord, SyncMutationRecord, SyncOutboxRecord, SyncRepository, SyncShadowRecord};

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

    mod v2_protocol {
        use super::*;

        #[tokio::test]
        async fn should_persist_client_mutation_and_shadow() {
            let database = TestDatabase::bootstrap_in_memory()
                .await
                .expect("test database should bootstrap");
            let repository = SyncRepository::new(database.connection().clone());

            repository
                .upsert_client(
                    repository.connection(),
                    &SyncClientRecord {
                        client_id: "client-1".to_owned(),
                        created_at: "2026-06-29T10:00:00Z".to_owned(),
                        last_seen_at: "2026-06-29T10:00:00Z".to_owned(),
                    },
                )
                .await
                .expect("client upsert should succeed");

            let mutation = SyncMutationRecord {
                client_id: "client-1".to_owned(),
                client_seq: 1,
                entity_type: "task".to_owned(),
                entity_id: "task-1".to_owned(),
                operation: "upsert".to_owned(),
                payload: "{\"title\":\"hello\"}".to_owned(),
                base_server_seq: None,
                status: "pending".to_owned(),
                error_message: None,
                created_at: "2026-06-29T10:00:00Z".to_owned(),
                updated_at: "2026-06-29T10:00:00Z".to_owned(),
            };
            repository
                .insert_mutation(repository.connection(), &mutation)
                .await
                .expect("mutation insert should succeed");

            repository
                .upsert_shadow(
                    repository.connection(),
                    &SyncShadowRecord {
                        entity_type: "task".to_owned(),
                        entity_id: "task-1".to_owned(),
                        server_seq: 1,
                        snapshot: "{\"title\":\"hello\"}".to_owned(),
                        deleted_at: None,
                        updated_at: "2026-06-29T10:00:00Z".to_owned(),
                    },
                )
                .await
                .expect("shadow upsert should succeed");

            let pending = repository
                .list_mutations_by_status("pending", 10)
                .await
                .expect("pending mutation query should succeed");

            assert_eq!(pending, vec![mutation]);
        }
    }
}

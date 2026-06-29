//! Sync Repository：负责本地同步元数据表读写。
//!
//! 长期同步协议使用 `sync_clients`、`sync_mutations`、`sync_shadow` 与 `sync_cursor`。

use chrono::Utc;
use sea_orm::{ConnectionTrait, DatabaseBackend, DatabaseConnection, DbBackend, QueryResult, Statement};
use sea_orm::Value;
use stoneflow_domain::create_id;

use crate::error::StorageError;

const DEVICE_ID_SCOPE: &str = "sync:device_id";
const NEXT_CLIENT_SEQ_SCOPE: &str = "sync:next_client_seq";

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

    /// 为一条业务 mutation 分配当前设备的 client id 与单调序号后写入。
    pub async fn insert_pending_mutation<C>(
        &self,
        connection: &C,
        record: &SyncMutationRecord,
    ) -> Result<(), StorageError>
    where
        C: ConnectionTrait,
    {
        let now = Utc::now().to_rfc3339();
        let mutation = SyncMutationRecord {
            client_id: self.ensure_client_id(connection, &now).await?,
            client_seq: self.allocate_client_seq(connection, &now).await?,
            entity_type: record.entity_type.clone(),
            entity_id: record.entity_id.clone(),
            operation: record.operation.clone(),
            payload: record.payload.clone(),
            base_server_seq: record.base_server_seq,
            status: record.status.clone(),
            error_message: record.error_message.clone(),
            created_at: record.created_at.clone(),
            updated_at: record.updated_at.clone(),
        };

        self.insert_mutation(connection, &mutation).await
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

    async fn ensure_client_id<C>(&self, connection: &C, now: &str) -> Result<String, StorageError>
    where
        C: ConnectionTrait,
    {
        if let Some(cursor) = self.find_cursor_in_connection(connection, DEVICE_ID_SCOPE).await? {
            if let Some(client_id) = cursor.cursor.filter(|value| !value.trim().is_empty()) {
                self.upsert_client(
                    connection,
                    &SyncClientRecord {
                        client_id: client_id.clone(),
                        created_at: now.to_owned(),
                        last_seen_at: now.to_owned(),
                    },
                )
                .await?;
                return Ok(client_id);
            }
        }

        let client_id = create_id().to_string();
        self.upsert_cursor(connection, DEVICE_ID_SCOPE, Some(&client_id), now)
            .await?;
        self.upsert_client(
            connection,
            &SyncClientRecord {
                client_id: client_id.clone(),
                created_at: now.to_owned(),
                last_seen_at: now.to_owned(),
            },
        )
        .await?;
        Ok(client_id)
    }

    async fn allocate_client_seq<C>(&self, connection: &C, now: &str) -> Result<i64, StorageError>
    where
        C: ConnectionTrait,
    {
        let current = self
            .find_cursor_in_connection(connection, NEXT_CLIENT_SEQ_SCOPE)
            .await?
            .and_then(|record| record.cursor)
            .and_then(|cursor| cursor.parse::<i64>().ok())
            .unwrap_or(1);
        let next = current.saturating_add(1);
        self.upsert_cursor(
            connection,
            NEXT_CLIENT_SEQ_SCOPE,
            Some(&next.to_string()),
            now,
        )
        .await?;
        Ok(current)
    }

    async fn find_cursor_in_connection<C>(
        &self,
        connection: &C,
        scope: &str,
    ) -> Result<Option<SyncCursorRecord>, StorageError>
    where
        C: ConnectionTrait,
    {
        let row = connection
            .query_one(Statement::from_sql_and_values(
                DatabaseBackend::Sqlite,
                "SELECT scope, cursor, updated_at FROM sync_cursor WHERE scope = ? LIMIT 1",
                [scope.into()],
            ))
            .await?;

        row.map(map_cursor_row).transpose()
    }
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

    use super::{SyncClientRecord, SyncMutationRecord, SyncRepository, SyncShadowRecord};

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

    mod sync_protocol {
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

        #[tokio::test]
        async fn should_allocate_client_identity_for_pending_mutation() {
            let database = TestDatabase::bootstrap_in_memory()
                .await
                .expect("test database should bootstrap");
            let repository = SyncRepository::new(database.connection().clone());
            let record = SyncMutationRecord {
                client_id: String::new(),
                client_seq: 0,
                entity_type: "task_link".to_owned(),
                entity_id: "link-1".to_owned(),
                operation: "hard_delete".to_owned(),
                payload: "{}".to_owned(),
                base_server_seq: None,
                status: "pending".to_owned(),
                error_message: None,
                created_at: "2026-06-29T10:00:00Z".to_owned(),
                updated_at: "2026-06-29T10:00:00Z".to_owned(),
            };

            repository
                .insert_pending_mutation(repository.connection(), &record)
                .await
                .expect("pending mutation insert should allocate identity");

            let mutations = repository
                .list_mutations_by_status("pending", 10)
                .await
                .expect("pending mutation query should succeed");

            assert_eq!(mutations.len(), 1);
            assert_eq!(mutations[0].entity_type, "task_link");
            assert_eq!(mutations[0].entity_id, "link-1");
            assert_eq!(mutations[0].operation, "hard_delete");
            assert!(!mutations[0].client_id.is_empty());
            assert_eq!(mutations[0].client_seq, 1);
        }
    }
}

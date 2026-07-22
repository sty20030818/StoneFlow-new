//! Sync 元数据：cursor / device（R2；无 sync_mutations / sync_shadow）。

use sea_orm::{ConnectionTrait, DatabaseBackend, DatabaseConnection, Statement};
use stoneflow_domain::create_id;

use crate::error::StorageError;

const DEVICE_ID_SCOPE: &str = "local_device";

/// `sync_cursors` 单行。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SyncCursorRecord {
    pub scope: String,
    pub cursor: Option<String>,
    pub updated_at: String,
}

/// `sync_devices` 单行。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SyncDeviceRecord {
    pub device_id: String,
    pub created_at: String,
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

    pub async fn get_or_create_device_id(&self, now: &str) -> Result<String, StorageError> {
        if let Some(existing) = self.find_device().await? {
            return Ok(existing.device_id);
        }

        let device_id = create_id().to_string();
        self.upsert_device(&SyncDeviceRecord {
            device_id: device_id.clone(),
            created_at: now.to_owned(),
            updated_at: now.to_owned(),
        })
        .await?;
        Ok(device_id)
    }

    pub async fn find_device(&self) -> Result<Option<SyncDeviceRecord>, StorageError> {
        let row = self
            .db
            .query_one(Statement::from_string(
                DatabaseBackend::Sqlite,
                "SELECT device_id, created_at, updated_at FROM sync_devices LIMIT 1".to_owned(),
            ))
            .await?;

        Ok(match row {
            Some(row) => Some(SyncDeviceRecord {
                device_id: row.try_get("", "device_id")?,
                created_at: row.try_get("", "created_at")?,
                updated_at: row.try_get("", "updated_at")?,
            }),
            None => None,
        })
    }

    pub async fn upsert_device(&self, record: &SyncDeviceRecord) -> Result<(), StorageError> {
        self.db
            .execute(Statement::from_sql_and_values(
                DatabaseBackend::Sqlite,
                r#"
                INSERT INTO sync_devices (device_id, created_at, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(device_id) DO UPDATE SET updated_at = excluded.updated_at
                "#,
                [
                    record.device_id.clone().into(),
                    record.created_at.clone().into(),
                    record.updated_at.clone().into(),
                ],
            ))
            .await?;
        Ok(())
    }

    pub async fn get_cursor(&self, scope: &str) -> Result<Option<SyncCursorRecord>, StorageError> {
        let row = self
            .db
            .query_one(Statement::from_sql_and_values(
                DatabaseBackend::Sqlite,
                "SELECT scope, cursor, updated_at FROM sync_cursors WHERE scope = ? LIMIT 1",
                [scope.into()],
            ))
            .await?;

        Ok(match row {
            Some(row) => Some(SyncCursorRecord {
                scope: row.try_get("", "scope")?,
                cursor: row.try_get("", "cursor")?,
                updated_at: row.try_get("", "updated_at")?,
            }),
            None => None,
        })
    }

    /// 兼容旧调用名。
    pub async fn find_cursor(&self, scope: &str) -> Result<Option<SyncCursorRecord>, StorageError> {
        self.get_cursor(scope).await
    }

    pub async fn upsert_cursor(&self, record: &SyncCursorRecord) -> Result<(), StorageError> {
        self.db
            .execute(Statement::from_sql_and_values(
                DatabaseBackend::Sqlite,
                r#"
                INSERT INTO sync_cursors (scope, cursor, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(scope) DO UPDATE SET
                    cursor = excluded.cursor,
                    updated_at = excluded.updated_at
                "#,
                [
                    record.scope.clone().into(),
                    record.cursor.clone().into(),
                    record.updated_at.clone().into(),
                ],
            ))
            .await?;
        let _ = DEVICE_ID_SCOPE;
        Ok(())
    }
}

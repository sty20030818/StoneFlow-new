//! 远端同步数据面 schema。
//!
//! 只创建缺失表；已存在但版本不匹配时返回明确错误，绝不自动 drop 或 rebuild。

use libsql::{params, Connection};

use crate::SyncError;

pub const PROTOCOL_SCHEMA_VERSION: i64 = 1;

const SCHEMA_STATEMENTS: &[&str] = &[
    r#"
    CREATE TABLE IF NOT EXISTS sync_schema (
        name TEXT PRIMARY KEY NOT NULL CHECK (name = 'stoneflow'),
        version INTEGER NOT NULL
    )
    "#,
    r#"
    CREATE TABLE IF NOT EXISTS sync_entity_snapshots (
        entity_type TEXT NOT NULL CHECK (entity_type IN ('space', 'project', 'task', 'task_link', 'view')),
        entity_id TEXT NOT NULL,
        generation INTEGER NOT NULL CHECK (generation >= 1),
        fields_json TEXT NOT NULL,
        field_versions_json TEXT NOT NULL,
        lifecycle_state TEXT NOT NULL CHECK (lifecycle_state IN ('active', 'archived', 'trashed')),
        lifecycle_seq INTEGER NOT NULL,
        updated_seq INTEGER NOT NULL,
        PRIMARY KEY (entity_type, entity_id, generation)
    )
    "#,
    r#"
    CREATE TABLE IF NOT EXISTS sync_applied_operations (
        device_id TEXT NOT NULL,
        operation_id TEXT NOT NULL,
        committed_seq INTEGER NOT NULL,
        committed_at TEXT NOT NULL,
        PRIMARY KEY (device_id, operation_id)
    )
    "#,
    r#"
    CREATE TABLE IF NOT EXISTS sync_tombstones (
        entity_type TEXT NOT NULL CHECK (entity_type IN ('space', 'project', 'task', 'task_link', 'view')),
        entity_id TEXT NOT NULL,
        generation INTEGER NOT NULL CHECK (generation >= 1),
        deletion_seq INTEGER NOT NULL,
        deleted_at TEXT NOT NULL,
        PRIMARY KEY (entity_type, entity_id, generation)
    )
    "#,
    r#"
    CREATE TABLE IF NOT EXISTS sync_change_log (
        server_seq INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        operation_id TEXT NOT NULL,
        entity_type TEXT NOT NULL CHECK (entity_type IN ('space', 'project', 'task', 'task_link', 'view')),
        entity_id TEXT NOT NULL,
        generation INTEGER NOT NULL CHECK (generation >= 1),
        mutation_kind TEXT NOT NULL CHECK (mutation_kind IN ('patch', 'lifecycle', 'tombstone')),
        payload_json TEXT NOT NULL,
        committed_at TEXT NOT NULL
    )
    "#,
    "CREATE INDEX IF NOT EXISTS idx_sync_change_log_operation ON sync_change_log(device_id, operation_id, server_seq)",
    "CREATE INDEX IF NOT EXISTS idx_sync_change_log_entity ON sync_change_log(entity_type, entity_id, generation, server_seq)",
    "CREATE INDEX IF NOT EXISTS idx_sync_tombstones_identity ON sync_tombstones(entity_type, entity_id, generation)",
];

/// 在空远端建立 schema，或验证已存在 schema 的版本。
pub async fn bootstrap_protocol_schema(remote: &Connection) -> Result<(), SyncError> {
    for statement in SCHEMA_STATEMENTS {
        remote
            .execute(statement, params![])
            .await
            .map_err(|error| SyncError::schema(format!("初始化 远端同步表失败: {error}")))?;
    }

    let mut rows = remote
        .query(
            "SELECT version FROM sync_schema WHERE name = 'stoneflow'",
            params![],
        )
        .await
        .map_err(|error| SyncError::schema(format!("读取 远端 schema 版本失败: {error}")))?;
    let version = rows
        .next()
        .await
        .map_err(|error| SyncError::schema(format!("遍历 远端 schema 版本失败: {error}")))?
        .map(|row| row.get::<i64>(0))
        .transpose()
        .map_err(|error| SyncError::schema(format!("读取 远端 schema 版本失败: {error}")))?;

    match version {
        None => {
            remote
                .execute(
                    "INSERT INTO sync_schema(name, version) VALUES ('stoneflow', ?1)",
                    params![PROTOCOL_SCHEMA_VERSION],
                )
                .await
                .map_err(|error| {
                    SyncError::schema(format!("写入 远端 schema 版本失败: {error}"))
                })?;
            Ok(())
        }
        Some(PROTOCOL_SCHEMA_VERSION) => Ok(()),
        Some(version) => Err(SyncError::schema(format!(
            "远端 schema 版本不兼容: 当前 {version}，需要 {PROTOCOL_SCHEMA_VERSION}"
        ))),
    }
}

#[cfg(test)]
mod tests {
    use libsql::{params, Builder, Connection};
    use tempfile::TempDir;

    use super::{bootstrap_protocol_schema, PROTOCOL_SCHEMA_VERSION};

    #[tokio::test]
    async fn bootstrap_protocol_schema_should_create_schema_and_indexes() {
        let (_directory, connection) = open_test_connection().await;
        bootstrap_protocol_schema(&connection)
            .await
            .expect("schema should bootstrap");

        let mut rows = connection
            .query(
                "SELECT version FROM sync_schema WHERE name = 'stoneflow'",
                params![],
            )
            .await
            .expect("schema version should query");
        let version = rows
            .next()
            .await
            .expect("schema row should read")
            .expect("schema row should exist")
            .get::<i64>(0)
            .expect("schema version should read");

        assert_eq!(version, PROTOCOL_SCHEMA_VERSION);
    }

    #[tokio::test]
    async fn bootstrap_protocol_schema_should_reject_incompatible_version() {
        let (_directory, connection) = open_test_connection().await;
        bootstrap_protocol_schema(&connection)
            .await
            .expect("schema should bootstrap");
        connection
            .execute(
                "UPDATE sync_schema SET version = 999 WHERE name = 'stoneflow'",
                params![],
            )
            .await
            .expect("schema version should update");

        assert!(bootstrap_protocol_schema(&connection).await.is_err());
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

//! 远端镜像 -> 本地工作副本 restore。

use libsql::Connection;
use stoneflow_domain::now_utc;

use crate::{
    apply::apply_operation_to_local,
    error::SyncWorkerError,
    local::{get_or_create_device_id, reset_local_replica_for_restore, write_restore_markers},
    remote::fetch_restore_snapshot,
    schema::{
        ProjectPayload, RemoteOperationRecord, SettingPayload, SpacePayload, SyncAction,
        SyncOperationPayload, TaskLinkPayload, TaskPayload, ViewPayload,
    },
};

pub async fn restore_remote_snapshot(
    local: &Connection,
    remote: &Connection,
) -> Result<(), SyncWorkerError> {
    let device_id = get_or_create_device_id(local).await?;
    let snapshot = fetch_restore_snapshot(remote).await?;
    let restored_at = now_utc().to_rfc3339();
    let transaction = local.transaction().await.map_err(|error| {
        SyncWorkerError::local_database(format!("开启本地 restore 事务失败: {error}"))
    })?;

    reset_local_replica_for_restore(&transaction).await?;
    restore_spaces(&transaction, &device_id, &snapshot.spaces).await?;
    restore_projects(&transaction, &device_id, &snapshot.projects).await?;
    restore_tasks(&transaction, &device_id, &snapshot.tasks).await?;
    restore_task_links(&transaction, &device_id, &snapshot.task_links).await?;
    restore_views(&transaction, &device_id, &snapshot.views).await?;
    restore_settings(&transaction, &device_id, &snapshot.settings).await?;
    write_restore_markers(
        &transaction,
        snapshot.latest_remote_cursor.unwrap_or(0),
        &restored_at,
    )
    .await?;

    transaction.commit().await.map_err(|error| {
        SyncWorkerError::local_database(format!("提交本地 restore 事务失败: {error}"))
    })?;

    Ok(())
}

async fn restore_spaces(
    transaction: &libsql::Transaction,
    device_id: &str,
    records: &[SpacePayload],
) -> Result<(), SyncWorkerError> {
    for snapshot in records {
        apply_operation_to_local(transaction, &restore_operation(device_id, snapshot.clone())).await?;
    }
    Ok(())
}

async fn restore_projects(
    transaction: &libsql::Transaction,
    device_id: &str,
    records: &[ProjectPayload],
) -> Result<(), SyncWorkerError> {
    for snapshot in records {
        apply_operation_to_local(transaction, &restore_operation(device_id, snapshot.clone())).await?;
    }
    Ok(())
}

async fn restore_tasks(
    transaction: &libsql::Transaction,
    device_id: &str,
    records: &[TaskPayload],
) -> Result<(), SyncWorkerError> {
    for snapshot in records {
        apply_operation_to_local(transaction, &restore_operation(device_id, snapshot.clone())).await?;
    }
    Ok(())
}

async fn restore_task_links(
    transaction: &libsql::Transaction,
    device_id: &str,
    records: &[TaskLinkPayload],
) -> Result<(), SyncWorkerError> {
    for snapshot in records {
        apply_operation_to_local(transaction, &restore_operation(device_id, snapshot.clone())).await?;
    }
    Ok(())
}

async fn restore_views(
    transaction: &libsql::Transaction,
    device_id: &str,
    records: &[ViewPayload],
) -> Result<(), SyncWorkerError> {
    for snapshot in records {
        apply_operation_to_local(transaction, &restore_operation(device_id, snapshot.clone())).await?;
    }
    Ok(())
}

async fn restore_settings(
    transaction: &libsql::Transaction,
    device_id: &str,
    records: &[SettingPayload],
) -> Result<(), SyncWorkerError> {
    for snapshot in records {
        apply_operation_to_local(transaction, &restore_operation(device_id, snapshot.clone())).await?;
    }
    Ok(())
}

fn restore_operation(device_id: &str, payload: impl IntoRestorePayload) -> RemoteOperationRecord {
    let payload = payload.into_payload();
    let entity_type = payload.entity_type().to_owned();
    let entity_id = payload.entity_id().to_owned();
    let committed_at = restore_payload_updated_at(&payload).to_owned();

    RemoteOperationRecord {
        remote_cursor: 0,
        op_id: format!("restore:{entity_type}:{entity_id}"),
        device_id: device_id.to_owned(),
        entity_type,
        entity_id,
        action: SyncAction::Upsert,
        payload,
        committed_at,
    }
}

fn restore_payload_updated_at(payload: &SyncOperationPayload) -> &str {
    match payload {
        SyncOperationPayload::Space { snapshot } => &snapshot.updated_at,
        SyncOperationPayload::Project { snapshot } => &snapshot.updated_at,
        SyncOperationPayload::Task { snapshot } => &snapshot.updated_at,
        SyncOperationPayload::View { snapshot } => &snapshot.updated_at,
        SyncOperationPayload::Setting { snapshot } => &snapshot.updated_at,
        SyncOperationPayload::TaskLink { snapshot } => &snapshot.updated_at,
        SyncOperationPayload::HardDelete { target } => &target.deleted_at,
    }
}

trait IntoRestorePayload {
    fn into_payload(self) -> SyncOperationPayload;
}

impl IntoRestorePayload for SpacePayload {
    fn into_payload(self) -> SyncOperationPayload {
        SyncOperationPayload::Space { snapshot: self }
    }
}

impl IntoRestorePayload for ProjectPayload {
    fn into_payload(self) -> SyncOperationPayload {
        SyncOperationPayload::Project { snapshot: self }
    }
}

impl IntoRestorePayload for TaskPayload {
    fn into_payload(self) -> SyncOperationPayload {
        SyncOperationPayload::Task { snapshot: self }
    }
}

impl IntoRestorePayload for TaskLinkPayload {
    fn into_payload(self) -> SyncOperationPayload {
        SyncOperationPayload::TaskLink { snapshot: self }
    }
}

impl IntoRestorePayload for ViewPayload {
    fn into_payload(self) -> SyncOperationPayload {
        SyncOperationPayload::View { snapshot: self }
    }
}

impl IntoRestorePayload for SettingPayload {
    fn into_payload(self) -> SyncOperationPayload {
        SyncOperationPayload::Setting { snapshot: self }
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use libsql::{params, Builder, Connection};
    use tempfile::TempDir;

    use super::restore_remote_snapshot;
    use crate::remote::bootstrap_remote_schema;

    const LOCAL_TEST_SCHEMA: &[&str] = &[
        r#"
        CREATE TABLE IF NOT EXISTS spaces (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            icon_key TEXT NOT NULL,
            color_key TEXT NOT NULL,
            is_default INTEGER NOT NULL,
            sort_order INTEGER NOT NULL,
            archived_at TEXT NULL,
            deleted_at TEXT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        "#,
        r#"
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY NOT NULL,
            space_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT NULL,
            due_at TEXT NULL,
            sort_order INTEGER NOT NULL,
            completed_at TEXT NULL,
            archived_at TEXT NULL,
            deleted_at TEXT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        "#,
        r#"
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY NOT NULL,
            space_id TEXT NOT NULL,
            project_id TEXT NULL,
            title TEXT NOT NULL,
            note TEXT NULL,
            status TEXT NOT NULL,
            status_changed_at TEXT NOT NULL,
            priority INTEGER NOT NULL,
            inbox_at TEXT NULL,
            due_at TEXT NULL,
            scheduled_at TEXT NULL,
            reminder_at TEXT NULL,
            sort_order INTEGER NOT NULL,
            completed_at TEXT NULL,
            canceled_at TEXT NULL,
            archived_at TEXT NULL,
            deleted_at TEXT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        "#,
        r#"
        CREATE TABLE IF NOT EXISTS task_links (
            id TEXT PRIMARY KEY NOT NULL,
            task_id TEXT NOT NULL,
            title TEXT NOT NULL,
            url TEXT NOT NULL,
            sort_order INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        "#,
        r#"
        CREATE TABLE IF NOT EXISTS views (
            id TEXT PRIMARY KEY NOT NULL,
            name TEXT NOT NULL,
            description TEXT NULL,
            type TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            key TEXT NULL,
            filters TEXT NOT NULL,
            sort TEXT NOT NULL,
            group_by TEXT NULL,
            is_visible INTEGER NOT NULL,
            sort_order INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        "#,
        r#"
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        "#,
        r#"
        CREATE TABLE IF NOT EXISTS activity_events (
            id TEXT PRIMARY KEY NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            action TEXT NOT NULL,
            actor_type TEXT NOT NULL,
            source TEXT NOT NULL,
            summary TEXT NULL,
            metadata TEXT NULL,
            created_at TEXT NOT NULL
        )
        "#,
        r#"
        CREATE TABLE IF NOT EXISTS activity_changes (
            id TEXT PRIMARY KEY NOT NULL,
            event_id TEXT NOT NULL,
            field TEXT NOT NULL,
            old_value TEXT NULL,
            new_value TEXT NULL,
            created_at TEXT NOT NULL
        )
        "#,
        r#"
        CREATE TABLE IF NOT EXISTS sync_outbox (
            id TEXT PRIMARY KEY NOT NULL,
            entity_type TEXT NOT NULL,
            action TEXT NOT NULL,
            payload TEXT NOT NULL,
            status TEXT NOT NULL,
            error_message TEXT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        "#,
        r#"
        CREATE TABLE IF NOT EXISTS sync_cursor (
            scope TEXT PRIMARY KEY NOT NULL,
            cursor TEXT NULL,
            updated_at TEXT NOT NULL
        )
        "#,
    ];

    #[tokio::test]
    async fn restore_remote_snapshot_should_replace_local_replica_and_preserve_sync_config() {
        let (_local_dir, local) = open_test_connection("local-restore").await;
        let (_remote_dir, remote) = open_test_connection("remote-restore").await;
        bootstrap_local_schema(&local).await;
        bootstrap_remote_schema(&remote)
            .await
            .expect("remote schema should bootstrap");

        seed_local_state(&local).await;
        seed_remote_state(&remote).await;

        restore_remote_snapshot(&local, &remote)
            .await
            .expect("restore should succeed");

        assert_eq!(count_rows(&local, "tasks").await, 1);
        assert_eq!(count_rows(&local, "projects").await, 1);
        assert_eq!(count_rows(&local, "task_links").await, 1);
        assert_eq!(count_rows(&local, "views").await, 1);
        assert_eq!(count_rows(&local, "sync_outbox").await, 0);
        assert_eq!(
            read_setting(&local, "app.sync.config").await.as_deref(),
            Some("{\"url\":\"libsql://saved.turso.io\"}")
        );
        assert_eq!(
            read_setting(&local, "app.theme").await.as_deref(),
            Some("\"light\"")
        );
        assert_eq!(
            read_cursor(&local, "sync:last_pulled_remote_cursor").await.as_deref(),
            Some("1")
        );
        assert!(read_cursor(&local, "sync:last_restore_at").await.is_some());
        assert!(read_cursor(&local, "sync:device_id").await.is_some());
    }

    async fn bootstrap_local_schema(connection: &Connection) {
        for statement in LOCAL_TEST_SCHEMA {
            connection
                .execute(statement, params![])
                .await
                .expect("local test schema statement should execute");
        }
    }

    async fn seed_local_state(local: &Connection) {
        local
            .execute(
                r#"
                INSERT INTO spaces(id, name, icon_key, color_key, is_default, sort_order, archived_at, deleted_at, created_at, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL, NULL, ?7, ?8)
                "#,
                params![
                    "stale-space",
                    "Stale",
                    "briefcase",
                    "blue",
                    1,
                    100,
                    "2026-06-27T00:00:00Z",
                    "2026-06-27T00:00:00Z"
                ],
            )
            .await
            .expect("stale local space should seed");
        local
            .execute(
                r#"
                INSERT INTO settings(key, value, created_at, updated_at)
                VALUES (?1, ?2, ?3, ?4), (?5, ?6, ?7, ?8)
                "#,
                params![
                    "app.sync.config",
                    "{\"url\":\"libsql://saved.turso.io\"}",
                    "2026-06-27T00:00:00Z",
                    "2026-06-27T00:00:00Z",
                    "app.theme",
                    "\"dark\"",
                    "2026-06-27T00:00:00Z",
                    "2026-06-27T00:00:00Z"
                ],
            )
            .await
            .expect("local settings should seed");
        local
            .execute(
                r#"
                INSERT INTO sync_outbox(id, entity_type, action, payload, status, error_message, created_at, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5, NULL, ?6, ?7)
                "#,
                params![
                    "outbox-1",
                    "task",
                    "upsert",
                    "{\"title\":\"stale\"}",
                    "pending",
                    "2026-06-27T00:00:00Z",
                    "2026-06-27T00:00:00Z"
                ],
            )
            .await
            .expect("local outbox should seed");
    }

    async fn seed_remote_state(remote: &Connection) {
        remote
            .execute(
                r#"
                INSERT INTO spaces(id, name, icon_key, color_key, is_default, sort_order, archived_at, deleted_at, created_at, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, NULL, NULL, ?7, ?8)
                "#,
                params![
                    "space-1",
                    "Work",
                    "briefcase",
                    "emerald",
                    1,
                    100,
                    "2026-06-28T00:00:00Z",
                    "2026-06-28T00:00:00Z"
                ],
            )
            .await
            .expect("remote spaces should seed");
        remote
            .execute(
                r#"
                INSERT INTO projects(id, space_id, name, description, due_at, sort_order, completed_at, archived_at, deleted_at, created_at, updated_at)
                VALUES (?1, ?2, ?3, NULL, NULL, ?4, NULL, NULL, NULL, ?5, ?6)
                "#,
                params![
                    "project-1",
                    "space-1",
                    "Project",
                    100,
                    "2026-06-28T00:00:00Z",
                    "2026-06-28T00:00:00Z"
                ],
            )
            .await
            .expect("remote projects should seed");
        remote
            .execute(
                r#"
                INSERT INTO tasks(id, space_id, project_id, title, note, status, status_changed_at, priority, inbox_at, due_at, scheduled_at, reminder_at, sort_order, completed_at, canceled_at, archived_at, deleted_at, created_at, updated_at)
                VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6, ?7, NULL, NULL, NULL, NULL, ?8, NULL, NULL, NULL, NULL, ?9, ?10)
                "#,
                params![
                    "task-1",
                    "space-1",
                    "project-1",
                    "Task",
                    "todo",
                    "2026-06-28T00:00:00Z",
                    2,
                    100,
                    "2026-06-28T00:00:00Z",
                    "2026-06-28T00:00:00Z"
                ],
            )
            .await
            .expect("remote tasks should seed");
        remote
            .execute(
                r#"
                INSERT INTO task_links(id, task_id, title, url, sort_order, created_at, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                "#,
                params![
                    "link-1",
                    "task-1",
                    "Docs",
                    "https://example.com",
                    100,
                    "2026-06-28T00:00:00Z",
                    "2026-06-28T00:00:00Z"
                ],
            )
            .await
            .expect("remote task links should seed");
        remote
            .execute(
                r#"
                INSERT INTO views(id, name, description, type, entity_type, key, filters, sort, group_by, is_visible, sort_order, created_at, updated_at)
                VALUES (?1, ?2, NULL, ?3, ?4, NULL, ?5, ?6, NULL, ?7, ?8, ?9, ?10)
                "#,
                params![
                    "view-1",
                    "Today",
                    "custom",
                    "task",
                    "{\"rules\":[]}",
                    "{\"field\":\"sort_order\"}",
                    1,
                    100,
                    "2026-06-28T00:00:00Z",
                    "2026-06-28T00:00:00Z"
                ],
            )
            .await
            .expect("remote views should seed");
        remote
            .execute(
                r#"
                INSERT INTO settings(key, value, created_at, updated_at)
                VALUES (?1, ?2, ?3, ?4)
                "#,
                params![
                    "app.theme",
                    "\"light\"",
                    "2026-06-28T00:00:00Z",
                    "2026-06-28T00:00:00Z"
                ],
            )
            .await
            .expect("remote settings should seed");
        remote
            .execute(
                r#"
                INSERT INTO sync_operations(op_id, device_id, entity_type, entity_id, action, payload, committed_at)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
                "#,
                params![
                    "op-7",
                    "device-a",
                    "task",
                    "task-1",
                    "upsert",
                    "{\"kind\":\"task\"}",
                    "2026-06-28T00:00:00Z"
                ],
            )
            .await
            .expect("remote operations should seed");
    }

    async fn count_rows(connection: &Connection, table_name: &str) -> i64 {
        let mut rows = connection
            .query(&format!("SELECT COUNT(*) FROM {table_name}"), params![])
            .await
            .expect("count query should succeed");
        let row = rows
            .next()
            .await
            .expect("count row should load")
            .expect("count row should exist");
        row.get::<i64>(0).expect("count column should load")
    }

    async fn read_setting(connection: &Connection, key: &str) -> Option<String> {
        let mut rows = connection
            .query("SELECT value FROM settings WHERE key = ?1 LIMIT 1", params![key])
            .await
            .expect("setting query should succeed");
        rows.next()
            .await
            .expect("setting row should load")
            .map(|row| row.get::<String>(0).expect("setting value should load"))
    }

    async fn read_cursor(connection: &Connection, scope: &str) -> Option<String> {
        let mut rows = connection
            .query("SELECT cursor FROM sync_cursor WHERE scope = ?1 LIMIT 1", params![scope])
            .await
            .expect("cursor query should succeed");
        rows.next()
            .await
            .expect("cursor row should load")
            .map(|row| row.get::<String>(0).expect("cursor value should load"))
    }

    async fn open_test_connection(name: &str) -> (TempDir, Connection) {
        let temp_dir = tempfile::tempdir().expect("temp dir should be created");
        let path = temp_dir.path().join(format!("{name}.db"));
        let database = Builder::new_local(PathBuf::from(path))
            .build()
            .await
            .expect("test database should build");
        let connection = database.connect().expect("test database should connect");

        (temp_dir, connection)
    }
}

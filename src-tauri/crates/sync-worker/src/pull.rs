//! 远端 change log -> 本地 SQLite 回放。

use libsql::Connection;

use crate::{
    apply::apply_operation_to_local,
    error::SyncWorkerError,
    local::{
        delete_sync_shadow, read_server_seq_cursor, reset_local_replica_for_snapshot,
        upsert_sync_shadow, write_server_seq_cursor_in_transaction,
    },
    migrate::{read_local_business_count, snapshot_business_count},
    remote::{fetch_changes_after, fetch_latest_server_seq, fetch_restore_snapshot},
    schema::{
        HardDeletePayload, RemoteChangeKind, RemoteChangeRecord, RemoteOperationRecord, SyncAction,
        SyncOperationPayload, PULL_BATCH_SIZE,
    },
};

/// 读取 `remote_change_log`，事务化应用到本地业务表与 `sync_shadow`。
pub async fn pull_remote_changes(
    local: &Connection,
    remote: &Connection,
) -> Result<(), SyncWorkerError> {
    if read_server_seq_cursor(local).await?.is_none() {
        pull_snapshot(local, remote).await?;
        return Ok(());
    }
    if should_repair_seed_only_replica(local, remote).await? {
        pull_snapshot(local, remote).await?;
        return Ok(());
    }

    loop {
        let after_server_seq = read_server_seq_cursor(local).await?.unwrap_or(0);
        let changes = fetch_changes_after(remote, after_server_seq, PULL_BATCH_SIZE).await?;
        if changes.is_empty() {
            break;
        }

        let Some(last_change) = changes.last() else {
            return Err(SyncWorkerError::protocol(
                "pull batch 为空时不应进入 cursor 更新分支",
            ));
        };
        let last_server_seq = last_change.server_seq;
        let transaction = local.transaction().await.map_err(|error| {
            SyncWorkerError::local_database(format!("开启本地 pull 事务失败: {error}"))
        })?;

        for change in &changes {
            apply_change_to_local(&transaction, change).await?;
        }

        write_server_seq_cursor_in_transaction(&transaction, last_server_seq).await?;
        transaction.commit().await.map_err(|error| {
            SyncWorkerError::local_database(format!("提交本地 pull 事务失败: {error}"))
        })?;
    }

    Ok(())
}

async fn should_repair_seed_only_replica(
    local: &Connection,
    remote: &Connection,
) -> Result<bool, SyncWorkerError> {
    if read_local_business_count(local).await? != 0 {
        return Ok(false);
    }

    let snapshot = fetch_restore_snapshot(remote).await?;
    Ok(snapshot_business_count(&snapshot) > 0)
}

async fn pull_snapshot(local: &Connection, remote: &Connection) -> Result<(), SyncWorkerError> {
    let snapshot = fetch_restore_snapshot(remote).await?;
    let server_seq = fetch_latest_server_seq(remote).await?.unwrap_or(0);
    let transaction = local.transaction().await.map_err(|error| {
        SyncWorkerError::local_database(format!("开启本地 snapshot 事务失败: {error}"))
    })?;

    reset_local_replica_for_snapshot(&transaction).await?;
    for space in &snapshot.spaces {
        let payload = SyncOperationPayload::Space {
            snapshot: space.clone(),
        };
        apply_snapshot_payload(&transaction, server_seq, "space", &space.id, payload).await?;
    }
    for project in &snapshot.projects {
        let payload = SyncOperationPayload::Project {
            snapshot: project.clone(),
        };
        apply_snapshot_payload(&transaction, server_seq, "project", &project.id, payload).await?;
    }
    for task in &snapshot.tasks {
        let payload = SyncOperationPayload::Task {
            snapshot: task.clone(),
        };
        apply_snapshot_payload(&transaction, server_seq, "task", &task.id, payload).await?;
    }
    for task_link in &snapshot.task_links {
        let payload = SyncOperationPayload::TaskLink {
            snapshot: task_link.clone(),
        };
        apply_snapshot_payload(
            &transaction,
            server_seq,
            "task_link",
            &task_link.id,
            payload,
        )
        .await?;
    }
    for view in &snapshot.views {
        let payload = SyncOperationPayload::View {
            snapshot: view.clone(),
        };
        apply_snapshot_payload(&transaction, server_seq, "view", &view.id, payload).await?;
    }
    for setting in &snapshot.settings {
        let payload = SyncOperationPayload::Setting {
            snapshot: setting.clone(),
        };
        apply_snapshot_payload(&transaction, server_seq, "setting", &setting.key, payload).await?;
    }

    write_server_seq_cursor_in_transaction(&transaction, server_seq).await?;
    transaction.commit().await.map_err(|error| {
        SyncWorkerError::local_database(format!("提交本地 snapshot 事务失败: {error}"))
    })?;
    Ok(())
}

async fn apply_snapshot_payload(
    transaction: &libsql::Transaction,
    server_seq: i64,
    entity_type: &str,
    entity_id: &str,
    payload: SyncOperationPayload,
) -> Result<(), SyncWorkerError> {
    let operation = RemoteOperationRecord {
        server_seq: server_seq,
        op_id: format!("snapshot:{entity_type}:{entity_id}"),
        device_id: "remote_snapshot".to_owned(),
        entity_type: entity_type.to_owned(),
        entity_id: entity_id.to_owned(),
        action: SyncAction::Upsert,
        payload,
        committed_at: "remote_snapshot".to_owned(),
    };
    apply_operation_to_local(transaction, &operation).await?;
    let snapshot = serde_json::to_string(&operation.payload).map_err(|error| {
        SyncWorkerError::serialization(format!("序列化 sync_shadow snapshot 失败: {error}"))
    })?;
    upsert_sync_shadow(
        transaction,
        entity_type,
        entity_id,
        server_seq,
        &snapshot,
        deleted_at_from_payload(&operation.payload),
        "remote_snapshot",
    )
    .await
}

async fn apply_change_to_local(
    transaction: &libsql::Transaction,
    change: &RemoteChangeRecord,
) -> Result<(), SyncWorkerError> {
    if matches!(change.change_kind, RemoteChangeKind::ConflictNotice) {
        return Ok(());
    }

    if change.change_kind == RemoteChangeKind::HardDelete {
        let operation = RemoteOperationRecord {
            server_seq: change.server_seq,
            op_id: operation_id(change),
            device_id: change.changed_by_client_id.clone(),
            entity_type: change.entity_type.clone(),
            entity_id: change.entity_id.clone(),
            action: SyncAction::Delete,
            payload: SyncOperationPayload::HardDelete {
                target: HardDeletePayload {
                    entity_type: change.entity_type.clone(),
                    entity_id: change.entity_id.clone(),
                    deleted_at: change.committed_at.clone(),
                    metadata: None,
                },
            },
            committed_at: change.committed_at.clone(),
        };
        apply_operation_to_local(transaction, &operation).await?;
        delete_sync_shadow(transaction, &change.entity_type, &change.entity_id).await?;
        return Ok(());
    }

    let Some(payload) = change.patch.clone() else {
        return Err(SyncWorkerError::protocol(format!(
            "{} change 缺少 patch: {}:{}",
            change_kind_label(change.change_kind),
            change.entity_type,
            change.entity_id
        )));
    };
    let operation = RemoteOperationRecord {
        server_seq: change.server_seq,
        op_id: operation_id(change),
        device_id: change.changed_by_client_id.clone(),
        entity_type: change.entity_type.clone(),
        entity_id: change.entity_id.clone(),
        action: match change.change_kind {
            RemoteChangeKind::Upsert | RemoteChangeKind::Restore => SyncAction::Upsert,
            RemoteChangeKind::SoftDelete => SyncAction::Delete,
            RemoteChangeKind::HardDelete | RemoteChangeKind::ConflictNotice => unreachable!(),
        },
        payload,
        committed_at: change.committed_at.clone(),
    };
    apply_operation_to_local(transaction, &operation).await?;
    let snapshot = serde_json::to_string(&operation.payload).map_err(|error| {
        SyncWorkerError::serialization(format!("序列化 sync_shadow snapshot 失败: {error}"))
    })?;
    upsert_sync_shadow(
        transaction,
        &change.entity_type,
        &change.entity_id,
        change.server_seq,
        &snapshot,
        deleted_at_from_payload(&operation.payload),
        &change.committed_at,
    )
    .await
}

fn deleted_at_from_payload(payload: &SyncOperationPayload) -> Option<&str> {
    match payload {
        SyncOperationPayload::Space { snapshot } => snapshot.deleted_at.as_deref(),
        SyncOperationPayload::Project { snapshot } => snapshot.deleted_at.as_deref(),
        SyncOperationPayload::Task { snapshot } => snapshot.deleted_at.as_deref(),
        _ => None,
    }
}

fn operation_id(change: &RemoteChangeRecord) -> String {
    format!("change:{}", change.server_seq)
}

fn change_kind_label(kind: RemoteChangeKind) -> &'static str {
    match kind {
        RemoteChangeKind::Upsert => "upsert",
        RemoteChangeKind::SoftDelete => "soft_delete",
        RemoteChangeKind::Restore => "restore",
        RemoteChangeKind::HardDelete => "hard_delete",
        RemoteChangeKind::ConflictNotice => "conflict_notice",
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use libsql::{params, Builder, Connection};
    use tempfile::TempDir;

    use super::pull_remote_changes;
    use crate::remote::bootstrap_remote_schema;

    #[tokio::test]
    async fn pull_remote_changes_should_apply_setting_and_advance_cursor() {
        let (_local_dir, local) = open_test_connection("local-pull").await;
        let (_remote_dir, remote) = open_test_connection("remote-pull").await;
        bootstrap_local_schema(&local).await;
        bootstrap_remote_schema(&remote)
            .await
            .expect("remote schema should bootstrap");
        local
            .execute(
                "INSERT INTO sync_cursor(scope, cursor, updated_at) VALUES (?1, ?2, ?3)",
                params!["sync:last_pulled_server_seq", "0", "2026-06-29T09:00:00Z"],
            )
            .await
            .expect("local server_seq cursor should insert");
        remote
            .execute(
                r#"
                INSERT INTO remote_change_log(
                    server_seq, entity_type, entity_id, change_kind, patch,
                    changed_by_client_id, changed_by_client_seq, committed_at
                )
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
                "#,
                params![
                    1,
                    "setting",
                    "app.theme",
                    "upsert",
                    r#"{"kind":"setting","snapshot":{"key":"app.theme","raw_value":"\"dark\"","updated_at":"2026-06-29T10:00:00Z"}}"#,
                    "client-a",
                    1,
                    "2026-06-29T10:00:00Z",
                ],
            )
            .await
            .expect("remote change should insert");

        pull_remote_changes(&local, &remote)
            .await
            .expect("pull should succeed");

        let setting = read_text(&local, "SELECT value FROM settings WHERE key = 'app.theme'")
            .await
            .expect("setting should exist");
        let cursor = read_text(
            &local,
            "SELECT cursor FROM sync_cursor WHERE scope = 'sync:last_pulled_server_seq'",
        )
        .await
        .expect("server seq cursor should exist");
        let shadow = read_text(
            &local,
            "SELECT snapshot FROM sync_shadow WHERE entity_type = 'setting' AND entity_id = 'app.theme'",
        )
        .await
        .expect("sync shadow should exist");

        assert_eq!(setting, "\"dark\"");
        assert_eq!(cursor, "1");
        assert!(shadow.contains("\"app.theme\""));
    }

    #[tokio::test]
    async fn pull_remote_changes_should_apply_snapshot_when_cursor_missing() {
        let (_local_dir, local) = open_test_connection("local-snapshot").await;
        let (_remote_dir, remote) = open_test_connection("remote-snapshot").await;
        bootstrap_local_schema(&local).await;
        bootstrap_remote_schema(&remote)
            .await
            .expect("remote schema should bootstrap");
        remote
            .execute(
                r#"
                INSERT INTO settings(key, value, created_at, updated_at)
                VALUES (?1, ?2, ?3, ?4)
                "#,
                params![
                    "app.theme",
                    "\"dark\"",
                    "2026-06-29T10:00:00Z",
                    "2026-06-29T10:00:00Z"
                ],
            )
            .await
            .expect("remote setting should insert");
        remote
            .execute(
                r#"
                INSERT INTO remote_change_log(
                    server_seq, entity_type, entity_id, change_kind, patch,
                    changed_by_client_id, changed_by_client_seq, committed_at
                )
                VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6, ?7)
                "#,
                params![
                    7,
                    "setting",
                    "app.theme",
                    "upsert",
                    "client-a",
                    1,
                    "2026-06-29T10:00:00Z",
                ],
            )
            .await
            .expect("remote server seq should insert");

        pull_remote_changes(&local, &remote)
            .await
            .expect("snapshot should succeed");

        let setting = read_text(&local, "SELECT value FROM settings WHERE key = 'app.theme'")
            .await
            .expect("setting should exist");
        let cursor = read_text(
            &local,
            "SELECT cursor FROM sync_cursor WHERE scope = 'sync:last_pulled_server_seq'",
        )
        .await
        .expect("server seq cursor should exist");

        assert_eq!(setting, "\"dark\"");
        assert_eq!(cursor, "7");
    }

    #[tokio::test]
    async fn pull_remote_changes_should_repair_seed_only_local_replica_even_when_cursor_exists() {
        let (_local_dir, local) = open_test_connection("local-seed-repair").await;
        let (_remote_dir, remote) = open_test_connection("remote-seed-repair").await;
        bootstrap_local_schema(&local).await;
        bootstrap_remote_schema(&remote)
            .await
            .expect("remote schema should bootstrap");
        insert_seed_only_local_replica(&local).await;
        local
            .execute(
                "INSERT INTO sync_cursor(scope, cursor, updated_at) VALUES (?1, ?2, ?3)",
                params!["sync:last_pulled_server_seq", "1", "2026-06-29T10:00:00Z"],
            )
            .await
            .expect("existing cursor should insert");
        remote
            .execute(
                r#"
                INSERT INTO settings(key, value, created_at, updated_at)
                VALUES (?1, ?2, ?3, ?4)
                "#,
                params![
                    "app.theme",
                    "\"dark\"",
                    "2026-06-29T10:00:00Z",
                    "2026-06-29T10:00:00Z"
                ],
            )
            .await
            .expect("remote setting should insert");
        remote
            .execute(
                r#"
                INSERT INTO remote_change_log(
                    server_seq, entity_type, entity_id, change_kind, patch,
                    changed_by_client_id, changed_by_client_seq, committed_at
                )
                VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6, ?7)
                "#,
                params![
                    1,
                    "setting",
                    "app.theme",
                    "upsert",
                    "client-a",
                    1,
                    "2026-06-29T10:00:00Z",
                ],
            )
            .await
            .expect("remote server seq should insert");

        pull_remote_changes(&local, &remote)
            .await
            .expect("snapshot repair should succeed");

        assert_eq!(
            read_text(&local, "SELECT value FROM settings WHERE key = 'app.theme'")
                .await
                .as_deref(),
            Some("\"dark\"")
        );
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

    async fn bootstrap_local_schema(connection: &Connection) {
        for statement in [
            r#"
            CREATE TABLE spaces (
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
            CREATE TABLE projects (
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
            CREATE TABLE tasks (
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
            CREATE TABLE task_links (
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
            CREATE TABLE views (
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
            CREATE TABLE settings (
                key TEXT PRIMARY KEY NOT NULL,
                value TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            "#,
            r#"
            CREATE TABLE activity_events (
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
            CREATE TABLE activity_changes (
                id TEXT PRIMARY KEY NOT NULL,
                event_id TEXT NOT NULL,
                field TEXT NOT NULL,
                old_value TEXT NULL,
                new_value TEXT NULL
            )
            "#,
            r#"
            CREATE TABLE sync_cursor (
                scope TEXT PRIMARY KEY NOT NULL,
                cursor TEXT NULL,
                updated_at TEXT NOT NULL
            )
            "#,
            r#"
            CREATE TABLE sync_shadow (
                entity_type TEXT NOT NULL,
                entity_id TEXT NOT NULL,
                server_seq INTEGER NOT NULL,
                snapshot TEXT NOT NULL,
                deleted_at TEXT NULL,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (entity_type, entity_id)
            )
            "#,
        ] {
            connection
                .execute(statement, params![])
                .await
                .expect("local schema statement should run");
        }
    }

    async fn insert_seed_only_local_replica(connection: &Connection) {
        connection
            .execute(
                r#"
                INSERT INTO spaces(
                    id, name, icon_key, color_key, is_default, sort_order, archived_at, deleted_at,
                    created_at, updated_at
                )
                VALUES (
                    'seed-space', '个人', 'user', 'blue', 1, 1000, NULL, NULL,
                    '2026-06-29T10:00:00Z', '2026-06-29T10:00:00Z'
                )
                "#,
                params![],
            )
            .await
            .expect("default space should insert");
        connection
            .execute(
                r#"
                INSERT INTO views(
                    id, name, description, type, entity_type, key, filters, sort, group_by,
                    is_visible, sort_order, created_at, updated_at
                )
                VALUES (
                    'seed-view', '今天', NULL, 'system', 'task', 'today', '{}', '[]', NULL,
                    1, 100, '2026-06-29T10:00:00Z', '2026-06-29T10:00:00Z'
                )
                "#,
                params![],
            )
            .await
            .expect("system view should insert");
        connection
            .execute(
                r#"
                INSERT INTO settings(key, value, created_at, updated_at)
                VALUES (?1, ?2, ?3, ?4)
                "#,
                params![
                    "app.sync.config",
                    "{}",
                    "2026-06-29T10:00:00Z",
                    "2026-06-29T10:00:00Z"
                ],
            )
            .await
            .expect("sync config should insert");
    }

    async fn read_text(connection: &Connection, sql: &str) -> Option<String> {
        let mut rows = connection
            .query(sql, params![])
            .await
            .expect("query should run");
        rows.next()
            .await
            .expect("row iteration should succeed")
            .map(|row| row.get::<String>(0).expect("column should be string"))
    }
}

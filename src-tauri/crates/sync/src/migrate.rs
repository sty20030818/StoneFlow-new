//! 旧同步数据到当前同步协议的幂等基线迁移。

use libsql::{params, Connection};

use crate::{
    error::SyncError,
    local::{read_server_seq_cursor, upsert_sync_shadow, write_server_seq_cursor_in_transaction},
    remote::{
        fetch_latest_server_seq, fetch_restore_snapshot, insert_baseline_changes_if_empty,
        RemoteRestoreSnapshot,
    },
    schema::{
        ProjectPayload, SettingPayload, SpacePayload, SyncOperationPayload, TaskLinkPayload,
        TaskPayload, ViewPayload,
    },
};

pub async fn migrate_baseline(local: &Connection, remote: &Connection) -> Result<(), SyncError> {
    let snapshot = fetch_restore_snapshot(remote).await?;
    insert_baseline_changes_if_empty(remote, &snapshot).await?;
    let server_seq = fetch_latest_server_seq(remote).await?.unwrap_or(0);

    if read_server_seq_cursor(local).await?.is_some() {
        return Ok(());
    }
    if read_local_business_count(local).await? == 0 {
        return Ok(());
    }

    let transaction = local.transaction().await.map_err(|error| {
        SyncError::local_database(format!("开启本地同步基线迁移事务失败: {error}"))
    })?;

    write_shadow_records(&transaction, server_seq, &snapshot.spaces).await?;
    write_shadow_records(&transaction, server_seq, &snapshot.projects).await?;
    write_shadow_records(&transaction, server_seq, &snapshot.tasks).await?;
    write_shadow_records(&transaction, server_seq, &snapshot.task_links).await?;
    write_shadow_records(&transaction, server_seq, &snapshot.views).await?;
    write_shadow_records(&transaction, server_seq, &snapshot.settings).await?;
    write_server_seq_cursor_in_transaction(&transaction, server_seq).await?;

    transaction.commit().await.map_err(|error| {
        SyncError::local_database(format!("提交本地同步基线迁移事务失败: {error}"))
    })?;
    Ok(())
}

async fn write_shadow_records<T>(
    transaction: &libsql::Transaction,
    server_seq: i64,
    records: &[T],
) -> Result<(), SyncError>
where
    T: Clone + IntoBaselinePayload,
{
    for record in records {
        let payload = record.clone().into_payload();
        let snapshot = serde_json::to_string(&payload).map_err(|error| {
            SyncError::serialization(format!("序列化 sync_shadow 失败: {error}"))
        })?;
        upsert_sync_shadow(
            transaction,
            payload.entity_type(),
            payload.entity_id(),
            server_seq,
            &snapshot,
            deleted_at_from_payload(&payload),
            updated_at_from_payload(&payload),
        )
        .await?;
    }
    Ok(())
}

pub(crate) async fn read_local_business_count(local: &Connection) -> Result<i64, SyncError> {
    let mut rows = local
        .query(
            r#"
            SELECT
                (SELECT COUNT(*) FROM spaces
                    WHERE NOT (
                        name = '个人'
                        AND icon_key = 'user'
                        AND color_key = 'blue'
                        AND is_default = 1
                        AND sort_order = 1000
                        AND archived_at IS NULL
                        AND deleted_at IS NULL
                    )
                ) +
                (SELECT COUNT(*) FROM projects) +
                (SELECT COUNT(*) FROM tasks) +
                (SELECT COUNT(*) FROM task_links) +
                (SELECT COUNT(*) FROM views
                    WHERE NOT (
                        type = 'system'
                        AND key IN (
                            'today',
                            'focus',
                            'upcoming',
                            'recently_added',
                            'waiting',
                            'overdue',
                            'active_projects',
                            'completed_projects',
                            'archived_projects',
                            'all_projects'
                        )
                    )
                ) +
                (SELECT COUNT(*) FROM settings
                    WHERE key NOT IN (
                        'app.sidebar.preferences',
                        'app.launcher',
                        'app.taskDefaults',
                        'app.ui.preferences',
                        'app.sync.config'
                    )
                )
            "#,
            params![],
        )
        .await
        .map_err(|error| SyncError::local_database(format!("读取本地业务数据数量失败: {error}")))?;
    let row = rows
        .next()
        .await
        .map_err(|error| SyncError::local_database(format!("遍历本地业务数据数量失败: {error}")))?
        .ok_or_else(|| SyncError::local_database("读取本地业务数据数量失败: 缺少结果行"))?;
    row.get::<i64>(0)
        .map_err(|error| SyncError::local_database(format!("读取本地业务数据数量列失败: {error}")))
}

pub(crate) fn snapshot_business_count(snapshot: &RemoteRestoreSnapshot) -> usize {
    snapshot.spaces.len()
        + snapshot.projects.len()
        + snapshot.tasks.len()
        + snapshot.task_links.len()
        + snapshot.views.len()
        + snapshot
            .settings
            .iter()
            .filter(|setting| setting.key != "app.sync.config")
            .count()
}

fn deleted_at_from_payload(payload: &SyncOperationPayload) -> Option<&str> {
    match payload {
        SyncOperationPayload::Space { snapshot } => snapshot.deleted_at.as_deref(),
        SyncOperationPayload::Project { snapshot } => snapshot.deleted_at.as_deref(),
        SyncOperationPayload::Task { snapshot } => snapshot.deleted_at.as_deref(),
        SyncOperationPayload::View { .. }
        | SyncOperationPayload::Setting { .. }
        | SyncOperationPayload::TaskLink { .. }
        | SyncOperationPayload::HardDelete { .. } => None,
    }
}

fn updated_at_from_payload(payload: &SyncOperationPayload) -> &str {
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

pub(crate) trait IntoBaselinePayload {
    fn into_payload(self) -> SyncOperationPayload;
}

impl IntoBaselinePayload for SpacePayload {
    fn into_payload(self) -> SyncOperationPayload {
        SyncOperationPayload::Space { snapshot: self }
    }
}

impl IntoBaselinePayload for ProjectPayload {
    fn into_payload(self) -> SyncOperationPayload {
        SyncOperationPayload::Project { snapshot: self }
    }
}

impl IntoBaselinePayload for TaskPayload {
    fn into_payload(self) -> SyncOperationPayload {
        SyncOperationPayload::Task { snapshot: self }
    }
}

impl IntoBaselinePayload for TaskLinkPayload {
    fn into_payload(self) -> SyncOperationPayload {
        SyncOperationPayload::TaskLink { snapshot: self }
    }
}

impl IntoBaselinePayload for ViewPayload {
    fn into_payload(self) -> SyncOperationPayload {
        SyncOperationPayload::View { snapshot: self }
    }
}

impl IntoBaselinePayload for SettingPayload {
    fn into_payload(self) -> SyncOperationPayload {
        SyncOperationPayload::Setting { snapshot: self }
    }
}

#[cfg(test)]
mod tests {

    use libsql::{params, Builder, Connection};
    use tempfile::TempDir;

    use super::migrate_baseline;
    use crate::remote::bootstrap_remote_schema;

    #[tokio::test]
    async fn migrate_baseline_should_seed_remote_log_and_local_cursor_without_overwriting_local_data(
    ) {
        let (_local_dir, local) = open_test_connection("local-migrate").await;
        let (_remote_dir, remote) = open_test_connection("remote-migrate").await;
        bootstrap_local_schema(&local).await;
        bootstrap_remote_schema(&remote)
            .await
            .expect("remote schema should bootstrap");
        insert_setting(&local, "app.theme", "local").await;
        insert_setting(&remote, "app.theme", "remote").await;

        migrate_baseline(&local, &remote)
            .await
            .expect("migration should succeed");
        migrate_baseline(&local, &remote)
            .await
            .expect("migration should be idempotent");

        assert_eq!(
            read_text(&local, "SELECT value FROM settings WHERE key = 'app.theme'")
                .await
                .as_deref(),
            Some("local")
        );
        assert_eq!(read_count(&remote, "remote_change_log").await, 1);
        assert_eq!(
            read_text(
                &local,
                "SELECT cursor FROM sync_cursor WHERE scope = 'sync:last_pulled_server_seq'"
            )
            .await
            .as_deref(),
            Some("1")
        );
        assert_eq!(read_count(&local, "sync_shadow").await, 1);
    }

    #[tokio::test]
    async fn migrate_baseline_should_not_write_local_cursor_for_empty_local_replica() {
        let (_local_dir, local) = open_test_connection("local-empty-migrate").await;
        let (_remote_dir, remote) = open_test_connection("remote-empty-migrate").await;
        bootstrap_local_schema(&local).await;
        bootstrap_remote_schema(&remote)
            .await
            .expect("remote schema should bootstrap");
        insert_setting(&remote, "app.theme", "remote").await;

        migrate_baseline(&local, &remote)
            .await
            .expect("migration should succeed");

        assert_eq!(read_count(&remote, "remote_change_log").await, 1);
        assert_eq!(
            read_text(
                &local,
                "SELECT cursor FROM sync_cursor WHERE scope = 'sync:last_pulled_server_seq'"
            )
            .await,
            None
        );
    }

    #[tokio::test]
    async fn migrate_baseline_should_treat_seed_only_local_replica_as_empty() {
        let (_local_dir, local) = open_test_connection("local-seed-only-migrate").await;
        let (_remote_dir, remote) = open_test_connection("remote-seed-only-migrate").await;
        bootstrap_local_schema(&local).await;
        bootstrap_remote_schema(&remote)
            .await
            .expect("remote schema should bootstrap");
        insert_default_seed_rows(&local).await;
        insert_setting(&remote, "app.theme", "remote").await;

        migrate_baseline(&local, &remote)
            .await
            .expect("migration should succeed");

        assert_eq!(read_count(&remote, "remote_change_log").await, 1);
        assert_eq!(
            read_text(
                &local,
                "SELECT cursor FROM sync_cursor WHERE scope = 'sync:last_pulled_server_seq'"
            )
            .await,
            None
        );
    }

    async fn open_test_connection(name: &str) -> (TempDir, Connection) {
        let temp_dir = tempfile::tempdir().expect("temp dir should be created");
        let path = temp_dir.path().join(format!("{name}.db"));
        let database = Builder::new_local(path)
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
                deleted_at TEXT NULL
            )
            "#,
            "CREATE TABLE projects (id TEXT PRIMARY KEY NOT NULL)",
            "CREATE TABLE tasks (id TEXT PRIMARY KEY NOT NULL)",
            "CREATE TABLE task_links (id TEXT PRIMARY KEY NOT NULL)",
            r#"
            CREATE TABLE views (
                id TEXT PRIMARY KEY NOT NULL,
                type TEXT NOT NULL,
                key TEXT NULL
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

    async fn insert_setting(connection: &Connection, key: &str, value: &str) {
        connection
            .execute(
                r#"
                INSERT INTO settings(key, value, created_at, updated_at)
                VALUES (?1, ?2, '2026-06-29T00:00:00Z', '2026-06-29T00:00:00Z')
                "#,
                params![key.to_owned(), value.to_owned()],
            )
            .await
            .expect("setting should insert");
    }

    async fn insert_default_seed_rows(connection: &Connection) {
        connection
            .execute(
                r#"
                INSERT INTO spaces(
                    id, name, icon_key, color_key, is_default, sort_order, archived_at, deleted_at
                )
                VALUES ('seed-space', '个人', 'user', 'blue', 1, 1000, NULL, NULL)
                "#,
                params![],
            )
            .await
            .expect("default space should insert");
        connection
            .execute(
                "INSERT INTO views(id, type, key) VALUES ('seed-view', 'system', 'today')",
                params![],
            )
            .await
            .expect("system view should insert");
        for key in [
            "app.sidebar.preferences",
            "app.launcher",
            "app.taskDefaults",
            "app.ui.preferences",
            "app.sync.config",
        ] {
            insert_setting(connection, key, "seed").await;
        }
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

    async fn read_count(connection: &Connection, table_name: &str) -> i64 {
        let mut rows = connection
            .query(&format!("SELECT COUNT(*) FROM {table_name}"), params![])
            .await
            .expect("count query should run");
        rows.next()
            .await
            .expect("row iteration should succeed")
            .expect("count row should exist")
            .get::<i64>(0)
            .expect("count should be i64")
    }
}

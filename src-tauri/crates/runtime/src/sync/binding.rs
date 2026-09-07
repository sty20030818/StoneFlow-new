//! 本机同步位置与远端实例身份的绑定边界。

use sea_orm::{ConnectionTrait, DatabaseBackend, DatabaseTransaction, Statement, TransactionTrait};
use stoneflow_storage::database::DatabaseRuntimeState;

use crate::app::error::AppError;

pub(super) const SERVER_SEQ_CURSOR_SCOPE: &str = "sync:last_pulled_server_seq";
pub(super) const REMOTE_INSTANCE_ID_SCOPE: &str = "sync:remote_instance_id";
pub(super) const ORIGIN_SEED_SCOPE: &str = "sync:origin_seed_done";
pub(super) const LAST_RESTORE_AT_SCOPE: &str = "sync:last_restore_at";

#[derive(Debug, Clone, PartialEq, Eq)]
pub(super) struct RemoteBindingSnapshot {
    pub remote_instance_id: Option<String>,
    pub server_seq: Option<i64>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum RemoteBindingState {
    Unbound,
    Bound,
}

/// 只读校验候选远端，供普通 configure 在写钥匙串前 fail closed。
pub(super) async fn verify_remote_binding(
    database: &DatabaseRuntimeState,
    remote_instance_id: &str,
) -> Result<RemoteBindingState, AppError> {
    let snapshot = read_remote_binding(database.connection()).await?;
    classify_binding(&snapshot, remote_instance_id)
}

/// 普通远端 IO 使用本机已绑定身份；旧 cursor 无身份时在网络访问前拒绝。
pub(super) async fn expected_remote_identity_for_io(
    database: &DatabaseRuntimeState,
) -> Result<Option<String>, AppError> {
    let snapshot = read_remote_binding(database.connection()).await?;
    if snapshot.remote_instance_id.is_none() && snapshot.server_seq.is_some() {
        return Err(AppError::conflict(
            "本机保留了旧同步位置，但还没有远端身份；请先确认沿用当前已配置远端。",
        ));
    }
    Ok(snapshot.remote_instance_id)
}

/// 每轮同步在任何 upload/download 前调用；首次绑定会落盘，后续只接受同一实例。
pub(super) async fn ensure_remote_binding(
    database: &DatabaseRuntimeState,
    remote_instance_id: &str,
) -> Result<(), AppError> {
    let transaction = database.connection().begin().await?;
    let snapshot = read_remote_binding(&transaction).await?;
    if matches!(
        classify_binding(&snapshot, remote_instance_id)?,
        RemoteBindingState::Unbound
    ) {
        let updated_at = stoneflow_domain::now_utc().to_rfc3339();
        write_setting(
            &transaction,
            REMOTE_INSTANCE_ID_SCOPE,
            remote_instance_id,
            &updated_at,
        )
        .await?;
    }
    transaction.commit().await?;
    Ok(())
}

/// 用户确认沿用当前配置远端后，为旧 cursor 原子补齐实例身份。
///
/// 该路径不清理 cursor、outbox 或业务表；远端序号落后时保持 fail closed。
pub(super) async fn adopt_legacy_remote_identity(
    database: &DatabaseRuntimeState,
    remote_instance_id: &str,
    remote_latest_server_seq: i64,
) -> Result<(), AppError> {
    if remote_instance_id.trim().is_empty() {
        return Err(AppError::validation("云端实例身份为空，拒绝沿用"));
    }
    if remote_latest_server_seq < 0 {
        return Err(AppError::validation("云端最新同步序号无效，拒绝沿用"));
    }

    let transaction = database.connection().begin().await?;
    let snapshot = read_remote_binding(&transaction).await?;
    let local_cursor = snapshot
        .server_seq
        .ok_or_else(|| AppError::conflict("当前本机没有待确认的旧同步游标，无需沿用远端"))?;
    if local_cursor < 0 {
        return Err(AppError::validation("本机同步游标无效，拒绝沿用远端"));
    }
    if remote_latest_server_seq < local_cursor {
        return Err(AppError::conflict(format!(
            "当前远端最新序号 {remote_latest_server_seq} 落后于本机同步游标 {local_cursor}，拒绝沿用"
        )));
    }

    match snapshot.remote_instance_id.as_deref() {
        Some(bound) if bound == remote_instance_id => {}
        Some(_) => return Err(binding_conflict()),
        None => {
            write_remote_identity(
                &transaction,
                remote_instance_id,
                &stoneflow_domain::now_utc().to_rfc3339(),
            )
            .await?;
        }
    }

    transaction.commit().await?;
    Ok(())
}

pub(super) async fn read_remote_binding(
    connection: &impl ConnectionTrait,
) -> Result<RemoteBindingSnapshot, AppError> {
    let rows = connection
        .query_all_raw(statement(
            "SELECT scope, cursor FROM sync_cursors WHERE scope IN (?, ?)",
            vec![
                REMOTE_INSTANCE_ID_SCOPE.into(),
                SERVER_SEQ_CURSOR_SCOPE.into(),
            ],
        ))
        .await?;

    let mut remote_instance_id = None;
    let mut server_seq = None;
    for row in rows {
        let scope: String = row.try_get("", "scope")?;
        let value: Option<String> = row.try_get("", "cursor")?;
        let value = value.filter(|value| !value.trim().is_empty());
        match scope.as_str() {
            REMOTE_INSTANCE_ID_SCOPE => remote_instance_id = value,
            SERVER_SEQ_CURSOR_SCOPE => {
                server_seq = value
                    .map(|value| {
                        value.parse::<i64>().map_err(|error| {
                            AppError::database(format!("解析本地 server_seq cursor 失败: {error}"))
                        })
                    })
                    .transpose()?;
            }
            _ => {}
        }
    }

    Ok(RemoteBindingSnapshot {
        remote_instance_id,
        server_seq,
    })
}

/// 游标与其远端身份必须在同一 SQLite 事务内提交。
pub(super) async fn write_bound_cursor(
    transaction: &DatabaseTransaction,
    remote_instance_id: &str,
    server_seq: i64,
    updated_at: &str,
) -> Result<(), AppError> {
    write_setting(
        transaction,
        REMOTE_INSTANCE_ID_SCOPE,
        remote_instance_id,
        updated_at,
    )
    .await?;
    write_setting(
        transaction,
        SERVER_SEQ_CURSOR_SCOPE,
        &server_seq.to_string(),
        updated_at,
    )
    .await
}

pub(super) async fn write_remote_identity(
    transaction: &DatabaseTransaction,
    remote_instance_id: &str,
    updated_at: &str,
) -> Result<(), AppError> {
    write_setting(
        transaction,
        REMOTE_INSTANCE_ID_SCOPE,
        remote_instance_id,
        updated_at,
    )
    .await
}

fn classify_binding(
    snapshot: &RemoteBindingSnapshot,
    remote_instance_id: &str,
) -> Result<RemoteBindingState, AppError> {
    if remote_instance_id.trim().is_empty() {
        return Err(AppError::validation("云端实例身份为空，拒绝绑定"));
    }

    match snapshot.remote_instance_id.as_deref() {
        Some(bound) if bound == remote_instance_id => Ok(RemoteBindingState::Bound),
        Some(_) => Err(binding_conflict()),
        None if snapshot.server_seq.is_some() => Err(AppError::conflict(
            "本机保留了旧同步位置，但还没有远端身份；请先确认沿用当前已配置远端。",
        )),
        None => Ok(RemoteBindingState::Unbound),
    }
}

fn binding_conflict() -> AppError {
    AppError::conflict(
        "同步远端实例与本机游标绑定不一致；已拒绝切换，请使用“重新绑定远端”明确确认。",
    )
}

async fn write_setting(
    connection: &impl ConnectionTrait,
    scope: &str,
    value: &str,
    updated_at: &str,
) -> Result<(), AppError> {
    connection
        .execute_raw(statement(
            r#"
            INSERT INTO sync_cursors(scope, cursor, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(scope) DO UPDATE
            SET cursor = excluded.cursor, updated_at = excluded.updated_at
            "#,
            vec![scope.into(), value.into(), updated_at.into()],
        ))
        .await?;
    Ok(())
}

fn statement(sql: &str, values: Vec<sea_orm::Value>) -> Statement {
    Statement::from_sql_and_values(DatabaseBackend::Sqlite, sql, values)
}

#[cfg(test)]
mod tests {
    use sea_orm::{ConnectionTrait, DatabaseBackend, Statement};
    use stoneflow_test_support::TestDatabase;

    use super::{
        adopt_legacy_remote_identity, ensure_remote_binding, expected_remote_identity_for_io,
        read_remote_binding, verify_remote_binding, RemoteBindingState, REMOTE_INSTANCE_ID_SCOPE,
        SERVER_SEQ_CURSOR_SCOPE,
    };
    use crate::app::error::AppError;

    #[tokio::test]
    async fn first_bind_and_same_remote_should_succeed_but_different_remote_should_fail_closed() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");

        let first = verify_remote_binding(&database, "remote-a")
            .await
            .expect("unbound replica should accept first remote");
        assert_eq!(first, RemoteBindingState::Unbound);
        ensure_remote_binding(&database, "remote-a")
            .await
            .expect("first remote should bind");
        ensure_remote_binding(&database, "remote-a")
            .await
            .expect("same remote should remain valid");
        assert_eq!(
            verify_remote_binding(&database, "remote-a")
                .await
                .expect("same remote should verify"),
            RemoteBindingState::Bound
        );

        let snapshot = read_remote_binding(database.connection())
            .await
            .expect("binding should load");
        assert_eq!(snapshot.remote_instance_id.as_deref(), Some("remote-a"));
        let error = verify_remote_binding(&database, "remote-b")
            .await
            .expect_err("different remote must require explicit rebind");
        assert!(matches!(error, AppError::Conflict(_)));
    }

    #[tokio::test]
    async fn legacy_cursor_without_identity_should_fail_closed() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        database
            .connection()
            .execute_raw(Statement::from_sql_and_values(
                DatabaseBackend::Sqlite,
                "INSERT INTO sync_cursors(scope, cursor, updated_at) VALUES (?, '42', 'now')",
                [SERVER_SEQ_CURSOR_SCOPE.into()],
            ))
            .await
            .expect("legacy cursor should insert");

        let error = verify_remote_binding(&database, "remote-a")
            .await
            .expect_err("unverifiable legacy cursor must not be adopted silently");
        assert!(matches!(error, AppError::Conflict(_)));
        let io_error = expected_remote_identity_for_io(&database)
            .await
            .expect_err("ordinary IO must stop before contacting a remote");
        assert!(matches!(io_error, AppError::Conflict(_)));
        let identity_count: i64 = database
            .connection()
            .query_one_raw(Statement::from_sql_and_values(
                DatabaseBackend::Sqlite,
                "SELECT COUNT(*) AS n FROM sync_cursors WHERE scope = ?",
                [REMOTE_INSTANCE_ID_SCOPE.into()],
            ))
            .await
            .expect("identity query should succeed")
            .expect("identity count should exist")
            .try_get("", "n")
            .expect("identity count should parse");
        assert_eq!(identity_count, 0);
    }

    #[tokio::test]
    async fn explicit_legacy_adoption_should_only_add_identity_and_allow_pending_outbox() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        database
            .connection()
            .execute_raw(Statement::from_sql_and_values(
                DatabaseBackend::Sqlite,
                "INSERT INTO sync_cursors(scope, cursor, updated_at) VALUES (?, '42', 'now')",
                [SERVER_SEQ_CURSOR_SCOPE.into()],
            ))
            .await
            .expect("legacy cursor should insert");
        database
            .connection()
            .execute_raw(Statement::from_string(
                DatabaseBackend::Sqlite,
                r#"
				INSERT INTO outbox(
					id, operation_id, entity_type, entity_id, generation,
					operation_type, payload_json, created_at, available_at
				) VALUES ('outbox-1', 'operation-1', 'task', 'task-1', 1, 'patch', '{}', 'now', 'now')
				"#,
            ))
            .await
            .expect("pending outbox should insert");
        let spaces_before: i64 = database
            .connection()
            .query_one_raw(Statement::from_string(
                DatabaseBackend::Sqlite,
                "SELECT COUNT(*) AS n FROM spaces",
            ))
            .await
            .expect("space count should load")
            .expect("space count should exist")
            .try_get("", "n")
            .expect("space count should parse");

        adopt_legacy_remote_identity(&database, "remote-a", 45)
            .await
            .expect("explicit adoption should bind current remote");
        adopt_legacy_remote_identity(&database, "remote-a", 45)
            .await
            .expect("same identity adoption should be idempotent");

        let snapshot = read_remote_binding(database.connection())
            .await
            .expect("binding should load");
        let outbox_count: i64 = database
            .connection()
            .query_one_raw(Statement::from_string(
                DatabaseBackend::Sqlite,
                "SELECT COUNT(*) AS n FROM outbox",
            ))
            .await
            .expect("outbox count should load")
            .expect("outbox count should exist")
            .try_get("", "n")
            .expect("outbox count should parse");
        let spaces_after: i64 = database
            .connection()
            .query_one_raw(Statement::from_string(
                DatabaseBackend::Sqlite,
                "SELECT COUNT(*) AS n FROM spaces",
            ))
            .await
            .expect("space count should load")
            .expect("space count should exist")
            .try_get("", "n")
            .expect("space count should parse");

        assert_eq!(snapshot.remote_instance_id.as_deref(), Some("remote-a"));
        assert_eq!(snapshot.server_seq, Some(42));
        assert_eq!(outbox_count, 1);
        assert_eq!(spaces_after, spaces_before);
    }

    #[tokio::test]
    async fn explicit_legacy_adoption_should_reject_missing_or_ahead_cursor_without_writing_identity(
    ) {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");

        let missing = adopt_legacy_remote_identity(&database, "remote-a", 10)
            .await
            .expect_err("adoption requires a legacy cursor");
        assert!(matches!(missing, AppError::Conflict(_)));
        let invalid_remote = adopt_legacy_remote_identity(&database, "remote-a", -1)
            .await
            .expect_err("a negative remote head must be rejected");
        assert!(matches!(invalid_remote, AppError::Validation(_)));

        database
            .connection()
            .execute_raw(Statement::from_sql_and_values(
                DatabaseBackend::Sqlite,
                "INSERT INTO sync_cursors(scope, cursor, updated_at) VALUES (?, '42', 'now')",
                [SERVER_SEQ_CURSOR_SCOPE.into()],
            ))
            .await
            .expect("legacy cursor should insert");
        let ahead = adopt_legacy_remote_identity(&database, "remote-a", 41)
            .await
            .expect_err("remote behind the local cursor must be rejected");
        let snapshot = read_remote_binding(database.connection())
            .await
            .expect("binding should load");

        assert!(matches!(ahead, AppError::Conflict(_)));
        assert_eq!(snapshot.remote_instance_id, None);
        assert_eq!(snapshot.server_seq, Some(42));
    }

    #[tokio::test]
    async fn explicit_legacy_adoption_should_reject_another_existing_identity_without_mutation() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        database
            .connection()
            .execute_raw(Statement::from_sql_and_values(
                DatabaseBackend::Sqlite,
                "INSERT INTO sync_cursors(scope, cursor, updated_at) VALUES (?, '42', 'now')",
                [SERVER_SEQ_CURSOR_SCOPE.into()],
            ))
            .await
            .expect("cursor should insert");
        database
            .connection()
            .execute_raw(Statement::from_sql_and_values(
                DatabaseBackend::Sqlite,
                "INSERT INTO sync_cursors(scope, cursor, updated_at) VALUES (?, 'remote-a', 'now')",
                [REMOTE_INSTANCE_ID_SCOPE.into()],
            ))
            .await
            .expect("identity should insert");

        let error = adopt_legacy_remote_identity(&database, "remote-b", 45)
            .await
            .expect_err("another identity must be rejected");
        let snapshot = read_remote_binding(database.connection())
            .await
            .expect("binding should load");

        assert!(matches!(error, AppError::Conflict(_)));
        assert_eq!(snapshot.remote_instance_id.as_deref(), Some("remote-a"));
        assert_eq!(snapshot.server_seq, Some(42));
    }

    #[tokio::test]
    async fn another_remote_must_not_reuse_a_cursor_even_when_sequences_overlap() {
        let database = TestDatabase::bootstrap_in_memory()
            .await
            .expect("test database should bootstrap");
        ensure_remote_binding(&database, "remote-a")
            .await
            .expect("first remote should bind");
        database
            .connection()
            .execute_raw(Statement::from_sql_and_values(
                DatabaseBackend::Sqlite,
                "INSERT INTO sync_cursors(scope, cursor, updated_at) VALUES (?, '100', 'now')",
                [SERVER_SEQ_CURSOR_SCOPE.into()],
            ))
            .await
            .expect("cursor should insert");

        // remote-b 即使也报告 100 或更大的 sequence，identity 不同就不能复用这个位置。
        let error = verify_remote_binding(&database, "remote-b")
            .await
            .expect_err("sequence overlap must not bypass identity binding");
        let snapshot = read_remote_binding(database.connection())
            .await
            .expect("original binding should remain intact");

        assert!(matches!(error, AppError::Conflict(_)));
        assert_eq!(snapshot.remote_instance_id.as_deref(), Some("remote-a"));
        assert_eq!(snapshot.server_seq, Some(100));
    }
}

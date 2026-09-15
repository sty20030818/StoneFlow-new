//! SQLite 前向迁移：从当前基线开始，后续迁移保持连续历史。

use sea_orm::{
    DatabaseConnection, DbBackend, SqliteTransactionMode, Statement, TransactionOptions,
    TransactionTrait,
};
pub use sea_orm_migration::prelude::*;

mod m20260915_000001_baseline;

const UNSUPPORTED_DATABASE: &str =
    "本地数据库迁移记录或表结构不受支持。请保留原数据库并从完整备份恢复，勿删除数据；本次未执行迁移。";

const REQUIRED_TABLES: &[&str] = &[
    "activity_changes",
    "activity_events",
    "applied_operations",
    "outbox",
    "projects",
    "seaql_migrations",
    "settings",
    "spaces",
    "sync_changes",
    "sync_cursors",
    "sync_devices",
    "sync_protocol_entities",
    "task_links",
    "tasks",
    "tombstones",
    "views",
];

const VIEW_COLUMNS: &[&str] = &[
    "id",
    "name",
    "entity_kind",
    "scope_json",
    "filters_json",
    "position",
    "generation",
    "created_at",
    "updated_at",
];

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![Box::new(m20260915_000001_baseline::Migration)]
    }
}

/// 初始化或升级；业务转换、改表与 ledger 在同一个 SQLite 写事务提交。
pub async fn run_migrations(connection: &DatabaseConnection) -> Result<usize, DbErr> {
    let transaction = connection
        .begin_with_options(TransactionOptions {
            sqlite_transaction_mode: Some(SqliteTransactionMode::Immediate),
            ..Default::default()
        })
        .await?;
    // 连接准入后可能有另一启动进程完成升级，持有写锁后重新读取实际历史。
    validate_database(&transaction).await?;
    Migrator::up(&transaction, None).await?;
    transaction.commit().await?;
    Ok(Migrator::migrations().len())
}

/// 连接设置持久 PRAGMA 与执行迁移之前，共用此只读准入判定。
pub(crate) async fn validate_database<C: ConnectionTrait>(connection: &C) -> Result<(), DbErr> {
    // SeaORM 的状态查询会先创建 ledger；必须在调用它之前只读拒绝未知或残缺库。
    let objects = connection
        .query_all_raw(Statement::from_string(
            DbBackend::Sqlite,
            "SELECT type, name FROM sqlite_schema WHERE name NOT GLOB 'sqlite_*'",
        ))
        .await?;
    if objects.is_empty() {
        return Ok(());
    }

    let mut tables = Vec::new();
    for row in &objects {
        if row.try_get::<String>("", "type")? == "table" {
            tables.push(row.try_get::<String>("", "name")?);
        }
    }
    // 已有账本不能使残缺业务库通过准入；不自动补表。
    if REQUIRED_TABLES
        .iter()
        .any(|required| !tables.iter().any(|name| name.as_str() == *required))
    {
        return Err(DbErr::Custom(UNSUPPORTED_DATABASE.to_owned()));
    }
    let records = connection
        .query_all_raw(Statement::from_string(
            DbBackend::Sqlite,
            "SELECT version, applied_at FROM seaql_migrations ORDER BY version",
        ))
        .await
        .map_err(|error| {
            DbErr::Custom(format!("{UNSUPPORTED_DATABASE} 读取迁移记录失败：{error}"))
        })?;
    let versions = records
        .iter()
        .map(|row| {
            row.try_get::<i64>("", "applied_at")?;
            row.try_get::<String>("", "version")
        })
        .collect::<Result<Vec<_>, DbErr>>()
        .map_err(|error| DbErr::Custom(format!("{UNSUPPORTED_DATABASE} 迁移记录无效：{error}")))?;
    let migrations = Migrator::migrations();
    let registered: Vec<&str> = migrations
        .iter()
        .map(|migration| migration.name())
        .collect();
    // 只接受从当前基线开始的连续前缀；旧账本必须在应用外完成已核验的收敛。
    let continuous = !versions.is_empty()
        && versions.len() <= registered.len()
        && versions
            .iter()
            .map(String::as_str)
            .eq(registered[..versions.len()].iter().copied());
    if continuous {
        let mut columns = connection
            .query_all_raw(Statement::from_string(
                DbBackend::Sqlite,
                "PRAGMA table_info(views)",
            ))
            .await?
            .into_iter()
            .map(|row| row.try_get::<String>("", "name"))
            .collect::<Result<Vec<_>, _>>()?;
        let mut expected = VIEW_COLUMNS.to_vec();
        columns.sort_unstable();
        expected.sort_unstable();
        if columns == expected {
            return Ok(());
        }
    }

    Err(DbErr::Custom(UNSUPPORTED_DATABASE.to_owned()))
}

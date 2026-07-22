//! 连接池 PRAGMA 基线测试。

use sea_orm::{ConnectionTrait, DatabaseBackend, Statement};
use stoneflow_storage::database::connect_sqlite_memory;

#[tokio::test]
async fn connect_sqlite_memory_should_enable_foreign_keys_and_full_sync() {
    let connection = connect_sqlite_memory()
        .await
        .expect("memory sqlite should connect");

    let foreign_keys = query_pragma_i64(&connection, "PRAGMA foreign_keys;")
        .await
        .expect("foreign_keys pragma");
    let synchronous = query_pragma_i64(&connection, "PRAGMA synchronous;")
        .await
        .expect("synchronous pragma");

    assert_eq!(foreign_keys, 1);
    // FULL == 2
    assert_eq!(synchronous, 2);
}

async fn query_pragma_i64(
    connection: &sea_orm::DatabaseConnection,
    sql: &str,
) -> Result<i64, sea_orm::DbErr> {
    let row = connection
        .query_one(Statement::from_string(
            DatabaseBackend::Sqlite,
            sql.to_owned(),
        ))
        .await?
        .expect("pragma should return a row");
    row.try_get_by_index(0)
}

use sqlx::Error as SqlxError;

use crate::SyncError;

pub fn map_connect_error(error: SqlxError) -> SyncError {
    map_sqlx_error("连接同步数据库", error)
}

pub fn map_sqlx_error(action: &str, error: SqlxError) -> SyncError {
    let message = error.to_string();
    let lower = message.to_ascii_lowercase();

    if is_auth_error(&error, &lower) {
        return SyncError::authentication(format!("{action}鉴权失败: {message}"));
    }
    if matches!(&error, SqlxError::Configuration(_))
        || lower.contains("invalid") && lower.contains("url")
        || lower.contains("empty host")
    {
        return SyncError::validation(format!("{action}参数错误: {message}"));
    }
    SyncError::remote_database(format!("{action}失败: {message}"))
}

pub fn is_unique_violation(error: &SqlxError) -> bool {
    match error {
        SqlxError::Database(db) => db.code().as_deref() == Some("23505"),
        _ => false,
    }
}

fn is_auth_error(error: &SqlxError, lower: &str) -> bool {
    if let SqlxError::Database(db) = error {
        if db.code().as_deref() == Some("28P01") || db.code().as_deref() == Some("28000") {
            return true;
        }
    }
    lower.contains("password authentication failed")
        || lower.contains("authentication failed")
        || lower.contains("role") && lower.contains("does not exist")
}

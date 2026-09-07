use sqlx::Error as SqlxError;

use crate::SyncError;

pub fn map_connect_error(error: SqlxError) -> SyncError {
    let lower = error.to_string().to_ascii_lowercase();
    if is_auth_error(&error, &lower) {
        return SyncError::authentication("同步数据库拒绝了凭据，请检查用户名与密码");
    }
    if matches!(&error, SqlxError::Configuration(_))
        || lower.contains("invalid") && lower.contains("url")
        || lower.contains("empty host")
    {
        return SyncError::validation("同步数据库连接参数无效");
    }
    SyncError::remote_database("无法连接同步数据库，请检查主机、网络与 TLS 配置")
}

#[cfg(test)]
mod tests {
    use sqlx::Error as SqlxError;

    use super::map_connect_error;

    #[test]
    fn connect_error_should_not_echo_a_url_from_the_driver() {
        let driver_error = std::io::Error::other(
            "invalid URL postgresql://user:synthetic-password@example.invalid/db",
        );
        let mapped = map_connect_error(SqlxError::Configuration(Box::new(driver_error)));

        assert!(!mapped.to_string().contains("synthetic-password"));
        assert!(!mapped.to_string().contains("user"));
    }
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

//! 系统凭证存储。
//!
//! 同步数据库连接串属于设备凭证，不能写入业务日志或同步 payload。
//! 历史账户名 `sync-token` 沿用（硬切后存的是完整 database_url）。

use keyring::Entry;
use thiserror::Error;

const SERVICE_NAME: &str = "space.stonefish.stoneflow";
const SYNC_TOKEN_ACCOUNT: &str = "sync-token";

/// 系统钥匙串读写失败。
#[derive(Debug, Error)]
pub enum CredentialError {
    #[error("初始化系统凭证存储失败: {0}")]
    Entry(#[source] keyring::Error),
    #[error("读取系统凭证失败: {0}")]
    Read(#[source] keyring::Error),
    #[error("保存系统凭证失败: {0}")]
    Write(#[source] keyring::Error),
}

/// 同步库连接串的单一系统凭证入口。
pub struct SyncTokenStore;

impl SyncTokenStore {
    pub fn load() -> Result<Option<String>, CredentialError> {
        let entry = credential_entry()?;
        match entry.get_password() {
            Ok(token) => Ok(Some(token)),
            Err(keyring::Error::NoEntry) => Ok(None),
            // macOS 未授权等：上层当作未配置，避免启动整链失败。
            Err(error) if is_authorization_failure(&error) => {
                log::warn!("凭证:钥匙串授权失败（读取）: {error}");
                Ok(None)
            }
            Err(error) => Err(CredentialError::Read(error)),
        }
    }

    pub fn save(token: &str) -> Result<(), CredentialError> {
        credential_entry()?
            .set_password(token)
            .map_err(CredentialError::Write)
    }

    /// 删除同步凭证（测试或用户关闭同步时使用）。
    pub fn clear() -> Result<(), CredentialError> {
        let entry = credential_entry()?;
        match entry.delete_credential() {
            Ok(()) => Ok(()),
            Err(keyring::Error::NoEntry) => Ok(()),
            Err(error) => Err(CredentialError::Write(error)),
        }
    }
}

fn credential_entry() -> Result<Entry, CredentialError> {
    Entry::new(SERVICE_NAME, SYNC_TOKEN_ACCOUNT).map_err(CredentialError::Entry)
}

fn is_authorization_failure(error: &keyring::Error) -> bool {
    let message = error.to_string().to_ascii_lowercase();
    message.contains("authorization")
        || message.contains("not authorized")
        || message.contains("user interaction is not allowed")
        || message.contains("errsec")
}

#[cfg(test)]
mod tests {
    use super::{SERVICE_NAME, SYNC_TOKEN_ACCOUNT};

    #[test]
    fn sync_token_credential_identity_should_be_stable() {
        assert_eq!(SERVICE_NAME, "space.stonefish.stoneflow");
        assert_eq!(SYNC_TOKEN_ACCOUNT, "sync-token");
    }
}

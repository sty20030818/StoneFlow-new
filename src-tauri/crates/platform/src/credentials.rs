//! 系统凭证存储。
//!
//! 同步 token 属于设备凭证，不能写入 SQLite、日志或同步 payload。

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

/// Turso token 的单一系统凭证入口。
pub struct SyncTokenStore;

impl SyncTokenStore {
    pub fn load() -> Result<Option<String>, CredentialError> {
        let entry = credential_entry()?;
        match entry.get_password() {
            Ok(token) => Ok(Some(token)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(error) => Err(CredentialError::Read(error)),
        }
    }

    pub fn save(token: &str) -> Result<(), CredentialError> {
        credential_entry()?
            .set_password(token)
            .map_err(CredentialError::Write)
    }
}

fn credential_entry() -> Result<Entry, CredentialError> {
    Entry::new(SERVICE_NAME, SYNC_TOKEN_ACCOUNT).map_err(CredentialError::Entry)
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

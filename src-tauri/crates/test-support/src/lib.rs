//! StoneFlow 测试基础设施：统一数据库 fixture 与陈旧测试目录清扫。

use std::fs;
use std::ops::Deref;
use std::path::Path;
use std::sync::Once;
use std::time::{Duration, SystemTime};

use sea_orm::DatabaseConnection;
use stoneflow_storage::database::{
    bootstrap_database_for_test, bootstrap_database_in_memory, DatabaseRuntimeState,
};
use stoneflow_storage::error::StorageError;
use tempfile::TempDir;

const TEST_DIR_PREFIX: &str = "stoneflow-test-";
const STALE_TEST_DIR_MAX_AGE: Duration = Duration::from_secs(24 * 60 * 60);
const REMOVE_RETRY_COUNT: usize = 5;
const REMOVE_RETRY_DELAY: Duration = Duration::from_millis(50);

static STALE_CLEANUP: Once = Once::new();

/// 测试专用数据库：拥有临时目录（可选）与连接，保证先关库再删目录。
pub struct TestDatabase {
    state: Option<DatabaseRuntimeState>,
    temp_dir: Option<TempDir>,
    closed: bool,
}

impl TestDatabase {
    /// 在临时目录中创建文件库（用于 bootstrap / schema / seed 等落盘测试）。
    pub async fn bootstrap() -> Result<Self, StorageError> {
        ensure_stale_cleanup();

        let temp_dir = TempDir::with_prefix(TEST_DIR_PREFIX).map_err(StorageError::from)?;
        let state = bootstrap_database_for_test(temp_dir.path()).await?;

        Ok(Self {
            state: Some(state),
            temp_dir: Some(temp_dir),
            closed: false,
        })
    }

    /// 创建内存库（默认选项，不落盘）。
    pub async fn bootstrap_in_memory() -> Result<Self, StorageError> {
        ensure_stale_cleanup();

        let state = bootstrap_database_in_memory().await?;

        Ok(Self {
            state: Some(state),
            temp_dir: None,
            closed: false,
        })
    }

    /// 返回测试临时目录；仅文件库可用。
    pub fn base_dir(&self) -> Option<&Path> {
        self.temp_dir.as_ref().map(TempDir::path)
    }

    /// 显式关闭连接，避免 Windows 上文件锁导致 Temp 目录残留。
    pub async fn close(mut self) {
        self.close_inner().await;
    }

    async fn close_inner(&mut self) {
        if self.closed {
            return;
        }

        if let Some(state) = self.state.take() {
            close_connection(state.connection()).await;
        }

        self.closed = true;
    }

    fn runtime(&self) -> &DatabaseRuntimeState {
        self.state
            .as_ref()
            .expect("test database connection should remain available until close")
    }
}

impl Deref for TestDatabase {
    type Target = DatabaseRuntimeState;

    fn deref(&self) -> &Self::Target {
        self.runtime()
    }
}

impl Drop for TestDatabase {
    fn drop(&mut self) {
        if self.closed {
            return;
        }

        // 在 #[tokio::test] 中 Drop 不能 block_on；先释放连接，再带重试删除目录。
        drop(self.state.take());

        if let Some(temp_dir) = self.temp_dir.take() {
            std::thread::sleep(REMOVE_RETRY_DELAY);
            let path = temp_dir.path().to_path_buf();
            std::mem::forget(temp_dir);
            remove_temp_dir_with_retry(&path);
        }

        self.closed = true;
    }
}

/// 删除 Temp 中过期的 StoneFlow 测试目录（含历史命名）。
pub fn cleanup_stale_test_dirs(max_age: Duration) {
    let temp_dir = std::env::temp_dir();
    let entries = match fs::read_dir(&temp_dir) {
        Ok(entries) => entries,
        Err(error) => {
            log::warn!("无法读取 Temp 目录 {}: {error}", temp_dir.display());
            return;
        }
    };

    let cutoff = SystemTime::now()
        .checked_sub(max_age)
        .unwrap_or(SystemTime::UNIX_EPOCH);

    for entry in entries.flatten() {
        let file_type = match entry.file_type() {
            Ok(file_type) => file_type,
            Err(_) => continue,
        };

        if !file_type.is_dir() {
            continue;
        }

        let path = entry.path();
        let dir_name = match path.file_name().and_then(|name| name.to_str()) {
            Some(name) => name,
            None => continue,
        };

        if !is_stoneflow_test_dir(dir_name) {
            continue;
        }

        let modified_at = match entry.metadata().and_then(|metadata| metadata.modified()) {
            Ok(modified_at) => modified_at,
            Err(_) => continue,
        };

        if modified_at > cutoff {
            continue;
        }

        remove_temp_dir_with_retry(&path);
    }
}

/// 统计 Temp 中 StoneFlow 测试目录数量（用于诊断）。
pub fn count_stoneflow_test_dirs() -> usize {
    let temp_dir = std::env::temp_dir();
    let entries = match fs::read_dir(&temp_dir) {
        Ok(entries) => entries,
        Err(_) => return 0,
    };

    entries
        .flatten()
        .filter(|entry| {
            entry
                .file_type()
                .map(|file_type| file_type.is_dir())
                .unwrap_or(false)
                && entry
                    .file_name()
                    .to_str()
                    .is_some_and(is_stoneflow_test_dir)
        })
        .count()
}

fn ensure_stale_cleanup() {
    STALE_CLEANUP.call_once(|| cleanup_stale_test_dirs(STALE_TEST_DIR_MAX_AGE));
}

fn is_stoneflow_test_dir(dir_name: &str) -> bool {
    dir_name.starts_with(TEST_DIR_PREFIX)
        || dir_name.starts_with("stoneflow-stage")
        || dir_name.starts_with("stoneflow-quick-create")
        || dir_name.starts_with("stoneflow-search")
        || dir_name.starts_with("stoneflow-project")
        || dir_name.starts_with("stoneflow-task")
}

async fn close_connection(connection: &DatabaseConnection) {
    let _ = connection.clone().close().await;
}

fn remove_temp_dir_with_retry(path: &Path) {
    for attempt in 0..REMOVE_RETRY_COUNT {
        match fs::remove_dir_all(path) {
            Ok(()) => return,
            Err(error) if attempt + 1 < REMOVE_RETRY_COUNT => {
                std::thread::sleep(REMOVE_RETRY_DELAY);
                log::debug!(
                    "删除测试目录重试 {}/{} {}: {error}",
                    attempt + 1,
                    REMOVE_RETRY_COUNT,
                    path.display()
                );
            }
            Err(error) => {
                log::warn!("无法删除测试目录 {}: {error}", path.display());
            }
        }
    }
}

/// 便捷宏：创建内存测试库。
#[macro_export]
macro_rules! test_db_in_memory {
    () => {
        $crate::TestDatabase::bootstrap_in_memory()
            .await
            .expect("in-memory test database should bootstrap")
    };
}

/// 便捷宏：创建文件测试库。
#[macro_export]
macro_rules! test_db_file {
    () => {
        $crate::TestDatabase::bootstrap()
            .await
            .expect("file test database should bootstrap")
    };
}

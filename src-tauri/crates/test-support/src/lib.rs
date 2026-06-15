//! StoneFlow 的测试基础设施 crate。

use std::path::{Path, PathBuf};

use uuid::Uuid;

/// 临时数据库目录句柄；离开作用域时自动清理。
#[derive(Debug)]
pub struct TempDatabaseDir {
    path: PathBuf,
}

impl TempDatabaseDir {
    /// 创建一个新的临时数据库目录。
    pub fn new(prefix: &str) -> std::io::Result<Self> {
        let path = std::env::temp_dir().join(format!("{prefix}-{}", Uuid::now_v7()));
        std::fs::create_dir_all(&path)?;
        Ok(Self { path })
    }

    /// 返回目录路径。
    pub fn path(&self) -> &Path {
        &self.path
    }

    /// 返回目录下的 SQLite 文件路径。
    pub fn database_path(&self, file_name: &str) -> PathBuf {
        self.path.join(file_name)
    }
}

impl Drop for TempDatabaseDir {
    fn drop(&mut self) {
        if let Err(error) = std::fs::remove_dir_all(&self.path) {
            eprintln!(
                "failed to remove temporary database dir {}: {error}",
                self.path.display()
            );
        }
    }
}

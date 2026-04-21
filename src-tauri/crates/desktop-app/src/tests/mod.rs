//! StoneFlow 集成测试入口。
//!
//! 测试代码按业务领域模块化组织，与原 Commands 结构对应。

use std::path::PathBuf;

/// 临时测试数据库目录管理。
pub struct TestDatabaseDir {
    root: PathBuf,
}

impl TestDatabaseDir {
    /// 创建新的临时测试目录。
    pub fn new() -> Self {
        let root =
            std::env::temp_dir().join(format!("stoneflow-db-test-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&root).expect("test dir should be created");
        Self { root }
    }

    /// 获取数据库文件路径。
    pub fn database_path(&self) -> PathBuf {
        self.root.join("app.db")
    }

    /// 获取 fixtures 根目录。
    pub fn root(&self) -> &PathBuf {
        &self.root
    }
}

impl Drop for TestDatabaseDir {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.root);
    }
}

// 测试模块声明
mod focus_tests;
mod inbox_tests;
mod project_tests;
mod resource_tests;
mod search_tests;
mod space_tests;
mod task_drawer_tests;
mod task_tests;
mod trash_tests;

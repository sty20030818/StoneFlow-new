//! StoneFlow 的持久化与外部存储适配层。
//!
//! 负责：
//! - SQLite 连接与 bootstrap；
//! - SeaORM entity 与 migration；
//! - repository 实现；
//! - application ports 的 SQLite adapter 与 service 工厂；
//! - entity 与 application record 映射。
//!
//! 仅本 crate 允许依赖 SeaORM。

pub mod adapters;
pub mod database;
pub mod entities;
pub mod error;
pub mod mappers;
pub mod migration;
pub mod repositories;
pub mod unit_of_work;

pub use adapters::{
    build_activity_service, build_launcher_context_service, build_launcher_service,
    build_lifecycle_service, build_project_service, build_search_service, build_settings_service,
    build_space_service, build_task_link_service, build_task_service, build_view_service,
    ActivityAppService, LauncherAppService, LauncherContextAppService, LifecycleAppService,
    ProjectAppService, SearchAppService, SettingsAppService, SpaceAppService, TaskAppService,
    TaskLinkAppService, ViewAppService,
};
pub use error::StorageError;
pub use unit_of_work::SqliteUnitOfWork;

#[cfg(test)]
mod r2_baseline_tests;
